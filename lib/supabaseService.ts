// lib/supabaseService.ts

import { supabase } from "./supabase";
import { Routine } from "@/types/routine";

// Obtener todas las rutinas de un usuario, con bloques y ejercicios
export async function fetchUserRoutines(userId: string): Promise<Routine[] | []> {
  // Incluye el campo is_preparation
  const { data, error } = await supabase
    .from("routines")
    .select(`
      id,
      user_id,
      name,
      style,
      level,
      duration,
      rest_between_exercises,
      rest_between_blocks,
      created_at,
      blocks (
        id,
        routine_id,
        title,
        order,
        repeat,
        is_preparation,
        exercises (
          id,
          block_id,
          name,
          order,
          duration,
          reps,
          equipment
        )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("order", { referencedTable: "blocks" })
    .order("order", { referencedTable: "blocks.exercises" });

  if (error) {
    console.error("Error al obtener rutinas:", error.message);
    return [];
  }

  return data ?? [];
}

// Crear rutina completa (routines + blocks + exercises)
export async function createRoutineWithBlocks(userId: string, routine: {
  name: string;
  style?: string;
  level?: string;
  duration?: number;
  rest_between_exercises?: number;
  rest_between_blocks?: number;
  blocks: {
    title: string;
    order: number;
    repeat: number;
    is_preparation?: boolean;
    exercises: {
      name: string;
      order: number;
      duration?: number;
      reps?: number;
      equipment?: string;
    }[];
  }[];
}) {
  // Crear rutina principal
  const { data: routineData, error: routineError } = await supabase
    .from("routines")
    .insert([{
      user_id: userId,
      name: routine.name,
      style: routine.style,
      level: routine.level,
      duration: routine.duration,
      rest_between_exercises: routine.rest_between_exercises ?? 5,
      rest_between_blocks: routine.rest_between_blocks ?? 5,
    }])
    .select()
    .single();

  if (routineError || !routineData) {
    console.error("Error al crear rutina:", routineError?.message);
    return null;
  }

  // Crear bloques y ejercicios
  for (const block of routine.blocks) {
    const { data: blockData, error: blockError } = await supabase
      .from("blocks")
      .insert([{
        routine_id: routineData.id,
        title: block.title,
        order: block.order,
        repeat: block.repeat,
        is_preparation: block.is_preparation ?? false,
      }])
      .select()
      .single();

    if (blockError || !blockData) {
      console.error("Error al crear bloque:", blockError?.message);
      continue;
    }

    const exercisesToInsert = block.exercises.map((ex) => ({
      block_id: blockData.id,
      name: ex.name,
      order: ex.order,
      duration: ex.duration,
      reps: ex.reps,
      equipment: ex.equipment,
    }));

    const { error: exError } = await supabase.from("exercises").insert(exercisesToInsert);
    if (exError) {
      console.error("Error al crear ejercicios:", exError.message);
    }
  }

  return routineData;
}

// Borrar rutina (con cascada elimina todo lo relacionado)
export async function deleteRoutine(routineId: string) {
  const { error } = await supabase
    .from("routines")
    .delete()
    .eq("id", routineId);

  if (error) {
    console.error("Error al borrar rutina:", error.message);
    return false;
  }

  return true;
}