export interface Cuisine {
  id: string;
  name: string;
  image: string | null;
  isActive: boolean;
}

export interface MenuItemDiscovery {
  id: string;
  name: string;
  image: string;
  price: number;
  restaurantId: string;
}

export interface RecentSearch {
  id: string;
  userId: string;
  query: string;
  createdAt: string;
}

export interface AddRecentSearchDto {
  query: string;
}
