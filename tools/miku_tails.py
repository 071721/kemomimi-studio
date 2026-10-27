# -*- coding: utf-8 -*-
"""把初音双马尾从立绘里拆出来

问题：立绘里马尾是「静态」的，物理部件又是从同一张图上裁的矩形，
两张叠在一起，一摆动就会看到背后那条不动的马尾，而且右马尾的矩形
里还混进了手臂和手提包。

做法：马尾的填充色是青绿（G 明显大于 R），描边是灰紫（G < R），
所以以「青绿」为可通行区域、从马尾内部洪泛，就能精确圈住马尾本体
（描边天然成为围墙，不会溢到刘海或身体）。

第二版修正（缺口）：
  洪泛只能圈到「纯青绿填充」，内缘的深青阴影带、发根附近的浅色高光、
  外缘被画布边缘裁到的描边都比 6px 生长范围宽，于是 body 与 tails
  之间留下「谁都没要」的像素 —— 合成后就是背景色透进来的缺口。
  现在改为：
    * 先算出「漏网像素」gap = 原图不透明 且 不在马尾掩码里；
    * gap 一律补进马尾图层（尾巴图层自己先完整，不再缺块）；
    * 再按「该像素在核心的同侧是外缘还是内缘」决定 body 要不要清掉它 ——
        - 外缘 gap：清掉，否则马尾摆走时原地会剩一条静止的头发残影；
        - 内缘 gap（贴着耳机/脸）：body 保留，重叠绘制，颜色同源看不出来，
          而且内缘在弯折绘制里位移≈0，不会错位。
  这样 body ∪ tails 完整覆盖原图，合成后无透明缺口。

产出两张全尺寸图（方便沿用原来的裁切矩形）：
  char-miku-body.png  去掉马尾的底图
  miku-tails.png      只剩左右马尾（含描边），专门给物理部件裁切
"""
import os
from collections import deque

import numpy as np
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHR = os.path.join(BASE, "assets", "chr")
SRC = os.path.join(CHR, "char-miku.png")
OUT_BODY = os.path.join(CHR, "char-miku-body.png")
OUT_TAILS = os.path.join(CHR, "miku-tails.png")

SEEDS = [(150, 800), (860, 800)]  # 左 / 右马尾内部各取一个点
GROW_TAIL = 6  # 部件侧：把马尾描边整圈带走
MIDX = 500  # 头部中线，用来区分左右马尾与「内缘 / 外缘」
BEND_SAFE_Y = 700  # 这行以下的漏网像素一律归马尾（位移大，留底图会露碎片）


def teal_mask(a):
    r = a[:, :, 0].astype(np.int16)
    g = a[:, :, 1].astype(np.int16)
    return (a[:, :, 3] > 40) & (g > r + 10)


def flood(passable, seed):
    h, w = passable.shape
    sx, sy = seed
    out = np.zeros((h, w), dtype=bool)
    if not passable[sy, sx]:
        return out
    out[sy, sx] = True
    dq = deque([(sy, sx)])
    while dq:
        y, x = dq.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and passable[ny, nx] and not out[ny, nx]:
                out[ny, nx] = True
                dq.append((ny, nx))
    return out


def grow(m, n):
    out = m.copy()
    for _ in range(n):
        nxt = out.copy()
        nxt[1:, :] |= out[:-1, :]
        nxt[:-1, :] |= out[1:, :]
        nxt[:, 1:] |= out[:, :-1]
        nxt[:, :-1] |= out[:, 1:]
        out = nxt
    return out


def despeckle(rgba, keep_x=(300, 710), min_area=1200):
    """马尾区外围会剩下几粒孤立的描边碎屑，按「小连通域 + 落在身体外侧」清掉。"""
    al = rgba[:, :, 3] > 0
    h, w = al.shape
    seen = np.zeros((h, w), dtype=bool)
    killed = np.zeros((h, w), dtype=bool)
    ys, xs = np.nonzero(al)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]:
            continue
        dq = deque([(y0, x0)])
        seen[y0, x0] = True
        pix = [(y0, x0)]
        while dq:
            y, x = dq.popleft()
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and al[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    dq.append((ny, nx))
                    pix.append((ny, nx))
        if len(pix) >= min_area:
            continue
        cx = sum(p[1] for p in pix) / len(pix)
        if keep_x[0] <= cx <= keep_x[1]:
            continue  # 身体范围内的小细节（耳机麦克风之类）不动
        py = np.array([p[0] for p in pix])
        px = np.array([p[1] for p in pix])
        killed[py, px] = True
    rgba[killed, 3] = 0
    return int(killed.sum())


def components(mask):
    """四连通标记，返回 (标签图, 块数)。"""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    n = 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]:
            continue
        n += 1
        lab[y0, x0] = n
        dq = deque([(y0, x0)])
        while dq:
            y, x = dq.popleft()
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n
                    dq.append((ny, nx))
    return lab, n


