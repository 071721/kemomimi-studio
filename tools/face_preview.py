# -*- coding: utf-8 -*-
"""把五官坐标画到立绘上，检查位置是否合适"""
import sys

from PIL import Image, ImageDraw

BASE = "assets/chr/"


def preview(name, face, out):
    im = Image.open(BASE + name).convert("RGBA")
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    cx, cy, rx, ry = face
    w = rx * 0.2
    h = ry * 0.46
    for s in (-1, 1):
        x = cx + s * rx * 0.4
        d.ellipse([x - w, cy - ry * 0.03 - h, x + w, cy - ry * 0.03 + h], fill=(70, 60, 90, 235))
        d.ellipse([x - w * 0.5, cy - h * 0.7, x - w * 0.05, cy - h * 0.2], fill=(255, 255, 255, 220))
    my = cy + ry * 0.42
    mw = rx * 0.3
    mh = ry * 0.24
    d.arc([cx - mw, my - mh, cx + mw, my + mh], 20, 160, fill=(190, 100, 120, 235), width=6)
    # 脸椭圆参考线
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=(255, 0, 120, 120), width=3)
    out_im = Image.alpha_composite(im, ov)
    out_im.save(out)
    print("saved", out, im.size)


if __name__ == "__main__":
    preview("char-miku.png", (615, 470, 150, 130), "assets/q2/_prev_miku.png")
