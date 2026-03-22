/**
 * Minimal react-native-maps fullscreen check. Use on iOS/Android only.
 * To try it: temporarily set App.tsx root to `<MapSmokeTest />` (then revert).
 */
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView from "react-native-maps";

export default function MapSmokeTest() {
  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <Text style={styles.webNote}>
          MapView is not supported in this web build. Run on iOS or Android.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  webNote: {
    padding: 24,
    fontSize: 16,
    color: "#334155",
  },
});
