import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { importRoutineByShareCode } from "@/lib/supabaseService";

export default function ImportRoutineScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [shareCode, setShareCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Verifica si el usuario está autenticado
  if (!session) {
    return (
      <View style={styles.centered}>
        <Text>No estás logueado.</Text>
      </View>
    );
  }

  const handleImport = async () => {
    if (!shareCode.trim()) {
      Alert.alert("Error", "Ingresá un código de compartir válido.");
      return;
    }

    setLoading(true);
    const routine = await importRoutineByShareCode(session.user.id, shareCode.trim());
    setLoading(false);

    if (routine) {
      Alert.alert("Éxito", `Rutina "${routine.name}" importada correctamente.`);
      router.replace("/");
    } else {
      Alert.alert("Error", "Código inválido, expirado o error al importar la rutina.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Importar Rutina</Text>
      <Text style={styles.label}>Código de compartir</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: X7Y9Z2P8"
        value={shareCode}
        onChangeText={setShareCode}
        autoCapitalize="characters"
      />
      <Pressable onPress={handleImport} style={styles.submitButton} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
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
    backgroundColor: "#fff",
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
    color: "#444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  submitButton: {
    marginTop: 36,
    padding: 14,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});