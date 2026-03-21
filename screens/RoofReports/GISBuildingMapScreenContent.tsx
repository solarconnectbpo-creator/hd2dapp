import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";

import type { BuildingWithImagery } from "@/src/gis/gisBuildingService";
import type { DetailedRoofMeasurement } from "@/src/gis/roofMeasurementService";
import { RoofMeasurementService } from "@/src/gis/roofMeasurementService";

import { gisBuildingMapScreenStyles as styles } from "./gisBuildingMapScreenStyles";

type RoofingOption = ReturnType<
  typeof RoofMeasurementService.compareRoofingOptions
>[number];

type Tab = "map" | "details" | "materials";

export interface GISBuildingMapScreenContentProps {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  mapSlot: React.ReactNode;
  building: BuildingWithImagery;
  measurements: DetailedRoofMeasurement;
  roofingOptions: RoofingOption[];
}

export function GISBuildingMapScreenContent({
  activeTab,
  setActiveTab,
  mapSlot,
  building,
  measurements,
  roofingOptions,
}: GISBuildingMapScreenContentProps) {
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "map" && styles.activeTab]}
          onPress={() => setActiveTab("map")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "map" && styles.activeTabText,
            ]}
          >
            Map
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "details" && styles.activeTab]}
          onPress={() => setActiveTab("details")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "details" && styles.activeTabText,
            ]}
          >
            Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "materials" && styles.activeTab]}
          onPress={() => setActiveTab("materials")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "materials" && styles.activeTabText,
            ]}
          >
            Materials
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "map" ? (
        <View style={styles.mapContainer}>{mapSlot}</View>
      ) : null}

      {activeTab === "details" ? (
        <ScrollView style={styles.detailsContainer}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Building Overview</Text>
            <View style={styles.detailRow}>
              <Text style={styles.label}>OSM ID:</Text>
              <Text style={styles.value}>{building.osmId}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Area:</Text>
              <Text style={styles.value}>{building.area.toFixed(2)} m²</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Perimeter:</Text>
              <Text style={styles.value}>
                {building.perimeter.toFixed(2)} m
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Height:</Text>
              <Text style={styles.value}>
                {building.height != null ? `${building.height}m` : "Unknown"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Levels:</Text>
              <Text style={styles.value}>
                {building.levels != null ? String(building.levels) : "Unknown"}
              </Text>
            </View>
          </View>

          {building.roofGeometry ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Roof Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Shape:</Text>
                <Text style={styles.value}>
                  {building.roofShape ?? "Unknown"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Pitch:</Text>
                <Text style={styles.value}>
                  {building.roofGeometry.pitch.toFixed(1)}°
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Direction:</Text>
                <Text style={styles.value}>
                  {building.roofDirection != null
                    ? `${building.roofDirection}°`
                    : "Unknown"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Material:</Text>
                <Text style={styles.value}>
                  {building.roofMaterial ?? "Not specified"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Complexity:</Text>
                <View style={styles.complexityBar}>
                  <View
                    style={[
                      styles.complexityFill,
                      {
                        width: `${building.roofGeometry.complexityScore * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.value}>
                  {(building.roofGeometry.complexityScore * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Detailed Measurements</Text>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Total Roof Area:</Text>
              <Text style={styles.value}>
                {measurements.totalArea.toFixed(2)} m²
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Pitch Adjusted Area:</Text>
              <Text style={styles.value}>
                {measurements.pitchAdjustedArea.toFixed(2)} m²
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Overhang Area:</Text>
              <Text style={styles.value}>
                {measurements.overhangArea.toFixed(2)} m²
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Gutter Length:</Text>
              <Text style={styles.value}>
                {measurements.gutterLength.toFixed(2)} m
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Downspouts Needed:</Text>
              <Text style={styles.value}>
                {measurements.downspoutRequirements}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Shingle Squares:</Text>
              <Text style={styles.value}>
                {measurements.materialRequirementsShingles}
              </Text>
            </View>
            {measurements.solarPotential != null ? (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Solar Potential:</Text>
                <Text style={styles.value}>
                  {measurements.solarPotential.toLocaleString()} kWh/year
                </Text>
              </View>
            ) : null}
          </View>

          {building.shadowAnalysis ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Shadow Analysis</Text>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Sun Angle:</Text>
                <Text style={styles.value}>
                  {building.shadowAnalysis.sunAngle}°
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Estimated Height:</Text>
                <Text style={styles.value}>
                  {building.shadowAnalysis.estimatedHeight}m
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Confidence:</Text>
                <Text style={styles.value}>
                  {(building.shadowAnalysis.confidence * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : null}

      {activeTab === "materials" ? (
        <ScrollView style={styles.materialsContainer}>
          {roofingOptions.map((option, idx) => (
            <View key={idx} style={styles.materialCard}>
              <View style={styles.materialHeader}>
                <Text style={styles.materialName}>{option.material}</Text>
                <Text style={styles.materialCost}>
                  ${option.cost.toLocaleString()}
                </Text>
              </View>
              <View style={styles.materialInfo}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Lifespan:</Text>
                  <Text style={styles.infoValue}>{option.lifespan} years</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Maintenance:</Text>
                  <Text style={styles.infoValue}>
                    {option.maintenanceFrequency}
                  </Text>
                </View>
              </View>
              <View style={styles.ratingContainer}>
                <View style={styles.ratingItem}>
                  <Text style={styles.ratingLabel}>Energy</Text>
                  <View style={styles.ratingBar}>
                    <View
                      style={[
                        styles.ratingFill,
                        { width: `${option.energyEfficiency}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.ratingValue}>
                    {option.energyEfficiency}/100
                  </Text>
                </View>
                <View style={styles.ratingItem}>
                  <Text style={styles.ratingLabel}>Durability</Text>
                  <View style={styles.ratingBar}>
                    <View
                      style={[
                        styles.ratingFill,
                        { width: `${option.durability}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.ratingValue}>
                    {option.durability}/100
                  </Text>
                </View>
                <View style={styles.ratingItem}>
                  <Text style={styles.ratingLabel}>Aesthetics</Text>
                  <View style={styles.ratingBar}>
                    <View
                      style={[
                        styles.ratingFill,
                        { width: `${option.aesthetics}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.ratingValue}>
                    {option.aesthetics}/100
                  </Text>
                </View>
              </View>
              <Text style={styles.recommendation}>{option.recommendation}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

export function GISBuildingMapAerialPreview({
  building,
}: {
  building: BuildingWithImagery;
}) {
  if (!building.aerialImagery) return null;
  return (
    <View style={styles.aerialContainer}>
      <Image
        source={{ uri: building.aerialImagery.imageUrl }}
        style={styles.aerialImage}
      />
      <Text style={styles.aerialLabel}>
        Resolution: {building.aerialImagery.resolution}m/px
      </Text>
    </View>
  );
}
