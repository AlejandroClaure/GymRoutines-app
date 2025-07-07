// app/index.tsx

import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Platform, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useEffect, useState, useCallback } from "react";

import { useAuth } from "@/context/AuthContext";
import { routineRegistry } from "@/data/routines/routineRegistry";
import { supabase } from "@/lib/supabase";
import { RoutineSummary } from "@/types/routine";

// Definición del tipo para rutinas combinadas
type CombinedRoutine = RoutineSummary & {
  source: "local" | "remote";
};

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState<CombinedRoutine[]>([]);

  // Función para cargar las rutinas
  const fetchRoutines = useCallback(async () => {
    setLoading(true);
    try {
      // Cargar rutinas locales desde el registro
      const localRoutines: CombinedRoutine[] = Object.entries(routineRegistry)
        .map(([key, r]) => {
          const validLevel = ["Principiante", "Intermedio", "Avanzado"].includes(r.level ?? "")
            ? r.level
            : "Principiante";
          return {
            id: r.id ?? key, // Usar la clave del registro si id no está definido
            name: r.name,
            level: validLevel as "Principiante" | "Intermedio" | "Avanzado" | undefined,
            duration: r.duration,
            style: r.style,
            source: "local" as const,
          };
        })
        .filter((r) => !!r.id); // Filtrar sin predicado de tipo

      if (localRoutines.length < Object.keys(routineRegistry).length) {
        console.warn("⚠️ Algunas rutinas locales fueron filtradas por tener id undefined:", {
          filteredCount: Object.keys(routineRegistry).length - localRoutines.length,
        });
      }

      // Si no hay sesión, solo mostrar rutinas locales
      if (!session) {
        console.log("🔍 No hay sesión, mostrando solo rutinas locales:", localRoutines);
        setRoutines(localRoutines);
        setLoading(false);
        return;
      }

      // Obtener rutinas remotas desde Supabase
      const { data, error } = await supabase
        .from("routines")
        .select("id, name, level, duration, style")
        .eq("user_id", session.user.id);

      if (error) {
        console.error("❌ Error al cargar rutinas del usuario:", error.message);
        setRoutines(localRoutines);
        setLoading(false);
        return;
      }

      // Mapear rutinas remotas
      const remoteRoutines: CombinedRoutine[] = (data ?? [])
        .map((r) => {
          const validLevel = ["Principiante", "Intermedio", "Avanzado"].includes(r.level ?? "")
            ? r.level
            : "Principiante";
          return {
            id: r.id, // Supabase siempre devuelve un id (UUID)
            name: r.name,
            level: validLevel as "Principiante" | "Intermedio" | "Avanzado" | undefined,
            duration: r.duration,
            style: r.style,
            source: "remote" as const,
          };
        })
        .filter((r) => !!r.id); // Filtrar sin predicado de tipo

      if (remoteRoutines.length < (data?.length ?? 0)) {
        console.warn("⚠️ Algunas rutinas remotas fueron filtradas por tener id undefined:", {
          filteredCount: (data?.length ?? 0) - remoteRoutines.length,
        });
      }

      // Combinar rutinas locales y remotas
      console.log("✅ Rutinas cargadas:", { local: localRoutines.length, remote: remoteRoutines.length });
      setRoutines([...localRoutines, ...remoteRoutines]);
    } catch (e) {
      console.error("❌ Error inesperado al cargar rutinas:", e);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Efecto para redirigir al login si no hay sesión
  useEffect(() => {
    if (session === null) {
      const timer = setTimeout(() => {
        router.replace("/login");
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [session, router]);

  // Efecto para recargar rutinas cuando la pantalla está en foco
  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [fetchRoutines])
  );

  // Función para manejar la selección de una rutina
  const handleSelectRoutine = (routine: CombinedRoutine) => {
    if (!routine.id) {
      console.error("❌ Intento de navegar a una rutina sin id:", routine);
      Alert.alert("Error", "No se puede acceder a esta rutina.");
      return;
    }
    router.push(`/rutina/${routine.id}`);
  };

  // Función para manejar la edición de una rutina
  const handleEditRoutine = (routine: CombinedRoutine) => {
    if (!routine.id) {
      console.error("❌ Intento de editar una rutina sin id:", routine);
      Alert.alert("Error", "No se puede editar esta rutina.");
      return;
    }
    router.push(`/rutina/editar/${routine.id}`);
  };

  // Función para crear una nueva rutina
  const handleCreateNew = () => {
    router.push("/rutina/nueva");
  };

  // Función para confirmar la eliminación de una rutina
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

  // Función para eliminar una rutina
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
      Alert.alert("Error", "Error al eliminar la rutina. Intenta nuevamente.");
      console.error("❌ Error al eliminar rutina:", error.message);
    } else {
      setRoutines((prev) => prev.filter((r) => r.id !== routine.id));
      console.log("✅ Rutina eliminada correctamente:", routine.id);
    }

    setLoading(false);
  };

  // Mostrar pantalla de carga mientras se obtienen los datos
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Renderizado principal de la pantalla
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏋️‍♂️ Mis Rutinas</Text>

      {/* Lista de rutinas */}
      <FlatList
        data={routines}
        keyExtractor={(item) => item.id ?? "fallback-" + Math.random().toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => handleSelectRoutine(item)} style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardText}>⏱️ Duración: {item.duration ?? "N/A"} min</Text>
              <Text style={styles.cardText}>⚡ Nivel: {item.level ?? "N/A"}</Text>
              <Text style={styles.cardText}>🔥 Estilo: {item.style ?? "N/A"}</Text>
              <Text style={styles.originText}>
                {item.source === "local" ? "📁 Local" : "☁️ Personal"}
              </Text>
            </Pressable>

            {item.source === "remote" && (
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: "#f59e0b" }]}
                  onPress={() => handleEditRoutine(item)}
                >
                  <Text style={styles.actionText}>🖊️ Editar</Text>
                </Pressable>

                <Pressable
                  style={[styles.actionButton, { backgroundColor: "#ef4444" }]}
                  onPress={() => handleDeleteRoutine(item)}
                >
                  <Text style={styles.actionText}>🗑️ Eliminar</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      {/* Botón para crear una nueva rutina */}
      <Pressable style={styles.newButton} onPress={handleCreateNew}>
        <Text style={styles.newButtonText}>➕ Nueva Rutina</Text>
      </Pressable>
    </View>
  );
}

// Estilos para la interfaz de usuario
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: "#444",
  },
  originText: {
    marginTop: 4,
    fontSize: 12,
    color: "#888",
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
  },
  actionText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  newButton: {
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#10b981",
    alignItems: "center",
  },
  newButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});