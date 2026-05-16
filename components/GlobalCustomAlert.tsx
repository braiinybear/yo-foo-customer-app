import React, { useEffect } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Fonts, FontSize } from "@/constants/typography";
import {
  AlertButton,
  AlertButtonStyle,
  AlertType,
  useAlertStore,
} from "@/store/useAlertStore";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { AnimatedPressable } from "./AnimatedPressable";
import { ANIMATION } from "@/animations/constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MODAL_WIDTH = Math.min(SCREEN_WIDTH - 48, 360);

export default function GlobalCustomAlert() {
  const { visible, title, message, buttons, type, hide } = useAlertStore();
  const { Colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);

  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = withSpring(1, ANIMATION.spring.heavy);
    } else {
      progress.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const rBackdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const rModalStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.85, 1]) },
      { translateY: interpolate(progress.value, [0, 1], [20, 0]) },
    ],
  }));

  const ICON_CONFIG: Record<AlertType, { name: keyof typeof Ionicons.glyphMap; bg: string; color: string }> = {
    success: { name: "checkmark-circle", bg: Colors.success + "15", color: Colors.success },
    error: { name: "close-circle", bg: Colors.danger + "15", color: Colors.danger },
    warning: { name: "warning", bg: Colors.warning + "15", color: Colors.warning },
    info: { name: "information-circle", bg: Colors.primary + "15", color: Colors.primary },
    confirm: { name: "help-circle", bg: Colors.secondary + "15", color: Colors.secondary },
  };

  const handlePress = (btn: AlertButton) => {
    hide();
    setTimeout(() => btn.onPress?.(), 100);
  };

  const icon = ICON_CONFIG[type] ?? ICON_CONFIG.info;
  const sortedButtons = [...buttons].sort((a) => (a.style === "cancel" ? -1 : 1));

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, rBackdropStyle]}>
        <Animated.View style={[styles.modal, rModalStyle]}>
          <View style={[styles.iconCircle, { backgroundColor: icon.bg }]}>
            <Ionicons name={icon.name} size={36} color={icon.color} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={[styles.buttonRow, sortedButtons.length === 1 && { justifyContent: "center" }]}>
            {sortedButtons.map((btn, i) => {
              const isPrimary = btn.style !== "cancel";
              return (
                <AnimatedPressable
                  key={`${btn.text}-${i}`}
                  style={[
                    styles.button,
                    isPrimary ? styles.buttonPrimary : styles.buttonCancel,
                    btn.style === "destructive" && { backgroundColor: Colors.danger },
                  ]}
                  onPress={() => handlePress(btn)}
                  scaleIn={0.95}
                >
                  <Text style={[
                    styles.buttonText, 
                    { color: isPrimary ? (isDark ? Colors.background : Colors.primary) : Colors.textSecondary }
                  ]}>
                    {btn.text}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modal: {
    width: MODAL_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: {
    backgroundColor: isDark ? Colors.primary : Colors.secondary,
  },
  buttonCancel: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonText: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
  },
});
