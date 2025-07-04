import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function LoginScreen() {
  const { signInWithGoogle, session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.replace("/"); // Redirige al home si ya hay sesión
    }
  }, [session]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido a GymRoutines 💪</Text>

      <Pressable
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={signInWithGoogle}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Ingresar con Google</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#121212",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 48,
    color: "#f0f0f0",
    textAlign: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4285F4",
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 18,
  },
});
