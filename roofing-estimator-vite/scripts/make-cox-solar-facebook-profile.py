#!/usr/bin/env python3
"""Square Cox Solar Solutions lockup sized for Facebook's circular profile crop."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[1]
SRC = REPO / "public" / "cox-solar-solutions-logo.png"
OUT = REPO / "public" / "cox-solar-solutions-facebook-profile.png"

# Facebook displays profile photos as a circle. 1080 is sharp on phone and desktop.
SIZE = 1080
# Keep the full lockup inside the inscribed circle with room for Facebook's crop.
CIRCLE_FILL = 0.78


def main() -> None:
    logo = Image.open(SRC).convert("RGBA")
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)

    canvas = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 255))
    max_w = int(SIZE * CIRCLE_FILL)
    lw, lh = logo.size
    scale = min(max_w / lw, max_w / lh)
    # Fit the bounding box inside the circle: half-diagonal <= radius * fill.
    radius = SIZE / 2 * 0.90
    half_w, half_h = lw * scale / 2, lh * scale / 2
    if (half_w**2 + half_h**2) ** 0.5 > radius:
        scale *= radius / ((half_w**2 + half_h**2) ** 0.5)
    nw, nh = max(1, int(lw * scale)), max(1, int(lh * scale))
    fitted = logo.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (SIZE - nw) // 2
    y = (SIZE - nh) // 2
    canvas.alpha_composite(fitted, (x, y))
    canvas.convert("RGB").save(OUT, "PNG", optimize=True)
    print("wrote", OUT, canvas.size, OUT.stat().st_size)


if __name__ == "__main__":
    main()
