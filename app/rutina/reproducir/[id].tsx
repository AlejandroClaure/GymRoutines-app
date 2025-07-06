// app/rutina/reproducir/[id].tsx

import { View, Text, StyleSheet, ActivityIndicator, Platform, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAudioPlayer } from "expo-audio";
import { useAuth } from "@/context/AuthContext";
import { fetchUserRoutines } from "@/lib/supabaseService";
import { routineRegistry } from "@/data/routines/routineRegistry";
import { Routine } from "@/types/routine";

// Componente para reproducir una rutina
export default function RoutinePlayerScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>(); // Permitir que id sea opcional
  const router = useRouter();
  const { session } = useAuth();

  // Estados para manejar la rutina y el estado del reproductor
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentExerciseRepeat, setCurrentExerciseRepeat] = useState(1); // Repeticiones del ejercicio
  const [currentBlockRepeat, setCurrentBlockRepeat] = useState(1); // Repeticiones del bloque
  const [countdown, setCountdown] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [isRepeatingExercise, setIsRepeatingExercise] = useState(false); // 🔁 Nuevo estado para distinguir descanso entre repeticiones
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const timerRef = useRef<number | null>(null); // Usar number para React Native

  // Carga de sonidos para el reproductor
  const startSound = useAudioPlayer(require("@/assets/sounds/start.mp3"));
  const beepSound = useAudioPlayer(require("@/assets/sounds/beep.mp3"));

  // Función para reproducir sonidos
  const playSound = useCallback(
    async (type: "start" | "beep") => {
      if (type === "start") {
        await beepSound.pause();
        await beepSound.seekTo(0);
        await startSound.seekTo(0);
        await startSound.play();
      } else {
        await beepSound.seekTo(0);
        await beepSound.play();
      }
    },
    [startSound, beepSound]
  );

  // Función para detener el sonido de beep
  const stopBeep = useCallback(async () => {
    await beepSound.pause();
    await beepSound.seekTo(0);
  }, [beepSound]);

  // Función para iniciar el temporizador
  const startTimer = useCallback((duration: number) => {
    setCountdown(duration);
    setIsActive(true);
    setIsPaused(false);
  }, []);

  // Función para pausar/continuar el reproductor
  const togglePause = async () => {
    if (!isPaused) {
      await beepSound.pause();
      await beepSound.seekTo(0);
      await startSound.pause();
      await startSound.seekTo(0);
    }
    setIsPaused((prev) => !prev);
  };

  // Función para reiniciar el ejercicio actual
  const resetExercise = () => {
    if (!routine) return;
    const current = routine.blocks[currentBlockIndex].exercises[currentExerciseIndex];
    const duration = current.duration ?? (current.reps ? 30 : 30);
    setCurrentExerciseRepeat(1);
    startTimer(duration);
    playSound("start");
    setIsResting(false);
    setIsRepeatingExercise(false); // 🔁 Reset
  };

  // Función para reiniciar el bloque actual
  const resetBlock = () => {
    if (!routine) return;
    setCurrentExerciseIndex(0);
    setCurrentExerciseRepeat(1);
    setCurrentBlockRepeat(1);
    const current = routine.blocks[currentBlockIndex].exercises[0];
    const duration = current.duration ?? (current.reps ? 30 : 30);
    startTimer(duration);
    playSound("start");
    setIsResting(false);
    setIsRepeatingExercise(false); // 🔁 Reset
  };

  // Función para reiniciar la rutina completa
  const resetRoutine = () => {
    if (!routine) return;
    setCurrentBlockIndex(0);
    setCurrentExerciseIndex(0);
    setCurrentExerciseRepeat(1);
    setCurrentBlockRepeat(1);
    const first = routine.blocks[0].exercises[0];
    const duration = first.duration ?? (first.reps ? 30 : 30);
    startTimer(duration);
    playSound("start");
    setIsResting(false);
    setIsRepeatingExercise(false); // 🔁 Reset
  };

  // Función para avanzar al siguiente ejercicio, repetición, bloque o finalizar
  const proceedToNext = useCallback(async () => {
    if (!routine) return;

    await stopBeep();
    const block = routine.blocks[currentBlockIndex];
    const exercise = block.exercises[currentExerciseIndex];
    const isPreparation = block.is_preparation ?? block.title.trim().toLowerCase() === "preparación";

    if (isResting) {
      setIsResting(false);

      // 🔁 Verificar si es descanso entre repeticiones
      if (isRepeatingExercise) {
        setIsRepeatingExercise(false);
        setCurrentExerciseRepeat((r) => r + 1);
        const duration = exercise.duration ?? 30;
        startTimer(duration);
        playSound("start");
        return;
      }

      const nextExerciseIndex = currentExerciseIndex + 1;
      if (nextExerciseIndex < block.exercises.length) {
        setCurrentExerciseIndex(nextExerciseIndex);
        setCurrentExerciseRepeat(1);
        const next = block.exercises[nextExerciseIndex];
        const duration = next.duration ?? (next.reps ? 30 : 30);
        startTimer(duration);
        playSound("start");
      } else {
        if (currentBlockRepeat < block.repeat) {
          setCurrentBlockRepeat((r) => r + 1);
          setCurrentExerciseIndex(0);
          setCurrentExerciseRepeat(1);
          const next = block.exercises[0];
          const duration = next.duration ?? (next.reps ? 30 : 30);
          startTimer(duration);
          playSound("start");
        } else {
          const nextBlockIndex = currentBlockIndex + 1;
          if (nextBlockIndex < routine.blocks.length) {
            if (isPreparation) {
              setCurrentBlockIndex(nextBlockIndex);
              setCurrentBlockRepeat(1);
              setCurrentExerciseIndex(0);
              setCurrentExerciseRepeat(1);
              const next = routine.blocks[nextBlockIndex].exercises[0];
              const duration = next.duration ?? (next.reps ? 30 : 30);
              startTimer(duration);
              playSound("start");
            } else {
              setIsResting(true);
              startTimer(routine.rest_between_blocks ?? 5);
            }
          } else {
            setIsActive(false);
            router.replace("/");
          }
        }
      }
    } else {
      // Durante el ejercicio, verificar repeticiones
      if (exercise.reps && currentExerciseRepeat < exercise.reps) {
        // 🔁 Agregar descanso entre repeticiones
        setIsResting(true);
        setIsRepeatingExercise(true);
        startTimer(routine.rest_between_exercises ?? 5);
      } else {
        const nextExerciseIndex = currentExerciseIndex + 1;
        if (nextExerciseIndex < block.exercises.length) {
          if (isPreparation) {
            setCurrentExerciseIndex(nextExerciseIndex);
            setCurrentExerciseRepeat(1);
            const next = block.exercises[nextExerciseIndex];
            const duration = next.duration ?? (next.reps ? 30 : 30);
            startTimer(duration);
            playSound("start");
          } else {
            setIsResting(true);
            startTimer(routine.rest_between_exercises ?? 5);
          }
        } else {
          if (currentBlockRepeat < block.repeat) {
            if (isPreparation) {
              setCurrentBlockRepeat((r) => r + 1);
              setCurrentExerciseIndex(0);
              setCurrentExerciseRepeat(1);
              const next = block.exercises[0];
              const duration = next.duration ?? (next.reps ? 30 : 30);
              startTimer(duration);
              playSound("start");
            } else {
              setIsResting(true);
              startTimer(routine.rest_between_exercises ?? 5);
            }
          } else {
            const nextBlockIndex = currentBlockIndex + 1;
            if (nextBlockIndex < routine.blocks.length) {
              if (isPreparation) {
                setCurrentBlockIndex(nextBlockIndex);
                setCurrentBlockRepeat(1);
                setCurrentExerciseIndex(0);
                setCurrentExerciseRepeat(1);
                const next = routine.blocks[nextBlockIndex].exercises[0];
                const duration = next.duration ?? (next.reps ? 30 : 30);
                startTimer(duration);
                playSound("start");
              } else {
                setIsResting(true);
                startTimer(routine.rest_between_blocks ?? 5);
              }
            } else {
              setIsActive(false);
              router.replace("/");
            }
          }
        }
      }
    }
  }, [
    routine,
    currentBlockIndex,
    currentExerciseIndex,
    currentExerciseRepeat,
    currentBlockRepeat,
    isResting,
    isRepeatingExercise,
    router,
    playSound,
    startTimer,
    stopBeep,
  ]);

  // Efecto para manejar el temporizador
  useEffect(() => {
    if (!isActive || isPaused) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          proceedToNext();
          return 0;
        }

        const next = prev - 1;
        if (!isResting && next <= 5) {
          playSound("beep");
        }

        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused, isResting, proceedToNext, playSound]);

  // Efecto para cargar la rutina
  useEffect(() => {
    const loadRoutine = async () => {
      if (!id) {
        setRoutine(null);
        setLoading(false);
        return;
      }

      if (routineRegistry[id]) {
        setRoutine(routineRegistry[id]);
        setLoading(false);
        return;
      }

      if (!session?.user?.id) {
        setRoutine(null);
        setLoading(false);
        return;
      }

      try {
        const routines = await fetchUserRoutines(session.user.id);
        const found = routines.find((r) => r.id === id) ?? null;
        setRoutine(found);
      } catch (error) {
        console.error("Error al cargar rutina:", error);
        setRoutine(null);
      } finally {
        setLoading(false);
      }
    };

    loadRoutine();
  }, [session, id]);

  // Efecto para iniciar el primer ejercicio
  useEffect(() => {
    if (!routine?.blocks[0]?.exercises[0]) return;

    const first = routine.blocks[0].exercises[0];
    const duration = first.duration ?? (first.reps ? 30 : 30);
    setCurrentExerciseRepeat(1);
    setCurrentBlockRepeat(1);
    startTimer(duration);
    playSound("start");
  }, [routine, startTimer, playSound]);

  // Pantalla de carga
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Pantalla de error si no se encuentra la rutina
  if (!routine) {
    return (
      <View style={styles.centered}>
        <Text>❌ Rutina no encontrada</Text>
      </View>
    );
  }

  const block = routine.blocks[currentBlockIndex];
  const exercise = block.exercises[currentExerciseIndex];

  // Renderizado del reproductor
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ alignItems: "center", justifyContent: "center", paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.block}>
        {block.title} — Vuelta {currentBlockRepeat}/{block.repeat}
      </Text>
      <Text style={styles.exercise}>
        {isResting ? "Descanso" : exercise.name}
      </Text>
      {exercise.reps && !isResting && (
        <Text style={styles.reps}>
          Repetición {currentExerciseRepeat}/{exercise.reps}
        </Text>
      )}
      <Text style={styles.timer}>{countdown}s</Text>
      {exercise.equipment && (
        <Text style={styles.equipment}>{exercise.equipment}</Text>
      )}

      <View style={styles.controls}>
        <Pressable onPress={togglePause} style={styles.button}>
          <Text style={styles.buttonText}>
            {isPaused ? "▶ Continuar" : "⏸ Pausar"}
          </Text>
        </Pressable>
        <Pressable onPress={resetExercise} style={styles.button}>
          <Text style={styles.buttonText}>🔁 Ejercicio</Text>
        </Pressable>
        <Pressable onPress={resetBlock} style={styles.button}>
          <Text style={styles.buttonText}>🔁 Bloque</Text>
        </Pressable>
        <Pressable onPress={resetRoutine} style={styles.button}>
          <Text style={styles.buttonText}>🔁 Rutina</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// Estilos para el componente
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
    paddingHorizontal: 24,
  },
  block: {
    fontSize: Platform.OS === "web" ? 56 : 28,
    color: "#93c5fd",
    marginTop: Platform.OS === "web" ? 100 : 50,
    marginBottom: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  equipment: {
    fontSize: Platform.OS === "web" ? 56 : 28,
    color: "#93c5fd",
    marginBottom: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  exercise: {
    fontSize: Platform.OS === "web" ? 80 : 40,
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  timer: {
    fontSize: 72,
    color: "#22d3ee",
    fontWeight: "bold",
    textAlign: "center",
  },
  reps: {
    fontSize: Platform.OS === "web" ? 48 : 24,
    color: "#93c5fd",
    marginBottom: 16,
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 40,
    gap: 12,
  },
  button: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    margin: 6,
  },
  buttonText: {
    color: "#fff",
    fontSize: Platform.OS === "web" ? 32 : 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});
