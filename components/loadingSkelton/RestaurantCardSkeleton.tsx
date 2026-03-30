import React from "react";
import { View, StyleSheet } from "react-native";

export default function RestaurantCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.image} />

      <View style={styles.content}>
        <View style={styles.title} />
        <View style={styles.subtitle} />
        <View style={styles.row}>
          <View style={styles.small} />
          <View style={styles.small} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
  },

  image: {
    height: 140,
    backgroundColor: "#E5E7EB",
  },

  content: {
    padding: 12,
    gap: 8,
  },

  title: {
    height: 16,
    width: "70%",
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
  },

  subtitle: {
    height: 12,
    width: "50%",
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  small: {
    height: 10,
    width: 60,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
  },
});