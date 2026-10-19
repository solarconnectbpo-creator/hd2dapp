#!/usr/bin/env python3
"""Stamp the Cox Solar Solutions logo over the Cox Roofing mark on the official slicks PDF."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/tmp/cox-slicks")
PAGES_DIR = ROOT / "pages-150"
OUT_DIR = ROOT / "swapped"
REPO = Path(__file__).resolve().parents[1]
SOLAR_LOGO = REPO / "public" / "cox-solar-solutions-logo.png"
SRC_PDF = ROOT / "Cox-Visual-Marketing-Slicks.pdf"
OUT_PDF = REPO / "public" / "cox-solar-visual-marketing-slicks.pdf"

W, H = 1275, 1650

# (x, y, w, h, dark, cover_mode)
# cover_mode: "rect" | "photo" | "pixels"
PLACEMENTS: dict[int, tuple[int, int, int, int, bool, str]] = {
    1: (95, 38, 430, 205, True, "photo"),
    2: (48, 28, 340, 175, False, "rect"),
    3: (48, 28, 340, 175, False, "rect"),
    4: (48, 28, 340, 175, False, "rect"),
    5: (48, 28, 340, 175, False, "rect"),
    6: (48, 28, 340, 175, False, "rect"),
    7: (100, 1460, 214, 112, False, "pixels"),
    8: (48, 28, 340, 175, False, "rect"),
    9: (48, 28, 360, 195, False, "rect"),
    10: (48, 28, 360, 195, False, "rect"),
    11: (70, 48, 480, 230, True, "rect"),
}

FONT_REG = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"


def navy_to_white(im: Image.Image) -> Image.Image:
    """Turn COX / house-stroke navy white on dark pages. Keep brighter panel blue."""
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            if b > 70 and r < 50 and g < 82 and b > r + 20:
                px[x, y] = (255, 255, 255, a)
    return im


def punch_cox_o_counter(im: Image.Image) -> Image.Image:
    """Cut the white slash out of the navy O so the hole still reads after COX goes white."""
    px = im.load()
    w, h = im.size
    hits: list[tuple[int, int]] = []
    for y in range(int(h * 0.58), h):
        for x in range(int(w * 0.34)):
            r, g, b, a = px[x, y]
            if a < 180 or r < 200 or g < 200 or b < 200:
                continue
            near_navy = False
            near_red = False
            for dy in range(-3, 4):
                for dx in range(-3, 4):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < w and 0 <= ny < h):
                        continue
                    rr, gg, bb, aa = px[nx, ny]
                    if aa > 180 and bb > 90 and rr < 50 and gg < 90:
                        near_navy = True
                    if aa > 180 and rr > 150 and gg < 90 and bb < 90:
                        near_red = True
            if near_navy and not near_red:
                hits.append((x, y))
    grow = 2
    mark = set(hits)
    for x, y in hits:
        for dx in range(-grow, grow + 1):
            for dy in range(-grow, grow + 1):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h:
                    mark.add((nx, ny))
    for x, y in mark:
        r, g, b, a = px[x, y]
        if a > 8 and r > 160 and g > 160 and b > 160:
            px[x, y] = (0, 0, 0, 0)
    return im


def fit_logo(logo: Image.Image, box_w: int, box_h: int) -> Image.Image:
    lw, lh = logo.size
    scale = min(box_w / lw, box_h / lh)
    nw, nh = max(1, int(lw * scale)), max(1, int(lh * scale))
    return logo.resize((nw, nh), Image.Resampling.LANCZOS)


def sample_bg(page: Image.Image, box: tuple[int, int, int, int]) -> tuple[int, int, int]:
    x, y, w, h = box
    pts = [
        (x - 16, y + h // 2),
        (x + w + 16, y + h // 2),
        (x + w // 2, y + h + 14),
        (x + 8, y + h + 8),
        (x + w - 8, y + h + 8),
    ]
    colors: list[tuple[int, int, int]] = []
    for px, py in pts:
        cx = min(W - 1, max(0, px))
        cy = min(H - 1, max(0, py))
        colors.append(page.getpixel((cx, cy))[:3])
    colors.sort()
    return colors[len(colors) // 2]


def erase_logo_pixels(page: Image.Image, box: tuple[int, int, int, int], bg: tuple[int, int, int]) -> None:
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


def inpaint_photo_lockup(page: Image.Image) -> Image.Image:
    """Reconstruct sky under the old roofing lockup so no plate is left behind."""
    import cv2
    import numpy as np

    arr = np.array(page.convert("RGB"))
    y0, y1, x0, x1 = 16, 275, 50, 590
    region = arr[y0:y1, x0:x1]
    r = region[:, :, 0].astype(int)
    g = region[:, :, 1].astype(int)
    b = region[:, :, 2].astype(int)
    white = (r > 115) & (g > 115) & (b > 115)
    red = (r > 100) & (r > g + 20) & (r > b + 12)
    bright = (r + g + b) > 135
    blue = (b > 80) & (b > r + 8) & ((r + g + b) > 120)
    mask_r = (white | red | bright | blue).astype(np.uint8) * 255
    mask_r = cv2.dilate(mask_r, np.ones((11, 11), np.uint8), iterations=2)
    full = np.zeros(arr.shape[:2], np.uint8)
    full[y0:y1, x0:x1] = mask_r
    out = cv2.inpaint(arr, full, 10, cv2.INPAINT_TELEA)
    return Image.fromarray(out).convert("RGBA")


def cover_old_lockup(
    page: Image.Image,
    box: tuple[int, int, int, int],
    bg: tuple[int, int, int],
    mode: str,
) -> None:
    x, y, w, h = box
    if mode == "photo":
        painted = inpaint_photo_lockup(page)
        page.paste(painted, (0, 0))
        return
    if mode == "pixels":
        erase_logo_pixels(page, box, bg)
        return
    draw = ImageDraw.Draw(page)
    pad = 6
    draw.rectangle([x - pad, y - pad, x + w + pad, y + h + pad], fill=bg + (255,))


def stamp(
    page: Image.Image,
    logo: Image.Image,
    box: tuple[int, int, int, int],
    mode: str,
) -> Image.Image:
    x, y, w, h = box
    page = page.convert("RGBA")
    bg = sample_bg(page, box)
    cover_old_lockup(page, box, bg, mode)
    fitted = fit_logo(logo, w, h)
    px = x + (w - fitted.size[0]) // 2
    py = y + (h - fitted.size[1]) // 2
    page.alpha_composite(fitted, (px, py))
    return page.convert("RGB")


def paint_text(
    page: Image.Image,
    box: tuple[int, int, int, int],
    text: str,
    *,
    fill: tuple[int, int, int],
    bg: tuple[int, int, int],
    font_path: str,
    size: int,
    align: str = "left",
) -> None:
    x, y, w, h = box
    draw = ImageDraw.Draw(page)
    draw.rectangle([x, y, x + w, y + h], fill=bg)
    font = ImageFont.truetype(font_path, size)
    tw, th = draw.textbbox((0, 0), text, font=font)[2:]
    if align == "center":
        tx = x + max(0, (w - tw) // 2)
    else:
        tx = x + 2
    ty = y + max(0, (h - th) // 2)
    draw.text((tx, ty), text, font=font, fill=fill)


def patch_page11_contact(page: Image.Image) -> Image.Image:
    def local_bg(x: int, y: int) -> tuple[int, int, int]:
        return page.getpixel((min(W - 1, max(0, x)), min(H - 1, max(0, y))))[:3]

    paint_text(
        page,
        (88, 1018, 360, 32),
        "seth@coxroof.com",
        fill=(255, 255, 255),
        bg=local_bg(80, 1000),
        font_path=FONT_REG,
        size=22,
    )
    paint_text(
        page,
        (668, 1018, 420, 32),
        "coxsolarsolutions.com",
        fill=(255, 255, 255),
        bg=local_bg(900, 1000),
        font_path=FONT_REG,
        size=22,
    )
    paint_text(
        page,
        (360, 1458, 560, 32),
        "coxsolarsolutions.com",
        fill=(255, 255, 255),
        bg=local_bg(200, 1470),
        font_path=FONT_BOLD,
        size=22,
        align="center",
    )
    return page


def render_source_pages() -> None:
    PAGES_DIR.mkdir(exist_ok=True)
    if len(list(PAGES_DIR.glob("page-*.png"))) >= 11:
        return
    import pymupdf

    doc = pymupdf.open(SRC_PDF)
    mat = pymupdf.Matrix(150 / 72, 150 / 72)
    for i, page in enumerate(doc, 1):
        pix = page.get_pixmap(matrix=mat, alpha=False)
        pix.save(str(PAGES_DIR / f"page-{i:02d}.png"))


def main() -> None:
    render_source_pages()
    OUT_DIR.mkdir(exist_ok=True)

    solar = Image.open(SOLAR_LOGO).convert("RGBA")
    solar = solar.crop(solar.getbbox())
    solar_dark = navy_to_white(punch_cox_o_counter(solar.copy()))

    out_paths: list[Path] = []
    for n in range(1, 12):
        x, y, w, h, dark, mode = PLACEMENTS[n]
        src = next(PAGES_DIR.glob(f"page*{n:02d}.png"))
        page = Image.open(src).convert("RGB")
        if page.size != (W, H):
            page = page.resize((W, H), Image.Resampling.LANCZOS)
        stamped = stamp(page, solar_dark if dark else solar, (x, y, w, h), mode)
        if n == 11:
            stamped = patch_page11_contact(stamped)
        dest = OUT_DIR / f"page-{n:02d}.jpg"
        stamped.save(dest, "JPEG", quality=92, optimize=True)
        out_paths.append(dest)
        print("stamped", dest.name, dest.stat().st_size)

    import img2pdf

    OUT_PDF.write_bytes(img2pdf.convert([str(p) for p in out_paths]))
    print("wrote", OUT_PDF, OUT_PDF.stat().st_size)


if __name__ == "__main__":
    main()
