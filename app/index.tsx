import { authClient } from "@/lib/auth-client";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";

export default function Index() {
  const { data: session, isPending } = authClient.useSession();
  

  useEffect(() => {
    const logStoredToken = async () => {
      try {
        const token = await SecureStore.getItemAsync(
          "better-auth_session_token"
        );

        console.log("--------- AUTH DEBUG ---------");
        console.log(
          "Stored Token in SecureStore:",
          token ? token : "No token found"
        );
        console.log("------------------------------");
      } catch (error) {
        console.error("Failed to fetch token from SecureStore:", error);
      }
    };

    if (!isPending) {
      logStoredToken();
    }
  }, [isPending]);

  // 🔹 Show loading state
  if (isPending) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // 🔹 If no session
  if (!session) {
    return (
      <View style={styles.container}>
        <Text>No active session</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>
        Welcome, {session.user.name}!

      </Text>
<Text>{JSON.stringify(session)}</Text>
      <Text
        onPress={() => authClient.signOut()}
        style={styles.signOut}
      >
        Sign Out
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  loadingText: {
    marginTop: 10,
    color: "#8e8e93",
  },

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  welcomeText: {
    fontSize: 20,
    fontWeight: "600",
  },

  signOut: {
    marginTop: 20,
    color: "red",
    fontWeight: "bold",
  },
});
