// app/rutina/[id].tsx

import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { fetchUserRoutines } from "@/lib/supabaseService";
import { routineRegistry } from "@/data/routines/routineRegistry";
import { useAuth } from "@/context/AuthContext";

export default function RutinaDetalleScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const router = useRouter();

  const [routine, setRoutine] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadRoutine = async () => {
      // Primero intentamos buscar la rutina en local
      const local = routineRegistry[id as string];
      if (local) {
        setRoutine(local);
        setLoading(false);
        return;
      }

      // Si no está local, buscamos en Supabase (requiere sesión)
      if (!session) {
        setRoutine(null);
        setLoading(false);
        return;
      }

      try {
        const all = await fetchUserRoutines(session.user.id);
        const found = all.find((r: any) => r.id === id);
        setRoutine(found || null);
      } catch (error) {
        console.error("❌ Error cargando rutina desde Supabase:", error);
        setRoutine(null);
      } finally {
        setLoading(false);
      }
    };

    loadRoutine();
  }, [id, session]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!routine) {
    return (
      <View style={styles.centered}>
        <Text>Rutina no encontrada.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{routine.name}</Text>
      <Text style={styles.meta}>Nivel: {routine.level ?? "N/A"}</Text>
      <Text style={styles.meta}>Estilo: {routine.style ?? "N/A"}</Text>
      <Text style={styles.meta}>Duración estimada: {routine.duration ?? "N/A"} min</Text>

      {routine.blocks?.map((block: any, i: number) => (
        <View key={block.id || i} style={styles.block}>
          <Text style={styles.blockTitle}>
            {i + 1}. {block.title} (x{block.repeat})
          </Text>
          {block.exercises?.map((ex: any, j: number) => (
            <View key={ex.id || j} style={styles.exercise}>
              <Text style={styles.exerciseName}>
                {j + 1}. {ex.name}
              </Text>
              {ex.duration !== null && ex.duration !== undefined && <Text>⏱️ Duración: {ex.duration}s</Text>}
              {ex.reps !== null && ex.reps !== undefined && <Text>🔁 Reps: {ex.reps}</Text>}
              {ex.equipment && <Text>🏋️ Equipo: {ex.equipment}</Text>}
            </View>
          ))}
        </View>
      ))}

      <Pressable
        style={styles.startButton}
        onPress={() => router.push(`/rutina/reproducir/${id}`)}
      >
        <Text style={styles.startButtonText}>▶️ Empezar rutina</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  meta: {
    fontSize: 14,
    color: "#444",
    marginBottom: 4,
    textAlign: "center",
  },
  block: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
  },
  blockTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 8,
  },
  exercise: {
    marginBottom: 6,
    paddingLeft: 10,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
  },
  startButton: {
    marginTop: 24,
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  startButtonText: {
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
