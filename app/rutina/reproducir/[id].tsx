import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAudioPlayer } from "expo-audio";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext"; // Importamos useTheme
import { fetchUserRoutines } from "@/lib/supabaseService";
import { routineRegistry } from "@/data/routines/routineRegistry";
import { useFocusEffect } from "@react-navigation/native";

// Constantes para duraciones predeterminadas
const DEFAULT_EXERCISE_DURATION = 30; // Duración por defecto para ejercicios (segundos)
const DEFAULT_REST_DURATION = 5; // Duración por defecto para descansos (segundos)

// Interfaz para la rutina, ajustada para ESLint
interface Routine {
  id?: string; // Opcional para compatibilidad con routineRegistry y Supabase
  name: string;
  rest_between_exercises?: number;
  rest_between_blocks?: number;
  level?: string;
  style?: string;
  duration?: number;
  blocks: { // Usamos { ... }[] en lugar de Array<{ ... }>
    id?: string;
    title: string;
    repeat: number;
    is_preparation?: boolean;
    exercises: {
      id?: string;
      name: string;
      duration?: number;
      reps?: number;
      equipment?: string;
    }[];
  }[];
}

// Interfaz para el estado del reproductor
interface PlayerState {
  countdown: number;
  isResting: boolean;
  isRepeatingExercise: boolean;
  isRestBetweenBlocks: boolean;
  isActive: boolean;
  isPaused: boolean;
}

// Interfaz para el progreso de la rutina
interface RoutineProgress {
  blockIndex: number;
  exerciseIndex: number;
  exerciseRepeat: number;
  blockRepeat: number;
}

