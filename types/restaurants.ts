export interface Restaurant {
    id: string;
    name: string;
    cuisineTypes: string[];
    costForTwo: number;
    image: string | null;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  type: "VEG" | "NON_VEG" | "VEGAN" | null;
  isAvailable: boolean;
  isBestseller: boolean;
  spiceLevel: string | null;
  prepTime: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface MenuCategory {
  id: string;
  name: string;
  restaurantId: string;
  type: "VEG" | "NON_VEG" | "VEGAN" | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  items: MenuItem[];
}

export interface RestaurantDetail {
  id: string;
  managerId: string;
  name: string;
  description: string | null;
  image: string | null;
  costForTwo: number;
  cuisineTypes: string[];
  address: string;
  lat: number;
  lng: number;
  isActive: boolean;
  isOpen: boolean;
  isVerified: boolean;
  rating: number;
  ratingCount: number;
  fssaiCode: string | null;
  gstNumber: string | null;
  type: "VEG" | "NON_VEG" | "VEGAN" | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  menuCategories: MenuCategory[];
  reviews: any[]; // You can replace 'any' with a Review interface if needed
}


export interface SearchParams {
  query?: string;
  type?: "VEG" | "NON_VEG" | "VEGAN";
  minRating?: number;
}