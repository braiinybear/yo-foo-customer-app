import { authClient } from "@/lib/auth-client";

import { Text, View, ActivityIndicator, StyleSheet } from "react-native";
import LoginRegister from "./(auth)/login-register";

export default function Index() {

  const { data: session, isPending } = authClient.useSession();

    if(!session && !isPending) {
      return <LoginRegister/>
    }
  // ⚡ 2. PREVENT THE FLICKER: Show a splash spinner while checking storage
  if (isPending) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  // ⚡ 3. Only render the actual home content if we have a session
  if (!session) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome, {session.user.name}!</Text>
      <Text onPress={() => authClient.signOut()} style={styles.signOut}>
        Sign Out
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  loadingText: { marginTop: 10, color: "#8e8e93" },
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  welcomeText: { fontSize: 20, fontWeight: "600" },
  signOut: { marginTop: 20, color: "red", fontWeight: "bold" },
});