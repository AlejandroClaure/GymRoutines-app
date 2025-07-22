import { supabase } from "./supabase";
import { Routine } from "@/types/routine";
import { generate } from "randomstring"; // For generating share codes

// Obtener todas las rutinas de un usuario, con bloques y ejercicios
export async function fetchUserRoutines(userId: string): Promise<Routine[] | []> {
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
        "order",
        repeat,
        is_preparation,
        exercises (
          id,
          block_id,
          name,
          "order",
          duration,
          reps,
          equipment
        )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error al obtener rutinas:", error.message);
    return [];
  }

  if (data) {
    data.forEach((routine) => {
      if (routine.blocks) {
        routine.blocks.sort((a, b) => a.order - b.order);
        routine.blocks.forEach((block) => {
          if (block.exercises) {
            block.exercises.sort((a, b) => a.order - b.order);
          }
        });
      }
    });
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
  // 1. Crear rutina
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
    .select("id")
    .single();

  if (routineError || !routineData) {
    console.error("❌ Error al crear rutina:", routineError?.message);
    return null;
  }

  const routineId = routineData.id;

  // 2. Insertar todos los bloques
  const { data: blocksData, error: blocksError } = await supabase
    .from("blocks")
    .insert(
      routine.blocks.map((block) => ({
        routine_id: routineId,
        title: block.title,
        order: block.order,
        repeat: block.repeat,
        is_preparation: block.is_preparation ?? false,
      }))
    )
    .select("id, order");

  if (blocksError || !blocksData) {
    console.error("❌ Error al insertar bloques:", blocksError?.message);
    return null;
  }

  // 3. Insertar ejercicios por bloque
  const allExercises = routine.blocks.flatMap((block) => {
    const insertedBlock = blocksData.find((b) => b.order === block.order);
    if (!insertedBlock) return [];

    return block.exercises.map((ex) => ({
      block_id: insertedBlock.id,
      name: ex.name,
      order: ex.order,
      duration: ex.duration ?? null,
      reps: ex.reps ?? null,
      equipment: ex.equipment ?? null,
    }));
  });

  if (allExercises.length > 0) {
    const { error: exError } = await supabase.from("exercises").insert(allExercises);
    if (exError) {
      console.error("❌ Error al insertar ejercicios:", exError.message);
      return null;
    }
  }

  return { id: routineId };
}

// Actualizar rutina completa (routines + blocks + exercises)
export async function updateRoutineWithBlocks(userId: string, routineId: string, routine: {
  name: string;
  style?: string;
  level?: string;
  duration?: number;
  rest_between_exercises?: number;
  rest_between_blocks?: number;
  blocks: {
    id?: string;
    title: string;
    order: number;
    repeat: number;
    is_preparation?: boolean;
    exercises: {
      id?: string;
      name: string;
      order: number;
      duration?: number;
      reps?: number;
      equipment?: string;
    }[];
  }[];
}) {
  // Actualizar la rutina principal
  const { data: routineData, error: routineError } = await supabase
    .from("routines")
    .update({
      name: routine.name,
      style: routine.style || null,
      level: routine.level || null,
      duration: routine.duration || null,
      rest_between_exercises: routine.rest_between_exercises ?? 5,
      rest_between_blocks: routine.rest_between_blocks ?? 5,
    })
    .eq("id", routineId)
    .eq("user_id", userId)
    .select()
    .single();

  if (routineError || !routineData) {
    console.error("❌ Error al actualizar rutina:", routineError?.message);
    return false;
  }

  const { data: existingBlocks, error: fetchBlockError } = await supabase
    .from("blocks")
    .select("id")
    .eq("routine_id", routineId);

  if (fetchBlockError || !existingBlocks) {
    console.error("❌ Error al obtener bloques existentes:", fetchBlockError?.message);
    return false;
  }

  const existingBlockIds = existingBlocks.map((b) => b.id);
  const newBlockIds = routine.blocks.map((b) => b.id).filter((id): id is string => !!id);

  for (const block of routine.blocks) {
    const blockToUpsert = {
      ...(block.id && { id: block.id }),
      routine_id: routineId,
      title: block.title,
      order: block.order,
      repeat: block.repeat,
      is_preparation: block.is_preparation ?? false,
    };

    const { data: blockData, error: blockError } = await supabase
      .from("blocks")
      .upsert([blockToUpsert])
      .select()
      .single();

    if (blockError || !blockData) {
      console.error("❌ Error al upsertar bloque:", blockError?.message);
      return false;
    }

    const { data: existingExercises, error: fetchExerciseError } = await supabase
      .from("exercises")
      .select("id")
      .eq("block_id", blockData.id);

    if (fetchExerciseError || !existingExercises) {
      console.error("❌ Error al obtener ejercicios existentes:", fetchExerciseError?.message);
      return false;
    }

    const existingExerciseIds = existingExercises.map((ex) => ex.id);
    const newExerciseIds = block.exercises.map((ex) => ex.id).filter((id): id is string => !!id);

    const exercisesToUpsert = block.exercises.map((ex, index) => ({
      ...(ex.id && { id: ex.id }),
      block_id: blockData.id,
      name: ex.name,
      order: index + 1,
      duration: ex.duration || null,
      reps: ex.reps || null,
      equipment: ex.equipment || null,
    }));

    const { error: exerciseError } = await supabase
      .from("exercises")
      .upsert(exercisesToUpsert);

    if (exerciseError) {
      console.error("❌ Error al upsertar ejercicios:", exerciseError.message);
      return false;
    }

    const exercisesToDelete = existingExerciseIds.filter((id) => !newExerciseIds.includes(id));
    if (exercisesToDelete.length > 0) {
      const { error: deleteExerciseError } = await supabase
        .from("exercises")
        .delete()
        .eq("block_id", blockData.id)
        .in("id", exercisesToDelete);

      if (deleteExerciseError) {
        console.error("❌ Error al eliminar ejercicios obsoletos:", deleteExerciseError.message);
        return false;
      }
    }
  }

  const blocksToDelete = existingBlockIds.filter((id) => !newBlockIds.includes(id));
  if (blocksToDelete.length > 0) {
    const { error: deleteBlockError } = await supabase
      .from("blocks")
      .delete()
      .eq("routine_id", routineId)
      .in("id", blocksToDelete);

    if (deleteBlockError) {
      console.error("❌ Error al eliminar bloques obsoletos:", deleteBlockError.message);
      return false;
    }
  }

  return true;
}

