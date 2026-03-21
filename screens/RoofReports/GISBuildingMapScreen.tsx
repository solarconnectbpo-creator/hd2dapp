/**
 * GIS building footprint + roof estimates (native: react-native-maps).
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import MapView, { Circle, Marker, Polygon } from "react-native-maps";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";
import { useGISBuildingMapData } from "@/src/gis/useGISBuildingMapData";

import {
  GISBuildingMapAerialPreview,
  GISBuildingMapScreenContent,
} from "./GISBuildingMapScreenContent";
import { gisBuildingMapScreenStyles as styles } from "./gisBuildingMapScreenStyles";

type Props = NativeStackScreenProps<ReportsStackParamList, "GISBuildingMap">;

export default function GISBuildingMapScreen({ route }: Props) {
  const { address, latitude, longitude, mapboxToken } = route.params;
  const { building, measurements, roofingOptions, loading, loadBuildingData } =
    useGISBuildingMapData({
      address,
      latitude,
      longitude,
      mapboxToken,
    });

  const [activeTab, setActiveTab] = useState<"map" | "details" | "materials">(
    "map",
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading Building Data...</Text>
      </View>
    );
  }

  if (!building || !measurements) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Building data not available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadBuildingData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GISBuildingMapScreenContent
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      building={building}
      measurements={measurements}
      roofingOptions={roofingOptions}
      mapSlot={
        <>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude,
              longitude,
              latitudeDelta: 0.002,
              longitudeDelta: 0.002,
            }}
          >
            <Polygon
              coordinates={building.coordinates.map((coord) => ({
                latitude: coord[1],
                longitude: coord[0],
              }))}
              fillColor="rgba(33, 150, 243, 0.3)"
              strokeColor="rgba(33, 150, 243, 1)"
              strokeWidth={2}
            />
            <Marker
              coordinate={{
                latitude: building.centerPoint[1],
                longitude: building.centerPoint[0],
              }}
              title="Building Center"
              description={`Height: ${building.height != null ? `${building.height}m` : "Unknown"}`}
            />
            <Circle
              center={{
                latitude: building.centerPoint[1],
                longitude: building.centerPoint[0],
              }}
              radius={(building.height ?? 12) * 2}
              fillColor="rgba(76, 175, 80, 0.1)"
              strokeColor="rgba(76, 175, 80, 0.5)"
              strokeWidth={1}
            />
          </MapView>
          <GISBuildingMapAerialPreview building={building} />
        </>
      }
    />
  );
}
