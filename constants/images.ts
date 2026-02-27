/**
 * images.ts — Centralized image asset registry
 *
 * PLACEHOLDER_FOOD_IMAGES  : Used when a restaurant/menu-item has no image from the API.
 *                            Pick one deterministically by hashing the item's id so the
 *                            same card always shows the same image across renders.
 *
 * Usage:
 *   import { getPlaceholderImage } from '@/constants/images';
 *   const uri = getPlaceholderImage(restaurant.id);
 */

// ─── Food placeholder images (freely usable via Unsplash Source) ──────────────
export const PLACEHOLDER_FOOD_IMAGES: string[] = [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80", // salad bowl
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80", // pizza
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80", // pancakes
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80", // grilled food
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80", // veg plate
    "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80", // indian thali
    "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=80", // biryani
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&q=80", // burger
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80", // restaurant interior
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80", // fine dining
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&q=80", // breakfast
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&q=80", // pasta
];

// ─── Placeholder background tints (for cards without images) ─────────────────
export const PLACEHOLDER_BG_COLORS: string[] = [
    "#fef3c7", // amber-50
    "#fce7f3", // pink-50
    "#d1fae5", // emerald-50
    "#ffe4e6", // rose-50
    "#fef9c3", // yellow-50
    "#ede9fe", // violet-50
    "#dbeafe", // blue-50
    "#dcfce7", // green-50
];

// ─── Helper: pick a placeholder image URL based on an arbitrary string id ─────
/**
 * Returns a stable placeholder image URI for the given id.
 * The same id always maps to the same image.
 */
export function getPlaceholderImage(id: string): string {
    const hash = id
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return PLACEHOLDER_FOOD_IMAGES[hash % PLACEHOLDER_FOOD_IMAGES.length];
}

/**
 * Returns a stable placeholder background color for the given id.
 */
export function getPlaceholderBgColor(id: string): string {
    const hash = id
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return PLACEHOLDER_BG_COLORS[hash % PLACEHOLDER_BG_COLORS.length];
}
