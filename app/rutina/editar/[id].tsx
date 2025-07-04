import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

// Definición de interfaces para ejercicios y bloques
interface Exercise {
  id: string;
  name: string;
  duration?: number;
  reps?: number;
  equipment?: string;
  block_id?: string;
}

interface Block {
  id: string;
  title: string;
  repeat: number;
  exercises: Exercise[];
}

export default function EditRoutineScreen() {
  // Obtiene el ID de la rutina desde los parámetros de la URL
  const { id } = useLocalSearchParams<{ id: string }>();
  // Hook para manejar la navegación
  const router = useRouter();

  // Estados para los datos de la rutina
  const [routineName, setRoutineName] = useState(""); // Nombre de la rutina
  const [style, setStyle] = useState(""); // Estilo (ej: Fuerza, Cardio)
  const [level, setLevel] = useState(""); // Nivel (ej: Principiante)
  const [duration, setDuration] = useState(""); // Duración total en minutos
  const [restBetweenExercises, setRestBetweenExercises] = useState("20"); // Descanso entre ejercicios
  const [restBetweenBlocks, setRestBetweenBlocks] = useState("60"); // Descanso entre bloques
  const [blocks, setBlocks] = useState<Block[]>([]); // Lista de bloques
  const [loading, setLoading] = useState(false); // Estado de carga
  const [error, setError] = useState<string | null>(null); // Estado de error

  // Efecto para cargar los datos de la rutina al montar el componente
  useEffect(() => {
    console.log("🧪 Iniciando carga de datos para rutina con ID:", id);
    if (!id) {
      console.log("❌ ID no proporcionado");
      setError("No se proporcionó un ID de rutina.");
      return;
    }

    // Función para obtener datos de la rutina desde Supabase
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log("📡 Obteniendo datos de la rutina...");
        const { data: routineData, error: routineError } = await supabase
          .from("routines")
          .select("name, style, level, duration, rest_between_exercises, rest_between_blocks")
          .eq("id", id)
          .single();

        if (routineError || !routineData) {
          console.log("❌ Error al cargar rutina:", routineError?.message || "No data");
          setError("No se pudo cargar la rutina.");
          return;
        }

        console.log("✅ Rutina cargada:", routineData);
        setRoutineName(routineData.name);
        setStyle(routineData.style || "");
        setLevel(routineData.level || "");
        setDuration(routineData.duration?.toString() || "");
        setRestBetweenExercises(routineData.rest_between_exercises?.toString() || "20");
        setRestBetweenBlocks(routineData.rest_between_blocks?.toString() || "60");

        console.log("📡 Obteniendo bloques...");
        const { data: blockData, error: blockError } = await supabase
          .from("blocks")
          .select("id, title, repeat")
          .eq("routine_id", id);

        if (blockError || !blockData) {
          console.log("❌ Error al cargar bloques:", blockError?.message || "No data");
          setError("No se pudieron cargar los bloques.");
          return;
        }

        console.log("✅ Bloques cargados:", blockData);
        const blockIds = blockData.map((b) => b.id);
        console.log("📡 Obteniendo ejercicios para bloques:", blockIds);
        const { data: exerciseData, error: exerciseError } = await supabase
          .from("exercises")
          .select("*")
          .in("block_id", blockIds);

        if (exerciseError || !exerciseData) {
          console.log("❌ Error al cargar ejercicios:", exerciseError?.message || "No data");
          setError("No se pudieron cargar los ejercicios.");
          return;
        }

        console.log("✅ Ejercicios cargados:", exerciseData);
        const blocksWithExercises: Block[] = blockData.map((block) => ({
          ...block,
          exercises: exerciseData.filter((ex) => ex.block_id === block.id),
        }));

        setBlocks(blocksWithExercises);
        console.log("✅ Datos combinados y estados actualizados");
      } catch (e) {
        console.error("❌ Error inesperado al cargar datos:", e);
        setError("Error inesperado al cargar los datos.");
      } finally {
        setLoading(false);
        console.log("🛑 Carga de datos finalizada");
      }
    };

    fetchData();
  }, [id]);

  // Función para actualizar un bloque específico
  const updateBlock = (index: number, changes: Partial<Block>) => {
    setBlocks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...changes };
      return copy;
    });
  };

  // Función para eliminar un bloque
  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  // Función para actualizar un ejercicio dentro de un bloque
  const updateExercise = (blockIndex: number, exIndex: number, changes: Partial<Exercise>) => {
    setBlocks((prev) => {
      const copy = [...prev];
      copy[blockIndex].exercises[exIndex] = {
        ...copy[blockIndex].exercises[exIndex],
        ...changes,
      };
      return copy;
    });
  };

  // Función para agregar un nuevo bloque
  const addBlock = () => {
    setBlocks((prev) => [
      ...prev,
      {
        id: uuidv4(),
        title: "",
        repeat: 1,
        exercises: [{ id: uuidv4(), name: "", duration: undefined, reps: undefined, equipment: "" }],
      },
    ]);
  };

  // Función para agregar un nuevo ejercicio a un bloque
  const addExercise = (blockIndex: number) => {
    setBlocks((prev) => {
      const copy = [...prev];
      copy[blockIndex].exercises.push({
        id: uuidv4(),
        name: "",
        duration: undefined,
        reps: undefined,
        equipment: "",
      });
      return copy;
    });
  };

  // Función para eliminar un ejercicio de un bloque
  const removeExercise = (blockIndex: number, exIndex: number) => {
    setBlocks((prev) => {
      const copy = [...prev];
      copy[blockIndex].exercises = copy[blockIndex].exercises.filter((_, i) => i !== exIndex);
      return copy;
    });
  };

  // Función para validar los datos antes de guardar
  const validate = (): boolean => {
    console.log("🔍 Iniciando validación de datos...");
    if (!routineName.trim()) {
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
      if (block.repeat < 1) {
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
        if (!ex.duration && !ex.reps) {
          console.log("❌ Validación fallida: Ejercicio sin duración ni repeticiones");
          Alert.alert("Error", `El ejercicio "${ex.name}" debe tener duración o repeticiones.`);
          return false;
        }
        if (ex.duration && isNaN(ex.duration)) {
          console.log("❌ Validación fallida: Duración de ejercicio no válida");
          Alert.alert("Error", `La duración del ejercicio "${ex.name}" debe ser un número válido.`);
          return false;
        }
        if (ex.reps && isNaN(ex.reps)) {
          console.log("❌ Validación fallida: Repeticiones de ejercicio no válidas");
          Alert.alert("Error", `Las repeticiones del ejercicio "${ex.name}" deben ser un número válido.`);
          return false;
        }
      }
    }

    console.log("✅ Validación exitosa");
    return true;
  };

  // Función para guardar los cambios en la rutina
  const handleSave = async () => {
    console.log("🧨 handleSave iniciado");
    if (!validate() || !id) {
      console.log("❌ handleSave detenido: Validación fallida o ID no proporcionado");
      Alert.alert("Error", "No se puede guardar debido a datos inválidos o falta de ID.");
      return;
    }

    setLoading(true);
    try {
      console.log("📡 Actualizando rutina en Supabase...");
      const { error: routineError } = await supabase
        .from("routines")
        .update({
          name: routineName,
          style: style.trim() || null,
          level: level.trim() || null,
          duration: duration ? parseInt(duration) : null,
          rest_between_exercises: parseInt(restBetweenExercises) || 20,
          rest_between_blocks: parseInt(restBetweenBlocks) || 60,
        })
        .eq("id", id);

      if (routineError) {
        console.log("❌ Error al actualizar rutina:", routineError.message);
        throw new Error(`Error al actualizar la rutina: ${routineError.message}`);
      }

      console.log("✅ Rutina actualizada");
      console.log("📡 Actualizando/insertando bloques...");
      for (const block of blocks) {
        const { error: blockError } = await supabase.from("blocks").upsert({
          id: block.id,
          routine_id: id,
          title: block.title,
          repeat: block.repeat,
        });

        if (blockError) {
          console.log("❌ Error al guardar bloque:", blockError.message);
          throw new Error(`Error al guardar el bloque: ${blockError.message}`);
        }

        const formattedExercises = block.exercises.map((ex) => ({
          id: ex.id,
          block_id: block.id,
          name: ex.name,
          duration: ex.duration || null,
          reps: ex.reps || null,
          equipment: ex.equipment || null,
        }));

        console.log("📡 Actualizando/insertando ejercicios para bloque:", block.id);
        const { error: exerciseError } = await supabase.from("exercises").upsert(formattedExercises);

        if (exerciseError) {
          console.log("❌ Error al guardar ejercicios:", exerciseError.message);
          throw new Error(`Error al guardar los ejercicios: ${exerciseError.message}`);
        }
      }

      console.log("✅ Bloques y ejercicios guardados");
      console.log("📡 Eliminando bloques antiguos...");
      const currentBlockIds = blocks.map((b) => b.id);
      const { error: deleteError } = await supabase
        .from("blocks")
        .delete()
        .eq("routine_id", id)
        .not("id", "in", currentBlockIds);

      if (deleteError) {
        console.log("❌ Error al eliminar bloques antiguos:", deleteError.message);
        throw new Error(`Error al eliminar bloques antiguos: ${deleteError.message}`);
      }

      console.log("✅ Guardado completo, mostrando mensaje y navegando al inicio");
      Alert.alert("Éxito", "La rutina se guardó correctamente.");
      router.replace("/");
    } catch (e: any) {
      console.error("❌ Error en handleSave:", e.message || "Desconocido");
      Alert.alert("Error", `Hubo un error al guardar la rutina: ${e.message || "Desconocido"}`);
    } finally {
      setLoading(false);
      console.log("🛑 handleSave finalizado");
    }
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Editar Rutina</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Campo para el nombre de la rutina */}
      <Text style={styles.label}>Nombre *</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre de la rutina"
        value={routineName}
        onChangeText={setRoutineName}
      />

      {/* Campo para el estilo de la rutina */}
      <Text style={styles.label}>Estilo</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Fuerza, Cardio, HIIT..."
        value={style}
        onChangeText={setStyle}
      />

      {/* Campo para el nivel de la rutina */}
      <Text style={styles.label}>Nivel</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Principiante, Intermedio, Avanzado"
        value={level}
        onChangeText={setLevel}
      />

      {/* Campo para la duración de la rutina */}
      <Text style={styles.label}>Duración (minutos)</Text>
      <TextInput
        style={styles.input}
        placeholder="Duración total estimada"
        keyboardType="numeric"
        value={duration}
        onChangeText={setDuration}
      />

      {/* Campo para el descanso entre ejercicios */}
      <Text style={styles.label}>Descanso entre ejercicios (segundos)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: 20"
        keyboardType="numeric"
        value={restBetweenExercises}
        onChangeText={setRestBetweenExercises}
      />

      {/* Campo para el descanso entre bloques */}
      <Text style={styles.label}>Descanso entre bloques (segundos)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: 60"
        keyboardType="numeric"
        value={restBetweenBlocks}
        onChangeText={setRestBetweenBlocks}
      />

      {/* Renderizado dinámico de los bloques */}
      {blocks.map((block, blockIndex) => (
        <View key={block.id} style={styles.blockContainer}>
          <View style={styles.blockHeader}>
            <Text style={styles.blockTitle}>Bloque {blockIndex + 1}</Text>
            {blocks.length > 1 && (
              <Pressable onPress={() => removeBlock(blockIndex)} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>Eliminar bloque</Text>
              </Pressable>
            )}
          </View>

          {/* Campo para el título del bloque */}
          <TextInput
            style={styles.input}
            placeholder="Título del bloque"
            value={block.title}
            onChangeText={(text) => updateBlock(blockIndex, { title: text })}
          />

          {/* Campo para las repeticiones del bloque */}
          <Text style={styles.label}>Repeticiones</Text>
          <TextInput
            style={styles.input}
            placeholder="Repeticiones"
            keyboardType="numeric"
            value={block.repeat.toString()}
            onChangeText={(text) => {
              const val = parseInt(text) || 1;
              updateBlock(blockIndex, { repeat: val });
            }}
          />

          {/* Renderizado dinámico de los ejercicios del bloque */}
          {block.exercises.map((ex, exIndex) => (
            <View key={ex.id} style={styles.exerciseContainer}>
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

              {/* Campo para el nombre del ejercicio */}
              <TextInput
                style={styles.input}
                placeholder="Nombre del ejercicio"
                value={ex.name}
                onChangeText={(text) => updateExercise(blockIndex, exIndex, { name: text })}
              />

              {/* Campo para la duración del ejercicio */}
              <Text style={styles.label}>Duración (segundos)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 30"
                keyboardType="numeric"
                value={ex.duration?.toString() || ""}
                onChangeText={(text) => {
                  const val = parseInt(text);
                  updateExercise(blockIndex, exIndex, { duration: isNaN(val) ? undefined : val });
                }}
              />

              {/* Campo para las repeticiones del ejercicio */}
              <Text style={styles.label}>Repeticiones</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 15"
                keyboardType="numeric"
                value={ex.reps?.toString() || ""}
                onChangeText={(text) => {
                  const val = parseInt(text);
                  updateExercise(blockIndex, exIndex, { reps: isNaN(val) ? undefined : val });
                }}
              />

              {/* Campo para el equipo del ejercicio */}
              <Text style={styles.label}>Equipo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Mancuernas, Barra..."
                value={ex.equipment || ""}
                onChangeText={(text) => updateExercise(blockIndex, exIndex, { equipment: text })}
              />
            </View>
          ))}

          {/* Botón para agregar un ejercicio al bloque */}
          <Pressable style={styles.addButton} onPress={() => addExercise(blockIndex)}>
            <Text style={styles.addButtonText}>+ Agregar ejercicio</Text>
          </Pressable>
        </View>
      ))}

      {/* Botón para agregar un nuevo bloque */}
      <Pressable style={styles.addButton} onPress={addBlock}>
        <Text style={styles.addButtonText}>+ Agregar bloque</Text>
      </Pressable>

      {/* Botón para probar la navegación */}
      <Pressable style={styles.addButton} onPress={() => {
        console.log("🧪 Probando navegación manual a /");
        router.replace("/");
      }}>
        <Text style={styles.addButtonText}>Volver al inicio (prueba)</Text>
      </Pressable>

      {/* Botón para guardar los cambios */}
      <Pressable
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Guardar Cambios</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

// Estilos para la interfaz de usuario
const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    color: "#111827",
  },
  error: {
    color: "#dc2626",
    fontWeight: "bold",
    marginBottom: 12,
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
    padding: 10,
    marginTop: 6,
    backgroundColor: "#fff",
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
    color: "#111827",
  },
  exerciseContainer: {
    marginTop: 16,
    padding: 10,
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
    color: "#111827",
  },
  removeButton: {
    padding: 6,
  },
  removeButtonText: {
    color: "#d00",
    fontWeight: "700",
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
  disabledButton: {
    backgroundColor: "#93c5fd",
  },
});