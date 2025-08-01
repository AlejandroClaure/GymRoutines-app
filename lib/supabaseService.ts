// lib/supabaseService.ts
import { supabase } from "./supabase";
import { Routine } from "@/types/routine";
import { generate } from "randomstring";

// Definir tipo ThemeOption para consistencia
export type ThemeOption = 'light' | 'dark' | 'system';

// Guardar preferencia de tema
export async function upsertThemePreference(userId: string, theme: ThemeOption) {
  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        theme,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("❌ Error al guardar tema:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return false;
  }

  console.log("✅ Tema guardado exitosamente para usuario:", userId);
  return true;
}

// Obtener preferencia de tema
export async function getThemePreference(userId: string): Promise<ThemeOption | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("theme")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("❌ Error al obtener tema:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return data?.theme ?? null;
}

// Notificación de recordatorio de entrenamiento para el usuario
export async function upsertNotificationPreference({
  userId,
  hour,
  minute,
  days,
}: {
  userId: string;
  hour: number;
  minute: number;
  days: number[];
}) {
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: userId,
        hour,
        minute,
        days,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("❌ Error al guardar preferencias:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return false;
  }

  console.log("✅ Preferencias de notificación guardadas para usuario:", userId);
  return true;
}

// Obtener preferencia de notificación
export async function getNotificationPreference(userId: string) {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("❌ Error al obtener preferencias:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return data;
}

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
    console.error("❌ Error al obtener rutinas:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
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
    console.error("❌ Error al crear rutina:", {
      message: routineError?.message,
      details: routineError?.details,
      hint: routineError?.hint,
      code: routineError?.code,
    });
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
    console.error("❌ Error al insertar bloques:", {
      message: blocksError?.message,
      details: blocksError?.details,
      hint: blocksError?.hint,
      code: blocksError?.code,
    });
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
      console.error("❌ Error al insertar ejercicios:", {
        message: exError.message,
        details: exError.details,
        hint: exError.hint,
        code: exError.code,
      });
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
    console.error("❌ Error al actualizar rutina:", {
      message: routineError?.message,
      details: routineError?.details,
      hint: routineError?.hint,
      code: routineError?.code,
    });
    return false;
  }

  const { data: existingBlocks, error: fetchBlockError } = await supabase
    .from("blocks")
    .select("id")
    .eq("routine_id", routineId);

  if (fetchBlockError || !existingBlocks) {
    console.error("❌ Error al obtener bloques existentes:", {
      message: fetchBlockError?.message,
      details: fetchBlockError?.details,
      hint: fetchBlockError?.hint,
      code: fetchBlockError?.code,
    });
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
      console.error("❌ Error al upsertar bloque:", {
        message: blockError?.message,
        details: blockError?.details,
        hint: blockError?.hint,
        code: blockError?.code,
      });
      return false;
    }

    const { data: existingExercises, error: fetchExerciseError } = await supabase
      .from("exercises")
      .select("id")
      .eq("block_id", blockData.id);

    if (fetchExerciseError || !existingExercises) {
      console.error("❌ Error al obtener ejercicios existentes:", {
        message: fetchExerciseError?.message,
        details: fetchExerciseError?.details,
        hint: fetchExerciseError?.hint,
        code: fetchExerciseError?.code,
      });
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
      console.error("❌ Error al upsertar ejercicios:", {
        message: exerciseError.message,
        details: exerciseError.details,
        hint: exerciseError.hint,
        code: exerciseError.code,
      });
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
        console.error("❌ Error al eliminar ejercicios obsoletos:", {
          message: deleteExerciseError.message,
          details: deleteExerciseError.details,
          hint: deleteExerciseError.hint,
          code: deleteExerciseError.code,
        });
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
      console.error("❌ Error al eliminar bloques obsoletos:", {
        message: deleteBlockError.message,
        details: deleteBlockError.details,
        hint: deleteBlockError.hint,
        code: deleteBlockError.code,
      });
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
    console.error("❌ Error al borrar rutina:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return false;
  }

  return true;
}

// Crear un código de compartir para una rutina
export async function createRoutineShareCode(routineId: string): Promise<string | null> {
  try {
    // Borrar códigos de compartir expirados
    await supabase.from("routine_shares").delete().lte("expires_at", new Date().toISOString());

    // Generar un código de 8 caracteres único
    const shareCode = generate({
      length: 8,
      charset: "alphanumeric",
      capitalization: "uppercase",
    });

    const { error } = await supabase.from("routine_shares").insert({
      routine_id: routineId,
      share_code: shareCode,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutos desde ahora
    });

    if (error) {
      console.error("❌ Error al crear código de compartir:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return null;
    }

    console.log("✅ Código de compartir creado:", shareCode);
    return shareCode;
  } catch (e: any) {
    console.error("❌ Error inesperado en createRoutineShareCode:", {
      message: e.message,
      details: e.details,
      hint: e.hint,
      code: e.code,
    });
    return null;
  }
}

// Importar una rutina por código de compartir
export async function importRoutineByShareCode(userId: string, shareCode: string): Promise<Routine | null> {
  try {
    // Buscar el código de compartir
    const { data: shareData, error: shareError } = await supabase
      .from("routine_shares")
      .select("routine_id")
      .eq("share_code", shareCode)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (shareError || !shareData) {
      console.error("❌ Error al buscar código de compartir o código expirado:", {
        message: shareError?.message || "Código no encontrado",
        details: shareError?.details,
        hint: shareError?.hint,
        code: shareError?.code,
      });
      return null;
    }

    // Obtener la rutina original con bloques y ejercicios
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
      console.error("❌ Error al obtener rutina:", {
        message: routineError?.message || "Rutina no encontrada",
        details: routineError?.details,
        hint: routineError?.hint,
        code: routineError?.code,
      });
      return null;
    }

    // Ordenar bloques y ejercicios para asegurar el orden correcto
    if (routineData.blocks) {
      routineData.blocks.sort((a, b) => a.order - b.order);
      routineData.blocks.forEach((block) => {
        if (block.exercises) {
          block.exercises.sort((a, b) => a.order - b.order);
        }
      });
    }

    // Construir el objeto de rutina para el usuario que importa
    const routineToCreate = {
      name: `${routineData.name} (Importada)`,
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

    // Crear la rutina para el usuario que importa
    const result = await createRoutineWithBlocks(userId, routineToCreate);
    if (!result) {
      console.error("❌ Error al crear rutina importada");
      return null;
    }

    // Obtener la rutina recién creada para devolverla
    const { data: newRoutine, error: fetchNewRoutineError } = await supabase
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
      .eq("id", result.id)
      .single();

    if (fetchNewRoutineError || !newRoutine) {
      console.error("❌ Error al obtener rutina importada:", {
        message: fetchNewRoutineError?.message,
        details: fetchNewRoutineError?.details,
        hint: fetchNewRoutineError?.hint,
        code: fetchNewRoutineError?.code,
      });
      return null;
    }

    console.log("✅ Rutina importada exitosamente:", newRoutine);
    return newRoutine as Routine;
  } catch (e: any) {
    console.error("❌ Error inesperado en importRoutineByShareCode:", {
      message: e.message,
      details: e.details,
      hint: e.hint,
      code: e.code,
    });
    return null;
  }
}