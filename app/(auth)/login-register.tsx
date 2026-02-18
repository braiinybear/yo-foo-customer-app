import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { authClient } from "@/lib/auth-client";
import { router } from "expo-router";

export default function LoginRegister() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // 2. Auth Handlers
  const handleAuthAction = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);

    const options = {
      onSuccess: () => {
        setIsLoading(false);
        router.replace("/");
      },
      onError: (ctx: any) => {
        setIsLoading(false);
        Alert.alert("Authentication Error", ctx.error.message);
      },
    };

    if (isLogin) {
      await authClient.signIn.email({ email, password }, options);
    } else {
      await authClient.signUp.email({ email, password, name }, options);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "food-delivery-customer:///", // Better Auth Expo plugin handles the deep link
      });
    } catch (err) {
      console.log(err);

      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isLogin ? "Welcome Back" : "Create Account"}
      </Text>

      <View style={styles.form}>
        {!isLogin && (
          <TextInput
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
        )}

        <TextInput
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleAuthAction}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isLogin ? "Login" : "Register"}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={isLoading}
        >
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsLogin(!isLogin)}
          style={styles.switchContainer}
        >
          <Text style={styles.switchText}>
            {isLogin
              ? "New here? Create an account"
              : "Already have an account? Sign In"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 32,
    textAlign: "center",
    color: "#1a1a1a",
  },
  form: { width: "100%" },
  input: {
    borderWidth: 1,
    borderColor: "#e1e1e1",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: "#99caff" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  divider: { flex: 1, height: 1, backgroundColor: "#e1e1e1" },
  dividerText: { marginHorizontal: 16, color: "#8e8e93" },
  googleButton: {
    borderWidth: 1,
    borderColor: "#e1e1e1",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  googleButtonText: { color: "#1a1a1a", fontSize: 16, fontWeight: "600" },
  switchContainer: { marginTop: 24, alignItems: "center" },
  switchText: { color: "#007AFF", fontSize: 14, fontWeight: "500" },
});
