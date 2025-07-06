// app/rutina/nueva.tsx

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
import { createRoutineWithBlocks } from "@/lib/supabaseService";

// Definición de tipos para ejercicios
type Exercise = {
  name: string; // Nombre del ejercicio (o título en bloques de preparación)
  order: number; // Orden dentro del bloque
  duration?: number; // Duración en segundos
  reps?: number; // Cantidad de repeticiones
  equipment?: string; // Equipamiento necesario
};

// Definición de tipos para bloques
type Block = {
  title: string; // Título del bloque
  order: number; // Orden dentro de la rutina
  repeat: string; // Cantidad de repeticiones (como string para el input)
  is_preparation?: boolean; // Indica si es bloque de preparación
  exercises: Exercise[]; // Lista de ejercicios
};

// Componente principal para crear una nueva rutina
export default function NuevaRutinaScreen() {
  const router = useRouter();
  const { session } = useAuth();

  // Estados para los campos de la rutina
  const [name, setName] = useState("");
  const [style, setStyle] = useState("");
  const [level, setLevel] = useState("");
  const [duration, setDuration] = useState("");
  const [restBetweenExercises, setRestBetweenExercises] = useState("5"); // Default: 5 segundos
  const [restBetweenBlocks, setRestBetweenBlocks] = useState("5"); // Default: 5 segundos
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

  // Función para restringir input a solo números
  const restrictToNumbers = (text: string) => {
    return text.replace(/[^0-9]/g, ""); // Elimina todo lo que no sea dígito
  };

  // Verifica si el usuario está autenticado
  if (!session) {
    return (
      <View style={styles.centered}>
        <Text>No estás logueado.</Text>
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
      // Si es bloque de preparación, fijar título y ajustar el ejercicio
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
        copy[index].repeat = "1"; // Bloques de preparación tienen 1 repetición
      }
      return copy;
    });
  };

  // Función para agregar un ejercicio a un bloque
  const addExercise = (blockIndex: number) => {
    setBlocks((prev) => {
      const copy = [...prev];
      const block = copy[blockIndex];
      if (block.is_preparation) return copy; // No permitir más ejercicios en bloques de preparación
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
      if (block.is_preparation) return copy; // No permitir eliminar el ejercicio de preparación
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

  // Función para manejar el envío del formulario
  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Debes ingresar un nombre para la rutina.");
      return;
    }

    for (const block of blocks) {
      if (!block.title.trim()) {
        Alert.alert("Error", "Cada bloque debe tener un título.");
        return;
      }
      if (block.exercises.length === 0) {
        Alert.alert("Error", `El bloque "${block.title}" debe tener al menos un ejercicio.`);
        return;
      }
      if (!block.repeat || isNaN(Number(block.repeat)) || Number(block.repeat) < 1) {
        Alert.alert("Error", `El bloque "${block.title}" debe tener al menos 1 repetición.`);
        return;
      }
      for (const ex of block.exercises) {
        if (!ex.name.trim()) {
          Alert.alert("Error", "Cada ejercicio debe tener un nombre.");
          return;
        }
        if (block.is_preparation) {
          if (!ex.duration) {
            Alert.alert(
              "Error",
              `El título "${ex.name}" en el bloque de preparación debe tener una duración.`
            );
            return;
          }
        } else if (!ex.duration && !ex.reps) {
          Alert.alert(
            "Error",
            `El ejercicio "${ex.name}" debe tener duración o repeticiones definidas.`
          );
          return;
        }
      }
    }

    setLoading(true);

    // Preparar datos para enviar a Supabase
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

    try {
      const result = await createRoutineWithBlocks(session.user.id, routineToCreate);
      if (result) {
        Alert.alert("Éxito", "Rutina creada correctamente");
        router.replace("/");
      } else {
        Alert.alert("Error", "No se pudo crear la rutina.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Ocurrió un error al crear la rutina.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Crear Nueva Rutina</Text>

      <Text style={styles.label}>Nombre *</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre de la rutina"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Estilo</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Fuerza, Cardio, HIIT..."
        value={style}
        onChangeText={setStyle}
      />

      <Text style={styles.label}>Nivel</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Principiante, Intermedio, Avanzado"
        value={level}
        onChangeText={setLevel}
      />

      <Text style={styles.label}>Duración (minutos)</Text>
      <TextInput
        style={styles.input}
        placeholder="Duración total estimada"
        keyboardType="numeric"
        value={duration}
        onChangeText={(text) => setDuration(restrictToNumbers(text))}
      />

      <Text style={styles.label}>Descanso entre ejercicios (segundos)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={restBetweenExercises}
        onChangeText={(text) => setRestBetweenExercises(restrictToNumbers(text))}
      />

      <Text style={styles.label}>Descanso entre bloques (segundos)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={restBetweenBlocks}
        onChangeText={(text) => setRestBetweenBlocks(restrictToNumbers(text))}
      />

      {/* Bloques dinámicos */}
      {blocks.map((block, blockIndex) => (
        <View key={blockIndex} style={styles.blockContainer}>
          <View style={styles.blockHeader}>
            <Text style={styles.blockTitle}>Bloque {blockIndex + 1}</Text>
            {blocks.length > 1 && (
              <Pressable onPress={() => removeBlock(blockIndex)} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>Eliminar bloque</Text>
              </Pressable>
            )}
          </View>

          {/* Switch para marcar como preparación */}
          <View style={styles.switchContainer}>
            <Text style={styles.label}>¿Es bloque de preparación?</Text>
            <Switch
              value={block.is_preparation}
              onValueChange={(value) => {
                updateBlock(blockIndex, {
                  is_preparation: value,
                  title: value ? "Preparación" : "",
                  repeat: value ? "1" : block.repeat,
                  exercises: value
                    ? [{ name: "preparen los elemntos", order: 1, duration: undefined, equipment: "" }]
                    : block.exercises,
                });
              }}
            />
          </View>

          <Text style={styles.label}>Título</Text>
          <TextInput
            style={[styles.input, block.is_preparation && styles.disabledInput]}
            placeholder="Título del bloque"
            value={block.title}
            onChangeText={(text) => updateBlock(blockIndex, { title: text })}
            editable={!block.is_preparation} // Bloquear edición si es preparación
          />

          <Text style={styles.label}>Repeticiones</Text>
          <TextInput
            style={[styles.input, block.is_preparation && styles.disabledInput]}
            keyboardType="numeric"
            placeholder="Ej: 1"
            value={block.repeat}
            onChangeText={(text) => updateBlock(blockIndex, { repeat: restrictToNumbers(text) })}
            editable={!block.is_preparation} // Bloquear para bloques de preparación
          />

          {block.exercises.map((exercise, exIndex) => (
            <View key={exIndex} style={styles.exerciseContainer}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseTitle}>
                  {block.is_preparation ? "Título" : `Ejercicio ${exIndex + 1}`}
                </Text>
                {!block.is_preparation && block.exercises.length > 1 && (
                  <Pressable
                    onPress={() => removeExercise(blockIndex, exIndex)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>Eliminar ejercicio</Text>
                  </Pressable>
                )}
              </View>

              <TextInput
                style={styles.input}
                placeholder={block.is_preparation ? "Preparen los elementos" : "Nombre del ejercicio"}
                value={exercise.name}
                onChangeText={(text) => updateExercise(blockIndex, exIndex, { name: text })}
              />

              <Text style={styles.label}>Duración (segundos)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="Ej: 30"
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
                  <Text style={styles.label}>Repeticiones</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Ej: 15"
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

              <Text style={styles.label}>Equipo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Mancuernas, Barra..."
                value={exercise.equipment || ""}
                onChangeText={(text) => updateExercise(blockIndex, exIndex, { equipment: text })}
              />
            </View>
          ))}

          {!block.is_preparation && (
            <Pressable onPress={() => addExercise(blockIndex)} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Agregar ejercicio</Text>
            </Pressable>
          )}
        </View>
      ))}

      <Pressable onPress={addBlock} style={styles.addButton}>
        <Text style={styles.addButtonText}>+ Agregar bloque</Text>
      </Pressable>

      <Pressable onPress={handleSubmit} style={styles.submitButton} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
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
  disabledInput: {
    backgroundColor: "#e5e7eb",
    color: "#444",
  },
  blockContainer: {
    marginTop: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    backgroundColor: "#fafafa",
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
    color: "#d00",
    fontWeight: "700",
  },
  exerciseContainer: {
    marginTop: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    backgroundColor: "#fff",
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
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
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
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
});