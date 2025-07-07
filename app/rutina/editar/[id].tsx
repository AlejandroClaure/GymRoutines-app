// app/rutina/editar/[id].tsx

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
  Switch,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { updateRoutineWithBlocks } from "@/lib/supabaseService";

// Definición de interfaces para ejercicios y bloques
interface Exercise {
  id?: string;
  name: string;
  order: number;
  duration?: number;
  reps?: number;
  equipment?: string;
  block_id?: string;
}

interface Block {
  id?: string;
  title: string;
  order: number;
  repeat: string;
  is_preparation?: boolean;
  exercises: Exercise[];
}

export default function EditRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Estados para los datos de la rutina
  const [routineName, setRoutineName] = useState("");
  const [style, setStyle] = useState("");
  const [level, setLevel] = useState("");
  const [duration, setDuration] = useState("");
  const [restBetweenExercises, setRestBetweenExercises] = useState("20");
  const [restBetweenBlocks, setRestBetweenBlocks] = useState("60");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para restringir input a solo números
  const restrictToNumbers = (text: string) => {
    return text.replace(/[^0-9]/g, "");
  };

  // Efecto para cargar los datos de la rutina
  useEffect(() => {
    console.log("🧪 Iniciando carga de datos para rutina con ID:", id);
    if (!id) {
      console.log("❌ ID no proporcionado");
      setError("No se proporcionó un ID de rutina.");
      return;
    }

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
          .select("id, title, repeat, is_preparation, order")
          .eq("routine_id", id)
          .order("order", { ascending: true });

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
          .select("id, name, duration, reps, equipment, block_id, order")
          .in("block_id", blockIds)
          .order("order", { ascending: true });

        if (exerciseError || !exerciseData) {
          console.log("❌ Error al cargar ejercicios:", exerciseError?.message || "No data");
          setError("No se pudieron cargar los ejercicios.");
          return;
        }

        console.log("✅ Ejercicios cargados:", exerciseData);
        const blocksWithExercises: Block[] = blockData.map((block) => ({
          id: block.id,
          title: block.title,
          order: block.order,
          repeat: block.repeat.toString(),
          is_preparation: block.is_preparation || false,
          exercises: exerciseData
            .filter((ex) => ex.block_id === block.id)
            .map((ex) => ({
              id: ex.id,
              name: ex.name,
              order: ex.order,
              duration: ex.duration,
              reps: ex.reps,
              equipment: ex.equipment || "",
              block_id: ex.block_id,
            })),
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

  // Función para actualizar un bloque
  const updateBlock = (index: number, changes: Partial<Block>) => {
    setBlocks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...changes };
      if (changes.is_preparation) {
        copy[index].title = "Preparación";
        copy[index].exercises = [
          {
            id: copy[index].exercises[0]?.id,
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

  // Función para eliminar un bloque
  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index).map((block, i) => ({ ...block, order: i + 1 })));
  };

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
  const removeExercise = (blockIndex: number, exIndex: number) => {
    setBlocks((prev) => {
      const copy = [...prev];
      const block = copy[blockIndex];
      if (block.is_preparation) return copy;
      copy[blockIndex].exercises = copy[blockIndex].exercises
        .filter((_, i) => i !== exIndex)
        .map((ex, i) => ({ ...ex, order: i + 1 }));
      return copy;
    });
  };

  // Función para actualizar un ejercicio
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

  // Función para validar los datos
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

  // Función para guardar los cambios
  const handleSave = async () => {
    console.log("🧨 Iniciando guardado de rutina con ID:", id);
    if (!validate() || !id) {
      console.log("❌ Guardado detenido: Validación fallida o ID no proporcionado");
      Alert.alert("Error", "No se puede guardar debido a datos inválidos o falta de ID.");
      return;
    }

    setLoading(true);
    try {
      const routineToUpdate = {
        name: routineName,
        style: style.trim() || undefined,
        level: level.trim() || undefined,
        duration: duration ? parseInt(duration) : undefined,
        rest_between_exercises: parseInt(restBetweenExercises) || 20,
        rest_between_blocks: parseInt(restBetweenBlocks) || 60,
        blocks: blocks.map((block, index) => ({
          id: block.id,
          title: block.title,
          order: block.order,
          repeat: parseInt(block.repeat) || 1,
          is_preparation: block.is_preparation,
          exercises: block.exercises.map((ex, exIndex) => ({
            id: ex.id,
            name: ex.name,
            order: exIndex + 1,
            duration: ex.duration,
            reps: ex.reps,
            equipment: ex.equipment,
          })),
        })),
      };

      const sessionResponse = await supabase.auth.getSession();
      if (!sessionResponse.data.session) {
        console.log("❌ No hay sesión activa");
        Alert.alert("Error", "Debes estar logueado para guardar la rutina.");
        return;
      }

      const userId = sessionResponse.data.session.user.id;
      console.log("📡 Llamando a updateRoutineWithBlocks con userId:", userId);
      const success = await updateRoutineWithBlocks(userId, id, routineToUpdate);
      if (success) {
        console.log("✅ Rutina actualizada correctamente");
        Alert.alert("Éxito", "La rutina se guardó correctamente.");
        router.replace("/");
      } else {
        console.log("❌ Error al actualizar la rutina");
        Alert.alert("Error", "No se pudo actualizar la rutina.");
      }
    } catch (e: any) {
      console.error("❌ Error al guardar la rutina:", e);
      Alert.alert("Error", `Hubo un error al guardar la rutina: ${e.message || "Desconocido"}`);
    } finally {
      setLoading(false);
      console.log("🛑 Guardado finalizado");
    }
  };

  // Mostrar pantalla de carga
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Renderizado principal
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Editar Rutina</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.label}>Nombre *</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre de la rutina"
        value={routineName}
        onChangeText={setRoutineName}
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
        placeholder="Ej: 20"
        keyboardType="numeric"
        value={restBetweenExercises}
        onChangeText={(text) => setRestBetweenExercises(restrictToNumbers(text))}
      />

      <Text style={styles.label}>Descanso entre bloques (segundos)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: 60"
        keyboardType="numeric"
        value={restBetweenBlocks}
        onChangeText={(text) => setRestBetweenBlocks(restrictToNumbers(text))}
      />

      {/* Bloques dinámicos */}
      {blocks.map((block, blockIndex) => (
        <View key={block.id || blockIndex} style={styles.blockContainer}>
          <View style={styles.blockHeader}>
            <Text style={styles.blockTitle}>Bloque {blockIndex + 1}</Text>
            {blocks.length > 1 && (
              <Pressable onPress={() => removeBlock(blockIndex)} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>Eliminar bloque</Text>
              </Pressable>
            )}
          </View>

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
                    ? [
                        {
                          name: block.exercises[0]?.name || "Preparación",
                          order: 1,
                          duration: block.exercises[0]?.duration,
                          equipment: block.exercises[0]?.equipment || "",
                        },
                      ]
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
            editable={!block.is_preparation}
          />

          <Text style={styles.label}>Repeticiones</Text>
          <TextInput
            style={[styles.input, block.is_preparation && styles.disabledInput]}
            placeholder="Ej: 1"
            keyboardType="numeric"
            value={block.repeat}
            onChangeText={(text) => updateBlock(blockIndex, { repeat: restrictToNumbers(text) })}
            editable={!block.is_preparation}
          />

          {block.exercises.map((ex, exIndex) => (
            <View key={ex.id || exIndex} style={styles.exerciseContainer}>
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
                value={ex.name}
                onChangeText={(text) => updateExercise(blockIndex, exIndex, { name: text })}
              />

              <Text style={styles.label}>Duración (segundos)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 30"
                keyboardType="numeric"
                value={ex.duration?.toString() || ""}
                onChangeText={(text) => {
                  const val = parseInt(restrictToNumbers(text));
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
                    placeholder="Ej: 15"
                    keyboardType="numeric"
                    value={ex.reps?.toString() || ""}
                    onChangeText={(text) => {
                      const val = parseInt(restrictToNumbers(text));
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
                value={ex.equipment || ""}
                onChangeText={(text) => updateExercise(blockIndex, exIndex, { equipment: text })}
              />
            </View>
          ))}

          {!block.is_preparation && (
            <Pressable style={styles.addButton} onPress={() => addExercise(blockIndex)}>
              <Text style={styles.addButtonText}>+ Agregar ejercicio</Text>
            </Pressable>
          )}
        </View>
      ))}

      <Pressable style={styles.addButton} onPress={addBlock}>
        <Text style={styles.addButtonText}>+ Agregar bloque</Text>
      </Pressable>

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
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
});