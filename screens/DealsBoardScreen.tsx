import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  Pressable,
} from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { STAGES } from "@/data/mockData";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CRMStackParamList } from "@/navigation/CRMStackNavigator";

export interface Deal {
  id: string;
  contact_name: string;
  company: string;
  value: number;
  stage: string;
  daysInStage?: number;
  phone: string;
  email: string;
  notes: string;
  industry?: string;
  created_at: string;
}

type Props = NativeStackScreenProps<CRMStackParamList, "DealsBoard">;

export default function DealsBoardScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDeals = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = (await apiClient.getDeals()) as Deal[];
      setDeals(data || []);
    } catch (e) {
      console.error("Error loading deals:", e);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const groupedDeals = useMemo(() => {
    const groups: Record<string, Deal[]> = {};
    STAGES.forEach((s) => (groups[s.key] = []));
    deals.forEach((deal) => {
      const k = deal.stage || "new";
      if (!groups[k]) groups[k] = [];
      groups[k].push(deal);
    });
    return groups;
  }, [deals]);

  const renderDealCard = (deal: Deal) => (
    <Pressable
      key={deal.id}
      onPress={() =>
        navigation.navigate("DealDetail", {
          dealId: deal.id,
        })
      }
      style={{ marginBottom: Spacing.sm }}
    >
      <Card elevation={2} style={styles.dealCard}>
        <ThemedText type="h4">{deal.contact_name}</ThemedText>
        <ThemedText type="small" style={styles.company}>
          {deal.company}
        </ThemedText>
        <ThemedText type="body" style={styles.value}>
          ${deal.value?.toLocaleString() || 0}
        </ThemedText>
        <ThemedText type="caption" style={styles.meta}>
          {deal.phone}
        </ThemedText>
      </Card>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText type="h2">Pipeline</ThemedText>
        <Button
          variant="secondary"
          onPress={loadDeals}
          style={styles.refreshButton}
        >
          Refresh
        </Button>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.board}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadDeals}
            tintColor={theme.text}
          />
        }
      >
        {STAGES.map((stage) => (
          <View
            key={stage.key}
            style={[
              styles.column,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <View style={styles.columnHeader}>
              <ThemedText type="h4">{stage.label}</ThemedText>
              <Badge
                label={String(groupedDeals[stage.key]?.length ?? 0)}
                color={stage.color}
              />
            </View>
            <FlatList
              data={groupedDeals[stage.key] || []}
              keyExtractor={(d) => d.id}
              renderItem={({ item }) => renderDealCard(item)}
              scrollEnabled={false}
            />
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  refreshButton: {
    minWidth: 100,
  },
  board: {
    paddingBottom: Spacing["3xl"],
    gap: Spacing.md,
  },
  column: {
    width: 260,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  columnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  dealCard: {
    borderRadius: BorderRadius.md,
  },
  company: {
    opacity: 0.8,
    marginTop: 2,
  },
  value: {
    marginTop: 4,
    fontWeight: "600",
  },
  meta: {
    marginTop: 2,
    opacity: 0.7,
  },
});
