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
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

interface Exercise {
  id: string;
  name: string;
  order: number;
  duration?: number;
  reps?: number;
  equipment?: string;
}

interface Block {
  id: string;
  title: string;
  order: number;
  repeat: string;
  is_preparation?: boolean;
  exercises: Exercise[];
}

export default function EditRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { resolvedTheme, isThemeLoading } = useTheme();

  const [routineName, setRoutineName] = useState("");
  const [style, setStyle] = useState("");
  const [level, setLevel] = useState("");
  const [duration, setDuration] = useState("");
  const [restBetweenExercises, setRestBetweenExercises] = useState("20");
  const [restBetweenBlocks, setRestBetweenBlocks] = useState("60");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const restrictToNumbers = (text: string) => {
    return text.replace(/[^0-9]/g, "");
  };

  useEffect(() => {
    if (!id) {
      console.log("❌ ID no proporcionado");
      setError("No se proporcionó un ID de rutina.");
      return;
    }

    if (!session) {
      console.log("❌ No hay sesión activa");
      setError("Debes estar logueado para editar una rutina.");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        console.log("📡 Obteniendo datos de la rutina con ID:", id);
        const { data: routineData, error: routineError } = await supabase
          .from("routines")
          .select("name, style, level, duration, rest_between_exercises, rest_between_blocks")
          .eq("id", id)
          .eq("user_id", session.user.id)
          .single();

        if (routineError || !routineData) {
          console.error("❌ Error al cargar rutina:", {
            message: routineError?.message,
            details: routineError?.details,
            hint: routineError?.hint,
            code: routineError?.code,
          });
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
          console.error("❌ Error al cargar bloques:", {
            message: blockError?.message,
            details: blockError?.details,
            hint: blockError?.hint,
            code: blockError?.code,
          });
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
          console.error("❌ Error al cargar ejercicios:", {
            message: exerciseError?.message,
            details: exerciseError?.details,
            hint: exerciseError?.hint,
            code: exerciseError?.code,
          });
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
            })),
        }));

        setBlocks(blocksWithExercises);
        console.log("✅ Datos combinados y estados actualizados");
      } catch (e: any) {
        console.error("❌ Error inesperado al cargar datos:", {
          message: e.message,
          details: e.details,
          hint: e.hint,
          code: e.code,
        });
        setError("Error inesperado al cargar los datos.");
      } finally {
        setLoading(false);
        console.log("🛑 Carga de datos finalizada");
      }
    };

    fetchData();
  }, [id, session]);

  const updateBlock = (index: number, changes: Partial<Block>) => {
    setBlocks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...changes };
      if (changes.is_preparation) {
        copy[index].title = "Preparación";
        copy[index].exercises = [
          {
            id: copy[index].exercises[0]?.id || uuidv4(),
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

  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index).map((block, i) => ({ ...block, order: i + 1 })));
  };

  const addBlock = () => {
    setBlocks((prev) => [
      ...prev,
      {
        id: uuidv4(),
        title: "",
        order: prev.length + 1,
        repeat: "1",
        is_preparation: false,
        exercises: [{ id: uuidv4(), name: "", order: 1, duration: undefined, reps: undefined, equipment: "" }],
      },
    ]);
  };

  const addExercise = (blockIndex: number) => {
    setBlocks((prev) => {
      const copy = [...prev];
      const block = copy[blockIndex];
      if (block.is_preparation) return copy;
      const exercises = block.exercises;
      exercises.push({
        id: uuidv4(),
        name: "",
        order: exercises.length + 1,
        duration: undefined,
        reps: undefined,
        equipment: "",
      });
      return copy;
    });
  };

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
        if (!ex.id) {
          console.log("❌ Validación fallida: Ejercicio sin ID");
          Alert.alert("Error", `El ejercicio "${ex.name}" debe tener un ID válido.`);
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

  const handleSave = async () => {
    console.log("🧨 Iniciando guardado de rutina con ID:", id);
    if (!validate() || !id || !session) {
      console.log("❌ Guardado detenido: Validación fallida, ID no proporcionado o no hay sesión");
      Alert.alert("Error", "No se puede guardar debido a datos inválidos, falta de ID o sesión.");
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
        blocks: blocks.map((block) => ({
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
            equipment: ex.equipment || undefined,
          })),
        })),
      };

      console.log("📡 Llamando a updateRoutineWithBlocks con userId:", session.user.id);
      const success = await updateRoutineWithBlocks(session.user.id, id, routineToUpdate);
      if (success) {
        console.log("✅ Rutina actualizada correctamente");
        Alert.alert("Éxito", "La rutina se guardó correctamente.");
        router.replace("/");
      } else {
        console.log("❌ Error al actualizar la rutina");
        Alert.alert("Error", "No se pudo actualizar la rutina.");
      }
    } catch (e: any) {
      console.error("❌ Error al guardar la rutina:", {
        message: e.message,
        details: e.details,
        hint: e.hint,
        code: e.code,
      });
      Alert.alert("Error", `Hubo un error al guardar la rutina: ${e.message || "Desconocido"}`);
    } finally {
      setLoading(false);
      console.log("🛑 Guardado finalizado");
    }
  };

  if (loading || isThemeLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Editar Rutina</Text>
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}

      <Text style={[styles.label, { color: colors.textSecondary }]}>Nombre *</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.card, color: colors.text }]}
        placeholder="Nombre de la rutina"
        placeholderTextColor={colors.textSecondary}
        value={routineName}
        onChangeText={setRoutineName}
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
          key={block.id}
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
                    ? [
                        {
                          id: block.exercises[0]?.id || uuidv4(),
                          name: block.exercises[0]?.name || "Preparación",
                          order: 1,
                          duration: block.exercises[0]?.duration,
                          equipment: block.exercises[0]?.equipment || "",
                        },
                      ]
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
            placeholder="Ej: 1"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={block.repeat}
            onChangeText={(text) => updateBlock(blockIndex, { repeat: restrictToNumbers(text) })}
            editable={!block.is_preparation}
          />

          {block.exercises.map((ex, exIndex) => (
            <View
              key={ex.id}
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
                placeholder={block.is_preparation ? "Preparen los elementos" : "Nombre del ejercicio"}
                placeholderTextColor={colors.textSecondary}
                value={ex.name}
                onChangeText={(text) => updateExercise(blockIndex, exIndex, { name: text })}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Duración (segundos)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.card, color: colors.text }]}
                placeholder="Ej: 30"
                placeholderTextColor={colors.textSecondary}
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
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Repeticiones</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.card, color: colors.text }]}
                    placeholder="Ej: 15"
                    placeholderTextColor={colors.textSecondary}
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

              <Text style={[styles.label, { color: colors.textSecondary }]}>Equipo</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.card, color: colors.text }]}
                placeholder="Ej: Mancuernas, Barra..."
                placeholderTextColor={colors.textSecondary}
                value={ex.equipment || ""}
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
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.submitButtonText}>Guardar Cambios</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
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
  error: {
    fontWeight: "bold",
    marginBottom: 12,
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
  removeButton: {
    padding: 6,
  },
  removeButtonText: {
    fontWeight: "700",
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
  disabledButton: {
    opacity: 0.7,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
});