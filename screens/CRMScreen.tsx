import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing, BorderRadius, AppColors, Typography } from "@/constants/theme";
import { DEALS, STAGES, Deal } from "@/data/mockData";
import { usePurchasedLeads } from "@/contexts/PurchasedLeadsContext";
import { BlurredContactInfo } from "@/components/BlurredContactInfo";
import type { CRMStackParamList } from "@/navigation/CRMStackNavigator";

type CRMNavigationProp = NativeStackNavigationProp<CRMStackParamList, "CRM">;

export default function CRMScreen() {
  const navigation = useNavigation<CRMNavigationProp>();
  const { theme, isDark } = useTheme();
  const { paddingTop, paddingBottom } = useScreenInsets();
  const { isPurchased, addPurchasedLead } = usePurchasedLeads();
  const [deals, setDeals] = useState(DEALS);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [newDeal, setNewDeal] = useState({
    contactName: "",
    company: "",
    value: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [showMessenger, setShowMessenger] = useState(false);
  const [messageText, setMessageText] = useState("");

  const getDealsByStage = (stage: string) =>
    deals.filter((deal) => deal.stage === stage);

  const getStageTotal = (stage: string) =>
    getDealsByStage(stage).reduce((sum, deal) => sum + deal.value, 0);

  const handleMoveStage = (deal: Deal, direction: "forward" | "back") => {
    const stageKeys = STAGES.map((s) => s.key);
    const currentIndex = stageKeys.indexOf(deal.stage);
    let newIndex = direction === "forward" ? currentIndex + 1 : currentIndex - 1;
    
    if (newIndex < 0 || newIndex >= stageKeys.length) return;
    
    const newStage = stageKeys[newIndex] as Deal["stage"];
    setDeals((prev) =>
      prev.map((d) =>
        d.id === deal.id ? { ...d, stage: newStage, daysInStage: 0 } : d
      )
    );
    setSelectedDeal(null);
  };

  const handleAddDeal = () => {
    if (!newDeal.contactName || !newDeal.value) {
      Alert.alert("Error", "Please fill in contact name and deal value");
      return;
    }
    const deal: Deal = {
      id: Date.now().toString(),
      contactName: newDeal.contactName,
      company: newDeal.company || "Individual",
      value: parseInt(newDeal.value) || 0,
      stage: "new",
      daysInStage: 0,
      phone: newDeal.phone,
      email: newDeal.email,
      notes: newDeal.notes,
      industry: "General",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setDeals((prev) => [deal, ...prev]);
    setShowAddModal(false);
    setNewDeal({ contactName: "", company: "", value: "", phone: "", email: "", notes: "" });
  };

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert("No Phone Number", "Please add a phone number to make a call");
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleSendMessage = async (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert("No Phone Number", "Please add a phone number to send a message");
      return;
    }
    if (!messageText.trim()) {
      Alert.alert("Empty Message", "Please type a message");
      return;
    }
    const encodedMessage = encodeURIComponent(messageText);
    Linking.openURL(`sms:${phoneNumber}?body=${encodedMessage}`);
    setMessageText("");
    setShowMessenger(false);
  };

  const handlePurchaseLead = (leadId: string) => {
    addPurchasedLead(leadId);
    Alert.alert("Success", "Lead contact info unlocked! You can now view phone and email.");
    setShowPurchaseModal(false);
  };

  const renderDealCard = (deal: Deal) => (
    <Card
      key={deal.id}
      elevation={1}
      onPress={() => setSelectedDeal(deal)}
      style={styles.dealCard}
    >
      <ThemedText type="h4" numberOfLines={1}>
        {deal.contactName}
      </ThemedText>
      <ThemedText style={[styles.companyText, { color: theme.textSecondary }]} numberOfLines={1}>
        {deal.company}
      </ThemedText>
      <View style={styles.dealFooter}>
        <ThemedText style={{ color: AppColors.accent, fontWeight: "600" }}>
          ${deal.value.toLocaleString()}
        </ThemedText>
        <ThemedText style={[styles.daysText, { color: theme.textSecondary }]}>
          {deal.daysInStage}d
        </ThemedText>
      </View>
    </Card>
  );

  const renderStageColumn = (stage: { key: string; label: string; color: string }) => {
    const stageDeals = getDealsByStage(stage.key);
    const total = getStageTotal(stage.key);

    return (
      <View key={stage.key} style={styles.stageColumn}>
        <View style={styles.stageHeader}>
          <View style={styles.stageTitleRow}>
            <View style={[styles.stageIndicator, { backgroundColor: stage.color }]} />
            <ThemedText type="h4" numberOfLines={1} style={styles.stageTitle}>
              {stage.label}
            </ThemedText>
            <Badge label={stageDeals.length.toString()} color={theme.backgroundSecondary} textColor={theme.text} />
          </View>
          <ThemedText style={[styles.stageTotal, { color: theme.textSecondary }]}>
            ${total.toLocaleString()}
          </ThemedText>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stageContent}>
          {stageDeals.map(renderDealCard)}
        </ScrollView>
      </View>
    );
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.backgroundDefault, color: theme.text },
  ];

  return (
    <ThemedView style={styles.container}>
      {/* Call Center Banner */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop, paddingBottom: Spacing.sm }}>
        <Card
          elevation={1}
          onPress={() => navigation.navigate("CallCenter")}
          style={[styles.callCenterBanner, { backgroundColor: AppColors.primary + "15" }]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4" style={{ marginBottom: Spacing.xs }}>
                Call Center
              </ThemedText>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                Manage agents & monitor calls
              </ThemedText>
            </View>
            <Feather name="arrow-right" size={20} color={AppColors.primary} />
          </View>
        </Card>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.pipelineContent, { paddingBottom }]}
      >
        {STAGES.slice(0, 6).map(renderStageColumn)}
      </ScrollView>

      <FloatingActionButton icon="plus" onPress={() => setShowAddModal(true)} />

      <Modal
        visible={!!selectedDeal}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedDeal(null)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Deal Details</ThemedText>
              <Pressable onPress={() => setSelectedDeal(null)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            {selectedDeal ? (
              <ScrollView style={styles.modalBody}>
                <ThemedText type="h2">{selectedDeal.contactName}</ThemedText>
                <ThemedText style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
                  {selectedDeal.company}
                </ThemedText>
                
                <View style={styles.valueSection}>
                  <ThemedText style={{ color: theme.textSecondary }}>Deal Value</ThemedText>
                  <ThemedText type="h1" style={{ color: AppColors.accent }}>
                    ${selectedDeal.value.toLocaleString()}
                  </ThemedText>
                </View>

                <Badge
                  label={STAGES.find((s) => s.key === selectedDeal.stage)?.label || ""}
                  color={STAGES.find((s) => s.key === selectedDeal.stage)?.color}
                  size="medium"
                  style={styles.stageBadge}
                />

                <BlurredContactInfo
                  phone={selectedDeal.phone}
                  email={selectedDeal.email}
                  isPurchased={isPurchased(selectedDeal.id)}
                  price={50}
                  onPurchase={() => {
                    setPurchasePrice(50);
                    setShowPurchaseModal(true);
                  }}
                />

                <View style={styles.detailRow}>
                  <Feather name="tag" size={16} color={theme.textSecondary} />
                  <ThemedText style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
                    {selectedDeal.industry}
                  </ThemedText>
                </View>

                {selectedDeal.notes ? (
                  <View style={styles.notesSection}>
                    <ThemedText type="h4">Notes</ThemedText>
                    <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                      {selectedDeal.notes}
                    </ThemedText>
                  </View>
                ) : null}

                <View style={styles.communicationButtons}>
                  <Pressable
                    onPress={() => handleCall(selectedDeal.phone)}
                    style={[styles.iconButton, { backgroundColor: AppColors.primary + "20" }]}
                  >
                    <Feather name="phone" size={20} color={AppColors.primary} />
                  </Pressable>
                  <Pressable
                    onPress={() => setShowMessenger(true)}
                    style={[styles.iconButton, { backgroundColor: AppColors.accent + "20" }]}
                  >
                    <Feather name="message-square" size={20} color={AppColors.accent} />
                  </Pressable>
                  <Pressable
                    onPress={() => Linking.openURL(`mailto:${selectedDeal.email}`)}
                    style={[styles.iconButton, { backgroundColor: theme.textSecondary + "20" }]}
                  >
                    <Feather name="mail" size={20} color={theme.textSecondary} />
                  </Pressable>
                </View>

                <View style={styles.actionButtons}>
                  {selectedDeal.stage !== "new" ? (
                    <Button
                      onPress={() => handleMoveStage(selectedDeal, "back")}
                      style={[styles.stageButton, { backgroundColor: theme.backgroundSecondary }]}
                    >
                      Move Back
                    </Button>
                  ) : null}
                  {selectedDeal.stage !== "won" && selectedDeal.stage !== "lost" ? (
                    <Button
                      onPress={() => handleMoveStage(selectedDeal, "forward")}
                      style={styles.stageButton}
                    >
                      Move Forward
                    </Button>
                  ) : null}
                </View>
              </ScrollView>
            ) : null}
          </ThemedView>
        </View>
      </Modal>

      <Modal
        visible={showMessenger && !!selectedDeal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMessenger(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Send Message</ThemedText>
              <Pressable onPress={() => setShowMessenger(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <ThemedText type="small" style={styles.label}>To: {selectedDeal?.phone}</ThemedText>
              <View style={styles.formField}>
                <TextInput
                  style={[inputStyle, styles.messageInput]}
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="Type your message..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>
              <Button 
                onPress={() => handleSendMessage(selectedDeal?.phone || "")}
                style={styles.submitButton}
              >
                Send Message
              </Button>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      <Modal
        visible={showPurchaseModal && !!selectedDeal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPurchaseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Unlock Lead Contact Info</ThemedText>
              <Pressable onPress={() => setShowPurchaseModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody}>
              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
                {selectedDeal?.contactName}
              </ThemedText>
              <ThemedText style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
                Unlock the contact information for this lead to make calls and send messages.
              </ThemedText>
              <Card elevation={1} style={[styles.priceCard, { backgroundColor: AppColors.primary + "15" }]}>
                <ThemedText style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
                  Unlock Price
                </ThemedText>
                <ThemedText type="h1" style={{ color: AppColors.primary }}>
                  ${purchasePrice}
                </ThemedText>
              </Card>
              <Button
                onPress={() => {
                  if (selectedDeal) {
                    handlePurchaseLead(selectedDeal.id);
                  }
                }}
                style={styles.submitButton}
              >
                Complete Purchase
              </Button>
              <Button
                onPress={() => setShowPurchaseModal(false)}
                style={[styles.submitButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                Cancel
              </Button>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Add New Deal</ThemedText>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formField}>
                <ThemedText type="small" style={styles.label}>Contact Name *</ThemedText>
                <TextInput
                  style={inputStyle}
                  value={newDeal.contactName}
                  onChangeText={(text) => setNewDeal((prev) => ({ ...prev, contactName: text }))}
                  placeholder="Enter contact name"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
              <View style={styles.formField}>
                <ThemedText type="small" style={styles.label}>Company</ThemedText>
                <TextInput
                  style={inputStyle}
                  value={newDeal.company}
                  onChangeText={(text) => setNewDeal((prev) => ({ ...prev, company: text }))}
                  placeholder="Enter company name"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
              <View style={styles.formField}>
                <ThemedText type="small" style={styles.label}>Deal Value ($) *</ThemedText>
                <TextInput
                  style={inputStyle}
                  value={newDeal.value}
                  onChangeText={(text) => setNewDeal((prev) => ({ ...prev, value: text }))}
                  placeholder="Enter deal value"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formField}>
                <ThemedText type="small" style={styles.label}>Phone</ThemedText>
                <TextInput
                  style={inputStyle}
                  value={newDeal.phone}
                  onChangeText={(text) => setNewDeal((prev) => ({ ...prev, phone: text }))}
                  placeholder="Enter phone number"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.formField}>
                <ThemedText type="small" style={styles.label}>Email</ThemedText>
                <TextInput
                  style={inputStyle}
                  value={newDeal.email}
                  onChangeText={(text) => setNewDeal((prev) => ({ ...prev, email: text }))}
                  placeholder="Enter email"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.formField}>
                <ThemedText type="small" style={styles.label}>Notes</ThemedText>
                <TextInput
                  style={[inputStyle, styles.notesInput]}
                  value={newDeal.notes}
                  onChangeText={(text) => setNewDeal((prev) => ({ ...prev, notes: text }))}
                  placeholder="Add notes..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <Button onPress={handleAddDeal} style={styles.submitButton}>
                Add Deal
              </Button>
            </ScrollView>
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
  pipelineContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  stageColumn: {
    width: 260,
  },
  stageHeader: {
    marginBottom: Spacing.md,
  },
  stageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  stageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stageTitle: {
    flex: 1,
  },
  stageTotal: {
    fontSize: 13,
    marginLeft: Spacing.lg,
  },
  stageContent: {
    flex: 1,
  },
  dealCard: {
    marginBottom: Spacing.sm,
  },
  companyText: {
    fontSize: 13,
    marginTop: 2,
  },
  dealFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  daysText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  modalBody: {
    padding: Spacing.xl,
  },
  valueSection: {
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  stageBadge: {
    alignSelf: "center",
    marginBottom: Spacing.xl,
  },
  detailsSection: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  notesSection: {
    marginBottom: Spacing.xl,
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  stageButton: {
    flex: 1,
  },
  formField: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "600",
    opacity: 0.8,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.body.fontSize,
  },
  notesInput: {
    height: 100,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
  },
  submitButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing["3xl"],
  },
  callCenterBanner: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  communicationButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    justifyContent: "center",
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  messageInput: {
    height: 100,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
  },
  priceCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
});
