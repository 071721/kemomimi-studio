# -*- coding: utf-8 -*-
"""初音 Q 版素材处理：抠白底 -> 裁边 -> 估算脸部椭圆

要点：原图里「头发 / 手臂 / 身体」围起来的白色区块与画面边缘不连通，
只从边缘泛洪会漏掉，会在成品里留下白色块。这里改成
「找出所有接近纯白的连通域，凡是平均亮度接近 255 的一律清掉」，
衬衫是米白（约 248,248,248），不会被误清。
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, "assets", "q2",
                   "把参考角色改成_初音未来_风格的Q版角色_保持完全相同的画风_2026-10-25T10-47-53.png")
OUT = os.path.join(BASE, "assets", "chr", "char-miku.png")


def white_regions(a):
    """返回所有「接近纯白」的连通域 mask 列表（4 邻接）。"""
    h, w, _ = a.shape
    mn = a.min(axis=2)
    mx = a.max(axis=2)
    cand = (mn >= 232) & ((mx - mn) <= 14)
    seen = np.zeros((h, w), dtype=bool)
    out = []
    ys, xs = np.nonzero(cand)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]:
            continue
        dq = deque([(y0, x0)])
        seen[y0, x0] = True
        pix = []
        while dq:
            y, x = dq.popleft()
            pix.append((y, x))
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    dq.append((ny, nx))
        m = np.zeros((h, w), dtype=bool)
        py = np.array([p[0] for p in pix])
        px = np.array([p[1] for p in pix])
        m[py, px] = True
        out.append((m, len(pix)))
    return out


def cut_white(im, min_mean=252.4, min_area=200):
    rgb = np.array(im.convert("RGB")).astype(np.float32)
    a = rgb.astype(np.int16)
    h, w, _ = a.shape
    rgba = np.array(im.convert("RGBA"))

    killed = np.zeros((h, w), dtype=bool)
    stats = []
    for m, area in white_regions(a):
        if area < min_area:
            continue
        mean = rgb[m].mean(axis=0).mean()
        if mean >= min_mean:  # 纯白背景（含被围住的白色块）
            killed |= m
            stats.append((area, round(float(mean), 1)))
    rgba[killed, 3] = 0
    # 清完再把边缘 1px 的白色毛边削掉一点，避免残留白圈
    soft = (a.min(axis=2) >= 246) & (~killed)
    near = np.zeros((h, w), dtype=bool)
    near[1:, :] |= killed[:-1, :]
    near[:-1, :] |= killed[1:, :]
    near[:, 1:] |= killed[:, :-1]
    near[:, :-1] |= killed[:, 1:]
    rgba[near & soft, 3] = 0

    print("cleared regions:", sorted(stats, reverse=True)[:8], "total", len(stats))
    return Image.fromarray(rgba)


def main():
    im = Image.open(SRC)
    im = cut_white(im)
    box = im.getbbox()
    pad = 6
    box = (max(0, box[0] - pad), max(0, box[1] - pad),
           min(im.width, box[2] + pad), min(im.height, box[3] + pad))
    print("old size", im.size, "crop box", box)
    im = im.crop(box)
    im.save(OUT)
    print("saved", OUT, im.size)

    # 估脸部：肤色像素（米白偏粉），排除青绿色头发
    a = np.array(im.convert("RGB")).astype(np.int16)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    skin = (r > 225) & (g > 200) & (g < 248) & (b > 195) & (b < 245) & (r >= g) & (r - b > 6) & (g - b > -6)
    skin[int(im.height * 0.55):, :] = False
    ys, xs = np.nonzero(skin)
    if len(xs) == 0:
        print("skin not found")
        return
    x0, x1 = np.percentile(xs, 2), np.percentile(xs, 98)
    y0, y1 = np.percentile(ys, 2), np.percentile(ys, 98)
    print("skin bbox", round(x0), round(y0), round(x1), round(y1))
    print("face cx %.0f cy %.0f rx %.0f ry %.0f" % ((x0 + x1) / 2, (y0 + y1) / 2,
                                                    (x1 - x0) / 2, (y1 - y0) / 2))

    # 顺便量一下残留白色：清完之后不该再有接近纯白的大块
    aa = np.array(im.convert("RGBA")).astype(np.int16)
    al = aa[:, :, 3]
    whiteish = (al > 200) & (aa[:, :, 0] > 252) & (aa[:, :, 1] > 252) & (aa[:, :, 2] > 252)
    print("residual pure white px", int(whiteish.sum()))


if __name__ == "__main__":
    main()
