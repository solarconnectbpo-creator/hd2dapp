/**
 * Ambient typings when the `cesium` package is not installed (optional web feature).
 * Install `cesium` for real types and runtime.
 */
declare module "cesium" {
  const Cesium: any;
  export = Cesium;
}
