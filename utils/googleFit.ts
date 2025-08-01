import axios from "axios";
import { supabase } from "@/lib/supabase";

export const fetchFitnessData = async (
  accessToken: string,
  startTime: string,
  endTime: string,
  dataType: string
) => {
  if (!accessToken) {
    console.error("No se encontró el token de acceso");
    return null;
  }

  try {
    const response = await axios.post(
      "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
      {
        aggregateBy: [{ dataTypeName: dataType }],
        bucketByTime: { durationMillis: 86400000 }, // Agrupar por día
        startTimeMillis: new Date(startTime).getTime(),
        endTimeMillis: new Date(endTime).getTime(),
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data.bucket.map((bucket: any) =>
      bucket.dataset[0].point.map((point: any) => ({
        value: point.value[0].fpVal || point.value[0].intVal || point.value,
        startTime: new Date(parseInt(point.startTimeNanos) / 1000000),
        endTime: new Date(parseInt(point.endTimeNanos) / 1000000),
      }))
    );

    return data.flat();
  } catch (error) {
    console.error(`Error al obtener ${dataType}:`, error);
    return null;
  }
};

export const saveFitnessData = async (
  userId: string,
  data: {
    calories?: number;
    heartRate?: number;
    sleep?: number;
    weight?: number;
  }
) => {
  const { error } = await supabase.from("user_fitness_data").insert({
    user_id: userId,
    calories_burned: data.calories || null,
    heart_rate: data.heartRate || null,
    sleep_duration: data.sleep || null,
    weight: data.weight || null,
  });

  if (error) {
    console.error("Error al guardar datos de fitness:", error.message);
    return false;
  }
  return true;
};