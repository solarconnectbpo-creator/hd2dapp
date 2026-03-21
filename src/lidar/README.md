# LiDAR-style measurement helpers

## Coordinate systems

| Mode | `Point3D` | Use when |
|------|-----------|----------|
| **`geographic`** | `x` = lat (°), `y` = lon (°), `z` = elevation (m) | Map taps, WGS84 polygons |
| **`cartesian`** | `x`, `y`, `z` in meters | Local scans, already projected data |

`useLidarMeasurement({ coordinateSystem: 'geographic' })` is the default and matches `LidarMapComponent` (react-native-maps) which stores lat/lng in `x`/`y`.

For meter-space point clouds, use `useLidarMeasurement({ coordinateSystem: 'cartesian' })` or pass `coordinateSystem` on each `Point3D`.

## Accuracy notes

- Horizontal distance and polygon area use **geodesic** math (via `@turf/turf`), not degree differences.
- **Z** is only as good as your source: the map component sets `z: 0` unless you supply DEM/LiDAR elevation when calling `addPoint`.
- Volume remains a **fan / tetrahedron** estimate over projected metric coordinates; it is not a full mesh hull.

## Public API

See `index.ts` exports: `LidarGeometryEngine`, `useLidarMeasurement`, `LidarMapComponent`, and types `Point3D`, `PointCoordinateSystem`, `MeasurementResult`, etc.
