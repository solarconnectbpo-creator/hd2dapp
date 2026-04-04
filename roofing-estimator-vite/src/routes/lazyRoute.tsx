import { lazy, Suspense, type ComponentType } from "react";
import { RouteLoadingFallback } from "../components/RouteLoadingFallback";

/** Wraps a lazy default export with Suspense for React Router `Component` routes. */
export function lazyRoute(load: () => Promise<{ default: ComponentType }>) {
  const Comp = lazy(load);
  return function LazyRoute() {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <Comp />
      </Suspense>
    );
  };
}
