"""
Geometry helpers for roof polygons → areas and totals (pixel space).
Wire `sqft_per_px_sq` from your camera GSD / map scale for real-world reports.
"""

from __future__ import annotations

from typing import Any


def flatten_contour_to_xy(poly: list) -> list[list[float]]:
    """Normalize OpenCV [[[x,y]], ...] or [[x,y], ...] to [[x,y], ...]."""
    out: list[list[float]] = []
    for pt in poly:
        if not isinstance(pt, (list, tuple)):
            continue
        if (
            len(pt) == 1
            and isinstance(pt[0], (list, tuple))
            and len(pt[0]) >= 2
        ):
            out.append([float(pt[0][0]), float(pt[0][1])])
        elif len(pt) >= 2 and isinstance(pt[0], (int, float)):
            out.append([float(pt[0]), float(pt[1])])
    return out


def polygon_area_px(contour: list[list[float]]) -> float:
    """Shoelace area for a closed polygon [[x,y], ...] in pixel coordinates."""
    if len(contour) < 3:
        return 0.0
    pts = [(float(p[0]), float(p[1])) for p in contour]
    if pts[0] != pts[-1]:
        pts = pts + [pts[0]]
    s = 0.0
    for i in range(len(pts) - 1):
        s += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
    return abs(s) / 2.0


def total_area_px_from_polygons(
    polygons: list[list[list[float]]],
) -> tuple[float, list[float]]:
    """
    Sum areas for each polygon ring (one entry per approxPolyDP contour).

    Returns:
      (total_area_px, per_polygon_areas_px)
    """
    areas: list[float] = []
    for poly in polygons:
        flat = flatten_contour_to_xy(poly)
        areas.append(polygon_area_px(flat))
    return (sum(areas), areas)


def pixels_sq_to_sqft(
    area_px: float,
    scale_sqft_per_px_sq: float,
) -> float:
    """Convert pixel² → ft² given (feet² per pixel²), e.g. from GSD."""
    return max(0.0, area_px * scale_sqft_per_px_sq)


def roof_measurement_summary(
    polygons: list[list[list[float]]],
    *,
    sqft_per_px_sq: float | None = None,
) -> dict[str, Any]:
    """
    Build a dict you can pass to a report / API (final total when scale is known).

    sqft_per_px_sq: ground sample distance squared in ft²/px² (calibrate per drone/satellite).
    """
    total_px, per_px = total_area_px_from_polygons(polygons)
    out: dict[str, Any] = {
        "polygon_count": len(polygons),
        "total_area_px": total_px,
        "per_polygon_area_px": per_px,
    }
    if sqft_per_px_sq is not None and sqft_per_px_sq > 0:
        out["total_area_sqft"] = pixels_sq_to_sqft(total_px, sqft_per_px_sq)
        out["per_polygon_area_sqft"] = [
            pixels_sq_to_sqft(a, sqft_per_px_sq) for a in per_px
        ]
    return out
