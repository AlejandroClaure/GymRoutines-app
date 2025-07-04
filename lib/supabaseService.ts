import { supabase } from "./supabase";

// 1. Obtener todas las rutinas de un usuario, con bloques y ejercicios
export async function fetchUserRoutines(userId: string) {
  const { data, error } = await supabase
    .from("routines")
    .select(`
      *,
      blocks (
        *,
        exercises (
          *
        )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching routines:", error.message);
    return [];
  }

  return data;
}

// 2. Crear rutina completa (routines + blocks + exercises)
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
      rest_between_exercises: routine.rest_between_exercises,
      rest_between_blocks: routine.rest_between_blocks,
    }])
    .select()
    .single();

  if (routineError || !routineData) {
    console.error("Error creating routine:", routineError?.message);
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
      }])
      .select()
      .single();

    if (blockError || !blockData) {
      console.error("Error creating block:", blockError?.message);
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
      console.error("Error creating exercises:", exError.message);
    }
  }

  return routineData;
}

// 3. Borrar rutina (con cascada elimina todo lo relacionado)
export async function deleteRoutine(routineId: string) {
  const { error } = await supabase
    .from("routines")
    .delete()
    .eq("id", routineId);

  if (error) {
    console.error("Error deleting routine:", error.message);
    return false;
  }

  return true;
}
