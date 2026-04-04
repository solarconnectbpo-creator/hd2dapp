"""
Infer ridge / hip / valley / eave / rake polylines from a roof mask + footprint polygon.

SAM only produces a mask — it does not label roof line semantics. This module uses
geometry heuristics (PCA-aligned boundary edges, concave notches, medial-axis skeleton)
to emit separate polylines for the estimator UI. Results are approximate; users should
verify on site.
"""

from __future__ import annotations

from collections import deque
from typing import Any

import cv2
import numpy as np

try:
    from skimage.morphology import skeletonize

    _SKIMAGE_OK = True
except ImportError:
    _SKIMAGE_OK = False


def _open_ring(pts: list[list[float]]) -> np.ndarray:
    """N×2 float array without duplicated closing vertex."""
    arr = np.array([[float(p[0]), float(p[1])] for p in pts], dtype=np.float64)
    if len(arr) >= 2 and np.allclose(arr[0], arr[-1]):
        arr = arr[:-1]
    return arr


def _edge_class_major_minor(
    e_unit: np.ndarray,
    major: np.ndarray,
    minor: np.ndarray,
) -> str:
    """Classify a boundary edge direction as eave, rake, or hip (diagonal)."""
    ea = abs(float(np.dot(e_unit, major)))
    eb = abs(float(np.dot(e_unit, minor)))
    if ea >= 0.82 and ea >= eb * 1.15:
        return "eave"
    if eb >= 0.82 and eb >= ea * 1.15:
        return "rake"
    return "hip"


