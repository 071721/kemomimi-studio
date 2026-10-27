# -*- coding: utf-8 -*-
"""粉绿汤圆（char-a）重新抠图

原流程的问题：源图角色轮廓外还有一圈约 15px 的「白色贴纸描边」，
旧脚本只把 alpha 往里收 8px，于是描边留了 7px 挂在身上。
短发发梢、发丝之间这些凹口处描边更宽，看上去就是一坨白。

新流程：
1. 从画面四边泛洪，可通行 = 淡紫背景 或 近白描边（暗色描边天然当围墙）
2. 收 1px，去掉描边与轮廓之间的过渡色
3. alpha 轻微羽化 + 边缘颜色去污染（用内部颜色填边缘，杜绝白边）
4. 按旧裁剪框裁切，保证脸部坐标 / 耳尾锚点都不需要改
"""
import os
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, "assets", "q2", "Ultra_simplified_kawaii_flat_c_2026-10-25T09-44-39.png")
OUT = os.path.join(BASE, "assets", "chr", "char-a.png")

# 旧流程得到的裁剪框（源图坐标），保持不变，避免所有坐标要重算
BOX = (126, 165, 897, 1375)  # 771 x 1210


def flood_outside(rgb, bg_tol=30, white_min=226, white_span=28):
    """从四边泛洪出「外部」：背景色 + 贴着轮廓的白色描边都能通过"""
    h, w, _ = rgb.shape
    a = rgb.astype(np.int16)

    border = np.concatenate([a[0:4].reshape(-1, 3), a[-4:].reshape(-1, 3),
                             a[:, 0:4].reshape(-1, 3), a[:, -4:].reshape(-1, 3)])
    bg = np.median(border, axis=0)

    dist = np.sqrt(((a - bg) ** 2).sum(axis=2))
    mn = a.min(axis=2)
    mx = a.max(axis=2)
    passable = (dist <= bg_tol) | ((mn >= white_min) & ((mx - mn) <= white_span))

    seen = np.zeros((h, w), dtype=bool)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if passable[y, x] and not seen[y, x]:
                seen[y, x] = True
                dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if passable[y, x] and not seen[y, x]:
                seen[y, x] = True
                dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and passable[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                dq.append((ny, nx))
    return ~seen, bg


def fill_edge_color(rgb, alpha, rounds=4):
    """把半透明边缘的 RGB 换成相邻不透明像素的颜色，避免白边/紫边"""
    out = rgb.astype(np.float32).copy()
    known = alpha >= 0.995
    for _ in range(rounds):
        acc = np.zeros_like(out)
        cnt = np.zeros(known.shape, dtype=np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh_rgb = np.roll(out, (dy, dx), axis=(0, 1))
            sh_k = np.roll(known, (dy, dx), axis=(0, 1))
            acc += sh_rgb * sh_k[:, :, None]
            cnt += sh_k
        m = (cnt > 0) & (~known)
        if not m.any():
            break
        out[m] = acc[m] / cnt[m][:, None]
        known = known | m
    return np.clip(out, 0, 255).astype(np.uint8)


def patch_face(arr, cx, cy, rx, ry, feather=14):
    """羽化椭圆盖掉立绘原有的小五官（换成本项目的程序化五官）"""
    h, w, _ = arr.shape
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(feather))

    rgb_slice = arr[cy - ry:cy + ry, cx - rx:cx + rx, :3]
    alpha_slice = arr[cy - ry:cy + ry, cx - rx:cx + rx, 3]
    opaque = rgb_slice[alpha_slice > 200]
    skin = np.median(opaque, axis=0).astype(np.uint8)

    m = np.array(mask).astype(np.float32)[:, :, None] / 255.0
    out = arr.astype(np.float32)
    out[:, :, :3] = out[:, :, :3] * (1 - m) + skin.astype(np.float32) * m
    return np.clip(out, 0, 255).astype(np.uint8)


def main():
    src = Image.open(SRC).convert("RGB")
    rgb = np.array(src)
    inside, bg = flood_outside(rgb)
    print("bg", [int(v) for v in bg], "kept px", int(inside.sum()))

    mask = inside
    # 收 1px：把描边与暗色轮廓之间的过渡像素带走
    mask = np.array(Image.fromarray((mask * 255).astype(np.uint8), "L")
                    .filter(ImageFilter.MinFilter(3))) > 127

    # 羽化 alpha，边缘更顺滑（缩放到 771 宽后看不出锯齿）
    soft = np.array(Image.fromarray((mask * 255).astype(np.uint8), "L")
                    .filter(ImageFilter.GaussianBlur(0.7))).astype(np.float32) / 255.0
    alpha = np.clip(soft, 0, 1)

    rgb_fixed = fill_edge_color(rgb, alpha)
    arr = np.dstack([rgb_fixed, (alpha * 255).round().astype(np.uint8)])

    # 按固定框裁切
    x0, y0, x1, y1 = BOX
    arr = arr[y0:y1, x0:x1].copy()

    # 右下角水印（裁切坐标：底部 80px、右侧 200px）
    arr[arr.shape[0] - 80:, arr.shape[1] - 200:, 3] = 0

    arr = patch_face(arr, 398, 472, 196, 88)
    im = Image.fromarray(arr, "RGBA")
    im.save(OUT)
    print("saved", OUT, im.size)

    # 自检：轮廓附近还有多少近白像素
    a = np.array(im).astype(np.int16)
    al = a[:, :, 3]
    edge = (al > 10) & (al < 250)
    near_white = edge & (a[:, :, :3].min(axis=2) >= 238) & ((a[:, :, :3].max(axis=2) - a[:, :, :3].min(axis=2)) <= 16)
    print("edge px", int(edge.sum()), "bright edge px", int(near_white.sum()))


if __name__ == "__main__":
    main()
