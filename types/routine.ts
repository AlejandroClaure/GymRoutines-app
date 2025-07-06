// types/routine.ts

// Tipo para un ejercicio individual
export type Exercise = {
  id?: string; // ID único del ejercicio (opcional, asignado por la DB)
  block_id?: string; // ID del bloque al que pertenece (opcional, asignado por la DB)
  name: string; // Nombre del ejercicio, obligatorio
  order: number; // Orden dentro del bloque
  duration?: number; // Duración en segundos (opcional si se usan repeticiones)
  reps?: number; // Cantidad de repeticiones (opcional si se usa duración)
  equipment?: string; // Equipamiento necesario (opcional)
};

// Tipo para un bloque de ejercicios
export type Block = {
  id?: string; // ID único del bloque (opcional, asignado por la DB)
  routine_id?: string; // ID de la rutina a la que pertenece (opcional, asignado por la DB)
  title: string; // Título del bloque, obligatorio
  order: number; // Orden del bloque dentro de la rutina
  repeat: number; // Cantidad de repeticiones del bloque
  is_preparation?: boolean; // Indica si es un bloque de preparación (opcional, por defecto false)
  exercises: Exercise[]; // Lista de ejercicios en el bloque
};

// Tipo para una rutina completa
export type Routine = {
  id?: string; // ID único de la rutina (opcional, asignado por la DB)
  user_id?: string; // ID del usuario propietario (opcional, asignado por la DB)
  name: string; // Nombre de la rutina, obligatorio
  style?: string; // Estilo de la rutina (ej. Fuerza, Cardio, HIIT), opcional
  level?: 'Principiante' | 'Intermedio' | 'Avanzado'; // Nivel de dificultad, opcional
  duration?: number; // Duración estimada en minutos, opcional
  rest_between_exercises?: number; // Tiempo de descanso entre ejercicios en segundos, opcional
  rest_between_blocks?: number; // Tiempo de descanso entre bloques en segundos, opcional
  blocks: Block[]; // Lista de bloques en la rutina
};

// Tipo para un resumen de rutina (usado en listas o vistas previas)
export type RoutineSummary = {
  id: string; // ID único de la rutina
  name: string; // Nombre de la rutina
  level: 'Principiante' | 'Intermedio' | 'Avanzado'; // Nivel de dificultad
  duration: number; // Duración estimada en minutos
  style: string; // Estilo de la rutina
  source?: 'local' | 'remote'; // Fuente de los datos (local o remota)
};