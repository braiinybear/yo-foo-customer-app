import SearchBar from "@/components/home/SearchBar";
import { View, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function SearchScreen() {
  const [search, setSearch] = useState("");
  const router = useRouter();

  return (
    <View style={{ flex: 1, marginTop: 50, paddingHorizontal: 16 }}>
      
      {/* Row Container */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        {/* Back Button */}
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={{ flex: 1 }}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search restaurants or dishes..."
          />
        </View>
      </View>

    </View>
  );
}
