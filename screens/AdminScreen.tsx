import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Modal, FlatList, Switch, TextInput, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, AppColors } from "@/constants/theme";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
}

interface AnalyticData {
  label: string;
  value: number;
  change: number;
}

interface AdminCourse {
  id: string;
  title: string;
  instructor: string;
  price: number;
  duration: string;
  level: "beginner" | "intermediate" | "advanced";
}

interface AdminLead {
  id: string;
  industry: string;
  location: string;
  address: string;
  price: number;
  qualityScore: number;
  contactName: string;
  phone: string;
}

export default function AdminScreen() {
  const { theme } = useTheme();
  const { logout, user } = useAuth();
  const insets = useSafeAreaInsets();
  const paddingTop = insets.top + Spacing.xl;
  const paddingBottom = insets.bottom + Spacing.xl;

  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCoursesModal, setShowCoursesModal] = useState(false);
  const [showJobsModal, setShowJobsModal] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [coursePrice, setCoursePrice] = useState("");
  const [leadContact, setLeadContact] = useState("");
  const [leadPrice, setLeadPrice] = useState("");
  const [leadAddress, setLeadAddress] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobSalary, setJobSalary] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([
    { id: "1", name: "John Doe", email: "john@hd2d.com", role: "Sales Rep", status: "active" },
    { id: "2", name: "Jane Smith", email: "jane@hd2d.com", role: "Sales Rep", status: "active" },
    { id: "3", name: "Mike Johnson", email: "mike@hd2d.com", role: "Company Owner", status: "inactive" },
    { id: "4", name: "Sarah Williams", email: "sarah@hd2d.com", role: "Sales Rep", status: "active" },
  ]);

  const [courses, setCourses] = useState<AdminCourse[]>([
    { id: "1", title: "D2D Mastery Certification", instructor: "Mike Reynolds", price: 497, duration: "8 weeks", level: "beginner" },
    { id: "2", title: "Roofing Sales Accelerator", instructor: "Sarah Martinez", price: 997, duration: "10 weeks", level: "intermediate" },
  ]);

  const [jobs, setJobs] = useState([
    { id: "1", title: "Senior Closer", location: "Remote", salary: "$120k OTE", description: "Drive enterprise deals and mentor reps." },
    { id: "2", title: "Field Sales Rep", location: "Dallas, TX", salary: "$80k OTE", description: "Local territory coverage for home services." },
  ]);

  const [platformSettings, setPlatformSettings] = useState({
    maintenanceMode: false,
    leadNotifications: true,
    autoApproval: true,
    analyticsTracking: true,
  });

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      await logout();
      if (typeof window !== "undefined") {
        window.location.reload();
      }
      return;
    }
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: logout,
        style: "destructive",
      },
    ]);
  };

  const toggleUserStatus = (userId: string) => {
    setUsers(users.map(u =>
      u.id === userId ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u
    ));
  };

  const handleAddJob = () => {
    if (!jobTitle.trim() || !jobLocation.trim() || !jobSalary.trim()) {
      Alert.alert("Missing fields", "Please enter job title, location, and salary.");
      return;
    }
    const newJob = {
      id: (jobs.length + 1).toString(),
      title: jobTitle.trim(),
      location: jobLocation.trim(),
      salary: jobSalary.trim(),
      description: jobDescription.trim() || "No description provided.",
    };
    setJobs([...jobs, newJob]);
    setJobTitle("");
    setJobLocation("");
    setJobSalary("");
    setJobDescription("");
    Alert.alert("Job added", "Job posting created.");
  };

  const adminStats = [
    { label: "Total Users", value: "1,247", icon: "users" as const },
    { label: "Active Sales Reps", value: "892", icon: "user-check" as const },
    { label: "Companies", value: "143", icon: "briefcase" as const },
    { label: "Revenue (Month)", value: "$47.2K", icon: "dollar-sign" as const },
  ];

  const analyticsData: AnalyticData[] = [
    { label: "Daily Active Users", value: 1247, change: 12 },
    { label: "New Leads Posted", value: 324, change: 8 },
    { label: "Lead Conversions", value: 89, change: 5 },
    { label: "Platform Commissions", value: 47200, change: 15 },
  ];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop }]}>
        <ThemedText type="h2">Admin Dashboard</ThemedText>
        <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
          Welcome, {user?.name}
        </ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          {adminStats.map((stat, index) => (
            <Card key={index} elevation={1} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: AppColors.primary + "20" }]}>
                <Feather name={stat.icon} size={24} color={AppColors.primary} />
              </View>
              <ThemedText type="h3" style={styles.statValue}>
                {stat.value}
              </ThemedText>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
                {stat.label}
              </ThemedText>
            </Card>
          ))}
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Administration
        </ThemedText>

        <Card elevation={1} style={styles.adminCard}>
          <Pressable style={styles.adminOption} onPress={() => setShowUsersModal(true)}>
            <View style={[styles.adminIcon, { backgroundColor: "#3B82F6" + "20" }]}>
              <Feather name="users" size={24} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4">Manage Users</ThemedText>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
                View and manage all users
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        </Card>

        <Card elevation={1} style={styles.adminCard}>
          <Pressable style={styles.adminOption} onPress={() => setShowAnalyticsModal(true)}>
            <View style={[styles.adminIcon, { backgroundColor: "#10B981" + "20" }]}>
              <Feather name="trending-up" size={24} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4">Platform Analytics</ThemedText>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
                View platform metrics and reports
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        </Card>

        <Card elevation={1} style={styles.adminCard}>
          <Pressable style={styles.adminOption} onPress={() => setShowSettingsModal(true)}>
            <View style={[styles.adminIcon, { backgroundColor: "#F59E0B" + "20" }]}>
              <Feather name="settings" size={24} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4">Platform Settings</ThemedText>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
                Configure platform features
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        </Card>

        <Card elevation={1} style={styles.adminCard}>
          <Pressable style={styles.adminOption} onPress={() => setShowCoursesModal(true)}>
            <View style={[styles.adminIcon, { backgroundColor: "#8B5CF6" + "20" }]}>
              <Feather name="book" size={24} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4">Manage Courses</ThemedText>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
                Add and manage training courses
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        </Card>

        <Card elevation={1} style={styles.adminCard}>
          <Pressable style={styles.adminOption} onPress={() => setShowJobsModal(true)}>
            <View style={[styles.adminIcon, { backgroundColor: "#0EA5E9" + "20" }]}>
              <Feather name="briefcase" size={24} color="#0EA5E9" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4">Manage Job Postings</ThemedText>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
                Add and manage jobs for users
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        </Card>

        <Button
          onPress={handleLogout}
          style={[
            styles.logoutButton,
            { backgroundColor: AppColors.error },
          ]}
        >
          Logout
        </Button>
      </ScrollView>

      {/* Users Management Modal */}
      <Modal visible={showUsersModal} animationType="slide" transparent>
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.lg }]}>
            <ThemedText type="h3">Manage Users</ThemedText>
            <Pressable onPress={() => setShowUsersModal(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Card elevation={1} style={styles.userCard}>
                <View style={styles.userRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="h4">{item.name}</ThemedText>
                    <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                      {item.email}
                    </ThemedText>
                    <ThemedText style={{ color: theme.textSecondary, fontSize: 12, marginTop: Spacing.xs }}>
                      {item.role}
                    </ThemedText>
                  </View>
                  <Switch
                    value={item.status === "active"}
                    onValueChange={() => toggleUserStatus(item.id)}
                  />
                </View>
              </Card>
            )}
          />
        </ThemedView>
      </Modal>

      {/* Analytics Modal */}
      <Modal visible={showAnalyticsModal} animationType="slide" transparent>
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.lg }]}>
            <ThemedText type="h3">Platform Analytics</ThemedText>
            <Pressable onPress={() => setShowAnalyticsModal(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <FlatList
            data={analyticsData}
            keyExtractor={(item) => item.label}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Card elevation={1} style={styles.analyticsCard}>
                <View style={styles.analyticsRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
                      {item.label}
                    </ThemedText>
                    <ThemedText type="h2" style={{ marginTop: Spacing.sm }}>
                      {item.value.toLocaleString()}
                    </ThemedText>
                  </View>
                  <View style={styles.changeIndicator}>
                    <Feather name="trending-up" size={20} color={AppColors.accent} />
                    <ThemedText style={{ color: AppColors.accent, fontWeight: "600" }}>
                      +{item.change}%
                    </ThemedText>
                  </View>
                </View>
              </Card>
            )}
          />
        </ThemedView>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.lg }]}>
            <ThemedText type="h3">Platform Settings</ThemedText>
            <Pressable onPress={() => setShowSettingsModal(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.listContent}>
            {Object.entries(platformSettings).map(([key, value]) => (
              <Card key={key} elevation={1} style={styles.settingsCard}>
                <View style={styles.settingsRow}>
                  <ThemedText type="h4" style={{ flex: 1 }}>
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </ThemedText>
                  <Switch
                    value={value}
                    onValueChange={(newValue) =>
                      setPlatformSettings((prev) => ({ ...prev, [key]: newValue }))
                    }
                  />
                </View>
              </Card>
            ))}
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* Courses Modal */}
      <Modal visible={showCoursesModal} animationType="slide" transparent>
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.lg }]}>
            <ThemedText type="h3">Manage Courses</ThemedText>
            <Pressable onPress={() => setShowCoursesModal(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <FlatList
            data={courses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.formContainer}>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  placeholder="Course Title"
                  placeholderTextColor={theme.textSecondary}
                  value={courseTitle}
                  onChangeText={setCourseTitle}
                />
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  placeholder="Course Price"
                  placeholderTextColor={theme.textSecondary}
                  value={coursePrice}
                  onChangeText={setCoursePrice}
                  keyboardType="numeric"
                />
                <Button
                  onPress={() => {
                    if (courseTitle && coursePrice) {
                      setCourses([...courses, {
                        id: (courses.length + 1).toString(),
                        title: courseTitle,
                        instructor: "Admin",
                        price: parseInt(coursePrice),
                        duration: "8 weeks",
                        level: "beginner"
                      }]);
                      setCourseTitle("");
                      setCoursePrice("");
                    }
                  }}
                >
                  Add Course
                </Button>
              </View>
            }
            renderItem={({ item }) => (
              <Card elevation={1} style={styles.itemCard}>
                <View style={styles.itemContent}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="h4">{item.title}</ThemedText>
                    <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                      {item.instructor}
                    </ThemedText>
                    <ThemedText type="h3" style={{ marginTop: Spacing.sm, color: AppColors.primary }}>
                      ${item.price}
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => setCourses(courses.filter(c => c.id !== item.id))}>
                    <Feather name="trash-2" size={20} color={AppColors.error} />
                  </Pressable>
                </View>
              </Card>
            )}
          />
        </ThemedView>
      </Modal>

      {/* Jobs Modal */}
      <Modal visible={showJobsModal} animationType="slide" transparent>
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.lg }]}>
            <ThemedText type="h3">Manage Job Postings</ThemedText>
            <Pressable onPress={() => setShowJobsModal(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <FlatList
            data={jobs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.formContainer}>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  placeholder="Job Title"
                  placeholderTextColor={theme.textSecondary}
                  value={jobTitle}
                  onChangeText={setJobTitle}
                />
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  placeholder="Location"
                  placeholderTextColor={theme.textSecondary}
                  value={jobLocation}
                  onChangeText={setJobLocation}
                />
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  placeholder="Salary (e.g., $100k OTE)"
                  placeholderTextColor={theme.textSecondary}
                  value={jobSalary}
                  onChangeText={setJobSalary}
                />
                <TextInput
                  style={[styles.textArea, { color: theme.text, borderColor: theme.border }]}
                  placeholder="Description"
                  placeholderTextColor={theme.textSecondary}
                  value={jobDescription}
                  onChangeText={setJobDescription}
                  multiline
                  numberOfLines={3}
                />
                <Button onPress={handleAddJob}>Add Job</Button>
              </View>
            }
            renderItem={({ item }) => (
              <Card elevation={1} style={styles.itemCard}>
                <View style={styles.itemContent}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="h4">{item.title}</ThemedText>
                    <ThemedText style={{ color: theme.textSecondary, fontSize: 12, marginTop: Spacing.xs }}>
                      {item.location}
                    </ThemedText>
                    <ThemedText style={{ color: theme.textSecondary, fontSize: 12, marginTop: Spacing.xs }}>
                      {item.salary}
                    </ThemedText>
                    <ThemedText style={{ color: theme.textSecondary, fontSize: 12, marginTop: Spacing.xs }}>
                      {item.description}
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => setJobs(jobs.filter((j) => j.id !== item.id))}>
                    <Feather name="trash-2" size={20} color={AppColors.error} />
                  </Pressable>
                </View>
              </Card>
            )}
          />
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing["3xl"],
  },
  statCard: {
    width: "48%",
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  statValue: {
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  adminCard: {
    marginBottom: Spacing.md,
  },
  adminOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  adminIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutButton: {
    marginTop: Spacing["3xl"],
    marginBottom: Spacing.xl,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  userCard: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  analyticsCard: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  analyticsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  changeIndicator: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 14,
    minHeight: 96,
    textAlignVertical: "top",
  },
  settingsCard: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formContainer: {
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 14,
  },
  itemCard: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  itemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  agentStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
