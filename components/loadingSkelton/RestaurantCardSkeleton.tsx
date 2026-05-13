import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";

export default function RestaurantCardSkeleton() {
  const { Colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
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

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.border,
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
    backgroundColor: Colors.border,
    borderRadius: 6,
  },
});