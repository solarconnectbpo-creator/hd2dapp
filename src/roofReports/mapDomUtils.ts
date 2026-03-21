/**
 * React Native Web often attaches the map <div> after the first useEffect tick.
 * Retry until the container exists or max frames (avoids "Map container not found").
 */
export function waitForHtmlElement(
  resolve: () => HTMLElement | null,
  onReady: (el: HTMLElement) => void,
  opts?: { maxFrames?: number; onTimeout?: () => void },
): () => void {
  let frame = 0;
  const max = opts?.maxFrames ?? 90;
  let cancelled = false;

  const tick = () => {
    if (cancelled) return;
    const el = resolve();
    if (el) {
      onReady(el);
      return;
    }
    frame += 1;
    if (frame >= max) {
      if (!cancelled) opts?.onTimeout?.();
      return;
    }
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
  return () => {
    cancelled = true;
  };
}
