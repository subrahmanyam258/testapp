"""Generates Android launcher icons (adaptive foreground + legacy) into android-res/. Run once; output is committed."""
from PIL import Image, ImageDraw
import os

TEAL = (11, 110, 110, 255)

def glyph(size, bg):
    """Hum Safar mark: nested arches + road dots. bg=None -> transparent (adaptive foreground)."""
    S = size * 4
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    if bg:
        m = Image.new('L', (S, S), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=255)
        img.paste(Image.new('RGBA', (S, S), bg), (0, 0), m)
    d = ImageDraw.Draw(img)
    k = 0.62 if not bg else 0.86            # keep inside the adaptive-icon safe zone
    cx, base = S / 2, S * (0.5 + 0.30 * k)
    th = max(2, int(S * 0.075 * k))
    def arch(w, top, color):
        r = w / 2
        d.arc([cx - r, top, cx + r, top + 2 * r], 180, 360, fill=color, width=th)
        for x in (cx - r, cx + r):
            d.line([x, top + r, x, base], fill=color, width=th)
            for y in (top + r, base): d.ellipse([x - th / 2, y - th / 2, x + th / 2, y + th / 2], fill=color)
    arch(S * 0.56 * k, S * (0.5 - 0.30 * k), (255, 255, 255, 255))
    arch(S * 0.30 * k, S * (0.5 - 0.30 * k) + S * 0.20 * k, (244, 160, 36, 255))
    r = S * 0.035 * k; cy = base - S * 0.22 * k
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 255))
    y = base + S * 0.07 * k; x = cx - S * 0.30 * k
    while x < cx + S * 0.30 * k:
        d.ellipse([x, y, x + th * .55, y + th * .55], fill=(255, 255, 255, 235)); x += th * 1.6
    return img.resize((size, size), Image.LANCZOS)

DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for name, f in DENS.items():
    out = f'android-res/mipmap-{name}'; os.makedirs(out, exist_ok=True)
    glyph(int(108 * f), None).save(f'{out}/ic_launcher_foreground.png')
    legacy = glyph(int(48 * f), TEAL)
    legacy.save(f'{out}/ic_launcher.png')
    # round variant
    S = int(48 * f); rnd = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    mask = Image.new('L', (S * 4, S * 4), 0); ImageDraw.Draw(mask).ellipse([0, 0, S * 4 - 1, S * 4 - 1], fill=255)
    rnd.paste(legacy, (0, 0), mask.resize((S, S), Image.LANCZOS)); rnd.save(f'{out}/ic_launcher_round.png')
print('icons written')
