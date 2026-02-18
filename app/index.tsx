import { authClient } from "@/lib/auth-client";
import { Link, router } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

export default function Index() {
  const handleSignOut = async () => {
    await authClient.signOut();
  };
  const { data: session, isPending, error } = authClient.useSession();
  console.log(
    "Session:",
    session?.session?.token,
    "Pending:",
    isPending,
    "Error:",
    error,
  );

  useEffect(() => {
    if (!isPending && !session?.session) {
      router.push("/login-register");
    }
  }, [session, isPending]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>
      <Link href="/login-register">Lo.gin/Register</Link>
      <Text>Hiiii</Text>
      <Text>Bye</Text>
      <Text>{JSON.stringify(session, null, 2)}</Text>
      <Text onPress={handleSignOut} style={{ marginTop: 20, color: "red" }}>
        Sign Out
      </Text>
    </View>
  );
}
