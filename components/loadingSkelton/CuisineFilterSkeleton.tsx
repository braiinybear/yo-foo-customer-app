import { Colors } from "@/constants/colors";
import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";

export default function CuisineFilterSkeleton() {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={styles.chip}>
            <View style={styles.circle} />
            <View style={styles.label} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  chip: {
    alignItems: "center",
    width: 60,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light,
    marginBottom: 6,
  },
  label: {
    width: 35,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light,
  },
});