// Borrar rutina (con cascada elimina todo lo relacionado)
export async function deleteRoutine(routineId: string) {
  const { error } = await supabase
    .from("routines")
    .delete()
    .eq("id", routineId);

  if (error) {
    console.error("❌ Error al borrar rutina:", error.message);
    return false;
  }

  return true;
}

// Crear un código de compartir para una rutina
export async function createRoutineShareCode(routineId: string): Promise<string | null> {
  try {
    // Clean up expired share codes
    await supabase.from("routine_shares").delete().lte("expires_at", new Date().toISOString());

    // Generate a unique 8-character share code
    const shareCode = generate({
      length: 8,
      charset: "alphanumeric",
      capitalization: "uppercase",
    });

    const { error } = await supabase.from("routine_shares").insert({
      routine_id: routineId,
      share_code: shareCode,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
    });

    if (error) {
      console.error("❌ Error al crear código de compartir:", error.message);
      return null;
    }

    return shareCode;
  } catch (e) {
    console.error("❌ Error inesperado en createRoutineShareCode:", e);
    return null;
  }
}

// Importar una rutina por código de compartir
export async function importRoutineByShareCode(userId: string, shareCode: string): Promise<boolean> {
  try {
    // Find the routine by share code
    const { data: shareData, error: shareError } = await supabase
      .from("routine_shares")
      .select("routine_id")
      .eq("share_code", shareCode)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (shareError || !shareData) {
      console.error("❌ Error al obtener código de compartir o código expirado:", shareError?.message);
      return false;
    }

    // Fetch the routine, blocks, and exercises
    const { data: routineData, error: routineError } = await supabase
      .from("routines")
      .select(`
        name,
        style,
        level,
        duration,
        rest_between_exercises,
        rest_between_blocks,
        blocks (
          id,
          title,
          "order",
          repeat,
          is_preparation,
          exercises (
            id,
            name,
            "order",
            duration,
            reps,
            equipment
          )
        )
      `)
      .eq("id", shareData.routine_id)
      .single();

    if (routineError || !routineData) {
      console.error("❌ Error al obtener rutina:", routineError?.message);
      return false;
    }

    // Sort blocks and exercises to ensure correct order
    if (routineData.blocks) {
      routineData.blocks.sort((a, b) => a.order - b.order);
      routineData.blocks.forEach((block) => {
        if (block.exercises) {
          block.exercises.sort((a, b) => a.order - b.order);
        }
      });
    }

    // Construct the routine object for the importing user
    const routineToCreate: Routine = {
      name: `${routineData.name} (Copia)`,
      style: routineData.style,
      level: routineData.level,
      duration: routineData.duration,
      rest_between_exercises: routineData.rest_between_exercises,
      rest_between_blocks: routineData.rest_between_blocks,
      blocks: routineData.blocks.map((block) => ({
        title: block.title,
        order: block.order,
        repeat: block.repeat,
        is_preparation: block.is_preparation,
        exercises: block.exercises.map((ex) => ({
          name: ex.name,
          order: ex.order,
          duration: ex.duration,
          reps: ex.reps,
          equipment: ex.equipment,
        })),
      })),
    };

    // Create the routine for the importing user
    const result = await createRoutineWithBlocks(userId, routineToCreate);
    return !!result; // Return true if creation was successful, false otherwise
  } catch (e) {
    console.error("❌ Error inesperado en importRoutineByShareCode:", e);
    return false;
  }
}