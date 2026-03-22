import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import {
  Spacing,
  BorderRadius,
  AppColors,
  Typography,
} from "@/constants/theme";
import { MOCK_CALL_CENTER, CALL_CENTER_PRICING } from "@/data/mockData";

export default function CallCenterScreen() {
  const { theme } = useTheme();
  const { paddingTop, paddingBottom } = useScreenInsets();
  const [callCenter, setCallCenter] = useState(MOCK_CALL_CENTER);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [agentName, setAgentName] = useState("");

  const handleAddAgent = () => {
    if (!agentName.trim()) {
      Alert.alert("Error", "Please enter agent name");
      return;
    }

    const newAgent = {
      id: Date.now().toString(),
      name: agentName,
      status: "active" as const,
      callsHandled: 0,
      averageCallDuration: 0,
    };

    setCallCenter((prev) => ({
      ...prev,
      agents: [...prev.agents, newAgent],
    }));
    setShowAddAgentModal(false);
    setAgentName("");
  };

  const totalCost = callCenter.monthlyPrice;
  const agentCost = (index: number) =>
    index === 0
      ? CALL_CENTER_PRICING.firstAgent
      : CALL_CENTER_PRICING.additionalAgent;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return AppColors.accent;
      case "break":
        return "#F59E0B";
      default:
        return theme.textSecondary;
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.backgroundDefault, color: theme.text },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="h2">Call Center</ThemedText>
          <ThemedText
            style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
          >
            Manage your sales team
          </ThemedText>
        </View>

        {/* Pricing Summary */}
        <Card elevation={1} style={styles.pricingCard}>
          <View style={styles.pricingHeader}>
            <ThemedText type="h4">Monthly Cost</ThemedText>
            <Badge
              label={callCenter.status === "active" ? "Active" : "Inactive"}
            />
          </View>
          <ThemedText
            type="h1"
            style={[styles.totalPrice, { color: AppColors.primary }]}
          >
            ${totalCost.toLocaleString()}
          </ThemedText>
          <ThemedText
            style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
          >
            {callCenter.agents.length} agent
            {callCenter.agents.length !== 1 ? "s" : ""} (
            {CALL_CENTER_PRICING.firstAgent} +{" "}
            {callCenter.agents.length > 1
              ? `${callCenter.agents.length - 1} × ${CALL_CENTER_PRICING.additionalAgent}`
              : "0"}
            )
          </ThemedText>

          <View style={styles.pricingBreakdown}>
            <View style={styles.breakdownItem}>
              <ThemedText style={{ color: theme.textSecondary }}>
                1st Agent
              </ThemedText>
              <ThemedText type="h4">
                ${CALL_CENTER_PRICING.firstAgent}
              </ThemedText>
            </View>
            {callCenter.agents.length > 1 && (
              <View style={styles.breakdownItem}>
                <ThemedText style={{ color: theme.textSecondary }}>
                  Additional ({callCenter.agents.length - 1})
                </ThemedText>
                <ThemedText type="h4">
                  $
                  {(
                    (callCenter.agents.length - 1) *
                    CALL_CENTER_PRICING.additionalAgent
                  ).toLocaleString()}
                </ThemedText>
              </View>
            )}
          </View>
        </Card>

        {/* Agents List */}
        <ThemedText type="h4" style={styles.sectionTitle}>
          Agents ({callCenter.agents.length})
        </ThemedText>

        {callCenter.agents.map((agent, index) => (
          <Card key={agent.id} elevation={1} style={styles.agentCard}>
            <View style={styles.agentHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText type="h4">{agent.name}</ThemedText>
                <ThemedText
                  style={{ color: theme.textSecondary, fontSize: 12 }}
                >
                  Agent {index + 1}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(agent.status) + "20" },
                ]}
              >
                <Feather
                  name="circle"
                  size={12}
                  color={getStatusColor(agent.status)}
                />
                <ThemedText
                  style={{
                    marginLeft: 6,
                    fontSize: 12,
                    color: getStatusColor(agent.status),
                    fontWeight: "600",
                  }}
                >
                  {agent.status}
                </ThemedText>
              </View>
            </View>
            <View style={styles.agentStats}>
              <View style={styles.statItem}>
                <Feather name="phone" size={16} color={theme.textSecondary} />
                <View style={{ marginLeft: Spacing.sm }}>
                  <ThemedText
                    style={{ color: theme.textSecondary, fontSize: 12 }}
                  >
                    Calls Today
                  </ThemedText>
                  <ThemedText type="h4">{agent.callsHandled}</ThemedText>
                </View>
              </View>
              <View style={styles.statItem}>
                <Feather name="clock" size={16} color={theme.textSecondary} />
                <View style={{ marginLeft: Spacing.sm }}>
                  <ThemedText
                    style={{ color: theme.textSecondary, fontSize: 12 }}
                  >
                    Avg Duration
                  </ThemedText>
                  <ThemedText type="h4">
                    {agent.averageCallDuration}m
                  </ThemedText>
                </View>
              </View>
              <View style={styles.statItem}>
                <ThemedText
                  style={{ color: theme.textSecondary, fontSize: 12 }}
                >
                  Cost
                </ThemedText>
                <ThemedText type="h4">${agentCost(index)}</ThemedText>
              </View>
            </View>
          </Card>
        ))}

        {/* Add Agent Button */}
        <Button
          onPress={() => setShowAddAgentModal(true)}
          style={styles.addButton}
        >
          <Feather name="plus" size={18} color="white" />
          <ThemedText
            style={{
              color: "white",
              marginLeft: Spacing.sm,
              fontWeight: "600",
            }}
          >
            Add Agent
          </ThemedText>
        </Button>
      </ScrollView>

      {/* Add Agent Modal */}
      <Modal
        visible={showAddAgentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddAgentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Add New Agent</ThemedText>
              <Pressable onPress={() => setShowAddAgentModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <ThemedText type="small" style={styles.label}>
                Agent Name
              </ThemedText>
              <TextInput
                style={inputStyle}
                value={agentName}
                onChangeText={setAgentName}
                placeholder="Enter agent name"
                placeholderTextColor={theme.textSecondary}
              />

              <Card
                elevation={1}
                style={[
                  styles.costPreview,
                  { borderLeftColor: AppColors.primary, borderLeftWidth: 4 },
                ]}
              >
                <ThemedText style={{ color: theme.textSecondary }}>
                  New Monthly Cost
                </ThemedText>
                <ThemedText
                  type="h2"
                  style={{ color: AppColors.primary, marginTop: Spacing.sm }}
                >
                  $
                  {(
                    callCenter.monthlyPrice +
                    CALL_CENTER_PRICING.additionalAgent
                  ).toLocaleString()}
                </ThemedText>
                <ThemedText
                  style={{
                    color: theme.textSecondary,
                    marginTop: Spacing.sm,
                    fontSize: 12,
                  }}
                >
                  +${CALL_CENTER_PRICING.additionalAgent}/month
                </ThemedText>
              </Card>

              <Button onPress={handleAddAgent} style={styles.modalButton}>
                Add Agent
              </Button>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.md,
  },
  pricingCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  pricingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalPrice: {
    marginVertical: Spacing.md,
  },
  pricingBreakdown: {
    flexDirection: "row",
    marginTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  breakdownItem: {
    flex: 1,
  },
  sectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  agentCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  agentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  agentStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  addButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingTop: Spacing.lg,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  modalBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  label: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
    opacity: 0.8,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.body.fontSize,
    marginBottom: Spacing.lg,
  },
  costPreview: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  modalButton: {
    marginTop: Spacing.lg,
  },
});
