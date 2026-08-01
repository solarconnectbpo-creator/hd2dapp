/**
 * Leaflet.draw (UMD) expects a global `L`. Vite ESM imports do not set it,
 * which throws `ReferenceError: L is not defined` as soon as the Contacts
 * (or any FallbackMap) chunk evaluates `import "leaflet-draw"`.
 */
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const g = globalThis as typeof globalThis & { L?: typeof L };
if (typeof g.L === "undefined") {
  g.L = L;
}

export default L;
export { L };
