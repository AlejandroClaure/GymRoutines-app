import { View, Text, StyleSheet, ActivityIndicator, Platform, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAudioPlayer } from "expo-audio";

import { useAuth } from "@/context/AuthContext";
import { fetchUserRoutines } from "@/lib/supabaseService";
import { routineRegistry } from "@/data/routines/routineRegistry";
import { Routine } from "@/types/routine";

export default function RoutinePlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentRepeat, setCurrentRepeat] = useState(1);
  const [countdown, setCountdown] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

   const timerRef = useRef<number | null>(null);

  const startSound = useAudioPlayer(require("@/assets/sounds/start.mp3"));
  const beepSound = useAudioPlayer(require("@/assets/sounds/beep.mp3"));

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

  const stopBeep = useCallback(async () => {
    await beepSound.pause();
    await beepSound.seekTo(0);
  }, [beepSound]);

  const startTimer = useCallback((duration: number) => {
    setCountdown(duration);
    setIsActive(true);
    setIsPaused(false);
  }, []);

  const togglePause = async () => {
    if (!isPaused) {
      await beepSound.pause();
      await beepSound.seekTo(0);
      await startSound.pause();
      await startSound.seekTo(0);
    }
    setIsPaused((prev) => !prev);
  };

  const resetExercise = () => {
    if (!routine) return;
    const current = routine.blocks[currentBlockIndex].exercises[currentExerciseIndex];
    startTimer(current.duration ?? 30);
    playSound("start");
    setIsResting(false);
  };

  const resetBlock = () => {
    if (!routine) return;
    setCurrentExerciseIndex(0);
    setCurrentRepeat(1);
    const current = routine.blocks[currentBlockIndex].exercises[0];
    startTimer(current.duration ?? 30);
    playSound("start");
    setIsResting(false);
  };

  const resetRoutine = () => {
    if (!routine) return;
    setCurrentBlockIndex(0);
    setCurrentRepeat(1);
    setCurrentExerciseIndex(0);
    const first = routine.blocks[0].exercises[0];
    startTimer(first.duration ?? 30);
    playSound("start");
    setIsResting(false);
  };

  const proceedToNext = useCallback(async () => {
    if (!routine) return;

    await stopBeep();
    const block = routine.blocks[currentBlockIndex];
    const nextExerciseIndex = currentExerciseIndex + 1;

    if (isResting) {
      setIsResting(false);

      if (nextExerciseIndex < block.exercises.length) {
        setCurrentExerciseIndex(nextExerciseIndex);
        const next = block.exercises[nextExerciseIndex];
        startTimer(next.duration ?? 30);
        playSound("start");
      } else {
        if (currentRepeat < block.repeat) {
          setCurrentRepeat((r) => r + 1);
          setCurrentExerciseIndex(0);
          const next = block.exercises[0];
          startTimer(next.duration ?? 30);
          playSound("start");
        } else {
          const nextBlockIndex = currentBlockIndex + 1;
          if (nextBlockIndex < routine.blocks.length) {
            const nextBlock = routine.blocks[nextBlockIndex];
            const skipRest = block.title.trim().toLowerCase() === "preparación";

            if (skipRest) {
              setCurrentBlockIndex(nextBlockIndex);
              setCurrentRepeat(1);
              setCurrentExerciseIndex(0);
              const next = nextBlock.exercises[0];
              startTimer(next.duration ?? 30);
              playSound("start");
            } else {
              setIsResting(true);
              startTimer(routine.restBetweenBlocks ?? 30);
            }
          } else {
            setIsActive(false);
            router.replace("/");
          }
        }
      }
    } else {
      if (nextExerciseIndex < block.exercises.length) {
        setIsResting(true);
        startTimer(routine.restBetweenExercises ?? 15);
      } else {
        if (currentRepeat < block.repeat) {
          setIsResting(true);
          startTimer(routine.restBetweenExercises ?? 15);
        } else {
          const nextBlockIndex = currentBlockIndex + 1;
          if (nextBlockIndex < routine.blocks.length) {
            const nextBlock = routine.blocks[nextBlockIndex];
            const skipRest = block.title.trim().toLowerCase() === "preparación";

            if (skipRest) {
              setCurrentBlockIndex(nextBlockIndex);
              setCurrentRepeat(1);
              setCurrentExerciseIndex(0);
              const next = nextBlock.exercises[0];
              startTimer(next.duration ?? 30);
              playSound("start");
            } else {
              setIsResting(true);
              startTimer(routine.restBetweenBlocks ?? 30);
            }
          } else {
            setIsActive(false);
            router.replace("/");
          }
        }
      }
    }
  }, [
    routine,
    currentBlockIndex,
    currentExerciseIndex,
    currentRepeat,
    isResting,
    router,
    playSound,
    startTimer,
    stopBeep,
  ]);

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

  useEffect(() => {
    const loadRoutine = async () => {
      if (!id) return;

      if (routineRegistry[id]) {
        setRoutine(routineRegistry[id]);
        setLoading(false);
        return;
      }

      if (!session?.user?.id) return;
      const routines = await fetchUserRoutines(session.user.id);
      const found = routines.find((r) => r.id === id);
      setRoutine(found || null);
      setLoading(false);
    };

    loadRoutine();
  }, [session, id]);

  useEffect(() => {
    if (!routine?.blocks[0]?.exercises[0]) return;

    const first = routine.blocks[0].exercises[0];
    startTimer(first.duration ?? 30);
    playSound("start");
  }, [routine, startTimer, playSound]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!routine) {
    return (
      <View style={styles.centered}>
        <Text>❌ Rutina no encontrada</Text>
      </View>
    );
  }

  const block = routine.blocks[currentBlockIndex];
  const exercise = block.exercises[currentExerciseIndex];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ alignItems: "center", justifyContent: "center", paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.block}>
        {block.title} — Vuelta {currentRepeat}/{block.repeat}
      </Text>
      <Text style={styles.exercise}>
        {isResting ? "Descanso" : exercise.name}
      </Text>
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
