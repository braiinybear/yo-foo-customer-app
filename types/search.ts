export type FoodType = "VEG" | "NON_VEG" | "VEGAN";

export type SortBy = "rating" | "costForTwo" | "deliveryTime";

export type SortOrder = "asc" | "desc";

export interface DishDetails {
  description: string;
  image: string;
  type: FoodType;
  spiceLevel: string;
  prepTime: number;
  isAvailable: boolean;
  avgPrice: number;
  popularChoice: boolean;
}

export interface RestaurantResult {
  restaurantId: string;
  name: string;
  logo: string;
  rating: number;
  ratingCount: number;
  costForTwo: number;
  menuItemId: string;
  price: number;
  isBestseller: boolean;
  estimatedDelivery: string;
}

export interface DishSearchResult {
  dishId: string;
  dishName: string;
  categoryName: string;
  dishDetails: DishDetails;
  restaurants: RestaurantResult[];
}

export interface SearchRestaurantsResponse {
  searchTerm: string;
  totalUniqueDishes: number;
  results: DishSearchResult[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SearchRestaurantsParams {
  page?: number;
  limit?: number;
  query?: string;
  type?: FoodType;
  minRating?: number;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  userLat?: number;
  userLng?: number;
}