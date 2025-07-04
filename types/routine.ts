// types/routine.ts

export type Exercise = {
  name: string;
  duration?: number; // en segundos (solo si se usa tiempo)
  reps?: number; // en repeticiones (opcional si hay duración)
  equipment?: string;
};

export type Block = {
  title: string;
  repeat: number;
  exercises: Exercise[];
};

export type Routine = {
  id: string;
  name: string;
  duration: number; // en minutos
  level: 'Principiante' | 'Intermedio' | 'Avanzado';
  style?: string;
  restBetweenExercises: number; // en segundos
  restBetweenBlocks: number; // en segundos
  blocks: Block[];
};

export type RoutineSummary = {
  id: string;
  name: string;
  level: "Principante" | "Intermedio" | "Avanzado"; 
  duration: number;
  style: string;
  source?: "local" | "remote";
};
