import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { importRoutineByShareCode } from "@/lib/supabaseService";

export default function ImportRoutineScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { resolvedTheme, isThemeLoading } = useTheme();
  const [shareCode, setShareCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Definir colores según el tema
  const colors = {
    background: resolvedTheme === "dark" ? "#0f172a" : "#ffffff",
    card: resolvedTheme === "dark" ? "#1e293b" : "#f9fafb",
    text: resolvedTheme === "dark" ? "#e5e7eb" : "#111827",
    textSecondary: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
    inputBorder: resolvedTheme === "dark" ? "#4b5563" : "#d1d5db",
    error: "#ef4444",
    primary: "#3b82f6",
    disabledButton: resolvedTheme === "dark" ? "#6b7280" : "#93c5fd",
  };

  // Verifica si el usuario está autenticado o si el tema está cargando
  if (!session) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>No estás logueado.</Text>
      </View>
    );
  }

  if (isThemeLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleImport = async () => {
    console.log("🧨 Iniciando importación de rutina con código:", shareCode);
    if (!shareCode.trim()) {
      console.log("❌ Validación fallida: Código de compartir vacío");
      setError("Ingresá un código de compartir válido.");
      Alert.alert("Error", "Ingresá un código de compartir válido.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log("📡 Llamando a importRoutineByShareCode para usuario:", session.user.id);
      const routine = await importRoutineByShareCode(session.user.id, shareCode.trim());
      if (routine) {
        console.log("✅ Rutina importada correctamente:", routine.name);
        Alert.alert("Éxito", `Rutina "${routine.name}" importada correctamente.`);
        router.replace("/");
      } else {
        console.log("❌ Error: Código inválido o expirado");
        setError("Código inválido, expirado o error al importar la rutina.");
        Alert.alert("Error", "Código inválido, expirado o error al importar la rutina.");
      }
    } catch (error: any) {
      console.error("❌ Error al importar la rutina:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      setError(`Error al importar la rutina: ${error.message || "Desconocido"}`);
      Alert.alert("Error", `Error al importar la rutina: ${error.message || "Desconocido"}`);
    } finally {
      setLoading(false);
      console.log("🛑 Importación finalizada");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Importar Rutina</Text>
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Código de compartir</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.card, color: colors.text }]}
        placeholder="Ej: X7Y9Z2P8"
        placeholderTextColor={colors.textSecondary}
        value={shareCode}
        onChangeText={(text) => setShareCode(text.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <Pressable
        style={[styles.submitButton, { backgroundColor: colors.primary }, loading && { backgroundColor: colors.disabledButton }]}
        onPress={handleImport}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.submitButtonText}>Importar Rutina</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  label: {
    marginTop: 12,
    fontWeight: "600",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  submitButton: {
    marginTop: 36,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  error: {
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
});