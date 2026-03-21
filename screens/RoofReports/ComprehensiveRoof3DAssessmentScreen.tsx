/**
 * Full roof assessment UI: integrated report (no 3D canvas — avoids Three.js crashes on web).
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";
import type { Point3D } from "@/src/gis/advanced3dRoofMeasurement";
import type { BuildingFootprint } from "@/src/gis/gisBuildingService";
import { createGISBuildingServiceFromEnv } from "@/src/gis/gisBuildingService";
import {
  RoofAssessmentIntegration,
  type ComprehensiveRoofAssessment,
} from "@/src/gis/roofAssessmentIntegration";
import {
  buildFallbackBuildingFootprint,
  createDemoPointCloud,
  DEMO_BUILDING_FOOTPRINT,
  pickClosestBuildingFootprint,
} from "@/src/gis/demoRoofAssessmentData";

import { comprehensiveRoof3dAssessmentStyles as styles } from "./comprehensiveRoof3dAssessmentStyles";

export interface ComprehensiveRoof3DAssessmentProps {
  address: string;
  latitude: number;
  longitude: number;
  buildingArea: number;
  pointCloud: Point3D[];
  buildingFootprint: BuildingFootprint;
  materialType?: "asphalt_shingle" | "metal" | "tile" | "slate" | "wood";
}

export function ComprehensiveRoof3DAssessmentScreen({
  address,
  latitude,
  longitude,
  buildingArea,
  pointCloud,
  buildingFootprint,
  materialType = "asphalt_shingle",
}: ComprehensiveRoof3DAssessmentProps) {
  const [assessment, setAssessment] =
    useState<ComprehensiveRoofAssessment | null>(null);
  const [loading, setLoading] = useState(true);

  const generateAssessment = useCallback(async () => {
    setLoading(true);
    try {
      const roofAssessment =
        await RoofAssessmentIntegration.generateComprehensiveAssessment(
          pointCloud,
          buildingFootprint,
          buildingArea,
          materialType,
        );
      setAssessment(roofAssessment);
    } catch (error) {
      Alert.alert("Error", "Failed to generate roof assessment");
      console.error(error);
      setAssessment(null);
    } finally {
      setLoading(false);
    }
  }, [pointCloud, buildingFootprint, buildingArea, materialType]);

  useEffect(() => {
    generateAssessment();
  }, [generateAssessment]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Analyzing roof assessment…</Text>
      </View>
    );
  }

  if (!assessment) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load assessment</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={generateAssessment}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.reportContainer}>
        <View style={styles.metaCard}>
          <Text style={styles.metaAddress}>{address}</Text>
          <Text style={styles.metaCoords}>
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Roof assessment summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemValue}>
                {assessment.summary.totalRoofArea.toFixed(0)}
              </Text>
              <Text style={styles.summaryItemLabel}>m² area</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemValue}>
                {assessment.summary.averagePitch.toFixed(0)}°
              </Text>
              <Text style={styles.summaryItemLabel}>Avg pitch</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemValue}>
                {assessment.roofGeometry.planes.length}
              </Text>
              <Text style={styles.summaryItemLabel}>Planes</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemValue}>
                ${(assessment.summary.estimatedTotalCost / 1000).toFixed(0)}K
              </Text>
              <Text style={styles.summaryItemLabel}>Est. cost</Text>
            </View>
          </View>
        </View>

        <View style={styles.complexityCard}>
          <Text style={styles.complexityLabel}>Roof complexity</Text>
          <Text style={styles.complexityValue}>
            {assessment.summary.complexityLevel}
          </Text>
          <View style={styles.complexityBar}>
            <View
              style={[
                styles.complexityFill,
                { width: `${assessment.roofGeometry.complexity * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.complexityScore}>
            {(assessment.roofGeometry.complexity * 100).toFixed(0)}%
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed plane analysis</Text>

          {assessment.planes.map((item, idx) => (
            <View
              key={`${item.plane.id}-${idx}`}
              style={styles.planeDetailCard}
            >
              <View style={styles.planeDetailHeader}>
                <View
                  style={[
                    styles.planeBullet,
                    { backgroundColor: item.plane.color },
                  ]}
                />
                <Text style={styles.planeDetailTitle}>Plane {idx + 1}</Text>
                <Text style={styles.planePitchBadge}>
                  {item.plane.pitch.toFixed(1)}°
                </Text>
              </View>

              <View style={styles.planeMetrics}>
                <View style={styles.metricColumn}>
                  <Text style={styles.metricLabel}>Area:</Text>
                  <Text style={styles.metricValue}>
                    {item.plane.area.toFixed(2)} m²
                  </Text>
                </View>
                <View style={styles.metricColumn}>
                  <Text style={styles.metricLabel}>Pitch ratio:</Text>
                  <Text style={styles.metricValue}>
                    {item.pitchAnalysis.detailedPitch.ratio}
                  </Text>
                </View>
                <View style={styles.metricColumn}>
                  <Text style={styles.metricLabel}>Direction:</Text>
                  <Text style={styles.metricValue}>
                    {item.plane.direction}°
                  </Text>
                </View>
              </View>

              <View style={styles.costBreakdown}>
                <Text style={styles.costLabel}>Materials:</Text>
                <Text style={styles.costValue}>
                  ${item.materialCosts.total.toLocaleString()}
                </Text>
              </View>

              <View style={styles.timeEstimate}>
                <Text style={styles.timeLabel}>Install time:</Text>
                <Text style={styles.timeValue}>
                  {item.installationTime.days} days
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {assessment.summary.recommendations.map((rec, idx) => (
            <View key={idx} style={styles.recommendationItem}>
              <Text style={styles.recommendationBullet}>•</Text>
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Structural features</Text>
          <View style={styles.featuresGrid}>
            <View style={styles.featureItem}>
              <Text style={styles.featureValue}>
                {assessment.roofGeometry.ridges.length}
              </Text>
              <Text style={styles.featureLabel}>Ridges</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureValue}>
                {assessment.roofGeometry.valleys.length}
              </Text>
              <Text style={styles.featureLabel}>Valleys</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureValue}>
                {assessment.summary.estimatedInstallationDays}
              </Text>
              <Text style={styles.featureLabel}>Est. days</Text>
            </View>
          </View>
        </View>

        <View style={styles.costSummaryCard}>
          <Text style={styles.costSummaryTitle}>Cost summary</Text>
          <Text style={styles.totalCost}>
            ${assessment.summary.estimatedTotalCost.toLocaleString()}
          </Text>
          <Text style={styles.costNote}>
            Installation time: {assessment.summary.estimatedInstallationDays}{" "}
            days
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ComprehensiveRoof3DAssessmentDemoInner() {
  const pointCloud = useMemo(() => createDemoPointCloud(), []);

  return (
    <ComprehensiveRoof3DAssessmentScreen
      address="Demo property (synthetic point cloud)"
      latitude={38.8979}
      longitude={-77.036}
      buildingArea={DEMO_BUILDING_FOOTPRINT.area}
      pointCloud={pointCloud}
      buildingFootprint={DEMO_BUILDING_FOOTPRINT}
    />
  );
}

function PropertyBackedComprehensiveAssessment({
  address,
  latitude,
  longitude,
}: {
  address: string;
  latitude: number;
  longitude: number;
}) {
  const gis = useMemo(() => createGISBuildingServiceFromEnv(), []);
  const pointCloud = useMemo(() => createDemoPointCloud(), []);
  const [loadingGis, setLoadingGis] = useState(true);
  const [footprint, setFootprint] = useState<BuildingFootprint | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingGis(true);
      try {
        let b = await gis.getBuildingByAddress(address);
        if (!b) {
          const buffer = 0.0005;
          const list = await gis.getBuildingFootprints(
            latitude - buffer,
            longitude - buffer,
            latitude + buffer,
            longitude + buffer,
          );
          b = pickClosestBuildingFootprint(list, latitude, longitude);
        }
        if (!cancelled) {
          setFootprint(
            b ??
              buildFallbackBuildingFootprint(
                latitude,
                longitude,
                `${latitude.toFixed(5)}_${longitude.toFixed(5)}`,
              ),
          );
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setFootprint(
            buildFallbackBuildingFootprint(
              latitude,
              longitude,
              `${latitude.toFixed(5)}_${longitude.toFixed(5)}`,
            ),
          );
        }
      } finally {
        if (!cancelled) setLoadingGis(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, latitude, longitude, gis]);

  if (loadingGis || !footprint) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading building footprint…</Text>
      </View>
    );
  }

  return (
    <ComprehensiveRoof3DAssessmentScreen
      address={address}
      latitude={latitude}
      longitude={longitude}
      buildingArea={footprint.area}
      pointCloud={pointCloud}
      buildingFootprint={footprint}
    />
  );
}

type ComprehensiveRoof3DRouteProps = NativeStackScreenProps<
  ReportsStackParamList,
  "ComprehensiveRoof3DAssessment"
>;

export default function ComprehensiveRoof3DAssessmentRoute({
  route,
}: ComprehensiveRoof3DRouteProps) {
  const p = route.params;
  const hasProperty =
    p &&
    typeof p.address === "string" &&
    p.address.trim().length > 0 &&
    typeof p.latitude === "number" &&
    Number.isFinite(p.latitude) &&
    typeof p.longitude === "number" &&
    Number.isFinite(p.longitude);

  if (hasProperty) {
    return (
      <PropertyBackedComprehensiveAssessment
        address={p.address.trim()}
        latitude={p.latitude}
        longitude={p.longitude}
      />
    );
  }

  return <ComprehensiveRoof3DAssessmentDemoInner />;
}
