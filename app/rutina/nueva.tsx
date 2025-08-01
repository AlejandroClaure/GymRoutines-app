import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { createRoutineWithBlocks } from "@/lib/supabaseService";

// Definición de tipos para ejercicios
type Exercise = {
  name: string;
  order: number;
  duration?: number;
  reps?: number;
  equipment?: string;
};

// Definición de tipos para bloques
type Block = {
  title: string;
  order: number;
  repeat: string;
  is_preparation?: boolean;
  exercises: Exercise[];
};

// Componente principal para crear una nueva rutina
export default function NuevaRutinaScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { resolvedTheme, isThemeLoading } = useTheme();

  // Estados para los campos de la rutina
  const [name, setName] = useState("");
  const [style, setStyle] = useState("");
  const [level, setLevel] = useState("");
  const [duration, setDuration] = useState("");
  const [restBetweenExercises, setRestBetweenExercises] = useState("5");
  const [restBetweenBlocks, setRestBetweenBlocks] = useState("5");
  const [blocks, setBlocks] = useState<Block[]>([
    {
      title: "",
      order: 1,
      repeat: "1",
      is_preparation: false,
      exercises: [{ name: "", order: 1, duration: undefined, reps: undefined, equipment: "" }],
    },
  ]);
  const [loading, setLoading] = useState(false);

  // Definir colores según el tema
  const colors = {
    background: resolvedTheme === "dark" ? "#0f172a" : "#ffffff",
    card: resolvedTheme === "dark" ? "#1e293b" : "#f9fafb",
    text: resolvedTheme === "dark" ? "#e5e7eb" : "#111827",
    textSecondary: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
    inputBorder: resolvedTheme === "dark" ? "#4b5563" : "#d1d5db",
    disabledInput: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
    error: "#ef4444",
    primary: "#3b82f6",
    destructive: "#ef4444",
    disabledButton: resolvedTheme === "dark" ? "#6b7280" : "#93c5fd",
  };

  // Función para restringir input a solo números
  const restrictToNumbers = (text: string): string => {
    return text.replace(/[^0-9]/g, "");
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

  // Función para agregar un nuevo bloque
  const addBlock = () => {
    setBlocks((prev) => [
      ...prev,
      {
        title: "",
        order: prev.length + 1,
        repeat: "1",
        is_preparation: false,
        exercises: [{ name: "", order: 1, duration: undefined, reps: undefined, equipment: "" }],
      },
    ]);
  };

  // Función para eliminar un bloque
  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index).map((block, i) => ({ ...block, order: i + 1 })));
  };

  // Función para actualizar un bloque
  const updateBlock = (index: number, block: Partial<Block>) => {
    setBlocks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...block };
      if (block.is_preparation) {
        copy[index].title = "Preparación";
        copy[index].exercises = [
          {
            name: copy[index].exercises[0]?.name || "Preparación",
            order: 1,
            duration: copy[index].exercises[0]?.duration,
            equipment: copy[index].exercises[0]?.equipment || "",
          },
        ];
        copy[index].repeat = "1";
      }
      return copy;
    });
  };

  // Función para agregar un ejercicio a un bloque
  const addExercise = (blockIndex: number) => {
    setBlocks((prev) => {
      const copy = [...prev];
      const block = copy[blockIndex];
      if (block.is_preparation) return copy;
      const exercises = block.exercises;
      exercises.push({
        name: "",
        order: exercises.length + 1,
        duration: undefined,
        reps: undefined,
        equipment: "",
      });
      return copy;
    });
  };

  // Función para eliminar un ejercicio
  const removeExercise = (blockIndex: number, exerciseIndex: number) => {
    setBlocks((prev) => {
      const copy = [...prev];
      const block = copy[blockIndex];
      if (block.is_preparation) return copy;
      copy[blockIndex].exercises = copy[blockIndex].exercises
        .filter((_, i) => i !== exerciseIndex)
        .map((ex, i) => ({ ...ex, order: i + 1 }));
      return copy;
    });
  };

  // Función para actualizar un ejercicio
  const updateExercise = (
    blockIndex: number,
    exerciseIndex: number,
    exercise: Partial<Exercise>
  ) => {
    setBlocks((prev) => {
      const copy = [...prev];
      copy[blockIndex].exercises[exerciseIndex] = {
        ...copy[blockIndex].exercises[exerciseIndex],
        ...exercise,
      };
      return copy;
    });
  };

  // Función para validar los datos antes de enviar
  const validate = (): boolean => {
    console.log("🔍 Iniciando validación de datos...");
    if (!name.trim()) {
      console.log("❌ Validación fallida: Nombre de rutina vacío");
      Alert.alert("Error", "El nombre de la rutina es obligatorio.");
      return false;
    }

    if (duration && isNaN(parseInt(duration))) {
      console.log("❌ Validación fallida: Duración no válida");
      Alert.alert("Error", "La duración debe ser un número válido.");
      return false;
    }

    if (restBetweenExercises && isNaN(parseInt(restBetweenExercises))) {
      console.log("❌ Validación fallida: Descanso entre ejercicios no válido");
      Alert.alert("Error", "El descanso entre ejercicios debe ser un número válido.");
      return false;
    }

    if (restBetweenBlocks && isNaN(parseInt(restBetweenBlocks))) {
      console.log("❌ Validación fallida: Descanso entre bloques no válido");
      Alert.alert("Error", "El descanso entre bloques debe ser un número válido.");
      return false;
    }

    for (const block of blocks) {
      if (!block.title.trim()) {
        console.log("❌ Validación fallida: Título de bloque vacío");
        Alert.alert("Error", "Todos los bloques deben tener un título.");
        return false;
      }
      if (!block.repeat || isNaN(Number(block.repeat)) || Number(block.repeat) < 1) {
        console.log("❌ Validación fallida: Repeticiones de bloque no válidas");
        Alert.alert("Error", `El bloque "${block.title}" debe repetirse al menos una vez.`);
        return false;
      }
      if (block.exercises.length === 0) {
        console.log("❌ Validación fallida: Bloque sin ejercicios");
        Alert.alert("Error", `El bloque "${block.title}" debe tener al menos un ejercicio.`);
        return false;
      }
      for (const ex of block.exercises) {
        if (!ex.name.trim()) {
          console.log("❌ Validación fallida: Nombre de ejercicio vacío");
          Alert.alert("Error", "Todos los ejercicios deben tener un nombre.");
          return false;
        }
        if (block.is_preparation) {
          if (!ex.duration) {
            console.log("❌ Validación fallida: Título de preparación sin duración");
            Alert.alert(
              "Error",
              `El título "${ex.name}" en el bloque de preparación debe tener una duración.`
            );
            return false;
          }
        } else if (!ex.duration && !ex.reps) {
          console.log("❌ Validación fallida: Ejercicio sin duración ni repeticiones");
          Alert.alert("Error", `El ejercicio "${ex.name}" debe tener duración o repeticiones.`);
          return false;
        }
      }
    }

    console.log("✅ Validación exitosa");
    return true;
  };

  // Función para manejar el envío del formulario
  const handleSubmit = async () => {
    console.log("🧨 Iniciando creación de rutina...");
    if (!validate()) {
      console.log("❌ Creación detenida: Validación fallida");
      return;
    }

    setLoading(true);
    try {
      const routineToCreate = {
        name,
        style: style.trim() || undefined,
        level: level.trim() || undefined,
        duration: duration ? parseInt(duration, 10) : undefined,
        rest_between_exercises: parseInt(restBetweenExercises, 10) || 5,
        rest_between_blocks: parseInt(restBetweenBlocks, 10) || 5,
        blocks: blocks.map((block, index) => ({
          title: block.title,
          order: index + 1,
          repeat: parseInt(block.repeat, 10) || 1,
          is_preparation: block.is_preparation,
          exercises: block.exercises.map((ex) => ({
            name: ex.name,
            order: ex.order,
            duration: ex.duration,
            reps: ex.reps,
            equipment: ex.equipment,
          })),
        })),
      };

      console.log("📡 Enviando datos a createRoutineWithBlocks para usuario:", session.user.id);
      const result = await createRoutineWithBlocks(session.user.id, routineToCreate);
      if (result) {
        console.log("✅ Rutina creada correctamente con ID:", result.id);
        Alert.alert("Éxito", "Rutina creada correctamente");
        router.replace("/");
      } else {
        console.log("❌ Error al crear la rutina");
        Alert.alert("Error", "No se pudo crear la rutina.");
      }
    } catch (error: any) {
      console.error("❌ Error al crear la rutina:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      Alert.alert("Error", `Ocurrió un error al crear la rutina: ${error.message || "Desconocido"}`);
    } finally {
      setLoading(false);
      console.log("🛑 Creación finalizada");
    }
  };

  // JSX renderizado (líneas 420 en adelante)
  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Crear Nueva Rutina</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Nombre *</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.card, color: colors.text }]}
        placeholder="Nombre de la rutina"
        placeholderTextColor={colors.textSecondary}
        value={name}
        onChangeText={setName}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Estilo</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.card, color: colors.text }]}
        placeholder="Ej: Fuerza, Cardio, HIIT..."
        placeholderTextColor={colors.textSecondary}
        value={style}
        onChangeText={setStyle}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Nivel</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.card, color: colors.text }]}
        placeholder="Ej: Principiante, Intermedio, Avanzado"
        placeholderTextColor={colors.textSecondary}
        value={level}
        onChangeText={setLevel}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Duración (minutos)</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.card, color: colors.text }]}
        placeholder="Duración total estimada"
        placeholderTextColor={colors.textSecondary}
        keyboardType="numeric"
        value={duration}
        onChangeText={(text) => setDuration(restrictToNumbers(text))}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Descanso entre ejercicios (segundos)</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.card, color: colors.text }]}
        placeholder="Ej: 20"
        placeholderTextColor={colors.textSecondary}
        keyboardType="numeric"
        value={restBetweenExercises}
        onChangeText={(text) => setRestBetweenExercises(restrictToNumbers(text))}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Descanso entre bloques (segundos)</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.card, color: colors.text }]}
        placeholder="Ej: 60"
        placeholderTextColor={colors.textSecondary}
        keyboardType="numeric"
        value={restBetweenBlocks}
        onChangeText={(text) => setRestBetweenBlocks(restrictToNumbers(text))}
      />

      {blocks.map((block, blockIndex) => (
        <View
          key={blockIndex}
          style={[styles.blockContainer, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
        >
          <View style={styles.blockHeader}>
            <Text style={[styles.blockTitle, { color: colors.text }]}>Bloque {blockIndex + 1}</Text>
            {blocks.length > 1 && (
              <Pressable onPress={() => removeBlock(blockIndex)} style={styles.removeButton}>
                <Text style={[styles.removeButtonText, { color: colors.destructive }]}>Eliminar bloque</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.switchContainer}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>¿Es bloque de preparación?</Text>
            <Switch
              value={block.is_preparation}
              onValueChange={(value) => {
                updateBlock(blockIndex, {
                  is_preparation: value,
                  title: value ? "Preparación" : "",
                  repeat: value ? "1" : block.repeat,
                  exercises: value
                    ? [{ name: "Preparación", order: 1, duration: undefined, equipment: "" }]
                    : block.exercises,
                });
              }}
              trackColor={{ false: colors.textSecondary, true: colors.primary }}
              thumbColor={colors.background}
            />
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Título</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.inputBorder,
                backgroundColor: block.is_preparation ? colors.disabledInput : colors.card,
                color: colors.text,
              },
            ]}
            placeholder="Título del bloque"
            placeholderTextColor={colors.textSecondary}
            value={block.title}
            onChangeText={(text) => updateBlock(blockIndex, { title: text })}
            editable={!block.is_preparation}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Repeticiones</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.inputBorder,
                backgroundColor: block.is_preparation ? colors.disabledInput : colors.card,
                color: colors.text,
              },
            ]}
            keyboardType="numeric"
            placeholder="Ej: 1"
            placeholderTextColor={colors.textSecondary}
            value={block.repeat}
            onChangeText={(text) => updateBlock(blockIndex, { repeat: restrictToNumbers(text) })}
            editable={!block.is_preparation}
          />

          {block.exercises.map((exercise, exIndex) => (
            <View
              key={exIndex}
              style={[styles.exerciseContainer, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
            >
              <View style={styles.exerciseHeader}>
                <Text style={[styles.exerciseTitle, { color: colors.text }]}>
                  {block.is_preparation ? "Título" : `Ejercicio ${exIndex + 1}`}
                </Text>
                {!block.is_preparation && block.exercises.length > 1 && (
                  <Pressable
                    onPress={() => removeExercise(blockIndex, exIndex)}
                    style={styles.removeButton}
                  >
                    <Text style={[styles.removeButtonText, { color: colors.destructive }]}>Eliminar ejercicio</Text>
                  </Pressable>
                )}
              </View>

              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.card, color: colors.text }]}
                placeholder={block.is_preparation ? "Preparación" : "Nombre del ejercicio"}
                placeholderTextColor={colors.textSecondary}
                value={exercise.name}
                onChangeText={(text) => updateExercise(blockIndex, exIndex, { name: text })}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Duración (segundos)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.card, color: colors.text }]}
                keyboardType="numeric"
                placeholder="Ej: 30"
                placeholderTextColor={colors.textSecondary}
                value={exercise.duration?.toString() || ""}
                onChangeText={(text) => {
                  const val = parseInt(restrictToNumbers(text), 10);
                  updateExercise(blockIndex, exIndex, {
                    duration: isNaN(val) ? undefined : val,
                  });
                }}
              />

              {!block.is_preparation && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Repeticiones</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.card, color: colors.text }]}
                    keyboardType="numeric"
                    placeholder="Ej: 15"
                    placeholderTextColor={colors.textSecondary}
                    value={exercise.reps?.toString() || ""}
                    onChangeText={(text) => {
                      const val = parseInt(restrictToNumbers(text), 10);
                      updateExercise(blockIndex, exIndex, {
                        reps: isNaN(val) ? undefined : val,
                      });
                    }}
                  />
                </>
              )}

              <Text style={[styles.label, { color: colors.textSecondary }]}>Equipo</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.card, color: colors.text }]}
                placeholder="Ej: Mancuernas, Barra..."
                placeholderTextColor={colors.textSecondary}
                value={exercise.equipment || ""}
                onChangeText={(text) => updateExercise(blockIndex, exIndex, { equipment: text })}
              />
            </View>
          ))}

          {!block.is_preparation && (
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => addExercise(blockIndex)}
            >
              <Text style={styles.addButtonText}>+ Agregar ejercicio</Text>
            </Pressable>
          )}
        </View>
      ))}

      <Pressable
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={addBlock}
      >
        <Text style={styles.addButtonText}>+ Agregar bloque</Text>
      </Pressable>

      <Pressable
        style={[styles.submitButton, { backgroundColor: colors.primary }, loading && { backgroundColor: colors.disabledButton }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.submitButtonText}>Guardar Rutina</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

// Estilos para el componente
const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
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
  disabledInput: {
    opacity: 0.7,
  },
  blockContainer: {
    marginTop: 24,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  blockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  blockTitle: {
    fontWeight: "700",
    fontSize: 18,
  },
  removeButton: {
    padding: 6,
  },
  removeButtonText: {
    fontWeight: "700",
  },
  exerciseContainer: {
    marginTop: 16,
    padding: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseTitle: {
    fontWeight: "600",
    fontSize: 16,
  },
  addButton: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "700",
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
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
});