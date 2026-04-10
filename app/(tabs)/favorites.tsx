import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import RestaurantCard from '@/components/home/RestaurantCard';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function FavoritesScreen() {
  const favorites = useFavoritesStore((state) => state.favorites);
  const router = useRouter();

  if (favorites.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="heart-outline" size={80} color={Colors.muted} />
        <Text style={styles.emptyTitle}>No Favorites Yet</Text>
        <Text style={styles.emptySubtitle}>
          Restaurants you favorite will appear here for quick access.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Your Favorite Spots</Text>
            <Text style={styles.headerSubtitle}>
              You have {favorites.length} {favorites.length === 1 ? 'restaurant' : 'restaurants'} saved
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <RestaurantCard
              restaurant={item}
              onPress={() => router.push(`/restaurants/${item.id}`)}
            />
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.xxl,
    color: Colors.text,
  },
  headerSubtitle: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginTop: 4,
  },
  listContent: {
    padding: 12,
  },
  cardContainer: {
    marginBottom: 4, // Reduced margin since contentContainer has padding and RestaurantCard has internal margin
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.surface,
  },
  emptyTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.xl,
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.md,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 8,
  },
});
