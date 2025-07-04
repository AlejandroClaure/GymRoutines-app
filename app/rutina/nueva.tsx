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
} from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { createRoutineWithBlocks } from "@/lib/supabaseService";

type Exercise = {
  name: string;
  order: number;
  duration?: number;
  reps?: number;
  equipment?: string;
};

type Block = {
  title: string;
  order: number;
  repeat: number;
  exercises: Exercise[];
};

export default function NuevaRutinaScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [name, setName] = useState("");
  const [style, setStyle] = useState("");
  const [level, setLevel] = useState("");
  const [duration, setDuration] = useState("");
  const [restBetweenExercises, setRestBetweenExercises] = useState("20");
  const [restBetweenBlocks, setRestBetweenBlocks] = useState("60");

  const [blocks, setBlocks] = useState<Block[]>([
    {
      title: "",
      order: 1,
      repeat: 1,
      exercises: [
        { name: "", order: 1, duration: undefined, reps: undefined, equipment: "" },
      ],
    },
  ]);

  const [loading, setLoading] = useState(false);

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text>No estás logueado.</Text>
      </View>
    );
  }

  const addBlock = () => {
    setBlocks((prev) => [
      ...prev,
      {
        title: "",
        order: prev.length + 1,
        repeat: 1,
        exercises: [{ name: "", order: 1, duration: undefined, reps: undefined, equipment: "" }],
      },
    ]);
  };

  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBlock = (index: number, block: Partial<Block>) => {
    setBlocks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...block };
      return copy;
    });
  };

  const addExercise = (blockIndex: number) => {
    setBlocks((prev) => {
      const copy = [...prev];
      const exercises = copy[blockIndex].exercises;
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

  const removeExercise = (blockIndex: number, exerciseIndex: number) => {
    setBlocks((prev) => {
      const copy = [...prev];
      copy[blockIndex].exercises = copy[blockIndex].exercises.filter((_, i) => i !== exerciseIndex);
      // reordenar orders de ejercicios
      copy[blockIndex].exercises = copy[blockIndex].exercises.map((ex, i) => ({ ...ex, order: i + 1 }));
      return copy;
    });
  };

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

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Debes ingresar un nombre para la rutina.");
      return;
    }

    // Validar bloques y ejercicios mínimos
    for (const block of blocks) {
      if (!block.title.trim()) {
        Alert.alert("Error", "Cada bloque debe tener un título.");
        return;
      }
      if (block.exercises.length === 0) {
        Alert.alert("Error", `El bloque "${block.title}" debe tener al menos un ejercicio.`);
        return;
      }
      for (const ex of block.exercises) {
        if (!ex.name.trim()) {
          Alert.alert("Error", "Cada ejercicio debe tener un nombre.");
          return;
        }
        // Opcional: validar duración o rep mínimo uno
        if (!ex.duration && !ex.reps) {
          Alert.alert(
            "Error",
            `El ejercicio "${ex.name}" debe tener duración o repeticiones definidas.`
          );
          return;
        }
      }
    }

    setLoading(true);

    const routineToCreate = {
      name,
      style: style.trim() || undefined,
      level: level.trim() || undefined,
      duration: duration ? parseInt(duration, 10) : undefined,
      rest_between_exercises: restBetweenExercises ? parseInt(restBetweenExercises, 10) : 20,
      rest_between_blocks: restBetweenBlocks ? parseInt(restBetweenBlocks, 10) : 60,
      blocks: blocks.map((block) => ({
        title: block.title,
        order: block.order,
        repeat: block.repeat,
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
        router.replace("/"); // Volver al home
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
        onChangeText={setDuration}
      />

      <Text style={styles.label}>Descanso entre ejercicios (segundos)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: 20"
        keyboardType="numeric"
        value={restBetweenExercises}
        onChangeText={setRestBetweenExercises}
      />

      <Text style={styles.label}>Descanso entre bloques (segundos)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: 60"
        keyboardType="numeric"
        value={restBetweenBlocks}
        onChangeText={setRestBetweenBlocks}
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

          <TextInput
            style={styles.input}
            placeholder="Título del bloque"
            value={block.title}
            onChangeText={(text) => updateBlock(blockIndex, { title: text })}
          />

          <Text style={styles.label}>Repeticiones</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={block.repeat.toString()}
            onChangeText={(text) => {
              const val = parseInt(text, 10);
              if (!isNaN(val) && val > 0) updateBlock(blockIndex, { repeat: val });
            }}
          />

          {/* Ejercicios del bloque */}
          {block.exercises.map((exercise, exIndex) => (
            <View key={exIndex} style={styles.exerciseContainer}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseTitle}>Ejercicio {exIndex + 1}</Text>
                {block.exercises.length > 1 && (
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
                placeholder="Nombre del ejercicio"
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
                  const val = parseInt(text, 10);
                  updateExercise(blockIndex, exIndex, { duration: isNaN(val) ? undefined : val });
                }}
              />

              <Text style={styles.label}>Repeticiones</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="Ej: 15"
                value={exercise.reps?.toString() || ""}
                onChangeText={(text) => {
                  const val = parseInt(text, 10);
                  updateExercise(blockIndex, exIndex, { reps: isNaN(val) ? undefined : val });
                }}
              />

              <Text style={styles.label}>Equipo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Mancuernas, Barra..."
                value={exercise.equipment || ""}
                onChangeText={(text) => updateExercise(blockIndex, exIndex, { equipment: text })}
              />
            </View>
          ))}

          <Pressable onPress={() => addExercise(blockIndex)} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Agregar ejercicio</Text>
          </Pressable>
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
});