def _median_profile(v, valid, win):
    """对边界曲线做滑动中值，得到「包络」，用来判断哪里是突然伸出去的刺。"""
    res = v.astype(np.float64).copy()
    idx = np.nonzero(valid)[0]
    for i in idx:
        a0, a1 = max(0, i - win), min(len(v), i + win + 1)
        seg = v[a0:a1][valid[a0:a1]]
        if len(seg):
            res[i] = np.median(seg)
    return res


def _prune_block(block, tol=6, win=14):
    """单连通块：把超出包络 tol 像素的突出部分剪掉（行方向 + 列方向各一遍）。"""
    h, w = block.shape
    out = block.copy()

    valid = block.any(1)
    left = np.full(h, w, np.int32)
    right = np.full(h, -1, np.int32)
    rows = np.nonzero(valid)[0]
    left[rows] = np.argmax(block[rows], axis=1)
    right[rows] = w - 1 - np.argmax(block[rows][:, ::-1], axis=1)
    ml = _median_profile(left, valid, win)
    mr = _median_profile(right, valid, win)
    for i in rows:
        if left[i] < ml[i] - tol:
            out[i, int(left[i]):int(ml[i]) - 1] = False
        if right[i] > mr[i] + tol:
            out[i, int(mr[i]) + 2:int(right[i]) + 1] = False

    valid = out.any(0)
    top = np.full(w, h, np.int32)
    bot = np.full(w, -1, np.int32)
    cols = np.nonzero(valid)[0]
    top[cols] = np.argmax(out[:, cols], axis=0)
    bot[cols] = h - 1 - np.argmax(out[::-1, :][:, cols], axis=0)
    mt = _median_profile(top, valid, win)
    mb = _median_profile(bot, valid, win)
    for j in cols:
        if top[j] < mt[j] - tol:
            out[int(top[j]):int(mt[j]) - 1, j] = False
        if bot[j] > mb[j] + tol:
            out[int(mb[j]) + 2:int(bot[j]) + 1, j] = False
    return out


def prune_spurs(mask, tol=6, win=14, min_area=800):
    """把一个连通块的轮廓剪平滑：只剪「几行之内突然伸出十几像素」的碎刺。

    这些碎刺基本都是隔壁部件（袖子、包、裙子）的描边被 grow/gap 顺手吸进来的，
    留在马尾图层上就成了轮廓外的一根小尖，摆动时还会跟着飞。
    真实曲线在 win 行内变化平缓，中值包络一比就能分辨。
    """
    lab, n = components(mask)
    keep = mask.copy()
    for cid in range(1, n + 1):
        sel = lab == cid
        if sel.sum() < min_area:
            continue
        ys, xs = np.nonzero(sel)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        pruned = _prune_block(sel[y0:y1, x0:x1], tol, win)
        keep[y0:y1, x0:x1] &= pruned
    return keep


def row_span(core, y, band=4):
    """取 core 在第 y 行（上下各找 band 行兜底）的左右边界。"""
    h, w = core.shape
    for dy in range(0, band + 1):
        for yy in (y - dy, y + dy):
            if 0 <= yy < h:
                idx = np.nonzero(core[yy])[0]
                if len(idx):
                    L = idx[idx < MIDX]
                    R = idx[idx >= MIDX]
                    return (L.min(), L.max()) if len(L) else None, \
                           (R.min(), R.max()) if len(R) else None
    return None, None


