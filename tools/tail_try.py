# -*- coding: utf-8 -*-
"""尾巴位置试排：把候选参数渲染成对比图，方便挑一个自然的位置"""
import math
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHR = os.path.join(ROOT, "assets", "chr")
OUT = os.path.join(ROOT, "tools", "preview")


def part_layer(img, w, rot, flip, af):
    h = round(w * img.height / img.width)
    im = img.resize((w, h), Image.LANCZOS)
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    a = math.radians(rot)
    diag = int(math.hypot(w, h)) + 8
    canvas = Image.new("RGBA", (diag, diag), (0, 0, 0, 0))
    px = diag / 2 - af[0] * w
    py = diag / 2 - af[1] * h
    canvas.alpha_composite(im, (round(px), round(py)))
    rot_im = canvas.rotate(-rot, resample=Image.BICUBIC, center=(diag / 2, diag / 2))
    return rot_im, (diag / 2, diag / 2)


def compose(body, parts, path):
    bw, bh = body.size
    scene = Image.new("RGBA", body.size, (34, 27, 51, 255))
    for p in parts:  # 先画后景
        if p["z"] < 0:
            im, (ax, ay) = part_layer(Image.open(os.path.join(CHR, p["src"])).convert("RGBA"),
                                      p["w"], p["rot"], p["flip"], p["af"])
            scene.alpha_composite(im, (round(p["ax"] - ax), round(p["ay"] - ay)))
    scene.alpha_composite(body, (0, 0))
    for p in parts:
        if p["z"] >= 0:
            im, (ax, ay) = part_layer(Image.open(os.path.join(CHR, p["src"])).convert("RGBA"),
                                      p["w"], p["rot"], p["flip"], p["af"])
            scene.alpha_composite(im, (round(p["ax"] - ax), round(p["ay"] - ay)))
    scene.convert("RGB").save(path)


CANDS = {
    "a": [
        dict(src="tail.png", ax=690, ay=760, w=380, rot=-18, flip=True, af=[0.18, 0.7], z=-1),
        dict(src="tail.png", ax=735, ay=800, w=400, rot=-12, flip=True, af=[0.18, 0.7], z=-1),
        dict(src="tail.png", ax=660, ay=790, w=340, rot=-24, flip=True, af=[0.18, 0.7], z=1),
    ],
    "b": [
        dict(src="tail-b.png", ax=520, ay=700, w=280, rot=-18, flip=True, af=[0.18, 0.7], z=-1),
        dict(src="tail-b.png", ax=555, ay=730, w=300, rot=-12, flip=True, af=[0.18, 0.7], z=-1),
        dict(src="tail-b.png", ax=500, ay=720, w=260, rot=-24, flip=True, af=[0.18, 0.7], z=1),
    ],
}

for key, cands in CANDS.items():
    body = Image.open(os.path.join(CHR, "char-%s.png" % key)).convert("RGBA")
    for i, c in enumerate(cands):
        compose(body.copy(), [c], os.path.join(OUT, "tail-%s-%d.png" % (key, i)))
    print("done", key)
