import { Routine } from "@/types/routine";

export const fullBodyFuncional: Routine = {
  id: "full-body-funcional",
  name: "Full Body Funcional",
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
      title: "Bloque 1 – Calentamiento funcional",
      repeat: 2,
      exercises: [
        { name: "Jump rope (soga rápida)", duration: 60, equipment: "Soga" },
        { name: "Sentadillas con peso corporal", duration: 30 },
        { name: "Desplantes alternos con salto", duration: 30 },
        { name: "Plancha con toques de hombros", duration: 30 },
        { name: "Skipping alto", duration: 30 },
        { name: "Jumping jacks", duration: 60 },
        { name: "Movilidad articular de cadera y hombros", duration: 120 },
        { name: "Respiración nasal + activación core", duration: 60 },
      ],
    },
    {
      title: "Bloque 2 – Piernas y Glúteos",
      repeat: 3,
      exercises: [
        { name: "Sentadilla frontal", reps: 12, equipment: "Barra (20 kg)" },
        { name: "Peso muerto convencional", reps: 10, equipment: "Barra (20 kg)" },
        { name: "Zancadas caminando", reps: 12, equipment: "2 mancuernas rusas (10 kg c/u)" },
        { name: "Sentadilla goblet", reps: 15, equipment: "1 mancuerna rusa (10 kg)" },
        { name: "Jump squats", duration: 20 },
      ],
    },
    {
      title: "Bloque 3 – Tren superior y Core",
      repeat: 3,
      exercises: [
        { name: "Press militar de pie", reps: 12, equipment: "Barra (20 kg)" },
        { name: "Remo inclinado", reps: 10, equipment: "Barra (20 kg)" },
        { name: "Swing ruso doble", reps: 20, equipment: "2 mancuernas rusas (10 kg c/u)" },
        { name: "Plancha con remo unilateral", duration: 30, equipment: "1 mancuerna rusa (cambiar lado)" },
        { name: "Russian twist", reps: 40, equipment: "1 mancuerna rusa (10 kg)" },
        { name: "Plancha frontal", duration: 45 },
      ],
    },
    {
      title: "Bloque 4 – Full Body HIIT + Soga",
      repeat: 1,
      exercises: [
        { name: "Clean + Press", reps: 10, equipment: "2 mancuernas rusas (10 kg c/u)" },
        { name: "Burpees", reps: 10 },
        { name: "Jump rope (rápido)", duration: 60, equipment: "Soga" },
        { name: "Thruster (sentadilla + press)", reps: 10, equipment: "Barra (20 kg)" },
        { name: "High pull explosivo", reps: 12, equipment: "2 mancuernas rusas (10 kg c/u)" },
      ],
    },
    {
      title: "Enfriamiento / Cooldown",
      repeat: 1,
      exercises: [
        { name: "Estiramientos estáticos para piernas, brazos y espalda", duration: 120 },
        { name: "Respiración profunda y relajación", duration: 60 },
      ],
    },
  ],
};