export default function RoutinePlayerScreen() {
  // Hooks para parámetros, navegación y autenticación
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { resolvedTheme } = useTheme(); // Obtenemos el tema actual
  const navigation = useNavigation();

  // Estados del componente
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>({
    countdown: 0,
    isResting: false,
    isRepeatingExercise: false,
    isRestBetweenBlocks: false,
    isActive: false,
    isPaused: false,
  });
  const [routineProgress, setRoutineProgress] = useState<RoutineProgress>({
    blockIndex: 0,
    exerciseIndex: 0,
    exerciseRepeat: 1,
    blockRepeat: 1,
  });

  // Definimos los colores según el tema
  const isDark = resolvedTheme === "dark";
  const colors = {
    background: isDark ? "#0f172a" : "#f9fafb", // Fondo principal
    text: isDark ? "#e5e7eb" : "#111827", // Texto principal
    title: isDark ? "#ffffff" : "#111827", // Títulos (blanco puro en oscuro)
    meta: isDark ? "#d1d5db" : "#4b5563", // Metadatos
    timer: isDark ? "#22d3ee" : "#0284c7", // Temporizador
    button: "#10b981", // Botón (verde, consistente con settings)
    buttonText: "#e5e7eb", // Texto del botón
    error: isDark ? "#f87171" : "#dc2626", // Errores
    accent: "#10b981", // Color de acento para ActivityIndicator
  };

  // Referencia para el temporizador
  const timerRef = useRef<number | null>(null);

  // Carga de sonidos
  const startSound = useAudioPlayer(require("@/assets/sounds/start.mp3"));
  const beepSound = useAudioPlayer(require("@/assets/sounds/beep.mp3"));

  // --- Funciones auxiliares ---

  // Verifica si se debe omitir el descanso entre bloques
  const shouldSkipRest = useCallback(
    (currentBlock: Routine["blocks"][0], nextBlock?: Routine["blocks"][0]) => {
      return (
        currentBlock.is_preparation || (nextBlock && nextBlock.is_preparation)
      );
    },
    []
  );

  // Reproduce un sonido según el tipo
  const playSound = useCallback(
    async (type: "start" | "beep") => {
      try {
        const sound = type === "start" ? startSound : beepSound;
        if (type === "start" && beepSound.playing) await beepSound.pause();
        await sound.seekTo(0);
        await sound.play();
        setAudioError(null);
      } catch (error) {
        console.error(`❌ Error al reproducir sonido ${type}:`, error);
        setAudioError("No se pudo reproducir el sonido. Revisá tu dispositivo.");
      }
    },
    [startSound, beepSound]
  );

  // Detiene el sonido de beep
  const stopBeep = useCallback(async () => {
    try {
      if (beepSound.playing) {
        await beepSound.pause();
        await beepSound.seekTo(0);
      }
    } catch (error) {
      console.error("❌ Error al detener sonido de beep:", error);
      setAudioError("No se pudo detener el sonido. Revisá tu dispositivo.");
    }
  }, [beepSound]);

  // Inicia el temporizador con una duración específica
  const startTimer = useCallback((duration: number) => {
    setPlayerState((prev) => ({
      ...prev,
      countdown: duration,
      isActive: true,
      isPaused: false,
    }));
    console.log(`⏲️ Iniciando temporizador con duración: ${duration}s`);
  }, []);

  // Efecto para limpiar recursos y reiniciar estados al desmontar
  useFocusEffect(
    useCallback(() => {
      return () => {
        console.log("🧹 Limpieza al salir de RoutinePlayerScreen");
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        stopBeep();
        if (startSound.playing) {
          startSound.pause();
          startSound.seekTo(0);
        }
        if (beepSound.playing) {
          beepSound.pause();
          beepSound.seekTo(0);
        }
        setRoutineProgress({
          blockIndex: 0,
          exerciseIndex: 0,
          exerciseRepeat: 1,
          blockRepeat: 1,
        });
        setPlayerState({
          countdown: 0,
          isResting: false,
          isRepeatingExercise: false,
          isRestBetweenBlocks: false,
          isActive: false,
          isPaused: false,
        });
        setInitialized(false);
      };
    }, [stopBeep, startSound, beepSound])
  );

  // Limpieza en navegador
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopBeep();
      if (startSound.playing) {
        startSound.pause();
        startSound.seekTo(0);
      }
      if (beepSound.playing) {
        beepSound.pause();
        beepSound.seekTo(0);
      }
      setRoutineProgress({
        blockIndex: 0,
        exerciseIndex: 0,
        exerciseRepeat: 1,
        blockRepeat: 1,
      });
      setPlayerState({
        countdown: 0,
        isResting: false,
        isRepeatingExercise: false,
        isRestBetweenBlocks: false,
        isActive: false,
        isPaused: false,
      });
      console.log("🧹 Limpieza al salir de RoutinePlayerScreen (beforeRemove)");
    });

    return () => unsubscribe();
  }, [navigation, stopBeep, startSound, beepSound]);

  // --- Funciones de control de la rutina ---

  // Pausa o reanuda la rutina
  const togglePause = useCallback(async () => {
    try {
      const newIsPaused = !playerState.isPaused;
      if (newIsPaused) {
        await stopBeep();
        if (startSound.playing) {
          await startSound.pause();
          await startSound.seekTo(0);
        }
      }
      setPlayerState((prev) => ({ ...prev, isPaused: newIsPaused }));
      console.log(`⏯️ ${newIsPaused ? "Pausando" : "Continuando"} rutina`);
    } catch (error) {
      console.error("❌ Error al pausar/continuar:", error);
      setAudioError("Error al pausar/continuar la rutina.");
    }
  }, [playerState.isPaused, stopBeep, startSound]);

  // Finaliza la rutina
  const endRoutine = useCallback(() => {
    router.replace("/rutina-completada");
    console.log("🏁 Rutina finalizada");
  }, [router]);

  // Avanza al siguiente bloque
  const goToNextBlock = useCallback(async () => {
    if (
      !routine?.blocks ||
      routineProgress.blockIndex >= routine.blocks.length
    ) {
      console.error("❌ Rutina o bloque no válido");
      endRoutine();
      return;
    }

    const block = routine.blocks[routineProgress.blockIndex];
    const nextBlockIndex = routineProgress.blockIndex + 1;

    if (playerState.isRestBetweenBlocks) {
      if (nextBlockIndex < routine.blocks.length) {
        const nextBlock = routine.blocks[nextBlockIndex];
        const duration =
          nextBlock.exercises[0].duration ??
          (nextBlock.exercises[0].reps
            ? DEFAULT_EXERCISE_DURATION
            : DEFAULT_EXERCISE_DURATION);
        setRoutineProgress((prev) => ({
          ...prev,
          blockIndex: nextBlockIndex,
          exerciseIndex: 0,
          exerciseRepeat: 1,
          blockRepeat: 1,
        }));
        setPlayerState((prev) => ({
          ...prev,
          isResting: false,
          isRepeatingExercise: false,
          isRestBetweenBlocks: false,
          isActive: true,
        }));
        startTimer(duration);
        await playSound("start");
        console.log(
          `➡️ Saltando descanso y avanzando al bloque: ${nextBlock.title}`
        );
      } else {
        endRoutine();
      }
      return;
    }

    if (routineProgress.blockRepeat < block.repeat) {
      const duration =
        block.exercises[0].duration ??
        (block.exercises[0].reps
          ? DEFAULT_EXERCISE_DURATION
          : DEFAULT_EXERCISE_DURATION);
      setRoutineProgress((prev) => ({
        ...prev,
        blockRepeat: prev.blockRepeat + 1,
        exerciseIndex: 0,
        exerciseRepeat: 1,
      }));
      setPlayerState((prev) => ({
        ...prev,
        isResting: false,
        isRepeatingExercise: false,
        isRestBetweenBlocks: false,
        isActive: true,
      }));
      startTimer(duration);
      await playSound("start");
      console.log(
        `🔄 Repitiendo bloque: ${block.title} (vuelta ${
          routineProgress.blockRepeat + 1
        })`
      );
    } else if (nextBlockIndex < routine.blocks.length) {
      const nextBlock = routine.blocks[nextBlockIndex];
      if (shouldSkipRest(block, nextBlock)) {
        const duration =
          nextBlock.exercises[0].duration ??
          (nextBlock.exercises[0].reps
            ? DEFAULT_EXERCISE_DURATION
            : DEFAULT_EXERCISE_DURATION);
        setRoutineProgress((prev) => ({
          ...prev,
          blockIndex: nextBlockIndex,
          exerciseIndex: 0,
          exerciseRepeat: 1,
          blockRepeat: 1,
        }));
        setPlayerState((prev) => ({
          ...prev,
          isResting: false,
          isRepeatingExercise: false,
          isRestBetweenBlocks: false,
          isActive: true,
        }));
        startTimer(duration);
        await playSound("start");
        console.log(
          `➡️ Avanzando al bloque: ${nextBlock.title} (sin descanso)`
        );
      } else {
        const restDuration =
          routine.rest_between_blocks ?? DEFAULT_REST_DURATION;
        setPlayerState((prev) => ({
          ...prev,
          isResting: true,
          isRepeatingExercise: false,
          isRestBetweenBlocks: true,
          isActive: true,
        }));
        startTimer(restDuration);
        console.log(`⏳ Iniciando descanso entre bloques (${restDuration}s)`);
      }
    } else {
      endRoutine();
    }
  }, [
    routine,
    routineProgress.blockIndex,
    routineProgress.blockRepeat,
    playerState.isRestBetweenBlocks,
    startTimer,
    playSound,
    shouldSkipRest,
    endRoutine,
  ]);

  // Avanza al siguiente ejercicio
  const goToNextExercise = useCallback(async () => {
    if (!routine?.blocks?.[routineProgress.blockIndex]?.exercises) {
      console.error("❌ Rutina o bloque no válido");
      endRoutine();
      return;
    }

    const block = routine.blocks[routineProgress.blockIndex];
    const nextExerciseIndex = routineProgress.exerciseIndex + 1;

    if (nextExerciseIndex < block.exercises.length) {
      const nextExercise = block.exercises[nextExerciseIndex];
      const duration =
        nextExercise.duration ??
        (nextExercise.reps
          ? DEFAULT_EXERCISE_DURATION
          : DEFAULT_EXERCISE_DURATION);
      setRoutineProgress((prev) => ({
        ...prev,
        exerciseIndex: nextExerciseIndex,
        exerciseRepeat: 1,
      }));
      setPlayerState((prev) => ({
        ...prev,
        isResting: false,
        isRepeatingExercise: false,
        isRestBetweenBlocks: false,
        isActive: true,
      }));
      startTimer(duration);
      await playSound("start");
      console.log(`➡️ Avanzando al ejercicio: ${nextExercise.name}`);
    } else {
      await goToNextBlock();
    }
  }, [
    routine,
    routineProgress.blockIndex,
    routineProgress.exerciseIndex,
    startTimer,
    playSound,
    goToNextBlock,
    endRoutine,
  ]);

  // Reinicia el ejercicio actual
  const resetExercise = useCallback(() => {
    if (
      !routine?.blocks?.[routineProgress.blockIndex]?.exercises?.[
        routineProgress.exerciseIndex
      ]
    ) {
      return;
    }
    const exercise =
      routine.blocks[routineProgress.blockIndex].exercises[
        routineProgress.exerciseIndex
      ];
    const duration =
      exercise.duration ??
      (exercise.reps ? DEFAULT_EXERCISE_DURATION : DEFAULT_EXERCISE_DURATION);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPlayerState({
      countdown: 0,
      isResting: false,
      isRepeatingExercise: false,
      isRestBetweenBlocks: false,
      isActive: false,
      isPaused: false,
    });
    setTimeout(() => {
      setRoutineProgress((prev) => ({ ...prev, exerciseRepeat: 1 }));
      setPlayerState({
        countdown: duration,
        isResting: false,
        isRepeatingExercise: false,
        isRestBetweenBlocks: false,
        isActive: true,
        isPaused: false,
      });
      playSound("start");
      console.log(`🔁 Reiniciando ejercicio: ${exercise.name}`);
    }, 0);
  }, [
    routine,
    routineProgress.blockIndex,
    routineProgress.exerciseIndex,
    playSound,
  ]);

  // Reinicia el bloque actual
  const resetBlock = useCallback(() => {
    if (!routine?.blocks?.[routineProgress.blockIndex]?.exercises?.[0]) {
      return;
    }
    const block = routine.blocks[routineProgress.blockIndex];
    const duration =
      block.exercises[0].duration ??
      (block.exercises[0].reps
        ? DEFAULT_EXERCISE_DURATION
        : DEFAULT_EXERCISE_DURATION);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRoutineProgress((prev) => ({
      ...prev,
      exerciseIndex: 0,
      exerciseRepeat: 1,
      blockRepeat: 1,
    }));
    setPlayerState({
      countdown: duration,
      isResting: false,
      isRepeatingExercise: false,
      isRestBetweenBlocks: false,
      isActive: true,
      isPaused: false,
    });
    playSound("start");
    console.log(`🔁 Reiniciando bloque: ${block.title}`);
  }, [routine, routineProgress.blockIndex, playSound]);

  // Reinicia la rutina completa
  const resetRoutine = useCallback(() => {
    if (!routine?.blocks?.[0]?.exercises?.[0]) {
      return;
    }
    const duration =
      routine.blocks[0].exercises[0].duration ??
      (routine.blocks[0].exercises[0].reps
        ? DEFAULT_EXERCISE_DURATION
        : DEFAULT_EXERCISE_DURATION);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRoutineProgress({
      blockIndex: 0,
      exerciseIndex: 0,
      exerciseRepeat: 1,
      blockRepeat: 1,
    });
    setPlayerState({
      countdown: duration,
      isResting: false,
      isRepeatingExercise: false,
      isRestBetweenBlocks: false,
      isActive: true,
      isPaused: false,
    });
    playSound("start");
    console.log(`🔁 Reiniciando rutina: ${routine.name}`);
  }, [routine, playSound]);

  // Maneja la finalización de un ejercicio
  const handleExerciseCompletion = useCallback(async () => {
    const block = routine?.blocks?.[routineProgress.blockIndex];
    const exercise = block?.exercises?.[routineProgress.exerciseIndex];
    if (!block || !exercise) {
      endRoutine();
      return;
    }

    if (block.is_preparation) {
      console.log(`🎯 Bloque de preparación finalizado: ${block.title}`);
      await goToNextBlock();
    } else if (
      exercise.reps &&
      routineProgress.exerciseRepeat < exercise.reps
    ) {
      const restDuration =
        routine?.rest_between_exercises ?? DEFAULT_REST_DURATION;
      setPlayerState((prev) => ({
        ...prev,
        isResting: true,
        isRepeatingExercise: true,
        isRestBetweenBlocks: false,
        isActive: true,
      }));
      startTimer(restDuration);
      console.log(
        `⏳ Iniciando descanso entre repeticiones (${restDuration}s)`
      );
    } else {
      const restDuration =
        routine?.rest_between_exercises ?? DEFAULT_REST_DURATION;
      setPlayerState((prev) => ({
        ...prev,
        isResting: true,
        isRepeatingExercise: false,
        isRestBetweenBlocks: false,
        isActive: true,
      }));
      startTimer(restDuration);
      console.log(`⏳ Iniciando descanso entre ejercicios (${restDuration}s)`);
    }
  }, [
    routine,
    routineProgress.blockIndex,
    routineProgress.exerciseRepeat,
    startTimer,
    goToNextBlock,
    endRoutine,
  ]);

  // Maneja la finalización de un descanso
  const handleRestCompletion = useCallback(async () => {
    setPlayerState((prev) => ({ ...prev, isResting: false }));
    if (playerState.isRepeatingExercise) {
      const exercise =
        routine?.blocks?.[routineProgress.blockIndex]?.exercises?.[
          routineProgress.exerciseIndex
        ];
      const duration = exercise?.duration ?? DEFAULT_EXERCISE_DURATION;
      setRoutineProgress((prev) => ({
        ...prev,
        exerciseRepeat: prev.exerciseRepeat + 1,
      }));
      setPlayerState((prev) => ({
        ...prev,
        isRepeatingExercise: false,
        isRestBetweenBlocks: false,
        isActive: true,
      }));
      startTimer(duration);
      await playSound("start");
      console.log(
        `🔁 Volviendo al ejercicio: ${exercise?.name} (repetición ${
          routineProgress.exerciseRepeat + 1
        })`
      );
    } else if (playerState.isRestBetweenBlocks) {
      await goToNextBlock();
    } else {
      await goToNextExercise();
    }
  }, [
    routine,
    routineProgress.blockIndex,
    routineProgress.exerciseIndex,
    routineProgress.exerciseRepeat,
    playerState.isRepeatingExercise,
    playerState.isRestBetweenBlocks,
    startTimer,
    playSound,
    goToNextBlock,
    goToNextExercise,
  ]);

  // Avanza al siguiente ejercicio, repetición, bloque o finaliza
  const proceedToNext = useCallback(async () => {
    if (
      !routine?.blocks?.[routineProgress.blockIndex]?.exercises?.[
        routineProgress.exerciseIndex
      ]
    ) {
      console.error("❌ Rutina o ejercicio no válido");
      endRoutine();
      return;
    }

    await stopBeep();
    if (playerState.isResting) {
      console.log(
        `⏳ Finalizando descanso (repetir ejercicio: ${playerState.isRepeatingExercise}, descanso entre bloques: ${playerState.isRestBetweenBlocks})`
      );
      await handleRestCompletion();
    } else {
      console.log(
        `🏋️ Finalizando ejercicio: ${
          routine.blocks[routineProgress.blockIndex].exercises[
            routineProgress.exerciseIndex
          ].name
        }`
      );
      await handleExerciseCompletion();
    }
  }, [
    routine,
    routineProgress.blockIndex,
    routineProgress.exerciseIndex,
    playerState.isResting,
    playerState.isRepeatingExercise,
    playerState.isRestBetweenBlocks,
    stopBeep,
    handleRestCompletion,
    handleExerciseCompletion,
    endRoutine,
  ]);

  // Efecto para manejar el temporizador
  useEffect(() => {
    if (!playerState.isActive || playerState.isPaused || !initialized) {
      if (timerRef.current) {
        console.log("⏹️ Timer detenido: inactivo, pausado o no inicializado");
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    console.log("▶️ Timer iniciado");
    timerRef.current = setInterval(() => {
      setPlayerState((prev) => {
        if (prev.countdown <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            console.log("⏹️ Timer detenido por countdown finalizado");
          }
          proceedToNext();
          return { ...prev, countdown: 0 };
        }

        const next = prev.countdown - 1;
        if (!prev.isResting && next <= 5) {
          playSound("beep");
        }
        return { ...prev, countdown: next };
      });
    }, 1000);

    return () => {
      console.log("🧹 Timer limpiado en useEffect (cleanup)");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    playerState.isActive,
    playerState.isPaused,
    playerState.isResting,
    initialized,
    proceedToNext,
    playSound,
  ]);

  // Efecto para cargar la rutina
  useEffect(() => {
    const loadRoutine = async () => {
      setLoading(true);
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
          setRoutine(null);
        } else {
          setRoutine(found);
        }
      } catch (error) {
        console.error("❌ Error al cargar rutina:", error);
        setRoutine(null);
      } finally {
        setLoading(false);
      }
    };

    loadRoutine();
  }, [session, id, router]);

  // Efecto para iniciar el primer ejercicio de la rutina
  useEffect(() => {
    if (!routine?.blocks?.[0]?.exercises?.[0] || initialized) {
      return;
    }

    const first = routine.blocks[0].exercises[0];
    const duration =
      first.duration ??
      (first.reps ? DEFAULT_EXERCISE_DURATION : DEFAULT_EXERCISE_DURATION);
    setRoutineProgress({
      blockIndex: 0,
      exerciseIndex: 0,
      exerciseRepeat: 1,
      blockRepeat: 1,
    });
    setPlayerState({
      countdown: duration,
      isResting: false,
      isRepeatingExercise: false,
      isRestBetweenBlocks: false,
      isActive: true,
      isPaused: false,
    });
    playSound("start");
    setInitialized(true);
    console.log(
      `🚀 Iniciando rutina: ${routine.name}, primer ejercicio: ${first.name}`
    );
  }, [routine, startTimer, playSound, initialized]);

  // --- Renderizado ---

  // Pantalla de error si no se proporciona ID
  if (!id) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>
          ❌ No se proporcionó un ID de rutina
        </Text>
        <Pressable
          onPress={() => router.replace("/")}
          style={[styles.button, { backgroundColor: colors.button }]}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            Volver al Inicio
          </Text>
        </Pressable>
      </View>
    );
  }

  // Pantalla de carga
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Pantalla de error si no se encuentra la rutina
  if (
    !routine ||
    !routine.blocks?.[routineProgress.blockIndex]?.exercises?.[
      routineProgress.exerciseIndex
    ]
  ) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>
          ❌ Rutina no encontrada o incompleta
        </Text>
        <Pressable
          onPress={() => router.replace("/")}
          style={[styles.button, { backgroundColor: colors.button }]}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            Volver al Inicio
          </Text>
        </Pressable>
      </View>
    );
  }

  // Variables para el bloque y ejercicio actual
  const block = routine.blocks[routineProgress.blockIndex];
  const exercise = block.exercises[routineProgress.exerciseIndex];
  const nextBlock = routine.blocks[routineProgress.blockIndex + 1];
  const nextExercise = block.exercises[routineProgress.exerciseIndex + 1];

  // Mostrar "Siguiente" según el tipo de descanso o bloque
  const showNextBlock =
    (block.is_preparation || playerState.isRestBetweenBlocks) && nextBlock;
  const showNextExercise =
    playerState.isResting &&
    !playerState.isRestBetweenBlocks &&
    !block.is_preparation &&
    nextExercise;

  // Renderizado del reproductor
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ alignItems: "center", paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        {audioError && (
          <Text style={[styles.error, { color: colors.error }]}>
            {audioError}
          </Text>
        )}
        <Text style={[styles.block, { color: colors.meta }]}>
          {block.title} — Vuelta {routineProgress.blockRepeat}/{block.repeat}
        </Text>
        <Text style={[styles.exercise, { color: colors.title }]}>
          {playerState.isRestBetweenBlocks
            ? "Descanso entre bloques"
            : playerState.isResting
            ? "Descanso"
            : exercise.name}
        </Text>
        {showNextBlock && (
          <Text style={[styles.nextBlock, { color: colors.meta }]}>
            Siguiente: {nextBlock.title}
          </Text>
        )}
        {showNextExercise && (
          <Text style={[styles.nextBlock, { color: colors.meta }]}>
            Siguiente: {nextExercise.name}
          </Text>
        )}
        {exercise.reps && !playerState.isResting && (
          <Text style={[styles.reps, { color: colors.meta }]}>
            Repetición {routineProgress.exerciseRepeat}/{exercise.reps}
          </Text>
        )}
        <Text style={[styles.timer, { color: colors.timer }]}>
          {playerState.countdown}s
        </Text>
        {exercise.equipment && !playerState.isResting && (
          <Text style={[styles.equipment, { color: colors.meta }]}>
            {exercise.equipment}
          </Text>
        )}
        <View style={styles.controls}>
          <Pressable
            onPress={togglePause}
            style={[styles.button, { backgroundColor: colors.button }]}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              {playerState.isPaused ? "▶ Continuar" : "⏸ Pausar"}
            </Text>
          </Pressable>
          <Pressable
            onPress={goToNextExercise}
            style={[styles.button, { backgroundColor: colors.button }]}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              ⏭️ Siguiente Ejercicio
            </Text>
          </Pressable>
          <Pressable
            onPress={goToNextBlock}
            style={[styles.button, { backgroundColor: colors.button }]}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              ⏭️ Siguiente Bloque
            </Text>
          </Pressable>
          <Pressable
            onPress={resetExercise}
            style={[styles.button, { backgroundColor: colors.button }]}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              🔁 Ejercicio
            </Text>
          </Pressable>
          <Pressable
            onPress={resetBlock}
            style={[styles.button, { backgroundColor: colors.button }]}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              🔁 Bloque
            </Text>
          </Pressable>
          <Pressable
            onPress={resetRoutine}
            style={[styles.button, { backgroundColor: colors.button }]}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              🔁 Rutina
            </Text>
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
    paddingHorizontal: 16, // Contenedor principal
  },
  content: {
    alignItems: "center",
    paddingTop: Platform.OS === "web" ? 80 : 40,
    paddingBottom: 20, // Contenido centrado
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16, // Pantalla de carga/error
  },
  block: {
    fontSize: Platform.OS === "web" ? 36 : 20,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center", // Título del bloque
  },
  exercise: {
    fontSize: Platform.OS === "web" ? 48 : 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 8, // Nombre del ejercicio
  },
  nextBlock: {
    fontSize: Platform.OS === "web" ? 28 : 16,
    textAlign: "center",
    marginBottom: 12, // Texto de "Siguiente"
  },
  timer: {
    fontSize: Platform.OS === "web" ? 64 : 48,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 8, // Temporizador
  },
  reps: {
    fontSize: Platform.OS === "web" ? 32 : 18,
    marginBottom: 12,
    textAlign: "center", // Repeticiones
  },
  equipment: {
    fontSize: Platform.OS === "web" ? 32 : 18,
    marginBottom: 12,
    textAlign: "center", // Equipamiento
  },
  error: {
    fontSize: Platform.OS === "web" ? 24 : 16,
    textAlign: "center",
    marginBottom: 12, // Mensaje de error
  },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 20,
    gap: 8,
    width: "100%",
    maxWidth: 600, // Contenedor de botones
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    minWidth: Platform.OS === "web" ? 180 : 120,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3, // Estilo de los botones
  },
  buttonText: {
    fontSize: Platform.OS === "web" ? 20 : 14,
    fontWeight: "600",
    textAlign: "center", // Texto de los botones
  },
});