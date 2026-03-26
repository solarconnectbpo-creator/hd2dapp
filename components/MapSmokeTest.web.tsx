/**
 * Web: never import react-native-maps (breaks the bundle / white screen).
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function MapSmokeTest() {
  return (
    <View style={styles.container}>
      <Text style={styles.webNote}>
        MapView is not supported in this web build. Run on iOS or Android.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webNote: {
    padding: 24,
    fontSize: 16,
    color: "#334155",
  },
});
