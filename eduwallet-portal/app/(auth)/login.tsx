import { useState } from "react";
import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { usePortalAuth } from "../../src/context/PortalAuthContext";
import { loginPortal } from "../../src/lib/portalBackendApi";

const COLORS = {
  background: "#0B1220",
  surface: "#121A2B",
  surfaceAlt: "#1A2336",
  border: "#2A3650",
  text: "#F3F6FC",
  muted: "#A9B4C8",
  accent: "#4C8DFF",
  accentPressed: "#3A76DE",
  danger: "#FF6B6B",
};

export default function LoginScreen() {
  const { signIn } = usePortalAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      const session = await loginPortal(email, password);
      signIn(session.token, session.user, session.organization);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.centerWrap}
      >
        <View style={styles.card}>
          <Text style={styles.title}>EduWallet Portal</Text>
          <Text style={styles.subtitle}>
            Sign in with your personal portal account to request and verify
            student data.
          </Text>

          <View style={styles.helperBox}>
            <Text style={styles.helperTitle}>Demo accounts</Text>
            <Text style={styles.helperText}>lars@ntnu.no / password123</Text>
            <Text style={styles.helperText}>ingrid@ntnu.no / password123</Text>
            <Text style={styles.helperText}>
              emma@nordichiring.no / password123
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@organization.com"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
              style={styles.input}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Sign in</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 28,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 10,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  helperBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 22,
  },
  helperTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  helperText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 15,
  },
  error: {
    color: COLORS.danger,
    marginBottom: 14,
    fontSize: 14,
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});