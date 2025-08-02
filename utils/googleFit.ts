import axios from "axios";
import { supabase } from "@/lib/supabase";

// Función para obtener datos de fitness desde la API de Google Fit
export const fetchFitnessData = async (
  accessToken: string, // Token de acceso para autenticar las solicitudes a Google Fit
  startTime: string, // Fecha y hora de inicio para el rango de datos (ISO string)
  endTime: string, // Fecha y hora de fin para el rango de datos (ISO string)
  dataType: string // Tipo de datos a obtener (ej. com.google.calories.expended)
) => {
  // Validamos que se haya proporcionado un token de acceso
  if (!accessToken) {
    console.error("❌ No se encontró el token de acceso");
    throw { code: 401, message: "No se proporcionó un token de acceso" }; // Lanzamos un error con código 401
  }

  try {
    // Realizamos una solicitud POST a la API de Google Fit para obtener datos agregados
    const response = await axios.post(
      "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
      {
        aggregateBy: [{ dataTypeName: dataType }], // Especificamos el tipo de datos a agregar
        bucketByTime: { durationMillis: 86400000 }, // Agrupamos los datos por día (86400000 ms = 1 día)
        startTimeMillis: new Date(startTime).getTime(), // Convertimos startTime a milisegundos
        endTimeMillis: new Date(endTime).getTime(), // Convertimos endTime a milisegundos
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Autenticación con el token de acceso
          "Content-Type": "application/json", // Tipo de contenido de la solicitud
        },
      }
    );

    // Procesamos los datos de la respuesta, extrayendo los puntos de datos relevantes
    const data = response.data.bucket.map((bucket: any) =>
      bucket.dataset[0].point.map((point: any) => ({
        value: point.value[0].fpVal || point.value[0].intVal || point.value, // Obtenemos el valor (float o int)
        startTime: new Date(parseInt(point.startTimeNanos) / 1000000), // Convertimos startTimeNanos a Date
        endTime: new Date(parseInt(point.endTimeNanos) / 1000000), // Convertimos endTimeNanos a Date
      }))
    );

    // Retornamos los datos procesados, aplanando el array
    return data.flat();
  } catch (error: any) {
    // Manejamos errores específicos de la solicitud
    if (axios.isAxiosError(error) && error.response) {
      // Si es un error de Axios con respuesta, propagamos el código de estado y el mensaje
      console.error(`❌ Error al obtener ${dataType}:`, {
        code: error.response.status,
        message: error.response.statusText,
      });
      throw {
        code: error.response.status, // Propagamos el código de error (ej. 401 para Unauthorized)
        message: error.response.statusText,
      };
    } else {
      // Para otros errores (como problemas de red), propagamos un error genérico
      console.error(`❌ Error al obtener ${dataType}:`, error.message);
      throw {
        code: 0, // Código genérico para errores no HTTP
        message: error.message || "Error desconocido al obtener datos de Google Fit",
      };
    }
  }
};

// Función para guardar datos de fitness en Supabase
export const saveFitnessData = async (
  userId: string, // ID del usuario
  data: {
    calories?: number; // Calorías quemadas (opcional)
    heartRate?: number; // Frecuencia cardíaca (opcional)
    sleep?: number; // Duración del sueño en horas (opcional)
    weight?: number; // Peso (opcional)
  }
) => {
  // Insertamos los datos en la tabla user_fitness_data de Supabase
  const { error } = await supabase.from("user_fitness_data").insert({
    user_id: userId,
    calories_burned: data.calories || null, // Guardamos null si no hay datos
    heart_rate: data.heartRate || null,
    sleep_duration: data.sleep || null,
    weight: data.weight || null,
  });

  // Si hay un error al guardar, lo registramos y retornamos false
  if (error) {
    console.error("❌ Error al guardar datos de fitness:", error.message);
    return false;
  }

  // Retornamos true si la operación fue exitosa
  return true;
};