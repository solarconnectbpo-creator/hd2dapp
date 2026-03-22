import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { SearchBar } from "@/components/SearchBar";
import { FilterChips } from "@/components/FilterChips";
import { Button } from "@/components/Button";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import {
  Spacing,
  BorderRadius,
  AppColors,
  Typography,
} from "@/constants/theme";
import { JOBS, JOB_POSTING_PACKAGES, Job } from "@/data/mockData";

const JOB_TYPE_COLORS: Record<string, string> = {
  "full-time": AppColors.accent,
  "part-time": "#8B5CF6",
  contract: "#F59E0B",
};

const EXPERIENCE_OPTIONS = [
  { key: "entry", label: "Entry Level" },
  { key: "mid", label: "Mid Level" },
  { key: "senior", label: "Senior" },
];

export default function JobsScreen() {
  const { theme, isDark } = useTheme();
  const { paddingTop, paddingBottom } = useScreenInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExperience, setSelectedExperience] = useState<string | null>(
    null,
  );
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");

  const filteredJobs = JOBS.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesExperience =
      !selectedExperience || job.experienceLevel === selectedExperience;
    return matchesSearch && matchesExperience;
  });

  const handleApply = () => {
    Alert.alert(
      "Application Submitted",
      `Your application for ${selectedJob?.title} at ${selectedJob?.company} has been submitted!`,
      [
        {
          text: "OK",
          onPress: () => {
            setShowApplyModal(false);
            setSelectedJob(null);
            setCoverLetter("");
          },
        },
      ],
    );
  };

  const renderJob = ({ item }: { item: Job }) => (
    <Card
      elevation={1}
      onPress={() => setSelectedJob(item)}
      style={styles.jobCard}
    >
      <View style={styles.jobHeader}>
        <View style={styles.companyLogo}>
          <Feather name="briefcase" size={24} color={theme.textSecondary} />
        </View>
        <View style={styles.jobInfo}>
          <ThemedText type="h4" numberOfLines={1}>
            {item.title}
          </ThemedText>
          <ThemedText
            style={[styles.companyName, { color: theme.textSecondary }]}
          >
            {item.company}
          </ThemedText>
        </View>
      </View>
      <View style={styles.jobMeta}>
        <View style={styles.locationRow}>
          <Feather name="map-pin" size={14} color={theme.textSecondary} />
          <ThemedText
            style={[styles.locationText, { color: theme.textSecondary }]}
          >
            {item.location}
          </ThemedText>
        </View>
        <Badge
          label={item.type.replace("-", " ")}
          color={JOB_TYPE_COLORS[item.type]}
          size="small"
        />
      </View>
      <View style={styles.jobFooter}>
        <ThemedText style={{ color: AppColors.accent, fontWeight: "600" }}>
          {item.salary}
        </ThemedText>
        <ThemedText style={[styles.postedText, { color: theme.textSecondary }]}>
          {item.postedAt}
        </ThemedText>
      </View>
    </Card>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop }]}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search jobs..."
        />
      </View>
      <View style={styles.filtersContainer}>
        <FilterChips
          options={EXPERIENCE_OPTIONS}
          selectedKey={selectedExperience}
          onSelect={setSelectedExperience}
        />
      </View>
      <FlatList
        data={filteredJobs}
        renderItem={renderJob}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <FloatingActionButton
        icon="dollar-sign"
        onPress={() => setShowPricingModal(true)}
      />

      <Modal
        visible={showPricingModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPricingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Job Posting Packages</ThemedText>
              <Pressable onPress={() => setShowPricingModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody}>
              {JOB_POSTING_PACKAGES.map((pkg) => (
                <Card
                  key={pkg.id}
                  elevation={1}
                  style={[styles.jobCard, { marginBottom: Spacing.md }]}
                >
                  <ThemedText type="h4">{pkg.name}</ThemedText>
                  <ThemedText
                    type="h2"
                    style={{
                      color: AppColors.primary,
                      marginVertical: Spacing.md,
                    }}
                  >
                    ${pkg.price}
                  </ThemedText>
                  <Button
                    onPress={() =>
                      Alert.alert("Purchase", `${pkg.name} for $${pkg.price}`)
                    }
                  >
                    Choose Package
                  </Button>
                </Card>
              ))}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      <Modal
        visible={!!selectedJob && !showApplyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedJob(null)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Job Details</ThemedText>
              <Pressable onPress={() => setSelectedJob(null)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            {selectedJob ? (
              <ScrollView style={styles.modalBody}>
                <View style={styles.jobDetailHeader}>
                  <View style={styles.companyLogoLarge}>
                    <Feather
                      name="briefcase"
                      size={32}
                      color={theme.textSecondary}
                    />
                  </View>
                  <ThemedText type="h2" style={styles.jobTitle}>
                    {selectedJob.title}
                  </ThemedText>
                  <ThemedText
                    style={[styles.companyName, { color: theme.textSecondary }]}
                  >
                    {selectedJob.company}
                  </ThemedText>
                </View>

                <View style={styles.jobDetailMeta}>
                  <View style={styles.metaItem}>
                    <Feather
                      name="map-pin"
                      size={16}
                      color={theme.textSecondary}
                    />
                    <ThemedText
                      style={{
                        color: theme.textSecondary,
                        marginLeft: Spacing.sm,
                      }}
                    >
                      {selectedJob.location}
                    </ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <Feather
                      name="clock"
                      size={16}
                      color={theme.textSecondary}
                    />
                    <ThemedText
                      style={{
                        color: theme.textSecondary,
                        marginLeft: Spacing.sm,
                      }}
                    >
                      {selectedJob.type.replace("-", " ")}
                    </ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <Feather
                      name="dollar-sign"
                      size={16}
                      color={AppColors.accent}
                    />
                    <ThemedText
                      style={{
                        color: AppColors.accent,
                        marginLeft: Spacing.sm,
                        fontWeight: "600",
                      }}
                    >
                      {selectedJob.salary}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.section}>
                  <ThemedText type="h4" style={styles.sectionTitle}>
                    Description
                  </ThemedText>
                  <ThemedText style={{ color: theme.textSecondary }}>
                    {selectedJob.description}
                  </ThemedText>
                </View>

                <View style={styles.section}>
                  <ThemedText type="h4" style={styles.sectionTitle}>
                    Requirements
                  </ThemedText>
                  {selectedJob.requirements.map((req, index) => (
                    <View key={index} style={styles.requirementItem}>
                      <Feather
                        name="check"
                        size={16}
                        color={AppColors.accent}
                      />
                      <ThemedText
                        style={[
                          styles.requirementText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {req}
                      </ThemedText>
                    </View>
                  ))}
                </View>

                <Button
                  onPress={() => setShowApplyModal(true)}
                  style={styles.applyButton}
                >
                  Apply Now
                </Button>
              </ScrollView>
            ) : null}
          </ThemedView>
        </View>
      </Modal>

      <Modal
        visible={showApplyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowApplyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Apply for Job</ThemedText>
              <Pressable onPress={() => setShowApplyModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              <ThemedText type="h4" style={styles.applyTitle}>
                {selectedJob?.title}
              </ThemedText>
              <ThemedText
                style={[styles.applyCompany, { color: theme.textSecondary }]}
              >
                {selectedJob?.company}
              </ThemedText>

              <View style={styles.formField}>
                <ThemedText type="small" style={styles.label}>
                  Cover Letter
                </ThemedText>
                <TextInput
                  style={[
                    styles.coverLetterInput,
                    {
                      backgroundColor: theme.backgroundDefault,
                      color: theme.text,
                    },
                  ]}
                  value={coverLetter}
                  onChangeText={setCoverLetter}
                  placeholder="Tell them why you're a great fit..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={6}
                />
              </View>

              <Pressable
                style={[
                  styles.uploadButton,
                  { backgroundColor: theme.backgroundDefault },
                ]}
              >
                <Feather name="upload" size={20} color={theme.textSecondary} />
                <ThemedText
                  style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}
                >
                  Upload Resume (Optional)
                </ThemedText>
              </Pressable>

              <Button onPress={handleApply} style={styles.submitButton}>
                Submit Application
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
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  filtersContainer: {
    marginBottom: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
  },
  separator: {
    height: Spacing.md,
  },
  jobCard: {
    gap: Spacing.md,
  },
  jobHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(128,128,128,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  companyLogoLarge: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(128,128,128,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  jobInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 14,
    marginTop: 2,
  },
  jobMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  locationText: {
    fontSize: 13,
  },
  jobFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  postedText: {
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
  jobDetailHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  jobTitle: {
    textAlign: "center",
  },
  jobDetailMeta: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  requirementText: {
    flex: 1,
  },
  applyButton: {
    marginBottom: Spacing["3xl"],
  },
  applyTitle: {
    marginBottom: Spacing.xs,
  },
  applyCompany: {
    marginBottom: Spacing.xl,
  },
  formField: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "600",
    opacity: 0.8,
  },
  coverLetterInput: {
    height: 150,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    fontSize: Typography.body.fontSize,
    textAlignVertical: "top",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xl,
  },
  submitButton: {
    marginBottom: Spacing["3xl"],
  },
});
