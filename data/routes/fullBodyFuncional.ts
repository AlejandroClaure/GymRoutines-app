// data/routines/fullBodyFuncional.ts

import { Routine } from "@/types/routine";

// Definición de la rutina "Full Body Funcional"
export const fullBodyFuncional: Routine = {
  id: "full-body-funcional",
  name: "Full Body Funcional",
  duration: 60, // Duración en minutos
  level: "Avanzado", // Nivel de dificultad
  style: "Full Body funcional (circuitos)", // Estilo de la rutina
  rest_between_exercises: 5, // Descanso entre ejercicios en segundos
  rest_between_blocks: 60, // Descanso entre bloques en segundos
  blocks: [
    {
      title: "Preparación",
      order: 1, // Orden del bloque
      repeat: 1, // Repeticiones del bloque
      is_preparation: true, // Bloque de preparación (omite descanso posterior)
      exercises: [
        {
          name: "¿Están listos?",
          order: 1, // Orden del ejercicio
          duration: 10, // Duración en segundos
          equipment: "Preparen los elementos",
        },
      ],
    },
    {
      title: "Bloque 1 – Calentamiento funcional",
      order: 2,
      repeat: 2,
      is_preparation: false, // No es bloque de preparación
      exercises: [
        { name: "Jump rope (soga rápida)", order: 1, duration: 60, equipment: "Soga" },
        { name: "Sentadillas con peso corporal", order: 2, duration: 30 },
        { name: "Desplantes alternos con salto", order: 3, duration: 30 },
        { name: "Plancha con toques de hombros", order: 4, duration: 30 },
        { name: "Skipping alto", order: 5, duration: 30 },
        { name: "Jumping jacks", order: 6, duration: 60 },
        { name: "Movilidad articular de cadera y hombros", order: 7, duration: 120 },
        { name: "Respiración nasal + activación core", order: 8, duration: 60 },
      ],
    },
    {
      title: "Bloque 2 – Piernas y Glúteos",
      order: 3,
      repeat: 3,
      is_preparation: false,
      exercises: [
        { name: "Sentadilla frontal", order: 1, reps: 12, equipment: "Barra (20 kg)" },
        { name: "Peso muerto convencional", order: 2, reps: 10, equipment: "Barra (20 kg)" },
        { name: "Zancadas caminando", order: 3, reps: 12, equipment: "2 mancuernas rusas (10 kg c/u)" },
        { name: "Sentadilla goblet", order: 4, reps: 15, equipment: "1 mancuerna rusa (10 kg)" },
        { name: "Jump squats", order: 5, duration: 20 },
      ],
    },
    {
      title: "Bloque 3 – Tren superior y Core",
      order: 4,
      repeat: 3,
      is_preparation: false,
      exercises: [
        { name: "Press militar de pie", order: 1, reps: 12, equipment: "Barra (20 kg)" },
        { name: "Remo inclinado", order: 2, reps: 10, equipment: "Barra (20 kg)" },
        { name: "Swing ruso doble", order: 3, reps: 20, equipment: "2 mancuernas rusas (10 kg c/u)" },
        { name: "Plancha con remo unilateral", order: 4, duration: 30, equipment: "1 mancuerna rusa (cambiar lado)" },
        { name: "Russian twist", order: 5, reps: 40, equipment: "1 mancuerna rusa (10 kg)" },
        { name: "Plancha frontal", order: 6, duration: 45 },
      ],
    },
    {
      title: "Bloque 4 – Full Body HIIT + Soga",
      order: 5,
      repeat: 1,
      is_preparation: false,
      exercises: [
        { name: "Clean + Press", order: 1, reps: 10, equipment: "2 mancuernas rusas (10 kg c/u)" },
        { name: "Burpees", order: 2, reps: 10 },
        { name: "Jump rope (rápido)", order: 3, duration: 60, equipment: "Soga" },
        { name: "Thruster (sentadilla + press)", order: 4, reps: 10, equipment: "Barra (20 kg)" },
        { name: "High pull explosivo", order: 5, reps: 12, equipment: "2 mancuernas rusas (10 kg c/u)" },
      ],
    },
    {
      title: "Enfriamiento / Cooldown",
      order: 6,
      repeat: 1,
      is_preparation: false,
      exercises: [
        { name: "Estiramientos estáticos para piernas, brazos y espalda", order: 1, duration: 120 },
        { name: "Respiración profunda y relajación", order: 2, duration: 60 },
      ],
    },
  ],
};