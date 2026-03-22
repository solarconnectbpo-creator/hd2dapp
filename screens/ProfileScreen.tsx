import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import {
  Spacing,
  BorderRadius,
  AppColors,
  Typography,
} from "@/constants/theme";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";
import * as Haptics from "expo-haptics";

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, "Profile">;
};

const STATS = [
  { label: "Deals Closed", value: "47", icon: "check-circle" },
  { label: "Revenue", value: "$285K", icon: "dollar-sign" },
  { label: "Certifications", value: "3", icon: "award" },
];

const MENU_ITEMS = [
  { key: "BusinessCard", icon: "credit-card", label: "Business Card" },
  { key: "Courses", icon: "book-open", label: "Courses & Certifications" },
  { key: "Jobs", icon: "briefcase", label: "Job Postings" },
];

const RECENT_ACTIVITY = [
  {
    type: "deal",
    text: "Closed deal with Miller Residence",
    time: "2 hours ago",
  },
  { type: "cert", text: "Earned Solar Pro Certification", time: "1 day ago" },
  {
    type: "course",
    text: "Completed Advanced Closing course",
    time: "3 days ago",
  },
];

interface BusinessCard {
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { paddingTop, paddingBottom } = useScreenInsets();
  const [showBusinessCard, setShowBusinessCard] = useState(false);
  const [businessCard, setBusinessCard] = useState<BusinessCard>({
    title: "Sales Representative",
    company: user?.company || "HD2D",
    email: user?.email || "contact@hd2d.com",
    phone: user?.phone || "+1-800-CLOSERS",
    website: "www.hd2d.com",
    address: "Nationwide",
  });
  const [editCard, setEditCard] = useState<BusinessCard>({ ...businessCard });
  const [isEditMode, setIsEditMode] = useState(false);

  const handleMenuPress = (key: string) => {
    if (key === "BusinessCard") {
      setShowBusinessCard(true);
    } else if (key === "Courses" || key === "Jobs") {
      navigation.navigate(key as any);
    }
  };

  const handleSaveCard = () => {
    setBusinessCard({ ...editCard });
    setIsEditMode(false);
    Alert.alert("Success", "Business card updated!");
  };

