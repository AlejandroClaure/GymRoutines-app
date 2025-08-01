import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { fetchUserRoutines } from "@/lib/supabaseService";
import { routineRegistry } from "@/data/routines/routineRegistry";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

// Definimos la interfaz para la rutina
interface Routine {
  id?: string; // Hacer id opcional para compatibilidad con routineRegistry y Supabase
  name: string;
  level?: string;
  style?: string;
  duration?: number;
  blocks: { 
    id?: string;
    title: string;
    repeat: number;
    exercises?: { 
      id?: string;
      name: string;
      duration?: number;
      reps?: number;
      equipment?: string;
    }[];
  }[]; // blocks es un array no opcional, pero sus propiedades internas sí lo son
}

export default function RutinaDetalleScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);

  const isDark = resolvedTheme === "dark";

  // Definimos los colores según el tema
  const colors = {
    background: isDark ? "#0f172a" : "#f9fafb", // Fondo principal
    card: isDark ? "rgba(255,255,255,0.3)" : "#f2f2f2", // Fondo de las tarjetas
    text: isDark ? "#e5e7eb" : "#111827", // Color del texto principal
    title: isDark ? "#ffffff" : "#111827", // Color del título (blanco puro en modo oscuro)
    meta: isDark ? "#d1d5db" : "#4b5563", // Color de los metadatos
    button: "#10b981", // Color del botón (verde, consistente con settings)
    buttonText: "#e5e7eb", // Texto del botón
    accent: "#10b981", // Color de acento para íconos
  };

  // Cargar la rutina al montar el componente
  useEffect(() => {
    if (!id) {
      console.warn("⚠️ ID de rutina no proporcionado.");
      setLoading(false);
      return;
    }

    const loadRoutine = async () => {
      console.log("🔄 Iniciando carga de rutina...");
      try {
        // Primero buscamos en el registro local
        const local = routineRegistry[id as string];
        if (local) {
          console.log("✅ Rutina encontrada en registro local:", local.name);
          setRoutine(local);
          setLoading(false);
          return;
        }

        // Si no está local, buscamos en Supabase (requiere sesión)
        if (!session) {
          console.warn("⚠️ No hay sesión activa, no se puede consultar Supabase.");
          setRoutine(null);
          setLoading(false);
          return;
        }

        const all = await fetchUserRoutines(session.user.id);
        const found = all.find((r: Routine) => r.id === id);
        if (found) {
          console.log("✅ Rutina encontrada en Supabase:", found.name);
          setRoutine(found);
        } else {
          console.warn("⚠️ Rutina no encontrada en Supabase.");
          setRoutine(null);
        }
      } catch (error) {
        console.error("❌ Error cargando rutina desde Supabase:", error);
        setRoutine(null);
      } finally {
        setLoading(false);
        console.log("🛑 Carga de rutina finalizada.");
      }
    };

    loadRoutine();
  }, [id, session]);

  // Pantalla de carga
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Pantalla de error si no se encuentra la rutina
  if (!routine) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          Rutina no encontrada.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={[styles.title, { color: colors.title }]}>
        {routine.name}
      </Text>
      <Text style={[styles.meta, { color: colors.meta }]}>
        Nivel: {routine.level ?? "N/A"}
      </Text>
      <Text style={[styles.meta, { color: colors.meta }]}>
        Estilo: {routine.style ?? "N/A"}
      </Text>
      <Text style={[styles.meta, { color: colors.meta }]}>
        Duración estimada: {routine.duration ?? "N/A"} min
      </Text>

      {routine.blocks.map((block, i) => (
        <View
          key={block.id || i}
          style={[styles.block, { backgroundColor: colors.card }]}
        >
          <Text style={[styles.blockTitle, { color: colors.title }]}>
            {i + 1}. {block.title} (x{block.repeat})
          </Text>
          {block.exercises?.map((ex, j) => (
            <View key={ex.id || j} style={styles.exercise}>
              <Text style={[styles.exerciseName, { color: colors.text }]}>
                {j + 1}. {ex.name}
              </Text>
              {ex.duration !== null && ex.duration !== undefined && (
                <Text style={{ color: colors.meta }}>
                  ⏱️ Duración: {ex.duration}s
                </Text>
              )}
              {ex.reps !== null && ex.reps !== undefined && (
                <Text style={{ color: colors.meta }}>
                  🔁 Reps: {ex.reps}
                </Text>
              )}
              {ex.equipment && (
                <Text style={{ color: colors.meta }}>
                  🏋️ Equipo: {ex.equipment}
                </Text>
              )}
            </View>
          ))}
        </View>
      ))}

      <Pressable
        style={[styles.startButton, { backgroundColor: colors.button }]}
        onPress={() => {
          if (typeof id !== "string") {
            console.error("❌ ID inválido:", id);
            return;
          }
          console.log("📋 Datos de la rutina:", routine);
          if (!routine?.name) {
            console.error("❌ Nombre de la rutina no definido:", routine);
            return;
          }
          const uniqueKey = `${id}-${Date.now()}`; // Key único con timestamp
          const encodedRoutineName = encodeURIComponent(routine.name);
          console.log("📤 Navegando con routineName:", routine.name, "Codificado:", encodedRoutineName);
          router.replace({
            pathname: "/rutina/reproducir/[id]",
            params: { id, key: uniqueKey, routineName: encodedRoutineName },
          });
        }}
      >
        <Text style={[styles.startButtonText, { color: colors.buttonText }]}>
          ▶️ Empezar rutina
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16, // Contenedor principal
  },
  scrollContent: {
    paddingBottom: 40, // Espacio al final del ScrollView
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center", // Centra el contenido para carga/error
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2, // Estilo del título
  },
  meta: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: "center", // Estilo de los metadatos
  },
  block: {
    marginTop: 20,
    padding: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3, // Estilo de los bloques
  },
  blockTitle: {
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 8, // Título de los bloques
  },
  exercise: {
    marginBottom: 6,
    paddingLeft: 10, // Contenedor de ejercicios
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600", // Nombre de los ejercicios
  },
  startButton: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5, // Botón de empezar
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "700", // Texto del botón
  },
  errorText: {
    fontSize: 16,
    fontWeight: "500", // Texto de error
  },
});