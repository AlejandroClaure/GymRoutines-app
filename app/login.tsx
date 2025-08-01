import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function LoginScreen() {
  const { signInWithGoogle, session, isLoading } = useAuth();
  const { resolvedTheme = "dark" } = useTheme(); // Valor por defecto: dark
  const router = useRouter();

  // Redirigir al home si hay sesión
  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [session, router]);

  // Definir colores según el tema
  const colors = {
    background: resolvedTheme === "dark" ? "#0f172a" : "#f1f5f9", // Fondo consistente con el layout
    text: resolvedTheme === "dark" ? "#e5e7eb" : "#111827", // Texto legible
    buttonBackground: "#4285F4", // Color del botón de Google
    buttonText: "#fff", // Texto del botón
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Bienvenido a GymRoutines 💪 
      </Text>
      {/* Subtítulo opcional para reforzar el branding */}
      <Text style={[styles.subtitle, { color: colors.text }]}>
        Tu compañero para rutinas de gimnasio
      </Text>
      <Pressable
        style={[styles.button, { backgroundColor: colors.buttonBackground }, isLoading && styles.buttonDisabled]}
        onPress={signInWithGoogle}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.buttonText} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            Ingresar con Google
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16, 
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
    marginBottom: 32,
    textAlign: "center",
    opacity: 0.8, 
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "600",
    fontSize: 18,
  },
});