  const handleShareCard = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Alert.alert("Share", "Business card sharing coming soon!");
  };

  const handleLogout = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (Platform.OS === "web") {
      await logout();
      if (typeof window !== "undefined") {
        window.location.reload();
      }
      return;
    }
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleForceLogout = async () => {
    try {
      await logout();
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error) {
      console.error("Force logout failed:", error);
      Alert.alert(
        "Logout error",
        "Unable to logout. Please refresh and try again.",
      );
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "deal":
        return "check-circle";
      case "cert":
        return "award";
      case "course":
        return "book-open";
      default:
        return "activity";
    }
  };

  const displayName = user?.name || "User";
  const userRole =
    user?.userType === "company"
      ? `${user.company || "Company"} Account`
      : "Sales Representative";
  const userBadges =
    user?.userType === "company"
      ? [{ label: "Company", color: AppColors.secondary }]
      : [
          { label: "Top Closer", color: AppColors.accent },
          { label: "Sales Rep", color: AppColors.primary },
        ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <Avatar name={displayName} index={0} size={80} />
        <ThemedText type="h2" style={styles.userName}>
          {displayName}
        </ThemedText>
        <ThemedText style={[styles.userRole, { color: theme.textSecondary }]}>
          {userRole}
        </ThemedText>
        <View style={styles.badges}>
          {userBadges.map((badge, index) => (
            <Badge
              key={index}
              label={badge.label}
              color={badge.color}
              size="medium"
            />
          ))}
        </View>
      </View>

      <View style={styles.statsContainer}>
        {STATS.map((stat) => (
          <Card key={stat.label} elevation={1} style={styles.statCard}>
            <Feather
              name={stat.icon as any}
              size={20}
              color={AppColors.primary}
              style={styles.statIcon}
            />
            <ThemedText type="h3" style={styles.statValue}>
              {stat.value}
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: theme.textSecondary }]}
            >
              {stat.label}
            </ThemedText>
          </Card>
        ))}
      </View>

      <View style={styles.menuSection}>
        {MENU_ITEMS.map((item) => (
          <Card
            key={item.key}
            elevation={1}
            onPress={() => handleMenuPress(item.key)}
            style={styles.menuItem}
          >
            <View style={styles.menuItemContent}>
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather
                  name={item.icon as any}
                  size={20}
                  color={AppColors.primary}
                />
              </View>
              <ThemedText type="h4">{item.label}</ThemedText>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={theme.textSecondary}
            />
          </Card>
        ))}
      </View>

      <View style={styles.activitySection}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Recent Activity
        </ThemedText>
        {RECENT_ACTIVITY.map((activity, index) => (
          <View key={index} style={styles.activityItem}>
            <View
              style={[
                styles.activityIcon,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <Feather
                name={getActivityIcon(activity.type) as any}
                size={16}
                color={AppColors.primary}
              />
            </View>
            <View style={styles.activityContent}>
              <ThemedText style={styles.activityText}>
                {activity.text}
              </ThemedText>
              <ThemedText
                style={[styles.activityTime, { color: theme.textSecondary }]}
              >
                {activity.time}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        style={[styles.settingsButton, { borderColor: theme.border }]}
        onPress={() => Alert.alert("Settings", "Settings screen coming soon!")}
      >
        <Feather name="settings" size={20} color={theme.textSecondary} />
        <ThemedText
          style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}
        >
          Settings
        </ThemedText>
      </Pressable>

      <Pressable
        style={[
          styles.logoutButton,
          { backgroundColor: AppColors.error + "15" },
        ]}
        onPress={handleLogout}
      >
        <Feather name="log-out" size={20} color={AppColors.error} />
        <ThemedText
          style={{
            color: AppColors.error,
            marginLeft: Spacing.sm,
            fontWeight: "500",
          }}
        >
          Log Out
        </ThemedText>
      </Pressable>

      <Button
        variant="secondary"
        onPress={handleForceLogout}
        style={{ marginBottom: Spacing.xl }}
      >
        Force Logout
      </Button>

      <Modal
        visible={showBusinessCard}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowBusinessCard(false);
          setIsEditMode(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.cardModalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Business Card</ThemedText>
              <Pressable
                onPress={() => {
                  setShowBusinessCard(false);
                  setIsEditMode(false);
                }}
              >
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {!isEditMode ? (
              <ScrollView style={styles.modalBody}>
                {/* Business Card Display */}
                <Card
                  elevation={2}
                  style={[
                    styles.businessCardPreview,
                    { backgroundColor: AppColors.primary + "10" },
                  ]}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Avatar name={displayName} index={0} size={48} />
                      <View style={styles.cardNameContainer}>
                        <ThemedText type="h4">{displayName}</ThemedText>
                        <ThemedText
                          style={{ color: theme.textSecondary, fontSize: 12 }}
                        >
                          {businessCard.title}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.cardDetails}>
                      <View style={styles.cardDetail}>
                        <Feather
                          name="briefcase"
                          size={16}
                          color={AppColors.primary}
                        />
                        <ThemedText style={styles.cardDetailText}>
                          {businessCard.company}
                        </ThemedText>
                      </View>
                      <View style={styles.cardDetail}>
                        <Feather
                          name="mail"
                          size={16}
                          color={AppColors.primary}
                        />
                        <ThemedText style={styles.cardDetailText}>
                          {businessCard.email}
                        </ThemedText>
                      </View>
                      <View style={styles.cardDetail}>
                        <Feather
                          name="phone"
                          size={16}
                          color={AppColors.primary}
                        />
                        <ThemedText style={styles.cardDetailText}>
                          {businessCard.phone}
                        </ThemedText>
                      </View>
                      {businessCard.website && (
                        <View style={styles.cardDetail}>
                          <Feather
                            name="globe"
                            size={16}
                            color={AppColors.primary}
                          />
                          <ThemedText style={styles.cardDetailText}>
                            {businessCard.website}
                          </ThemedText>
                        </View>
                      )}
                      {businessCard.address && (
                        <View style={styles.cardDetail}>
                          <Feather
                            name="map-pin"
                            size={16}
                            color={AppColors.primary}
                          />
                          <ThemedText style={styles.cardDetailText}>
                            {businessCard.address}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                </Card>

                <View style={styles.cardActionButtons}>
                  <Button
                    onPress={() => setIsEditMode(true)}
                    style={styles.halfButton}
                  >
                    Edit
                  </Button>
                  <Button
                    onPress={handleShareCard}
                    style={[
                      styles.halfButton,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    Share
                  </Button>
                </View>
              </ScrollView>
            ) : (
              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
              >
                <ThemedText type="h4" style={styles.editFormTitle}>
                  Edit Business Card
                </ThemedText>

                <View style={styles.formField}>
                  <ThemedText type="small" style={styles.label}>
                    Title
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundDefault,
                        color: theme.text,
                      },
                    ]}
                    value={editCard.title}
                    onChangeText={(text) =>
                      setEditCard({ ...editCard, title: text })
                    }
                    placeholder="Your job title"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={styles.formField}>
                  <ThemedText type="small" style={styles.label}>
                    Company
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundDefault,
                        color: theme.text,
                      },
                    ]}
                    value={editCard.company}
                    onChangeText={(text) =>
                      setEditCard({ ...editCard, company: text })
                    }
                    placeholder="Company name"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={styles.formField}>
                  <ThemedText type="small" style={styles.label}>
                    Email
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundDefault,
                        color: theme.text,
                      },
                    ]}
                    value={editCard.email}
                    onChangeText={(text) =>
                      setEditCard({ ...editCard, email: text })
                    }
                    placeholder="Email address"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.formField}>
                  <ThemedText type="small" style={styles.label}>
                    Phone
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundDefault,
                        color: theme.text,
                      },
                    ]}
                    value={editCard.phone}
                    onChangeText={(text) =>
                      setEditCard({ ...editCard, phone: text })
                    }
                    placeholder="Phone number"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.formField}>
                  <ThemedText type="small" style={styles.label}>
                    Website
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundDefault,
                        color: theme.text,
                      },
                    ]}
                    value={editCard.website}
                    onChangeText={(text) =>
                      setEditCard({ ...editCard, website: text })
                    }
                    placeholder="Website URL"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={styles.formField}>
                  <ThemedText type="small" style={styles.label}>
                    Address
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundDefault,
                        color: theme.text,
                      },
                    ]}
                    value={editCard.address}
                    onChangeText={(text) =>
                      setEditCard({ ...editCard, address: text })
                    }
                    placeholder="Business address"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={styles.cardActionButtons}>
                  <Button onPress={handleSaveCard} style={styles.halfButton}>
                    Save
                  </Button>
                  <Button
                    onPress={() => {
                      setEditCard({ ...businessCard });
                      setIsEditMode(false);
                    }}
                    style={[
                      styles.halfButton,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    Cancel
                  </Button>
                </View>
              </ScrollView>
            )}
          </ThemedView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  userName: {
    marginTop: Spacing.md,
  },
  userRole: {
    marginTop: Spacing.xs,
  },
  badges: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  statsContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  statIcon: {
    marginBottom: Spacing.sm,
  },
  statValue: {
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  menuSection: {
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  activitySection: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  cardModalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "95%",
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
  businessCardPreview: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  cardContent: {
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  cardNameContainer: {
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(128,128,128,0.2)",
    marginVertical: Spacing.md,
  },
  cardDetails: {
    gap: Spacing.md,
  },
  cardDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  cardDetailText: {
    fontSize: 13,
    flex: 1,
  },
  cardActionButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing["3xl"],
  },
  halfButton: {
    flex: 1,
  },
  editFormTitle: {
    marginBottom: Spacing.lg,
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
});
