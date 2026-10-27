# -*- coding: utf-8 -*-
"""把角色素材内嵌成 data URI，生成 src/assets.js

目的：用户双击 index.html（file:// 协议）时，Chromium 会把 canvas 标记为
tainted，任何 toDataURL 都会抛 SecurityError。头像裁切正好用到 toDataURL，
一抛错整个初始化就断了，表现为「舞台空白、看不到角色」。
内嵌成 data URI 后图片与页面同源，canvas 不再被污染，导出 PNG 也能用。
"""
import base64
import io
import os
import pathlib

from PIL import Image

QUALITY = 95

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHR = ROOT / "assets" / "chr"
OUT = ROOT / "src" / "assets.js"

FILES = ["char-a.png", "char-miku-body.png", "miku-tails.png"]


def main():
    entries = []
    total = 0
    for name in FILES:
        path = CHR / name
        if not path.exists():
            print("skip missing", name)
            continue
        raw = path.read_bytes()
        total += len(raw)
        # PNG 太大（单张 1MB），转 WebP 后画质几乎无损、体积只剩 1/10
        buf = io.BytesIO()
        Image.open(path).convert("RGBA").save(buf, "WEBP", quality=QUALITY, method=6)
        data = buf.getvalue()
        b64 = base64.b64encode(data).decode("ascii")
        entries.append('  "assets/chr/%s": "data:image/webp;base64,%s"' % (name, b64))
        print("%-12s png %6.1f KB -> webp %5.1f KB" % (name, len(raw) / 1024, len(data) / 1024))

    js = (
        "/* 自动生成，勿手改。重新生成：python tools/embed_assets.py */\n"
        "window.ASSET_DATA = {\n" + ",\n".join(entries) + "\n};\n"
    )
    OUT.write_text(js, encoding="utf-8")
    print("total png %.1f KB, assets.js %.1f KB" % (total / 1024, len(js) / 1024))


if __name__ == "__main__":
    main()
