/**
 * Real-Time Guidance Overlay Component
 * Displays measurement quality checks and photo capture guidance.
 */

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/theme";
import type { GuidanceMessage } from "../userGuidanceSystem";

type ThemeColors = typeof Colors.light;

interface GuidanceOverlayProps {
  messages: GuidanceMessage[];
  onDismiss?: (messageId: string) => void;
  onAction?: (messageId: string, actionKey: string) => void;
}

export default function GuidanceOverlay({
  messages,
  onDismiss,
  onAction,
}: GuidanceOverlayProps) {
  const { theme } = useTheme();

  if (messages.length === 0) {
    return null;
  }

  const sortedMessages = [...messages].sort((a, b) => b.priority - a.priority);
  const topMessage = sortedMessages[0];

  return (
    <View style={styles.container}>
      {sortedMessages.map((message) => (
        <GuidanceMessageCard
          key={message.id}
          message={message}
          theme={theme}
          onDismiss={() => onDismiss?.(message.id)}
          onAction={(actionKey) => onAction?.(message.id, actionKey)}
          isTop={message.id === topMessage.id}
        />
      ))}
    </View>
  );
}

interface GuidanceMessageCardProps {
  message: GuidanceMessage;
  theme: ThemeColors;
  onDismiss: () => void;
  onAction: (actionKey: string) => void;
  isTop: boolean;
}

function GuidanceMessageCard({
  message,
  theme,
  onDismiss,
  onAction,
  isTop,
}: GuidanceMessageCardProps) {
  const [scaleAnim] = useState(new Animated.Value(0.95));

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const getTypeStyles = () => {
    switch (message.type) {
      case "warning":
        return {
          backgroundColor: "#fef2f2",
          borderColor: "#fca5a5",
          iconColor: "#dc2626",
          iconName: "alert-circle" as const,
        };
      case "suggestion":
        return {
          backgroundColor: "#fef3c7",
          borderColor: "#fcd34d",
          iconColor: "#d97706",
          iconName: "zap" as const,
        };
      case "success":
        return {
          backgroundColor: "#f0fdf4",
          borderColor: "#86efac",
          iconColor: "#16a34a",
          iconName: "check-circle" as const,
        };
      case "info":
      default:
        return {
          backgroundColor: "#eff6ff",
          borderColor: "#93c5fd",
          iconColor: "#2563eb",
          iconName: "info" as const,
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <Animated.View
      style={[
        styles.messageCard,
        {
          transform: [{ scale: scaleAnim }],
          backgroundColor: typeStyles.backgroundColor,
          borderColor: typeStyles.borderColor,
          marginBottom: isTop ? 12 : 8,
          borderLeftWidth: 4,
        },
      ]}
    >
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Feather name={typeStyles.iconName} size={16} color={typeStyles.iconColor} />
          <Text
            style={[
              styles.messageTitle,
              { color: typeStyles.iconColor, fontWeight: "600" },
            ]}
          >
            {message.title}
          </Text>
          {message.dismissible && (
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={14} color={typeStyles.iconColor} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.messageText, { color: theme.text }]}>{message.message}</Text>

        {message.action && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: typeStyles.iconColor }]}
            onPress={() => {
              message.action?.onPress();
              onAction("primary");
            }}
          >
            <Text style={styles.actionButtonText}>{message.action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  messageContent: {
    gap: 8,
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  messageTitle: {
    fontSize: 13,
    flex: 1,
  },
  dismissButton: {
    padding: 4,
  },
  messageText: {
    fontSize: 12,
    lineHeight: 16,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 4,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
