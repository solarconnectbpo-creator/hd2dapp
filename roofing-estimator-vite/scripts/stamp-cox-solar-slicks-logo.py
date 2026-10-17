#!/usr/bin/env python3
"""Stamp the Cox Solar Solutions logo over the Cox Roofing mark on the official slicks PDF."""
from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path("/tmp/cox-slicks")
PAGES_DIR = ROOT / "pages-150"
OUT_DIR = ROOT / "swapped"
REPO = Path(__file__).resolve().parents[1]
SOLAR_LOGO = REPO / "public" / "cox-solar-solutions-logo.png"
SRC_PDF = ROOT / "Cox-Visual-Marketing-Slicks.pdf"
OUT_PDF = REPO / "public" / "cox-solar-visual-marketing-slicks.pdf"

# Letter @ 150 dpi
W, H = 1275, 1650

# (x, y, w, h, dark, feather)
# cover box hides the old lockup; logo is fitted inside the same box.
PLACEMENTS: dict[int, tuple[int, int, int, int, bool, bool]] = {
    1: (95, 40, 420, 230, True, False),
    2: (48, 28, 340, 175, False, False),
    3: (48, 28, 340, 175, False, False),
    4: (48, 28, 340, 175, False, False),
    5: (48, 28, 340, 175, False, False),
    6: (48, 28, 340, 175, False, False),
    # Tight floor lockup — pixel-erase plus a small floor patch, never the sofa.
    7: (100, 1460, 214, 112, False, True),
    8: (48, 28, 340, 175, False, False),
    9: (48, 28, 360, 195, False, False),
    10: (48, 28, 360, 195, False, False),
    11: (55, 50, 520, 250, True, False),
}


def navy_to_white(im: Image.Image) -> Image.Image:
    """Make navy wordmark readable on dark pages."""
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            if b > 70 and r < 80 and b > r + 20:
                px[x, y] = (255, 255, 255, a)
    return im


def fit_logo(logo: Image.Image, box_w: int, box_h: int) -> Image.Image:
    lw, lh = logo.size
    scale = min(box_w / lw, box_h / lh)
    nw, nh = max(1, int(lw * scale)), max(1, int(lh * scale))
    return logo.resize((nw, nh), Image.Resampling.LANCZOS)


def sample_bg(page: Image.Image, box: tuple[int, int, int, int]) -> tuple[int, int, int]:
    x, y, w, h = box
    pts = [
        (x - 12, y + h // 2),
        (x + w + 12, y + h // 2),
        (x + w // 2, y + h + 10),
        (x + 4, y + h - 4),
        (x + w - 4, y + h - 4),
    ]
    colors: list[tuple[int, int, int]] = []
    for px, py in pts:
        cx = min(W - 1, max(0, px))
        cy = min(H - 1, max(0, py))
        colors.append(page.getpixel((cx, cy))[:3])
    colors.sort()
    return colors[len(colors) // 2]


def erase_logo_pixels(page: Image.Image, box: tuple[int, int, int, int], bg: tuple[int, int, int]) -> None:
    """Replace red / navy / dark-text lockup pixels with the local background."""
    x, y, w, h = box
    pad = 10
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(page.size[0], x + w + pad), min(page.size[1], y + h + pad)
    crop = page.crop((x0, y0, x1, y1)).convert("RGBA")
    px = crop.load()
    cw, ch = crop.size
    hits: list[tuple[int, int]] = []
    for yy in range(ch):
        for xx in range(cw):
            r, g, b, a = px[xx, yy]
            red = r > 130 and r > g + 25 and r > b + 20
            navy = b > 70 and b > r + 10 and r < 120 and g < 140
            ink = r < 110 and g < 110 and b < 110
            if red or navy or ink:
                hits.append((xx, yy))
    grow = 6
    mark = set(hits)
    extra: list[tuple[int, int]] = []
    for xx, yy in hits:
        for dx in range(-grow, grow + 1):
            for dy in range(-grow, grow + 1):
                nx, ny = xx + dx, yy + dy
                if 0 <= nx < cw and 0 <= ny < ch and (nx, ny) not in mark:
                    extra.append((nx, ny))
                    mark.add((nx, ny))
    for xx, yy in hits + extra:
        px[xx, yy] = bg + (255,)
    page.paste(crop, (x0, y0))


def cover_old_lockup(
    page: Image.Image,
    box: tuple[int, int, int, int],
    bg: tuple[int, int, int],
    feather: bool,
) -> None:
    x, y, w, h = box
    if feather:
        erase_logo_pixels(page, box, bg)
        return
    draw = ImageDraw.Draw(page)
    pad = 6
    draw.rectangle([x - pad, y - pad, x + w + pad, y + h + pad], fill=bg + (255,))


def stamp(
    page: Image.Image,
    logo: Image.Image,
    box: tuple[int, int, int, int],
    dark: bool,
    feather: bool,
) -> Image.Image:
    x, y, w, h = box
    page = page.convert("RGBA")
    bg = sample_bg(page, box)
    cover_old_lockup(page, box, bg, feather)
    fitted = fit_logo(logo, w, h)
    px = x + (w - fitted.size[0]) // 2
    py = y + (h - fitted.size[1]) // 2
    page.alpha_composite(fitted, (px, py))
    return page.convert("RGB")


def main() -> None:
    PAGES_DIR.mkdir(exist_ok=True)
    OUT_DIR.mkdir(exist_ok=True)
    if len(list(PAGES_DIR.glob("page-*.png"))) < 11:
        subprocess.check_call(["pdftoppm", "-png", "-r", "150", str(SRC_PDF), str(PAGES_DIR / "page")])

    solar = Image.open(SOLAR_LOGO).convert("RGBA")
    solar = solar.crop(solar.getbbox())
    solar_dark = navy_to_white(solar.copy())

    out_paths: list[Path] = []
    for n in range(1, 12):
        x, y, w, h, dark, feather = PLACEMENTS[n]
        src = next(PAGES_DIR.glob(f"page*{n:02d}.png"))
        page = Image.open(src).convert("RGB")
        if page.size != (W, H):
            page = page.resize((W, H), Image.Resampling.LANCZOS)
        stamped = stamp(page, solar_dark if dark else solar, (x, y, w, h), dark, feather)
        dest = OUT_DIR / f"page-{n:02d}.jpg"
        stamped.save(dest, "JPEG", quality=92, optimize=True)
        out_paths.append(dest)
        print("stamped", dest.name, dest.stat().st_size)

    import img2pdf

    OUT_PDF.write_bytes(img2pdf.convert([str(p) for p in out_paths]))
    print("wrote", OUT_PDF, OUT_PDF.stat().st_size)


if __name__ == "__main__":
    main()
