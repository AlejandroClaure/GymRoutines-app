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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { session } = useAuth();

  // Estados para manejar la rutina y el estado del reproductor
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentExerciseRepeat, setCurrentExerciseRepeat] = useState(1);
  const [currentBlockRepeat, setCurrentBlockRepeat] = useState(1);
  const [countdown, setCountdown] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [isRepeatingExercise, setIsRepeatingExercise] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const timerRef = useRef<number | null>(null);

  // Carga de sonidos para el reproductor
  const startSound = useAudioPlayer(require("@/assets/sounds/start.mp3"));
  const beepSound = useAudioPlayer(require("@/assets/sounds/beep.mp3"));

  // Función para reproducir sonidos
  const playSound = useCallback(
    async (type: "start" | "beep") => {
      try {
        if (type === "start") {
          await beepSound.pause();
          await beepSound.seekTo(0);
          await startSound.seekTo(0);
          await startSound.play();
        } else {
          await beepSound.seekTo(0);
          await beepSound.play();
        }
      } catch (error) {
        console.error("❌ Error al reproducir sonido:", error);
      }
    },
    [startSound, beepSound]
  );

  // Función para detener el sonido de beep
  const stopBeep = useCallback(async () => {
    try {
      await beepSound.pause();
      await beepSound.seekTo(0);
    } catch (error) {
      console.error("❌ Error al detener sonido de beep:", error);
    }
  }, [beepSound]);

  // Función para iniciar el temporizador
  const startTimer = useCallback((duration: number) => {
    setCountdown(duration);
    setIsActive(true);
    setIsPaused(false);
    console.log(`⏲️ Iniciando temporizador con duración: ${duration}s`);
  }, []);

  // Función para pausar/continuar el reproductor
  const togglePause = async () => {
    try {
      if (!isPaused) {
        await stopBeep();
        await startSound.pause();
        await startSound.seekTo(0);
      }
      setIsPaused((prev) => !prev);
      console.log(`⏯️ ${isPaused ? "Continuando" : "Pausando"} rutina`);
    } catch (error) {
      console.error("❌ Error al pausar/continuar:", error);
    }
  };

  // Función para reiniciar el ejercicio actual
  const resetExercise = () => {
    if (!routine) return;
    const current = routine.blocks[currentBlockIndex]?.exercises[currentExerciseIndex];
    if (!current) return;
    const duration = current.duration ?? (current.reps ? 30 : 30);
    setCurrentExerciseRepeat(1);
    setIsResting(false);
    setIsRepeatingExercise(false);
    startTimer(duration);
    playSound("start");
    console.log(`🔁 Reiniciando ejercicio: ${current.name}`);
  };

  // Función para reiniciar el bloque actual
  const resetBlock = () => {
    if (!routine) return;
    const block = routine.blocks[currentBlockIndex];
    if (!block?.exercises[0]) return;
    setCurrentExerciseIndex(0);
    setCurrentExerciseRepeat(1);
    setCurrentBlockRepeat(1);
    setIsResting(false);
    setIsRepeatingExercise(false);
    const duration = block.exercises[0].duration ?? (block.exercises[0].reps ? 30 : 30);
    startTimer(duration);
    playSound("start");
    console.log(`🔁 Reiniciando bloque: ${block.title}`);
  };

  // Función para reiniciar la rutina completa
  const resetRoutine = () => {
    if (!routine || !routine.blocks[0]?.exercises[0]) return;
    setCurrentBlockIndex(0);
    setCurrentExerciseIndex(0);
    setCurrentExerciseRepeat(1);
    setCurrentBlockRepeat(1);
    setIsResting(false);
    setIsRepeatingExercise(false);
    const duration = routine.blocks[0].exercises[0].duration ?? (routine.blocks[0].exercises[0].reps ? 30 : 30);
    startTimer(duration);
    playSound("start");
    console.log(`🔁 Reiniciando rutina: ${routine.name}`);
  };

  // Función para avanzar al siguiente bloque
  const goToNextBlock = useCallback(() => {
    if (!routine) return;
    const block = routine.blocks[currentBlockIndex];
    if (!block) return;

    const nextRepeat = currentBlockRepeat + 1;
    if (currentBlockRepeat < block.repeat) {
      // Repetir el bloque actual
      setCurrentBlockRepeat(nextRepeat);
      setCurrentExerciseIndex(0);
      setCurrentExerciseRepeat(1);
      setIsResting(false);
      setIsRepeatingExercise(false);
      const next = block.exercises[0];
      const duration = next.duration ?? (next.reps ? 30 : 30);
      startTimer(duration);
      playSound("start");
      console.log(`🔄 Repitiendo bloque: ${block.title} (vuelta ${nextRepeat})`);
    } else {
      const nextBlockIndex = currentBlockIndex + 1;
      if (nextBlockIndex < routine.blocks.length) {
        const nextBlock = routine.blocks[nextBlockIndex];
        const isCurrentBlockPreparation = block.is_preparation;
        const isNextBlockPreparation = nextBlock.is_preparation;

        // Omitir descanso si el bloque actual o el siguiente es de preparación
        if (isCurrentBlockPreparation || isNextBlockPreparation) {
          setCurrentBlockIndex(nextBlockIndex);
          setCurrentBlockRepeat(1);
          setCurrentExerciseIndex(0);
          setCurrentExerciseRepeat(1);
          setIsResting(false);
          setIsRepeatingExercise(false);
          const next = nextBlock.exercises[0];
          const duration = next.duration ?? (next.reps ? 30 : 30);
          startTimer(duration);
          playSound("start");
          console.log(`➡️ Avanzando al bloque: ${nextBlock.title} (sin descanso)`);
        } else {
          // Aplicar descanso entre bloques
          const restDuration = routine.rest_between_blocks ?? 5;
          setIsResting(true);
          setIsRepeatingExercise(false);
          startTimer(restDuration);
          // Actualizar índices para el siguiente bloque después del descanso
          setCurrentBlockIndex(nextBlockIndex);
          setCurrentBlockRepeat(1);
          setCurrentExerciseIndex(0);
          setCurrentExerciseRepeat(1);
          console.log(`⏳ Iniciando descanso entre bloques (${restDuration}s)`);
        }
      } else {
        // Fin de la rutina
        setIsActive(false);
        setIsResting(false);
        router.replace("/");
        console.log("🏁 Rutina finalizada");
      }
    }
  }, [routine, currentBlockIndex, currentBlockRepeat, startTimer, playSound, router]);

  // Función para avanzar al siguiente ejercicio
  const goToNextExercise = useCallback(() => {
    if (!routine) return;
    const block = routine.blocks[currentBlockIndex];
    if (!block) return;

    const nextExerciseIndex = currentExerciseIndex + 1;
    if (nextExerciseIndex < block.exercises.length) {
      setCurrentExerciseIndex(nextExerciseIndex);
      setCurrentExerciseRepeat(1);
      setIsResting(false);
      setIsRepeatingExercise(false);
      const next = block.exercises[nextExerciseIndex];
      const duration = next.duration ?? (next.reps ? 30 : 30);
      startTimer(duration);
      playSound("start");
      console.log(`➡️ Avanzando al ejercicio: ${next.name}`);
    } else {
      // No hay más ejercicios en el bloque, pasar al siguiente bloque
      goToNextBlock();
      console.log(`🔁 currentBlockIndex: ${currentBlockIndex}, total: ${routine.blocks.length}`);
    }
  }, [routine, currentBlockIndex, currentExerciseIndex, startTimer, playSound, goToNextBlock]);

  // Función para avanzar al siguiente ejercicio, repetición, bloque o finalizar
  const proceedToNext = useCallback(async () => {
    if (!routine) {
      console.error("❌ No hay rutina cargada");
      return;
    }

    await stopBeep();
    const block = routine.blocks[currentBlockIndex];
    if (!block) {
      console.error("❌ Bloque no encontrado en índice:", currentBlockIndex);
      setIsActive(false);
      setIsResting(false);
      router.replace("/");
      return;
    }

    const exercise = block.exercises[currentExerciseIndex];
    if (!exercise) {
      console.error("❌ Ejercicio no encontrado en índice:", currentExerciseIndex);
      setIsActive(false);
      setIsResting(false);
      router.replace("/");
      return;
    }

    if (isResting) {
      console.log(`⏳ Finalizando descanso (repetir ejercicio: ${isRepeatingExercise})`);
      setIsResting(false);

      if (isRepeatingExercise) {
        // Descanso entre repeticiones de un ejercicio
        setIsRepeatingExercise(false);
        setCurrentExerciseRepeat((r) => r + 1);
        const duration = exercise.duration ?? (exercise.reps ? 30 : 30);
        startTimer(duration);
        playSound("start");
        console.log(`🔁 Volviendo al ejercicio: ${exercise.name} (repetición ${currentExerciseRepeat + 1})`);
      } else {
        // Verificar si el descanso fue entre bloques
        const isRestBetweenBlocks = currentExerciseIndex === 0 && currentBlockRepeat === 1;
        if (isRestBetweenBlocks) {
          const next = block.exercises[0];
          const duration = next.duration ?? (next.reps ? 30 : 30);
          setIsResting(false);
          setIsRepeatingExercise(false);
          startTimer(duration);
          playSound("start");
          console.log(`🚀 Iniciando bloque: ${block.title}, primer ejercicio: ${next.name}`);
        } else {
          // Descanso entre ejercicios
          goToNextExercise();
        }
      }
    } else {
      console.log(`🏋️ Finalizando ejercicio: ${exercise.name}`);
      if (block.is_preparation) {
        console.log(`🎯 Bloque de preparación finalizado: ${block.title}. Saltando al siguiente bloque...`);
        goToNextBlock();
        return;
      }
      if (exercise.reps && currentExerciseRepeat < exercise.reps) {
        setIsResting(true);
        setIsRepeatingExercise(true);
        const restDuration = routine.rest_between_exercises ?? 5;
        startTimer(restDuration);
        console.log(`⏳ Iniciando descanso entre repeticiones (${restDuration}s)`);
      } else {
        const restDuration = routine.rest_between_exercises ?? 5;
        setIsResting(true);
        setIsRepeatingExercise(false);
        startTimer(restDuration);
        console.log(`⏳ Iniciando descanso entre ejercicios (${restDuration}s)`);
      }
    }
  }, [currentBlockRepeat,
    routine,
    currentBlockIndex,
    currentExerciseIndex,
    currentExerciseRepeat,
    isResting,
    isRepeatingExercise,
    goToNextBlock,
    startTimer,
    playSound,
    stopBeep,
    goToNextExercise,
    router,
  ]);

  // Efecto para manejar el temporizador
  useEffect(() => {
    if (!isActive || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, isPaused, isResting, proceedToNext, playSound]);

  // Efecto para cargar la rutina
  useEffect(() => {
    const loadRoutine = async () => {
      if (!id) {
        console.error("❌ ID de rutina no proporcionado");
        setRoutine(null);
        setLoading(false);
        return;
      }

      if (routineRegistry[id]) {
        console.log(`📁 Cargando rutina local: ${id}`);
        setRoutine(routineRegistry[id]);
        setLoading(false);
        return;
      }

      if (!session?.user?.id) {
        console.error("❌ No hay sesión de usuario");
        setRoutine(null);
        setLoading(false);
        return;
      }

      try {
        console.log(`☁️ Cargando rutina remota: ${id}`);
        const routines = await fetchUserRoutines(session.user.id);
        const found = routines.find((r) => r.id === id) ?? null;
        if (!found) {
          console.error(`❌ Rutina remota no encontrada: ${id}`);
          router.replace("/+not-found");
        } else if (!found.blocks || found.blocks.length === 0) {
          console.error(`❌ Rutina remota sin bloques: ${id}`);
        }
        setRoutine(found);
      } catch (error) {
        console.error("❌ Error al cargar rutina:", error);
        setRoutine(null);
      } finally {
        setLoading(false);
      }
    };

    loadRoutine();
  }, [session, id, router]);

  // Efecto para iniciar el primer ejercicio
  useEffect(() => {
    if (!routine?.blocks[0]?.exercises[0]) return;

    const first = routine.blocks[0].exercises[0];
    const duration = first.duration ?? (first.reps ? 30 : 30);
    setCurrentExerciseRepeat(1);
    setCurrentBlockRepeat(1);
    setIsResting(false);
    setIsRepeatingExercise(false);
    startTimer(duration);
    playSound("start");
    console.log(`🚀 Iniciando rutina: ${routine.name}, primer ejercicio: ${first.name}`);
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
  if (!routine || !routine.blocks?.[currentBlockIndex]?.exercises?.[currentExerciseIndex]) {
    return (
      <View style={styles.centered}>
        <Text>❌ Rutina no encontrada o incompleta</Text>
      </View>
    );
  }

  const block = routine.blocks[currentBlockIndex];
  const exercise = block.exercises[currentExerciseIndex];
  const isRestBetweenBlocks = isResting && currentExerciseIndex === 0 && currentBlockRepeat === 1;
  const nextBlock = routine.blocks[currentBlockIndex + 1];
  const showNextBlock = (isResting || block.is_preparation) && nextBlock;

  // Renderizado del reproductor
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ alignItems: "center", paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <Text style={styles.block}>
          {block.title} — Vuelta {currentBlockRepeat}/{block.repeat}
        </Text>
        <Text style={styles.exercise}>
          {isRestBetweenBlocks ? "Descanso entre bloques" : isResting ? "Descanso" : exercise.name}
        </Text>
        {showNextBlock && (
          <Text style={styles.nextBlock}>
            Siguiente: {nextBlock.title}
          </Text>
        )}
        {exercise.reps && !isResting && (
          <Text style={styles.reps}>
            Repetición {currentExerciseRepeat}/{exercise.reps}
          </Text>
        )}
        <Text style={styles.timer}>{countdown}s</Text>
        {exercise.equipment && !isResting && (
          <Text style={styles.equipment}>{exercise.equipment}</Text>
        )}

        <View style={styles.controls}>
          <Pressable onPress={togglePause} style={styles.button}>
            <Text style={styles.buttonText}>
              {isPaused ? "▶ Continuar" : "⏸ Pausar"}
            </Text>
          </Pressable>
          <Pressable onPress={goToNextExercise} style={styles.button}>
            <Text style={styles.buttonText}>⏭️ Siguiente Ejercicio</Text>
          </Pressable>
          <Pressable onPress={goToNextBlock} style={styles.button}>
            <Text style={styles.buttonText}>⏭️ Siguiente Bloque</Text>
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
      </View>
    </ScrollView>
  );
}

// Estilos para el componente
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
    paddingHorizontal: 16,
  },
  content: {
    alignItems: "center",
    paddingTop: Platform.OS === "web" ? 80 : 40,
    paddingBottom: 20,
  },
  block: {
    fontSize: Platform.OS === "web" ? 36 : 20,
    color: "#93c5fd",
    marginBottom: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  exercise: {
    fontSize: Platform.OS === "web" ? 48 : 28,
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "bold",
    paddingHorizontal: 8,
  },
  nextBlock: {
    fontSize: Platform.OS === "web" ? 28 : 16,
    color: "#60a5fa",
    textAlign: "center",
    marginBottom: 12,
  },
  timer: {
    fontSize: Platform.OS === "web" ? 64 : 48,
    color: "#22d3ee",
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 8,
  },
  reps: {
    fontSize: Platform.OS === "web" ? 32 : 18,
    color: "#93c5fd",
    marginBottom: 12,
    textAlign: "center",
  },
  equipment: {
    fontSize: Platform.OS === "web" ? 32 : 18,
    color: "#93c5fd",
    marginBottom: 12,
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#111827",
  },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 20,
    gap: 8,
    width: "100%",
    maxWidth: 600,
  },
  button: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    minWidth: Platform.OS === "web" ? 180 : 120,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: Platform.OS === "web" ? 20 : 14,
    fontWeight: "600",
    textAlign: "center",
  },
});