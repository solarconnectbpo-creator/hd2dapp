import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import {
  GISBuildingService,
  type BuildingWithImagery,
} from "@/src/gis/gisBuildingService";
import {
  RoofMeasurementService,
  type DetailedRoofMeasurement,
} from "@/src/gis/roofMeasurementService";

type RoofingOption = ReturnType<
  typeof RoofMeasurementService.compareRoofingOptions
>[number];

function getMapboxToken(explicit?: string): string | undefined {
  const t = explicit?.trim();
  if (t) return t;
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_MAPBOX_TOKEN) {
    return String(process.env.EXPO_PUBLIC_MAPBOX_TOKEN).trim();
  }
  return undefined;
}

function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGISBuildingMapData(params: {
  address: string;
  latitude: number;
  longitude: number;
  mapboxToken?: string;
}) {
  const {
    address,
    latitude,
    longitude,
    mapboxToken: mapboxTokenParam,
  } = params;

  const mapboxToken = getMapboxToken(mapboxTokenParam);
  const gisService = useMemo(
    () => new GISBuildingService(mapboxToken),
    [mapboxToken],
  );

  const [building, setBuilding] = useState<BuildingWithImagery | null>(null);
  const [measurements, setMeasurements] =
    useState<DetailedRoofMeasurement | null>(null);
  const [loading, setLoading] = useState(false);
  const [roofingOptions, setRoofingOptions] = useState<RoofingOption[]>([]);

  const loadBuildingData = useCallback(async () => {
    setLoading(true);
    try {
      let buildingData = await gisService.getBuildingByAddress(address);

      if (!buildingData) {
        const buffer = 0.0005;
        const list = await gisService.getBuildingFootprints(
          latitude - buffer,
          longitude - buffer,
          latitude + buffer,
          longitude + buffer,
        );
        let best: (typeof list)[0] | null = null;
        let bestD = Infinity;
        for (const b of list) {
          const [blon, blat] = b.centerPoint;
          const d = haversineM(latitude, longitude, blat, blon);
          if (d < bestD) {
            bestD = d;
            best = b;
          }
        }
        buildingData = best;
      }

      if (buildingData) {
        const enhanced = await gisService.getEnhancedBuildingData(buildingData);
        setBuilding(enhanced);

        const roofGeometry =
          enhanced.roofGeometry ??
          (await gisService.calculateRoofGeometry(buildingData));
        const roofMeasurements =
          RoofMeasurementService.calculateDetailedMeasurements(
            buildingData,
            roofGeometry,
          );
        setMeasurements(roofMeasurements);
        setRoofingOptions(
          RoofMeasurementService.compareRoofingOptions(roofMeasurements),
        );
      } else {
        Alert.alert(
          "Building Not Found",
          "Could not find building data for this location.",
        );
        setBuilding(null);
        setMeasurements(null);
        setRoofingOptions([]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load building data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [address, gisService, latitude, longitude]);

  useEffect(() => {
    loadBuildingData();
  }, [loadBuildingData]);

  return {
    building,
    measurements,
    roofingOptions,
    loading,
    loadBuildingData,
  };
}
