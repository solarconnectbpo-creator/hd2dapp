import React from "react";
import { StyleSheet, Image, View } from "react-native";

export function HeroLogo() {
  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/icon.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 200,
    height: 200,
  },
});
