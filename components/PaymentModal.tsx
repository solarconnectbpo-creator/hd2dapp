import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, AppColors } from "@/constants/theme";

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  currency: string;
  description: string;
  itemName: string;
  onSuccess: (transactionId: string) => void;
}

export function PaymentModal({
  visible,
  onClose,
  amount,
  currency,
  description,
  itemName,
  onSuccess,
}: PaymentModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("");

  const handlePayment = async () => {
    if (!cardNumber || cardNumber.length < 4) {
      Alert.alert("Error", "Please enter card details");
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate payment processing with a delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const transactionId = `txn_${Date.now()}`;
      Alert.alert("Success", "Payment processed successfully!");
      onSuccess(transactionId);
      onClose();
      setCardNumber("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Payment processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const formattedAmount = (amount / 100).toFixed(2);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <ThemedText type="h3">Complete Payment</ThemedText>
          <Pressable onPress={onClose} disabled={isProcessing}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        <View
          style={[
            styles.content,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
        >
          <Card elevation={1} style={styles.summaryCard}>
            <ThemedText type="h4" style={styles.itemName}>
              {itemName}
            </ThemedText>
            <ThemedText
              style={{
                color: theme.textSecondary,
                fontSize: 13,
                marginTop: Spacing.sm,
              }}
            >
              {description}
            </ThemedText>
            <View style={styles.divider} />
            <View style={styles.amountRow}>
              <ThemedText style={{ color: theme.textSecondary }}>
                Total Amount
              </ThemedText>
              <ThemedText type="h2" style={{ color: AppColors.primary }}>
                ${formattedAmount} {currency.toUpperCase()}
              </ThemedText>
            </View>
          </Card>

          <View style={styles.infoBox}>
            <Feather name="info" size={16} color="#3B82F6" />
            <ThemedText
              style={{
                color: "#3B82F6",
                fontSize: 12,
                marginLeft: Spacing.sm,
                flex: 1,
              }}
            >
              Test Mode: Use card 4242 4242 4242 4242, any future date & CVC
            </ThemedText>
          </View>

          <TextInput
            style={[
              styles.cardInput,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.backgroundDefault,
              },
            ]}
            placeholder="Card Number (4242 4242 4242 4242)"
            placeholderTextColor={theme.textSecondary}
            value={cardNumber}
            onChangeText={setCardNumber}
            keyboardType="numeric"
            maxLength={19}
            editable={!isProcessing}
          />

          <Button
            onPress={handlePayment}
            disabled={isProcessing}
            style={styles.payButton}
          >
            {isProcessing ? (
              <ActivityIndicator color={AppColors.secondary} />
            ) : (
              <ThemedText type="h4" style={{ color: AppColors.secondary }}>
                Pay ${formattedAmount}
              </ThemedText>
            )}
          </Button>

          <Pressable
            onPress={onClose}
            disabled={isProcessing}
            style={styles.cancelButton}
          >
            <ThemedText style={{ color: theme.textSecondary }}>
              Cancel
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  summaryCard: {
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
  },
  itemName: {
    marginBottom: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(128,128,128,0.1)",
    marginVertical: Spacing.md,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.xl,
  },
  cardInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    fontSize: 14,
  },
  payButton: {
    marginBottom: Spacing.md,
    backgroundColor: AppColors.primary,
  },
  cancelButton: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
});
