# Roadmap: native LiDAR / AR roof capture (deferred)

## Current scope

The roofing estimator PWA uses **MapLibre**, satellite imagery, and manual or AI-assisted tracing in the browser. **Web-based LiDAR or photorealistic 3D terrain from device depth** is **not** part of the current product.

## Why native is a separate phase

- **iPhone / iPad LiDAR** (ARKit depth) is exposed through **native SDKs**, not a stable, universal web API for arbitrary roof capture workflows.
- **WebXR** may help on some headsets or future browsers but is not a dependable baseline for field estimators today.
- A **native shell** (e.g. Capacitor or React Native) is the practical path when the team wants room-scale or walk-around capture with depth fusion and export back into this app (e.g. via measurement IDs or shared project JSON).

## Suggested later milestones (internal)

1. Prototype **Capacitor** (or similar) wrapper with ARKit depth sample → simplified mesh or line export.
2. Define a **small interchange format** (e.g. vertices + confidence) that maps into existing measurement / field project flows.
3. Keep **browser** as the primary estimate and CRM surface; treat native capture as an optional **companion** until parity is proven.

This document is for planning only; it does not commit the product to shipping native LiDAR features on a fixed date.
