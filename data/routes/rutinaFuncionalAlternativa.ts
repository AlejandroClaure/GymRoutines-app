import { Routine } from "@/types/routine";

export const rutinaFuncionalAlternativa: Routine = {
  id: "rutina-funcional-alternativa",
  name: "🔥 Rutina Funcional Alternativa",
  duration: 60,
  level: "Avanzado",
  style: "Full Body funcional (circuitos)",
  restBetweenExercises: 5,
  restBetweenBlocks: 60,
  blocks: [
     {
      title: "Preparación",
      repeat: 1,
      exercises: [
        { name: "¿Están listos?", duration: 10, equipment: "Preparen los elementos" }
      ],
    },
    {
      title: "Calentamiento",
      repeat: 2,
      exercises: [
        { name: "Saltos con soga (jump rope)", duration: 60 },
        { name: "Sentadilla con salto sin peso", duration: 60 },
        { name: "Rotaciones de cadera y hombros", duration: 60 },
        { name: "Desplantes laterales (sin peso)", duration: 60 },
        { name: "Mountain climbers", duration: 60 },
      ],
    },
    {
      title: "Bloque Inferior – Piernas y Glúteos",
      repeat: 3,
      exercises: [
        { name: "Sentadilla búlgara (split squat)", reps: 12, equipment: "Mancuernas" },
        { name: "Peso muerto a una pierna con barra", reps: 10, equipment: "Barra" },
        { name: "Step-ups con mancuernas", reps: 15, equipment: "Mancuernas" },
        { name: "Hip thrust con barra o peso", reps: 15, equipment: "Barra" },
        { name: "Saltos laterales explosivos", duration: 20 },
      ],
    },
    {
      title: "Bloque Superior – Pecho/Espalda/Brazos",
      repeat: 3,
      exercises: [
        { name: "Press de banca con barra o mancuernas", reps: 12, equipment: "Barra o mancuernas" },
        { name: "Remo renegado con mancuernas", reps: 10, equipment: "Mancuernas" },
        { name: "Flexiones con palmada", reps: 12 },
        { name: "Curl de bíceps martillo", reps: 12, equipment: "Mancuernas" },
        { name: "Fondos de tríceps con banco", reps: 15 },
      ],
    },
    {
      title: "Bloque Core – Abdominales",
      repeat: 2,
      exercises: [
        { name: "Plancha lateral con elevación de pierna", duration: 30 },
        { name: "V-ups", reps: 20 },
        { name: "Russian twist con mancuerna o pesa rusa", duration: 30, equipment: "Mancuerna o pesa rusa" },
        { name: "Elevación de piernas colgado o en el suelo", reps: 15 },
        { name: "Crunch abdominal con peso", reps: 15, equipment: "Mancuerna o pesa rusa" },
      ],
    },
    {
      title: "Bloque Full Body HIIT + Soga",
      repeat: 1, // AMRAP durante 13 min, pero lo modelamos con repeat: 1
      exercises: [
        { name: "Swing con mancuerna o pesa rusa", reps: 20, equipment: "Mancuerna o pesa rusa" },
        { name: "Burpees con salto alto", reps: 10 },
        { name: "Clean + Press con barra o mancuernas", reps: 12, equipment: "Barra o mancuernas" },
        { name: "Jump rope rápido", duration: 60, equipment: "Soga" },
        { name: "Thrusters con barra o mancuernas", reps: 12, equipment: "Barra o mancuernas" },
      ],
    },
    {
      title: "Enfriamiento",
      repeat: 1,
      exercises: [
        { name: "Estiramientos estáticos para piernas, brazos y espalda", duration: 120 },
        { name: "Respiración profunda y relajación", duration: 60 },
      ],
    },
  ],
};
