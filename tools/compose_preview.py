"""把耳朵/尾巴按锚点+旋转合成到立绘上，用于校准默认参数。"""
import os, math, json, sys
from PIL import Image, ImageDraw

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHR = os.path.join(BASE, "assets", "chr")

def load(n):
    return Image.open(os.path.join(CHR, n)).convert("RGBA")

def place(canvas, part, ax, ay, W, rot, flip, af):
    im = part.transpose(Image.FLIP_LEFT_RIGHT) if flip else part
    H = round(im.height * W / im.width)
    im = im.resize((W, H), Image.LANCZOS)
    axp, ayp = af[0] * W, af[1] * H
    diag = 2 * int(math.hypot(W, H)) + 8
    big = Image.new("RGBA", (diag, diag), (0, 0, 0, 0))
    big.alpha_composite(im, (round(diag / 2 - axp), round(diag / 2 - ayp)))
    rot_img = big.rotate(rot, resample=Image.BICUBIC, center=(diag / 2, diag / 2))
    canvas.alpha_composite(rot_img, (round(ax - diag / 2), round(ay - diag / 2)))

CFG = {
    "char1": {
        "body": "char1.png",
        "bg": (255, 255, 255, 255),
        "parts": [
            dict(name="tail.png", ax=575, ay=670, W=430, rot=-48, flip=True, af=(0.20, 0.62), behind=True),
            dict(name="ear-l.png", ax=398, ay=170, W=118, rot=-16, flip=False, af=(0.88, 0.92)),
            dict(name="ear-r.png", ax=502, ay=170, W=118, rot=16, flip=True, af=(0.88, 0.92)),
        ],
    },
    "char2": {
        "body": "char2.png",
        "bg": (245, 245, 250, 255),
        "parts": [
            dict(name="tail.png", ax=610, ay=770, W=400, rot=-56, flip=True, af=(0.20, 0.62), behind=True),
            dict(name="ear-l.png", ax=380, ay=200, W=105, rot=-20, flip=False, af=(0.88, 0.92)),
            dict(name="ear-r.png", ax=515, ay=200, W=105, rot=20, flip=True, af=(0.88, 0.92)),
        ],
    },
}

for key, cfg in CFG.items():
    body = load(cfg["body"])
    canvas = Image.new("RGBA", body.size, (0, 0, 0, 0))
    back = [p for p in cfg["parts"] if p.get("behind")]
    front = [p for p in cfg["parts"] if not p.get("behind")]
    for p in back:
        place(canvas, load(p["name"]), p["ax"], p["ay"], p["W"], p["rot"], p["flip"], p["af"])
    canvas.alpha_composite(body)
    for p in front:
        place(canvas, load(p["name"]), p["ax"], p["ay"], p["W"], p["rot"], p["flip"], p["af"])
    out = Image.new("RGBA", canvas.size, cfg["bg"])
    out.alpha_composite(canvas)
    path = os.path.join(BASE, f"preview-{key}.png")
    out.save(path)
    print(path, out.size)
