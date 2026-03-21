import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Alert,
} from "react-native";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { STAGES } from "@/data/mockData";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CRMStackParamList } from "@/navigation/CRMStackNavigator";
import type { Deal } from "./DealsBoardScreen";

type Props = NativeStackScreenProps<CRMStackParamList, "DealDetail">;

export default function DealDetailScreen({ route, navigation }: Props) {
  const { dealId } = route.params;
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [notes, setNotes] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const loadDeal = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await apiClient.getDeal(dealId) as Deal;
      setDeal(data);
      setNotes(data.notes || "");
      setValue(String(data.value ?? ""));
    } catch (e) {
      console.error("Load deal error:", e);
    }
  }, [dealId, isAuthenticated]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  const handleSave = async () => {
    if (!isAuthenticated || !deal) return;
    setSaving(true);
    try {
      await apiClient.updateDeal(deal.id, {
        notes,
        value: Number(value || 0),
      });
      Alert.alert("Saved", "Deal updated.");
      loadDeal();
    } catch (e) {
      console.error("Save deal error:", e);
      Alert.alert("Error", "Failed to save deal.");
    } finally {
      setSaving(false);
    }
  };

  if (!deal) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Loading deal...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScreenKeyboardAwareScrollView style={styles.container}>
      <ThemedText type="h2" style={styles.title}>
        {deal.contact_name}
      </ThemedText>
      <ThemedText type="body" style={styles.subtitle}>
        {deal.company}
      </ThemedText>

      <View style={styles.section}>
        <ThemedText type="small" style={styles.label}>
          Pipeline Stage
        </ThemedText>
        <View style={styles.stageRow}>
          {STAGES.map((stage) => {
            const isActive = stage.key === deal.stage;
            return (
              <Badge
                key={stage.key}
                label={stage.label}
                color={isActive ? stage.color : theme.backgroundSecondary}
                textColor={isActive ? "#FFFFFF" : theme.textSecondary}
                size="medium"
              />
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={styles.label}>
          Deal Value
        </ThemedText>
        <TextInput
          value={value}
          onChangeText={setValue}
          keyboardType="numeric"
          placeholder="0"
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.backgroundSecondary,
            },
          ]}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={styles.label}>
          Contact
        </ThemedText>
        <ThemedText type="body">{deal.phone}</ThemedText>
        <ThemedText type="body">{deal.email}</ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={styles.label}>
          Notes
        </ThemedText>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          placeholder="Add notes..."
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.notesInput,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.backgroundSecondary,
            },
          ]}
        />
      </View>

      <Button onPress={handleSave} disabled={saving} style={styles.saveButton}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    opacity: 0.8,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  stageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
    textAlignVertical: "top",
  },
  saveButton: {
    marginBottom: Spacing["3xl"],
  },
});