def _longest_skeleton_polyline(mask_bool: np.ndarray) -> list[list[float]] | None:
    """Longest path on morphological skeleton → ridge-like centerline (image x,y)."""
    if not _SKIMAGE_OK:
        return None
    sk = skeletonize(mask_bool)
    if not np.any(sk):
        return None
    ys, xs = np.where(sk)
    if len(xs) < 8:
        return None

    pts = list(zip(ys.tolist(), xs.tolist()))
    idx_at: dict[tuple[int, int], int] = {}
    for i, (yy, xx) in enumerate(pts):
        idx_at[(yy, xx)] = i
    nidx = len(pts)
    adj: list[list[int]] = [[] for _ in range(nidx)]
    neigh = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    for i, (yy, xx) in enumerate(pts):
        for dy, dx in neigh:
            k = (yy + dy, xx + dx)
            if k in idx_at:
                j = idx_at[k]
                if j > i:
                    adj[i].append(j)
                    adj[j].append(i)

    def bfs_farthest(start: int) -> tuple[int, list[int]]:
        """Return (far_index, parent_links) for unweighted BFS tree."""
        dist = [-1] * nidx
        parent = [-1] * nidx
        dist[start] = 0
        q: deque[int] = deque([start])
        far = start
        while q:
            u = q.popleft()
            if dist[u] > dist[far]:
                far = u
            for v in adj[u]:
                if dist[v] == -1:
                    dist[v] = dist[u] + 1
                    parent[v] = u
                    q.append(v)
        return far, parent

    def path_from_parents(end: int, parent: list[int]) -> list[int]:
        out: list[int] = []
        u = end
        while u >= 0:
            out.append(u)
            u = parent[u]
        out.reverse()
        return out

    # Tree diameter: BFS from arbitrary node, then from farthest (longest shortest path)
    a, _ = bfs_farthest(0)
    b, parent = bfs_farthest(a)
    path_b = path_from_parents(b, parent)
    if len(path_b) < 2:
        return None

    coords: list[list[float]] = []
    step = max(1, len(path_b) // 80)
    for k in range(0, len(path_b), step):
        yy, xx = pts[path_b[k]]
        coords.append([float(xx), float(yy)])
    yy, xx = pts[path_b[-1]]
    last = [float(xx), float(yy)]
    if not coords or abs(coords[-1][0] - last[0]) > 0.5 or abs(coords[-1][1] - last[1]) > 0.5:
        coords.append(last)
    return coords if len(coords) >= 2 else None


def _ridge_fallback_pca_axis(mask_bool: np.ndarray) -> list[list[float]] | None:
    """When skeleton is empty/short, draw a ridge-like line along mask PCA major axis (typical gable/hip spine)."""
    ys, xs = np.where(mask_bool)
    if len(xs) < 12:
        return None
    pts = np.column_stack((xs.astype(np.float64), ys.astype(np.float64)))
    c = pts.mean(axis=0)
    cov = np.cov(pts.T)
    ev, evec = np.linalg.eigh(cov)
    order = np.argsort(ev)[::-1]
    major = evec[:, order[0]].astype(np.float64)
    nrm = np.linalg.norm(major) + 1e-9
    major = major / nrm
    proj = (pts - c) @ major
    tmin, tmax = float(proj.min()), float(proj.max())
    span = tmax - tmin
    if span < 12.0:
        return None
    pad = 0.06 * span
    t0, t1 = tmin + pad, tmax - pad
    p0 = c + major * t0
    p1 = c + major * t1
    return [[float(p0[0]), float(p0[1])], [float(p1[0]), float(p1[1])]]


def _ridge_tortuosity(coords: list[list[float]]) -> float:
    """Path length divided by chord length — high values mean a zig-zag skeleton walk."""
    if len(coords) < 2:
        return 1.0
    arr = np.array(coords, dtype=np.float64)
    direct = float(np.linalg.norm(arr[-1] - arr[0]))
    if direct < 2.0:
        return 1.0
    path_len = float(np.sum(np.linalg.norm(np.diff(arr, axis=0), axis=1)))
    return path_len / direct


def _smooth_ridge_polyline(coords: list[list[float]]) -> list[list[float]]:
    """Moving average + Douglas–Peucker to tame pixel-level skeleton jitter."""
    if len(coords) < 3:
        return coords
    arr = np.array(coords, dtype=np.float64)
    w = min(5, len(arr))
    if w % 2 == 0:
        w -= 1
    if w < 3:
        return coords
    pad = w // 2
    ker = np.ones(w, dtype=np.float64) / w
    sx = np.convolve(np.pad(arr[:, 0], (pad, pad), mode="edge"), ker, mode="valid")
    sy = np.convolve(np.pad(arr[:, 1], (pad, pad), mode="edge"), ker, mode="valid")
    sm = np.column_stack([sx, sy])
    pts = sm.reshape(-1, 1, 2).astype(np.float32)
    peri = cv2.arcLength(pts, False)
    if peri < 1e-6:
        return coords
    eps = max(2.0, 0.018 * peri)
    approx = cv2.approxPolyDP(pts, eps, False)
    out = [[float(p[0][0]), float(p[0][1])] for p in approx]
    return out if len(out) >= 2 else coords


def _simplify_outline_ring(V: np.ndarray, target_vertices: int = 16) -> np.ndarray:
    """Reduce dense SAM footprints to ~target edges so we don't emit hundreds of micro-segments."""
    n = len(V)
    if n <= target_vertices:
        return V
    peri = float(cv2.arcLength(V.reshape(-1, 1, 2).astype(np.float32), True))
    if peri < 1e-6:
        return V
    # Start ~2% of perimeter; tighten until we have at most target_vertices (+1)
    for frac in (0.035, 0.05, 0.075, 0.1, 0.14, 0.2):
        eps = max(2.0, frac * peri)
        approx = cv2.approxPolyDP(V.reshape(-1, 1, 2).astype(np.float32), eps, True)
        if len(approx) <= target_vertices + 1:
            pts = approx.reshape(-1, 2).astype(np.float64)
            if len(pts) >= 3:
                return pts
    return V


def _merge_boundary_edges(
    V: np.ndarray,
    major: np.ndarray,
    minor: np.ndarray,
) -> list[dict[str, Any]]:
    """
    One polyline per contiguous run of same edge class (eave / rake / hip).
    Skips very short edges (noise from tessellation).
    """
    n = len(V)
    if n < 3:
        return []

    segs: list[tuple[str, np.ndarray, np.ndarray]] = []
    for i in range(n):
        p0 = V[i]
        p1 = V[(i + 1) % n]
        e = p1 - p0
        el = float(np.linalg.norm(e))
        if el < 8.0:
            continue
        kind = _edge_class_major_minor(e / el, major, minor)
        segs.append((kind, p0, p1))

    if not segs:
        return []

    merged: list[dict[str, Any]] = []
    cur_k, a, b = segs[0]
    for k, p0, p1 in segs[1:]:
        if k == cur_k and float(np.linalg.norm(b - p0)) < 6.0:
            b = p1
        else:
            merged.append(
                {
                    "type": cur_k,
                    "coordinates": [[float(a[0]), float(a[1])], [float(b[0]), float(b[1])]],
                }
            )
            cur_k, a, b = k, p0, p1
    merged.append(
        {
            "type": cur_k,
            "coordinates": [[float(a[0]), float(a[1])], [float(b[0]), float(b[1])]],
        }
    )
    return merged


def infer_roof_lines_from_mask_and_polygon(
    mask: np.ndarray,
    polygon: list[list[float]],
) -> list[dict[str, Any]]:
    """
    Return list of { "type": "ridge"|..., "coordinates": [[x,y], ...] } in image pixels.
    """
    out: list[dict[str, Any]] = []
    V = _open_ring(polygon)
    if len(V) < 3:
        return out

    m = (mask > 0.5).astype(np.uint8)
    if m.sum() < 50:
        return out

    # PCA axes from full-resolution ring (stable building direction)
    cent = V.mean(axis=0)
    Vc = V - cent
    cov = np.cov(Vc.T)
    eigvals, eigvecs = np.linalg.eigh(cov)
    order = np.argsort(eigvals)[::-1]
    major = eigvecs[:, order[0]].astype(np.float64)
    minor = eigvecs[:, order[1]].astype(np.float64)
    major /= np.linalg.norm(major) + 1e-9
    minor /= np.linalg.norm(minor) + 1e-9

    Vs = _simplify_outline_ring(V, target_vertices=16)

    # Ridge centerline first (main internal structure)
    ridge = _longest_skeleton_polyline(m.astype(bool))
    if not ridge or len(ridge) < 2:
        ridge = _ridge_fallback_pca_axis(m.astype(bool))
    elif _ridge_tortuosity(ridge) > 1.38:
        # Skeleton diameter path often zig-zags on textured shingles — use PCA spine when cleaner.
        ridge_pca = _ridge_fallback_pca_axis(m.astype(bool))
        if ridge_pca and len(ridge_pca) >= 2:
            ridge = ridge_pca

    if ridge and len(ridge) >= 2:
        ridge = _smooth_ridge_polyline(ridge)
        # Cap points so the map and labels stay readable
        if len(ridge) > 36:
            step = max(1, len(ridge) // 36)
            ridge = [ridge[i] for i in range(0, len(ridge), step)] + [ridge[-1]]
            if len(ridge) >= 2 and ridge[-1] == ridge[-2]:
                ridge.pop()
        out.append({"type": "ridge", "coordinates": ridge})

    # Merged boundary runs on simplified outline (no per-vertex spam; no heuristic valleys)
    out.extend(_merge_boundary_edges(Vs, major, minor))

    return out[:48]
