// app/index.tsx
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Platform, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { routineRegistry } from "@/data/routines/routineRegistry";
import { supabase } from "@/lib/supabase";
import { RoutineSummary } from "@/types/routine";
import { createRoutineShareCode } from "@/lib/supabaseService";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

type CombinedRoutine = RoutineSummary & {
  source: "local" | "remote";
};

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { resolvedTheme, isThemeLoading } = useTheme();
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState<CombinedRoutine[]>([]);

  // Definir colores según el tema
  const colors = {
    background: resolvedTheme === "dark" ? "#0f172a" : "#ffffff",
    card: resolvedTheme === "dark" ? "#1e293b" : "#f9fafb",
    text: resolvedTheme === "dark" ? "#e5e7eb" : "#111827",
    textSecondary: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
    primary: "#10b981",
    secondary: "#6b7280",
    destructive: "#ef4444",
    edit: "#f59e0b",
    share: "#3b82f6",
  };

  const fetchRoutines = useCallback(async () => {
    setLoading(true);
    try {
      // Cargar rutinas locales
      const localRoutines: CombinedRoutine[] = Object.entries(routineRegistry)
        .map(([key, r]) => {
          const validLevel = ["Principiante", "Intermedio", "Avanzado"].includes(r.level ?? "")
            ? r.level
            : "Principiante";
          return {
            id: r.id ?? key,
            name: r.name,
            level: validLevel as "Principiante" | "Intermedio" | "Avanzado" | undefined,
            duration: r.duration,
            style: r.style,
            source: "local" as const,
          };
        })
        .filter((r) => !!r.id);

      if (localRoutines.length < Object.keys(routineRegistry).length) {
        console.warn("⚠️ Algunas rutinas locales fueron filtradas por tener id undefined:", {
          filteredCount: Object.keys(routineRegistry).length - localRoutines.length,
        });
      }

      // Si no hay sesión, mostrar solo rutinas locales
      if (!session) {
        console.log("🔍 No hay sesión, mostrando solo rutinas locales:", localRoutines.length);
        setRoutines(localRoutines);
        setLoading(false);
        return;
      }

      // Cargar rutinas remotas
      const { data, error } = await supabase
        .from("routines")
        .select("id, name, level, duration, style")
        .eq("user_id", session.user.id);

      if (error) {
        console.error("❌ Error al cargar rutinas del usuario:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        Alert.alert("Error", "No se pudieron cargar las rutinas. Intenta de nuevo.");
        setRoutines(localRoutines);
        setLoading(false);
        return;
      }

      const remoteRoutines: CombinedRoutine[] = (data ?? [])
        .map((r) => {
          const validLevel = ["Principiante", "Intermedio", "Avanzado"].includes(r.level ?? "")
            ? r.level
            : "Principiante";
          return {
            id: r.id,
            name: r.name,
            level: validLevel as "Principiante" | "Intermedio" | "Avanzado" | undefined,
            duration: r.duration,
            style: r.style,
            source: "remote" as const,
          };
        })
        .filter((r) => !!r.id);

      if (remoteRoutines.length < (data?.length ?? 0)) {
        console.warn("⚠️ Algunas rutinas remotas fueron filtradas por tener id undefined:", {
          filteredCount: (data?.length ?? 0) - remoteRoutines.length,
        });
      }

      console.log("✅ Rutinas cargadas:", { local: localRoutines.length, remote: remoteRoutines.length });
      setRoutines([...localRoutines, ...remoteRoutines]);
    } catch (e: any) {
      console.error("❌ Error inesperado al cargar rutinas:", {
        message: e.message,
        details: e.details,
        hint: e.hint,
        code: e.code,
      });
      Alert.alert("Error", "Ocurrió un error inesperado al cargar las rutinas.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  const handleCopyRoutine = async (routine: CombinedRoutine) => {
    if (routine.source !== "remote" || !routine.id) {
      console.error("❌ Intento de compartir una rutina no remota o sin id:", routine);
      Alert.alert("Error", "Solo las rutinas personales pueden ser compartidas.");
      return;
    }

    setLoading(true);
    const shareCode = await createRoutineShareCode(routine.id);
    setLoading(false);

    if (!shareCode) {
      Alert.alert("Error", "No se pudo generar el código de compartir.");
      return;
    }

    try {
      await Clipboard.setStringAsync(shareCode);
      Alert.alert(
        "Código copiado",
        `El código ${shareCode} ha sido copiado al portapapeles. Compártelo para que otros puedan importar la rutina. Válido por 5 minutos.`
      );
    } catch (e: any) {
      console.error("❌ Error al copiar al portapapeles:", {
        message: e.message,
        details: e.details,
        hint: e.hint,
        code: e.code,
      });
      Alert.alert("Error", `No se pudo copiar el código al portapapeles. Código: ${shareCode}`);
    }
  };

  useEffect(() => {
    if (session === null) {
      const timer = setTimeout(() => {
        router.replace("/login");
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [session, router]);

  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [fetchRoutines])
  );

  const handleSelectRoutine = (routine: CombinedRoutine) => {
    if (!routine.id) {
      console.error("❌ Intento de navegar a una rutina sin id:", routine);
      Alert.alert("Error", "No se puede acceder a esta rutina.");
      return;
    }
    router.push(`/rutina/${routine.id}`);
  };

  const handleEditRoutine = (routine: CombinedRoutine) => {
    if (!routine.id) {
      console.error("❌ Intento de editar una rutina sin id:", routine);
      Alert.alert("Error", "No se puede editar esta rutina.");
      return;
    }
    router.push(`/rutina/editar/${routine.id}`);
  };

  const handleCreateNew = () => {
    router.push("/rutina/nueva");
  };

  const handleImportRoutine = () => {
    router.push("/rutina/importar");
  };

  const confirmDeletion = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (Platform.OS === "web") {
        const result = confirm(message);
        resolve(result);
      } else {
        Alert.alert(
          "Confirmar eliminación",
          message,
          [
            { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
            { text: "Eliminar", style: "destructive", onPress: () => resolve(true) },
          ],
          { cancelable: true }
        );
      }
    });
  };

  const handleDeleteRoutine = async (routine: CombinedRoutine) => {
    if (routine.source !== "remote" || !routine.id) {
      console.error("❌ Intento de eliminar una rutina no remota o sin id:", routine);
      return;
    }

    const confirmed = await confirmDeletion(
      `¿Eliminar la rutina "${routine.name}"? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    setLoading(true);

    const { error } = await supabase
      .from("routines")
      .delete()
      .eq("id", routine.id)
      .eq("user_id", session!.user.id);

    if (error) {
      console.error("❌ Error al eliminar rutina:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      Alert.alert("Error", "Error al eliminar la rutina. Intenta nuevamente.");
    } else {
      setRoutines((prev) => prev.filter((r) => r.id !== routine.id));
      console.log("✅ Rutina eliminada correctamente:", routine.id);
    }

    setLoading(false);
  };

  if (loading || isThemeLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>🏋️‍♂️ Mis Rutinas</Text>
      <FlatList
        data={routines}
        keyExtractor={(item) => item.id ?? `fallback-${Math.random().toString()}`}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Pressable onPress={() => handleSelectRoutine(item)} style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.cardText, { color: colors.text }]}>⏱️ Duración: {item.duration ?? "N/A"} min</Text>
              <Text style={[styles.cardText, { color: colors.text }]}>⚡ Nivel: {item.level ?? "N/A"}</Text>
              <Text style={[styles.cardText, { color: colors.text }]}>🔥 Estilo: {item.style ?? "N/A"}</Text>
              <Text style={[styles.originText, { color: colors.textSecondary }]}>
                {item.source === "local" ? "📁 Local" : "☁️ Personal"}
              </Text>
            </Pressable>
            {item.source === "remote" && (
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: colors.edit }]}
                  onPress={() => handleEditRoutine(item)}
                >
                  <Text style={styles.actionText}>🖊️ Editar</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: colors.destructive }]}
                  onPress={() => handleDeleteRoutine(item)}
                >
                  <Text style={styles.actionText}>🗑️ Eliminar</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: colors.share }]}
                  onPress={() => handleCopyRoutine(item)}
                >
                  <Feather name="copy" size={16} color="#fff" />
                  <Text style={styles.actionText}> Copiar</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
      <View style={styles.buttonContainer}>
        <Pressable style={[styles.newButton, { backgroundColor: colors.primary }]} onPress={handleCreateNew}>
          <Text style={styles.newButtonText}>➕ Nueva Rutina</Text>
        </Pressable>
        <Pressable style={[styles.newButton, { backgroundColor: colors.secondary }]} onPress={handleImportRoutine}>
          <Text style={styles.newButtonText}>📥 Importar Rutina</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    marginBottom: 2,
  },
  originText: {
    marginTop: 4,
    fontSize: 12,
    fontStyle: "italic",
  },
  actionRow: {
    flexDirection: "row",
    marginTop: 10,
    justifyContent: "space-between",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  actionText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  newButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  newButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});