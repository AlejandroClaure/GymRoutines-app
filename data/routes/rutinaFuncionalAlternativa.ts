// data/routines/rutinaFuncionalAlternativa.ts

import { Routine } from "@/types/routine";

// Definición de la rutina "Rutina Funcional Alternativa"
export const rutinaFuncionalAlternativa: Routine = {
  id: "rutina-funcional-alternativa",
  name: "🔥 Rutina Funcional Alternativa",
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
      title: "Calentamiento",
      order: 2,
      repeat: 2,
      is_preparation: false, // No es bloque de preparación
      exercises: [
        { name: "Saltos con soga (jump rope)", order: 1, duration: 60 },
        { name: "Sentadilla con salto sin peso", order: 2, duration: 60 },
        { name: "Rotaciones de cadera y hombros", order: 3, duration: 60 },
        { name: "Desplantes laterales (sin peso)", order: 4, duration: 60 },
        { name: "Mountain climbers", order: 5, duration: 60 },
      ],
    },
    {
      title: "Bloque Inferior – Piernas y Glúteos",
      order: 3,
      repeat: 3,
      is_preparation: false,
      exercises: [
        { name: "Sentadilla búlgara (split squat)", order: 1, reps: 12, equipment: "Mancuernas" },
        { name: "Peso muerto a una pierna con barra", order: 2, reps: 10, equipment: "Barra" },
        { name: "Step-ups con mancuernas", order: 3, reps: 15, equipment: "Mancuernas" },
        { name: "Hip thrust con barra o peso", order: 4, reps: 15, equipment: "Barra" },
        { name: "Saltos laterales explosivos", order: 5, duration: 20 },
      ],
    },
    {
      title: "Bloque Superior – Pecho/Espalda/Brazos",
      order: 4,
      repeat: 3,
      is_preparation: false,
      exercises: [
        { name: "Press de banca con barra o mancuernas", order: 1, reps: 12, equipment: "Barra o mancuernas" },
        { name: "Remo renegado con mancuernas", order: 2, reps: 10, equipment: "Mancuernas" },
        { name: "Flexiones con palmada", order: 3, reps: 12 },
        { name: "Curl de bíceps martillo", order: 4, reps: 12, equipment: "Mancuernas" },
        { name: "Fondos de tríceps con banco", order: 5, reps: 15 },
      ],
    },
    {
      title: "Bloque Core – Abdominales",
      order: 5,
      repeat: 2,
      is_preparation: false,
      exercises: [
        { name: "Plancha lateral con elevación de pierna", order: 1, duration: 30 },
        { name: "V-ups", order: 2, reps: 20 },
        { name: "Russian twist con mancuerna o pesa rusa", order: 3, duration: 30, equipment: "Mancuerna o pesa rusa" },
        { name: "Elevación de piernas colgado o en el suelo", order: 4, reps: 15 },
        { name: "Crunch abdominal con peso", order: 5, reps: 15, equipment: "Mancuerna o pesa rusa" },
      ],
    },
    {
      title: "Bloque Full Body HIIT + Soga",
      order: 6,
      repeat: 1, // AMRAP durante 13 min, pero modelado con repeat: 1
      is_preparation: false,
      exercises: [
        { name: "Swing con mancuerna o pesa rusa", order: 1, reps: 20, equipment: "Mancuerna o pesa rusa" },
        { name: "Burpees con salto alto", order: 2, reps: 10 },
        { name: "Clean + Press con barra o mancuernas", order: 3, reps: 12, equipment: "Barra o mancuernas" },
        { name: "Jump rope rápido", order: 4, duration: 60, equipment: "Soga" },
        { name: "Thrusters con barra o mancuernas", order: 5, reps: 12, equipment: "Barra o mancuernas" },
      ],
    },
    {
      title: "Enfriamiento",
      order: 7,
      repeat: 1,
      is_preparation: false,
      exercises: [
        { name: "Estiramientos estáticos para piernas, brazos y espalda", order: 1, duration: 120 },
        { name: "Respiración profunda y relajación", order: 2, duration: 60 },
      ],
    },
  ],
};