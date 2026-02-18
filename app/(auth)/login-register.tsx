import { authClient } from "@/lib/auth-client";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";

import { Button, Text, TextInput, View } from "react-native";

const handleLogin = async (email: string, password: string) => {
  const res = await authClient.signIn.email(
    {
      email: email,
      password: password,
    },
    {
      onSuccess: async () => {
        const token = await SecureStore.getItemAsync("better-auth-token");
        console.log("SecureStore token after login:", token);
        router.push("/");
      },
      onError: (ctx) => alert(ctx.error.message),
    },
  );

  console.log(res);
};

const handleRegister = async (
  email: string,
  password: string,
  name: string,
) => {
  await authClient.signUp.email(
    {
      email,
      password,
      name,
    },
    {
      onSuccess: async () => {
        const token = await SecureStore.getItemAsync("better-auth-token");
        console.log("SecureStore token after register:", token);
        router.push("/");
      },
      onError: (ctx) => alert(ctx.error.message),
    },
  );
};

const handleGoogleLogin = async () => {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: "/", // The plugin handles the conversion to deep link
  });
};

export default function LoginRegister() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        {isLogin ? "Login" : "Register"}
      </Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          marginBottom: 12,
          padding: 8,
          borderRadius: 6,
        }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          marginBottom: 12,
          padding: 8,
          borderRadius: 6,
        }}
      />
      {!isLogin && (
        <TextInput
          placeholder="Name"
          value={name}
          onChangeText={setName}
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            marginBottom: 12,
            padding: 8,
            borderRadius: 6,
          }}
        />
      )}
      <Button
        title={isLogin ? "Login" : "Register"}
        onPress={async () => {
          if (
            !email ||
            typeof email !== "string" ||
            !password ||
            typeof password !== "string"
          ) {
            alert("Please enter a valid email and password.");
            return;
          }
          if (!isLogin && !name) {
            alert("Please enter your name.");
            return;
          }
          if (isLogin) {
            await handleLogin(email, password);
          } else {
            await handleRegister(email, password, name);
          }
        }}
      />
      <View style={{ height: 12 }} />
      <Button
        title={
          isLogin
            ? "Don't have an account? Register"
            : "Already have an account? Login"
        }
        onPress={() => setIsLogin((prev) => !prev)}
      />
      <View style={{ height: 12 }} />
      <Button title="Sign in with Google" onPress={handleGoogleLogin} />
    </View>
  );
}
