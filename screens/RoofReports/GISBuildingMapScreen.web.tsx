/**
 * Web: react-native-maps is not loaded (it breaks the web bundle). Details / materials tabs work;
 * map tab shows aerial preview + notice. Use iOS/Android for the full map.
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
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
          <View style={[styles.map, { justifyContent: "center", padding: 16 }]}>
            <Text style={{ color: "#666", textAlign: "center", marginBottom: 8 }}>
              Interactive map (Apple/Google) is not available in this web build.
              Use the iOS or Android app, or open the Details / Materials tabs
              below.
            </Text>
          </View>
          <GISBuildingMapAerialPreview building={building} />
        </>
      }
    />
  );
}
