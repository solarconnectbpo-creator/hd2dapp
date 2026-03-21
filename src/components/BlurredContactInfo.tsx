import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Spacing, AppColors, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface BlurredContactInfoProps {
  phone: string;
  email: string;
  isPurchased: boolean;
  price: number;
  onPurchase: () => void;
}

export function BlurredContactInfo({
  phone,
  email,
  isPurchased,
  price,
  onPurchase,
}: BlurredContactInfoProps) {
  const { theme } = useTheme();

  if (isPurchased) {
    return (
      <View style={styles.contactContainer}>
        <View style={styles.contactItem}>
          <Feather name="phone" size={16} color={AppColors.accent} />
          <ThemedText style={{ marginLeft: Spacing.sm, fontWeight: '500' }}>
            {phone}
          </ThemedText>
        </View>
        <View style={styles.contactItem}>
          <Feather name="mail" size={16} color={AppColors.accent} />
          <ThemedText style={{ marginLeft: Spacing.sm, fontWeight: '500' }}>
            {email}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <Card elevation={1} style={[styles.blurredCard, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={styles.blurredContent}>
        <View style={styles.blurredRow}>
          <Feather name="phone" size={16} color={theme.textSecondary} />
          <View style={[styles.blurBox, { backgroundColor: AppColors.primary + '30' }]}>
            <ThemedText style={{ color: theme.textSecondary, opacity: 0.3 }}>
              {phone}
            </ThemedText>
          </View>
        </View>
        <View style={styles.blurredRow}>
          <Feather name="mail" size={16} color={theme.textSecondary} />
          <View style={[styles.blurBox, { backgroundColor: AppColors.primary + '30' }]}>
            <ThemedText style={{ color: theme.textSecondary, opacity: 0.3 }}>
              {email}
            </ThemedText>
          </View>
        </View>
      </View>
      <View style={styles.lockSection}>
        <Feather name="lock" size={18} color={AppColors.error} />
        <ThemedText type="h4" style={{ marginTop: Spacing.md, marginBottom: Spacing.sm, textAlign: 'center' }}>
          Contact Info Locked
        </ThemedText>
        <ThemedText style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.lg, fontSize: 12 }}>
          Purchase this lead to unlock contact details
        </ThemedText>
      </View>
      <Button
        onPress={onPurchase}
        style={[styles.purchaseButton, { backgroundColor: AppColors.accent }]}
      >
        <ThemedText type="h4" style={{ color: '#FFFFFF', textAlign: 'center' }}>
          Unlock for ${price}
        </ThemedText>
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  contactContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blurredCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  blurredContent: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  blurredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  blurBox: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    height: 24,
    justifyContent: 'center',
  },
  lockSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  purchaseButton: {
    paddingVertical: Spacing.md,
  },
});
