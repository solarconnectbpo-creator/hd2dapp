/**
 * Re-export so existing `@/navigation/ReportsStackNavigator` imports stay stable.
 * Canonical implementation: `src/navigation/ReportsStackNavigator.tsx`.
 * Use relative paths here — Metro can fail to resolve `@/src/...` from this shim.
 */
export { default } from "../src/navigation/ReportsStackNavigator";
export type { ReportsStackParamList } from "../src/navigation/ReportsStackNavigator";
