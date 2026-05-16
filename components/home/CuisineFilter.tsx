import { useTheme } from "@/context/ThemeContext";
import { Fonts, FontSize } from "@/constants/typography";
import React, { useMemo } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { AnimatedPressable } from "../AnimatedPressable";


interface CuisineFilterProps {
    cuisines: string[];
    selected: string;
    onSelect: (id: string) => void;
}
interface Cuisine {
  id: string;
  label: string;
  imageUrl: string;
}
const cuisinesDummy: Cuisine[] = [
  { id: "all", label: "All", imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop" },
  { id: "italian", label: "Italian", imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=600&auto=format&fit=crop" },
  { id: "pizza", label: "Pizza", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600&auto=format&fit=crop" },
  { id: "american", label: "American", imageUrl: "https://images.unsplash.com/photo-1594179047519-f347310d3322?q=80&w=600&auto=format&fit=crop" },
  { id: "fast-food", label: "Fast Food", imageUrl: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?q=80&w=600&auto=format&fit=crop" },
  { id: "north-indian", label: "North Indian", imageUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=600&auto=format&fit=crop" },
  { id: "mughlai", label: "Mughlai", imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=600&auto=format&fit=crop" },
  { id: "chinese", label: "Chinese", imageUrl: "https://images.unsplash.com/photo-1525755662778-989d0524087e?q=80&w=600&auto=format&fit=crop" },
  { id: "asian", label: "Asian", imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=600&auto=format&fit=crop" },
  { id: "mexican", label: "Mexican", imageUrl: "https://images.unsplash.com/photo-1565299543923-37dd37887442?q=80&w=600&auto=format&fit=crop" },
  { id: "street-food", label: "Street Food", imageUrl: "https://images.unsplash.com/photo-1620706859996-5b65b16955d7?q=80&w=600&auto=format&fit=crop" },
  { id: "japanese", label: "Japanese", imageUrl: "https://images.unsplash.com/photo-1617196034183-421b4917c92d?q=80&w=600&auto=format&fit=crop" },
  { id: "sushi", label: "Sushi", imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=600&auto=format&fit=crop" },
  { id: "south-indian", label: "South Indian", imageUrl: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?q=80&w=600&auto=format&fit=crop" },
  { id: "beverages", label: "Beverages", imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=600&auto=format&fit=crop" },
  { id: "desserts", label: "Desserts", imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=600&auto=format&fit=crop" },
  { id: "bihari", label: "Bihari", imageUrl: "https://images.unsplash.com/photo-1650893361257-24756c321013?q=80&w=600&auto=format&fit=crop" }
];

export default function CuisineFilter({ cuisines, selected, onSelect }: CuisineFilterProps) {
    const { Colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);

    
    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                decelerationRate="fast"
            >
                {cuisines.map((item) => {
                    const isActive = selected === item;
                    return (
                        <AnimatedPressable
                            key={item}
                            style={[styles.chip, isActive && styles.chipActive]}
                            onPress={() => onSelect(item)}
                            scaleIn={0.94}
                        >
                        <View style={[styles.emojiWrapper, isActive && styles.emojiWrapperActive]}>
                            <Image 
                                source={{ 
                                    uri: cuisinesDummy.find(c => c.id === item.toLowerCase())?.imageUrl 
                                }} 
                                style={styles.emoji} 
                            />
                        </View>
                            <Text style={[styles.label, isActive && styles.labelActive]}>
                                {item}
                            </Text>
                        </AnimatedPressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        backgroundColor: isDark ? '#0D1B2A' : Colors.secondary,
    },
    scrollContent: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 4,
    },
    chip: {
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 6,
        marginRight: 4,
        position: "relative",
    },
    chipActive: {},
    emojiWrapper: {
        width: 52,
        height: 52,
        borderRadius: 26,
        overflow: "hidden",
        marginBottom: 6,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.1)", // Subtle border
        backgroundColor: "rgba(255,255,255,0.05)",
    },
    emojiWrapperActive: {
        borderColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    emoji: {
        width: '100%',
        height: '100%',
    },
    label: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: "rgba(255,255,255,0.6)", // Muted white
        textAlign: "center",
    },
    labelActive: {
        color: Colors.primary,
        fontFamily: Fonts.brandBold,
    },
});
