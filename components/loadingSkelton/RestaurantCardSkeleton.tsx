import React from "react";
import { View, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

export default function RestaurantCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.image} />

      <View style={styles.content}>
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
    backgroundColor: Colors.white,
    marginHorizontal: 0,
    marginVertical: 8,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  image: {
    height: 200,
    backgroundColor: Colors.light,
  },

  content: {
    padding: 14,
    gap: 8,
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  small: {
    height: 10,
    width: 70,
    backgroundColor: Colors.light,
    borderRadius: 6,
  },
});