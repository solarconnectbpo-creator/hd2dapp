/**
 * AI Insight Card Component
 * Displays AI predictions with explanations, confidence scores, and user actions.
 */

import React, { useState, type ComponentProps } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { AppColors } from "@/constants/theme";
import {
  type AIPredictionExplanation,
  type ExplanationFactor,
  type UserAction,
  formatExplanationForUI,
} from "@/src/roofReports/ai/explainableAi";

type FeatherIconName = ComponentProps<typeof Feather>["name"];

interface AIInsightCardProps {
  title: string;
  explanation: AIPredictionExplanation;
  onAction?: (actionKey: string) => void;
  variant?: "pitch" | "damage" | "measurement" | "general";
}

export default function AIInsightCard({
  title,
  explanation,
  onAction,
  variant = "general",
}: AIInsightCardProps) {
  const { theme } = useTheme();
  const [showDetails, setShowDetails] = useState(false);
  const formatted = formatExplanationForUI(explanation);

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.85) return "#10b981"; // green
    if (confidence > 0.7) return "#f59e0b"; // amber
    return "#ef4444"; // red
  };

  const getVariantIcon = (): FeatherIconName => {
    switch (variant) {
      case "pitch":
        return "trending-up";
      case "damage":
        return "alert-circle";
      case "measurement":
        return "layers";
      default:
        return "info";
    }
  };

  return (
    <>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBackground,
            borderColor: getConfidenceColor(explanation.confidence),
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Feather
              name={getVariantIcon()}
              size={20}
              color={getConfidenceColor(explanation.confidence)}
            />
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          </View>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>
              {(explanation.confidence * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Headline */}
        <Text
          style={[
            styles.headline,
            { color: getConfidenceColor(explanation.confidence) },
          ]}
        >
          {formatted.headline}
        </Text>

        {/* Prediction Value */}
        <View style={styles.predictionBox}>
          <Text
            style={[styles.predictionLabel, { color: theme.textSecondary }]}
          >
            Prediction:
          </Text>
          <Text style={[styles.predictionValue, { color: theme.text }]}>
            {typeof explanation.prediction === "object"
              ? JSON.stringify(explanation.prediction)
              : String(explanation.prediction)}
          </Text>
        </View>

        {/* Key Factors */}
        {formatted.factors.length > 0 && (
          <View style={styles.factorsSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Key Factors
            </Text>
            {formatted.factors
              .slice(0, 2)
              .map((factor: string, idx: number) => (
                <View key={idx} style={styles.factorItem}>
                  <Feather name="check-circle" size={16} color="#10b981" />
                  <Text style={[styles.factorText, { color: theme.text }]}>
                    {factor}
                  </Text>
                </View>
              ))}
            {formatted.factors.length > 2 && (
              <TouchableOpacity onPress={() => setShowDetails(true)}>
                <Text style={styles.viewMoreLink}>
                  View {formatted.factors.length - 2} more factors →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Call to Action */}
        <Text
          style={[
            styles.callToAction,
            { color: getConfidenceColor(explanation.confidence) },
          ]}
        >
          {formatted.callToAction}
        </Text>

        {/* User Actions */}
        {explanation.userActions && explanation.userActions.length > 0 && (
          <View style={styles.actionsSection}>
            {explanation.userActions
              .slice(0, 2)
              .map((action: UserAction, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor:
                        idx === 0 ? AppColors.primary : AppColors.secondary,
                    },
                  ]}
                  onPress={() => onAction?.(action.action)}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: idx === 0 ? "#fff" : theme.text },
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* Details Toggle */}
        <TouchableOpacity
          style={styles.detailsToggle}
          onPress={() => setShowDetails(true)}
        >
          <Feather name="help-circle" size={16} color={theme.textSecondary} />
          <Text style={[styles.detailsText, { color: theme.textSecondary }]}>
            Why this assessment?
          </Text>
        </TouchableOpacity>
      </View>

      {/* Details Modal */}
      <Modal visible={showDetails} transparent animationType="slide">
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: theme.backgroundRoot },
          ]}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {title} - Full Explanation
              </Text>
              <TouchableOpacity onPress={() => setShowDetails(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Confidence */}
              <View style={styles.detailSection}>
                <Text
                  style={[styles.detailSectionTitle, { color: theme.text }]}
                >
                  Confidence Score
                </Text>
                <View
                  style={[
                    styles.confidenceBar,
                    {
                      backgroundColor: getConfidenceColor(
                        explanation.confidence,
                      ),
                    },
                  ]}
                >
                  <Text style={styles.confidenceBarText}>
                    {(explanation.confidence * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>

              {/* All Factors */}
              <View style={styles.detailSection}>
                <Text
                  style={[styles.detailSectionTitle, { color: theme.text }]}
                >
                  Contributing Factors
                </Text>
                {explanation.reasoning.map(
                  (factor: ExplanationFactor, idx: number) => (
                    <View key={idx} style={styles.detailFactorItem}>
                      <View
                        style={[
                          styles.impactBadge,
                          {
                            backgroundColor:
                              factor.impact === "high"
                                ? "#ef4444"
                                : factor.impact === "medium"
                                  ? "#f59e0b"
                                  : "#10b981",
                          },
                        ]}
                      >
                        <Text style={styles.impactText}>
                          {factor.impact.toUpperCase()[0]}
                        </Text>
                      </View>
                      <View style={styles.detailFactorContent}>
                        <Text
                          style={[styles.factorName, { color: theme.text }]}
                        >
                          {factor.factor}
                        </Text>
                        {factor.value && (
                          <Text
                            style={[
                              styles.factorValue,
                              { color: theme.textSecondary },
                            ]}
                          >
                            {factor.value}
                          </Text>
                        )}
                        <Text
                          style={[
                            styles.factorExplanation,
                            { color: theme.text },
                          ]}
                        >
                          {factor.explanation}
                        </Text>
                      </View>
                    </View>
                  ),
                )}
              </View>

              {/* Limitations */}
              {formatted.limitations.length > 0 && (
                <View style={styles.detailSection}>
                  <Text
                    style={[styles.detailSectionTitle, { color: theme.text }]}
                  >
                    Limitations & Caveats
                  </Text>
                  {formatted.limitations.map(
                    (limitation: string, idx: number) => (
                      <View key={idx} style={styles.limitationItem}>
                        <Feather
                          name="alert-triangle"
                          size={14}
                          color="#f59e0b"
                        />
                        <Text
                          style={[styles.limitationText, { color: theme.text }]}
                        >
                          {limitation}
                        </Text>
                      </View>
                    ),
                  )}
                </View>
              )}

              {/* Disclaimer */}
              <View
                style={[
                  styles.disclaimerBox,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Feather name="info" size={16} color={theme.textSecondary} />
                <Text style={[styles.disclaimerText, { color: theme.text }]}>
                  {explanation.disclaimer}
                </Text>
              </View>

              {/* All Actions */}
              {explanation.userActions &&
                explanation.userActions.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text
                      style={[styles.detailSectionTitle, { color: theme.text }]}
                    >
                      Next Steps
                    </Text>
                    {explanation.userActions.map(
                      (action: UserAction, idx: number) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.actionOption,
                            {
                              backgroundColor: theme.cardBackground,
                              borderColor: theme.border,
                            },
                          ]}
                          onPress={() => {
                            onAction?.(action.action);
                            setShowDetails(false);
                          }}
                        >
                          <View>
                            <Text
                              style={[
                                styles.actionOptionLabel,
                                { color: theme.text },
                              ]}
                            >
                              {action.label}
                            </Text>
                            <Text
                              style={[
                                styles.actionOptionDescription,
                                { color: theme.textSecondary },
                              ]}
                            >
                              {action.description}
                            </Text>
                          </View>
                          <Feather
                            name="chevron-right"
                            size={20}
                            color={theme.textSecondary}
                          />
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  headline: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  predictionBox: {
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  predictionLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  predictionValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  factorsSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  factorItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  factorText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  viewMoreLink: {
    fontSize: 13,
    color: "#3b82f6",
    fontWeight: "600",
    marginTop: 4,
  },
  callToAction: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  actionsSection: {
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  detailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  detailsText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    marginTop: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  modalScroll: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  confidenceBar: {
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  confidenceBarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  detailFactorItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  impactBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  impactText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  detailFactorContent: {
    flex: 1,
  },
  factorName: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  factorValue: {
    fontSize: 12,
    marginBottom: 4,
  },
  factorExplanation: {
    fontSize: 13,
    lineHeight: 18,
  },
  limitationItem: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  limitationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  disclaimerBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  actionOption: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  actionOptionLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  actionOptionDescription: {
    fontSize: 12,
  },
});
