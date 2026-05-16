import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import Animated from "react-native-reanimated";
import { useShimmer } from "@/hooks/useShimmer";

export default function CuisineFilterSkeleton() {
  const { Colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
  const { pulseStyle } = useShimmer();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={styles.chip}>
            <Animated.View style={[styles.circle, pulseStyle]} />
            <Animated.View style={[styles.label, pulseStyle]} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  chip: {
    alignItems: "center",
    width: 68,
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.border,
    marginBottom: 6,
  },
  label: {
    width: 40,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
});
