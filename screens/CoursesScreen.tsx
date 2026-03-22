import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { PaymentModal } from "@/components/PaymentModal";
import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import {
  COURSES,
  CERTIFICATIONS,
  Course,
  Certification,
} from "@/data/mockData";

const LEVEL_COLORS: Record<string, string> = {
  beginner: AppColors.accent,
  intermediate: "#F59E0B",
  advanced: AppColors.error,
};

type TabKey = "all" | "my" | "certs";

export default function CoursesScreen() {
  const { theme, isDark } = useTheme();
  const { paddingTop, paddingBottom } = useScreenInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [courses, setCourses] = useState(COURSES);
  const [certifications] = useState(CERTIFICATIONS);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const filteredCourses =
    activeTab === "my" ? courses.filter((c) => c.enrolled) : courses;

  const handleEnroll = (course: Course) => {
    setShowPayment(true);
  };

  const handlePaymentSuccess = (transactionId: string) => {
    if (selectedCourse) {
      setCourses((prev) =>
        prev.map((c) =>
          c.id === selectedCourse.id ? { ...c, enrolled: true } : c,
        ),
      );
    }
    setSelectedCourse(null);
    setShowPayment(false);
    Alert.alert("Success", "You are now enrolled in this course!");
  };

  const renderTab = (key: TabKey, label: string) => (
    <Pressable
      key={key}
      onPress={() => setActiveTab(key)}
      style={[
        styles.tab,
        {
          backgroundColor:
            activeTab === key ? AppColors.primary : theme.backgroundDefault,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.tabText,
          { color: activeTab === key ? "#FFFFFF" : theme.text },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  const renderCourse = (course: Course) => (
    <Card
      key={course.id}
      elevation={1}
      onPress={() => setSelectedCourse(course)}
      style={styles.courseCard}
    >
      <View style={styles.courseHeader}>
        <View
          style={[
            styles.courseThumbnail,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="play-circle" size={24} color={theme.textSecondary} />
        </View>
        <View style={styles.courseInfo}>
          <ThemedText type="h4" numberOfLines={1}>
            {course.title}
          </ThemedText>
          <ThemedText
            style={[styles.instructor, { color: theme.textSecondary }]}
          >
            {course.instructor}
          </ThemedText>
        </View>
      </View>
      <View style={styles.courseMeta}>
        <Badge label={course.level} color={LEVEL_COLORS[course.level]} />
        <ThemedText style={[styles.duration, { color: theme.textSecondary }]}>
          {course.duration}
        </ThemedText>
        {course.enrolled ? (
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <View
                style={[styles.progressFill, { width: `${course.progress}%` }]}
              />
            </View>
            <ThemedText
              style={[styles.progressText, { color: theme.textSecondary }]}
            >
              {course.progress}%
            </ThemedText>
          </View>
        ) : (
          <ThemedText style={{ color: AppColors.primary, fontWeight: "600" }}>
            ${course.price}
          </ThemedText>
        )}
      </View>
    </Card>
  );

  const renderCertification = (cert: Certification) => (
    <Card key={cert.id} elevation={1} style={styles.certCard}>
      <View style={styles.certHeader}>
        <View
          style={[
            styles.certBadge,
            {
              backgroundColor: cert.earned
                ? AppColors.accent
                : theme.backgroundSecondary,
            },
          ]}
        >
          <Feather
            name="award"
            size={24}
            color={cert.earned ? "#FFFFFF" : theme.textSecondary}
          />
        </View>
        <View style={styles.certInfo}>
          <ThemedText type="h4">{cert.name}</ThemedText>
          <ThemedText style={[styles.certReq, { color: theme.textSecondary }]}>
            {cert.requirements}
          </ThemedText>
        </View>
        {cert.earned ? (
          <Feather name="check-circle" size={24} color={AppColors.accent} />
        ) : null}
      </View>
      {!cert.earned ? (
        <View style={styles.certProgress}>
          <View
            style={[
              styles.progressBar,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <View
              style={[styles.progressFill, { width: `${cert.progress}%` }]}
            />
          </View>
          <ThemedText
            style={[styles.progressText, { color: theme.textSecondary }]}
          >
            {cert.progress}%
          </ThemedText>
        </View>
      ) : null}
    </Card>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop }]}>
        <View style={styles.tabs}>
          {renderTab("all", "All Courses")}
          {renderTab("my", "My Courses")}
          {renderTab("certs", "Certifications")}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "certs"
          ? certifications.map(renderCertification)
          : filteredCourses.map(renderCourse)}
      </ScrollView>

      <Modal
        visible={!!selectedCourse}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedCourse(null)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Course Details</ThemedText>
              <Pressable onPress={() => setSelectedCourse(null)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            {selectedCourse ? (
              <ScrollView style={styles.modalBody}>
                <View
                  style={[
                    styles.modalThumbnail,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <Feather
                    name="play-circle"
                    size={48}
                    color={theme.textSecondary}
                  />
                </View>
                <ThemedText type="h2" style={styles.modalTitle}>
                  {selectedCourse.title}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.modalInstructor,
                    { color: theme.textSecondary },
                  ]}
                >
                  by {selectedCourse.instructor}
                </ThemedText>
                <View style={styles.modalMeta}>
                  <Badge
                    label={selectedCourse.level}
                    color={LEVEL_COLORS[selectedCourse.level]}
                    size="medium"
                  />
                  <View style={styles.durationContainer}>
                    <Feather
                      name="clock"
                      size={14}
                      color={theme.textSecondary}
                    />
                    <ThemedText
                      style={{ color: theme.textSecondary, marginLeft: 4 }}
                    >
                      {selectedCourse.duration}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.modalSection}>
                  <ThemedText type="h4">Description</ThemedText>
                  <ThemedText
                    style={{
                      color: theme.textSecondary,
                      marginTop: Spacing.sm,
                    }}
                  >
                    {selectedCourse.description}
                  </ThemedText>
                </View>
                {selectedCourse.enrolled ? (
                  <View style={styles.enrolledSection}>
                    <ThemedText style={{ color: theme.textSecondary }}>
                      Your Progress
                    </ThemedText>
                    <View
                      style={[
                        styles.progressBarLarge,
                        { backgroundColor: theme.backgroundSecondary },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${selectedCourse.progress}%` },
                        ]}
                      />
                    </View>
                    <ThemedText type="h3">
                      {selectedCourse.progress}% Complete
                    </ThemedText>
                    <Button
                      onPress={() => setSelectedCourse(null)}
                      style={styles.continueButton}
                    >
                      Continue Learning
                    </Button>
                  </View>
                ) : (
                  <View style={styles.priceSection}>
                    <ThemedText style={{ color: theme.textSecondary }}>
                      Course Price
                    </ThemedText>
                    <ThemedText type="h1" style={{ color: AppColors.primary }}>
                      ${selectedCourse.price}
                    </ThemedText>
                    <Button
                      onPress={() => handleEnroll(selectedCourse)}
                      style={styles.enrollButton}
                    >
                      Enroll Now
                    </Button>
                  </View>
                )}
              </ScrollView>
            ) : null}
          </ThemedView>
        </View>
      </Modal>

      <PaymentModal
        visible={showPayment && selectedCourse !== null}
        onClose={() => setShowPayment(false)}
        amount={selectedCourse ? selectedCourse.price * 100 : 0}
        currency="USD"
        description={selectedCourse?.description || ""}
        itemName={selectedCourse?.title || ""}
        onSuccess={handlePaymentSuccess}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  tabs: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  courseCard: {
    gap: Spacing.md,
  },
  courseHeader: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  courseThumbnail: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  courseInfo: {
    flex: 1,
    justifyContent: "center",
  },
  instructor: {
    fontSize: 13,
    marginTop: 2,
  },
  courseMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  duration: {
    fontSize: 12,
  },
  progressContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarLarge: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: Spacing.md,
  },
  progressFill: {
    height: "100%",
    backgroundColor: AppColors.accent,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "500",
  },
  certCard: {
    gap: Spacing.md,
  },
  certHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  certBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  certInfo: {
    flex: 1,
  },
  certReq: {
    fontSize: 12,
    marginTop: 2,
  },
  certProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
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
  modalThumbnail: {
    height: 150,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    marginBottom: Spacing.xs,
  },
  modalInstructor: {
    marginBottom: Spacing.lg,
  },
  modalMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalSection: {
    marginBottom: Spacing.xl,
  },
  enrolledSection: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  priceSection: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  continueButton: {
    width: "100%",
    marginTop: Spacing.lg,
  },
  enrollButton: {
    width: "100%",
    marginTop: Spacing.lg,
  },
});
