import { useEffect, useState } from "react";
import { getEagleViewEmbeddedAuthToken } from "./eagleViewEmbeddedAuth";

export type MapProvider = "eagleview" | "osm-fallback" | "checking";

let cachedResult: MapProvider | null = null;

export function useMapProvider(): MapProvider {
  const [provider, setProvider] = useState<MapProvider>(
    cachedResult ?? "checking",
  );

  useEffect(() => {
    if (cachedResult) {
      setProvider(cachedResult);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        await getEagleViewEmbeddedAuthToken();
        cachedResult = "eagleview";
      } catch {
        cachedResult = "osm-fallback";
      }
      if (mounted) setProvider(cachedResult);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return provider;
}