def main():
    im = Image.open(SRC).convert("RGBA")
    a = np.array(im)
    passable = teal_mask(a)

    core = np.zeros(a.shape[:2], dtype=bool)
    for seed in SEEDS:
        m = flood(passable, seed)
        ys, xs = np.nonzero(m)
        if m.sum() < 20000:
            print("!! seed", seed, "只有", m.sum(), "像素，可能取点不对")
            continue
        print("seed %s -> %6d px  bbox x %d..%d  y %d..%d"
              % (seed, m.sum(), xs.min(), xs.max(), ys.min(), ys.max()))
        core |= m

    part_zone = grow(core, GROW_TAIL)

    opaque = a[:, :, 3] > 0
    gap = opaque & ~part_zone
    # 只看马尾附近 20px 内的漏网像素，再远就是身体别的东西了
    near = grow(core, 20)
    gap &= near
    # gap 只能吸收「头发色系」的像素：青绿填充、灰紫描边、青白高光。
    # 否则贴着马尾的手臂（米白袖子）、皮肤、耳机黑都会被算成头发，
    # 摆动时整块跟着飞走，还会在马尾图层里留下白色色块。
    rgb = a[:, :, :3].astype(np.float32)
    lum = rgb.mean(2)
    sat = rgb.max(2) - rgb.min(2)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    teal_like = g > r + 6
    outline_like = (b > g) & (lum > 105) & (lum < 228) & (np.abs(r - g) < 48) & (sat < 62)
    hair_like = teal_like | outline_like
    # 手提包是浅蓝（B 明显大于 G），而头发是青绿（G≈B）。
    # 但包也满足 g > r，于是整条包边会被当成头发吸进马尾层 ——
    # 表现就是「马尾和手里的包长成一块」。包的一切（包身、包的描边）都归底图。
    bag_like = (b > g + 8) & (g > 150) & (r > 120)
    gap &= ~bag_like
    dropped = gap & ~hair_like
    gap &= hair_like
    print("gap 中剔除的非头发像素 %d px（手臂/皮肤/耳机等）" % int(dropped.sum()))
    ys, xs = np.nonzero(gap)
    print("漏网像素 %d px（bbox x %d..%d  y %d..%d）"
          % (len(ys), xs.min(), xs.max(), ys.min(), ys.max()))

    # gap 一律补进马尾图层（尾巴先保证自己完整、不缺块）
    part_zone |= gap
    # 最外那 1px 半透明抗锯齿也归马尾：不然它会留在底图上，
    # 变成绕着马尾的一圈静止小碎点（摆动时特别明显）。
    edge = opaque & grow(part_zone, 1) & ~part_zone
    part_zone |= edge

    # 再按「外缘 / 内缘」决定底图要不要跟着清：
    #   外缘 gap 必须从底图清掉，否则马尾摆走时原地会剩一条静止的头发残影；
    #   内缘 gap（贴着耳机、脸）留给底图做重叠兜底，弯折时内缘位移≈0，
    #   重叠绘制既不会错位，又能把耳机那一侧填满，不再露背景。
    outer = np.zeros_like(gap)
    cache = {}
    for y, x in zip(ys, xs):
        if y not in cache:
            cache[y] = row_span(core, y)
        L, R = cache[y]
        if x < MIDX:
            if L and x < L[0]:
                outer[y, x] = True
        else:
            if R and x > R[1]:
                outer[y, x] = True
    # 发尾那一段位移最大（dx 按发根深度平方增长），那里的 gap 必须整体跟着尾巴走，
    # 留在底图会在原地留一块静止的碎片 —— 看着就是「发尾内侧的缺口」。
    deep = np.zeros_like(gap)
    deep[BEND_SAFE_Y:, :] = True
    outer |= gap & deep
    body_zone = part_zone & ~(gap & ~outer)   # 只清马尾本体 + 外缘 gap
    # 包整体留在底图（grow 会咬到包边一点点，这里补回来）
    body_zone &= ~bag_like
    # 内缘凹槽里是耳机的黑色单元：grow 会顺着几何形状咬进去一小条，
    # 咬掉的这部分必须留在底图上填凹槽，否则凹槽边缘会露出一条背景缝。
    dark = (lum < 92) & (sat < 60)
    keep_dark = body_zone & dark
    body_zone &= ~dark
    if keep_dark.any():
        print("凹槽暗部保留在底图 %d px" % int(keep_dark.sum()))
    print("外缘 gap 并入底图清空区 %d px / 内缘重叠保留 %d px"
          % (int(outer.sum()), int(gap.sum() - outer.sum())))

    body = a.copy()
    body[body_zone, 3] = 0
    tails = a.copy()
    tails[~part_zone, 3] = 0

    # 剪掉轮廓外突出来的碎刺（多半是袖子/包/裙子的描边被顺手吸进来的），
    # 剪掉的像素本来属于隔壁部件，要还回底图，不能两层都不要。
    # 注意顺序：必须放在 despeckle 之后，否则还回去的小碎片会被当成脏点再清一次。
    print("despeckle:", despeckle(body), "px 清掉")
    tal = tails[:, :, 3] > 24
    pruned = prune_spurs(tal)
    removed = tal & ~pruned
    if removed.any():
        tails[removed, 3] = 0
        body[removed] = a[removed]
        print("轮廓碎刺剪除 %d px（已还给底图）" % int(removed.sum()))

    # 兜底：任何「原图不透明、两层都没要」的像素一律回填底图，
    # 保证合成后不存在任何透明缺口（宁可与马尾重叠，也不能漏）。
    miss0 = (a[:, :, 3] > 0) & (body[:, :, 3] == 0) & (tails[:, :, 3] == 0)
    if miss0.any():
        body[miss0] = a[miss0]
        print("兜底回填底图 %d px" % int(miss0.sum()))
    Image.fromarray(body).save(OUT_BODY)
    Image.fromarray(tails).save(OUT_TAILS)

    # ---- 自检：合成后是否还有原图不透明、两层都缺的像素 ----
    ba = np.array(Image.open(OUT_BODY))[:, :, 3].astype(np.float32)
    ta = np.array(Image.open(OUT_TAILS))[:, :, 3].astype(np.float32)
    sa = a[:, :, 3].astype(np.float32)
    comp = 1 - (1 - ba / 255.0) * (1 - ta / 255.0)
    miss = (sa > 200) & (comp < 0.55)
    print("合成自检：原图不透明但合成缺失 %d px" % int(miss.sum()))
    if miss.any():
        yy, xx = np.nonzero(miss)
        print("   剩余缺失 bbox x %d..%d y %d..%d" % (xx.min(), xx.max(), yy.min(), yy.max()))
    print("body  -> %s  不透明 %d px" % (OUT_BODY, int((ba > 0).sum())))
    print("tails -> %s  不透明 %d px" % (OUT_TAILS, int((ta > 0).sum())))


if __name__ == "__main__":
    main()
