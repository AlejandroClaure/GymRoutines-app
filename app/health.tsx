import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext'; // Contexto para manejar autenticación
import { useTheme } from '@/context/ThemeContext'; // Contexto para manejar temas (claro/oscuro)
import { fetchFitnessData, saveFitnessData } from '@/utils/googleFit'; // Funciones para interactuar con Google Fit y Supabase
import { FontAwesome5 } from '@expo/vector-icons'; // Iconos para la interfaz
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated'; // Animaciones
import { router } from 'expo-router'; // Navegación entre pantallas
import { supabase } from '@/lib/supabase'; // Cliente Supabase para autenticación

// Definimos el tipo para los datos de fitness
type FitnessData = {
  calories: any[]; // Datos de calorías quemadas
  heartRate: any[]; // Datos de frecuencia cardíaca
  sleep: any[]; // Datos de sueño
  weight: any[]; // Datos de peso
};

// Componente principal de la pantalla de Salud
const HealthScreen = () => {
  // Obtenemos la sesión y la función para obtener el token de acceso desde el contexto
  const { session, getAccessToken } = useAuth();
  // Obtenemos el tema resuelto y el estado de carga del tema
  const { resolvedTheme, isThemeLoading } = useTheme();

  // Estado para almacenar los datos de fitness
  const [fitnessData, setFitnessData] = useState<FitnessData>({
    calories: [],
    heartRate: [],
    sleep: [],
    weight: [],
  });

  // Estado para indicar si se están cargando datos
  const [isFetching, setIsFetching] = useState(false);
  // Estado para manejar errores
  const [error, setError] = useState<string | null>(null);

  // Valores animados para controlar opacidad y escala de las tarjetas
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0);

  // Estilo animado para las tarjetas
  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  // Definimos colores según el tema (claro u oscuro)
  const colors = {
    background: resolvedTheme === 'dark' ? '#0f172a' : '#ffffff',
    card: resolvedTheme === 'dark' ? '#1e293b' : '#f9fafb',
    text: resolvedTheme === 'dark' ? '#e5e7eb' : '#111827',
    textSecondary: resolvedTheme === 'dark' ? '#9ca3af' : '#6b7280',
    error: '#ef4444',
    primary: '#3b82f6',
  };

  // Función para filtrar datos del día más reciente
  const getLatestDayData = (data: any[], aggregator: (acc: number, entry: any) => number, dataType: string) => {
    console.log(`🔍 Filtrando datos de ${dataType}...`);
    // Validamos que los datos sean un array
    if (!Array.isArray(data)) {
      console.warn(`⚠️ ${dataType} no es un array:`, data);
      return { date: 'Sin datos', value: 0 };
    }

    // Obtenemos la fecha actual en formato ISO (solo fecha)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    // Filtramos los datos para el día actual
    const dailyData = data.filter((entry) => {
      if (!entry || !entry.startTime || !entry.value) {
        console.warn(`⚠️ Dato inválido en ${dataType}:`, entry);
        return false;
      }
      const entryDate = new Date(entry.startTime).toISOString().split('T')[0];
      return entryDate === todayStr;
    });

    // Si no hay datos para el día actual, retornamos 0
    if (dailyData.length === 0) {
      console.log(`⚠️ No hay datos para ${dataType} en ${todayStr}`);
      return { date: todayStr, value: 0 };
    }

    // Calculamos el valor acumulado usando el agregador proporcionado
    const value = dailyData.reduce((sum, entry) => sum + aggregator(0, entry), 0);
    return { date: todayStr, value: value.toFixed(2) };
  };

  // Efecto para escuchar cambios en el estado de autenticación
  useEffect(() => {
    // Suscribimos un listener para detectar cambios en la sesión
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        // Si no hay sesión, mostramos un error y redirigimos al login
        setError('Sesión cerrada. Por favor, iniciá sesión nuevamente.');
        router.replace('/login');
      }
    });

    // Limpieza: desuscribimos el listener al desmontar el componente
    return () => listener.subscription.unsubscribe();
  }, []);

  // Efecto para obtener datos de Google Fit
  useEffect(() => {
    const fetchData = async () => {
      // Verificamos si hay una sesión válida
      if (!session?.user?.id) {
        console.log('❌ No hay sesión de usuario:', session);
        setError('Por favor, iniciá sesión para ver tus datos de salud.');
        router.replace('/login'); // Redirigimos al login si no hay sesión
        return;
      }

      console.log('🧨 Iniciando carga de datos de Google Fit...');
      setIsFetching(true); // Indicamos que estamos cargando datos
      setError(null); // Limpiamos cualquier error previo

      try {
        // Obtenemos el token de acceso
        const accessToken = await getAccessToken();
        if (!accessToken) {
          console.error('❌ No se pudo obtener el accessToken');
          setError('Tu sesión ha expirado. Por favor, iniciá sesión nuevamente.');
          router.replace('/login'); // Redirigimos al login si no hay token
          return;
        }

        // Definimos el rango de fechas para los datos de hoy
        const today = new Date();
        const startTime = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endTime = new Date(today.setHours(23, 59, 59, 999)).toISOString();
        console.log('📅 Rango de fechas (hoy):', startTime, 'a', endTime);

        // Obtenemos datos de Google Fit
        const calories = await fetchFitnessData(accessToken, startTime, endTime, 'com.google.calories.expended');
        console.log('🔥 Calorías:', calories);
        const heartRate = await fetchFitnessData(accessToken, startTime, endTime, 'com.google.heart_rate.bpm');
        console.log('💓 Frecuencia Cardíaca:', heartRate);
        const sleep = await fetchFitnessData(accessToken, startTime, endTime, 'com.google.sleep.segment');
        console.log('😴 Sueño:', sleep);
        const weight = await fetchFitnessData(accessToken, startTime, endTime, 'com.google.weight');
        console.log('⚖️ Peso:', weight);

        // Validamos los datos recibidos
        const validateData = (data: any[], type: string) => {
          if (!Array.isArray(data)) {
            console.warn(`⚠️ ${type} no es un array:`, data);
            return [];
          }
          return data.filter((entry) => {
            const isValid = entry && entry.value && entry.startTime instanceof Date && !isNaN(entry.startTime.getTime());
            if (!isValid) {
              console.warn(`⚠️ Dato filtrado en ${type}:`, entry);
            }
            return isValid;
          });
        };

        // Creamos el objeto de datos validados
        const validatedData: FitnessData = {
          calories: validateData(calories, 'calories'),
          heartRate: validateData(heartRate, 'heartRate'),
          sleep: validateData(sleep, 'sleep'),
          weight: validateData(weight, 'weight'),
        };

        // Actualizamos el estado con los datos validados
        setFitnessData(validatedData);
        console.log('✅ Datos de fitness actualizados:', validatedData);

        // Guardamos los datos en Supabase si hay una sesión válida
        if (session.user.id) {
          const latestCalories = getLatestDayData(validatedData.calories, (acc, entry) => acc + entry.value, 'calories');
          const latestHeartRate = getLatestDayData(validatedData.heartRate, (acc, entry) => entry.value, 'heartRate');
          const latestSleep = getLatestDayData(validatedData.sleep, (acc, entry) => acc + entry.value, 'sleep');
          const latestWeight = getLatestDayData(validatedData.weight, (acc, entry) => entry.value, 'weight');

          const result = await saveFitnessData(session.user.id, {
            calories: parseFloat(latestCalories.value),
            heartRate: parseFloat(latestHeartRate.value),
            sleep: parseFloat(latestSleep.value) / 3600,
            weight: parseFloat(latestWeight.value),
          });
          console.log('💾 Resultado de guardar datos en Supabase:', result);
        }

        // Aplicamos animaciones a las tarjetas
        cardOpacity.value = withTiming(1, { duration: 600 });
        cardScale.value = withSpring(1, { damping: 12, stiffness: 120 });
      } catch (err: any) {
        // Manejamos errores al obtener datos de Google Fit
        console.error('❌ Error al obtener datos de Google Fit:', {
          message: err.message,
          details: err.details,
          code: err.code,
        });
        if (err.code === 401 || err.message.includes('Unauthorized')) {
          // Si el error es de autenticación, redirigimos al login
          setError('Tu sesión ha expirado. Por favor, iniciá sesión nuevamente.');
          router.replace('/login');
        } else {
          // Para otros errores, mostramos un mensaje genérico
          setError('Error al cargar los datos de salud. Verificá tu conexión o permisos.');
          Alert.alert('Error', 'No se pudieron cargar los datos de salud.');
        }
      } finally {
        // Finalizamos el estado de carga
        setIsFetching(false);
        console.log('🛑 Carga de datos finalizada');
      }
    };

    // Ejecutamos la función de obtención de datos
    fetchData();
  }, [session, cardOpacity, cardScale, getAccessToken]);

  // Función para calcular el nivel de estrés basado en frecuencia cardíaca y sueño
  const calculateStressScore = (heartRate: number, sleepHours: number) => {
    const heartRateScore = Math.min((heartRate - 60) / 20, 1);
    const sleepScore = Math.min((8 - sleepHours) / 2, 1);
    const stressScore = (heartRateScore * 0.6 + sleepScore * 0.4) * 100;
    return Math.round(stressScore);
  };

  // Renderizamos un indicador de carga si el tema está cargando
  if (isThemeLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Si no hay sesión, mostramos un mensaje y esperamos la redirección
  if (!session?.user?.id) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Por favor, iniciá sesión para ver tus datos de salud.
        </Text>
      </View>
    );
  }

  // Renderizamos la interfaz principal
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <FontAwesome5 name="heart" size={28} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mis Estadísticas de Salud</Text>
      </View>

      {isFetching ? (
        // Mostramos un indicador de carga mientras se obtienen los datos
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Cargando datos...</Text>
        </View>
      ) : (
        // Mostramos las estadísticas de salud
        <View style={styles.statsContainer}>
          {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}

          {fitnessData.calories.length > 0 ? (
            <Animated.View style={[styles.statCard, animatedCardStyle, { backgroundColor: colors.card }]}>
              <FontAwesome5 name="fire" size={24} color={colors.primary} />
              <Text style={[styles.statTitle, { color: colors.text }]}>
                Calorías Quemadas ({getLatestDayData(fitnessData.calories, (acc, entry) => acc + entry.value, 'calories').date})
              </Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {getLatestDayData(fitnessData.calories, (acc, entry) => acc + entry.value, 'calories').value} kcal
              </Text>
            </Animated.View>
          ) : (
            <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
              No hay datos de calorías disponibles.
            </Text>
          )}

          {fitnessData.heartRate.length > 0 ? (
            <Animated.View style={[styles.statCard, animatedCardStyle, { backgroundColor: colors.card }]}>
              <FontAwesome5 name="heartbeat" size={24} color={colors.primary} />
              <Text style={[styles.statTitle, { color: colors.text }]}>
                Frecuencia Cardíaca ({getLatestDayData(fitnessData.heartRate, (acc, entry) => entry.value, 'heartRate').date})
              </Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {getLatestDayData(fitnessData.heartRate, (acc, entry) => entry.value, 'heartRate').value} bpm
              </Text>
            </Animated.View>
          ) : (
            <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
              No hay datos de frecuencia cardíaca disponibles.
            </Text>
          )}

          {fitnessData.sleep.length > 0 ? (
            <Animated.View style={[styles.statCard, animatedCardStyle, { backgroundColor: colors.card }]}>
              <FontAwesome5 name="bed" size={24} color={colors.primary} />
              <Text style={[styles.statTitle, { color: colors.text }]}>
                Sueño ({getLatestDayData(fitnessData.sleep, (acc, entry) => acc + entry.value, 'sleep').date})
              </Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {(parseFloat(getLatestDayData(fitnessData.sleep, (acc, entry) => acc + entry.value, 'sleep').value) / 3600).toFixed(2)} horas
              </Text>
            </Animated.View>
          ) : (
            <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
              No hay datos de sueño disponibles.
            </Text>
          )}

          {fitnessData.weight.length > 0 ? (
            <Animated.View style={[styles.statCard, animatedCardStyle, { backgroundColor: colors.card }]}>
              <FontAwesome5 name="weight" size={24} color={colors.primary} />
              <Text style={[styles.statTitle, { color: colors.text }]}>
                Peso ({getLatestDayData(fitnessData.weight, (acc, entry) => entry.value, 'weight').date})
              </Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {getLatestDayData(fitnessData.weight, (acc, entry) => entry.value, 'weight').value} kg
              </Text>
            </Animated.View>
          ) : (
            <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
              No hay datos de peso disponibles.
            </Text>
          )}

          {fitnessData.heartRate.length > 0 && fitnessData.sleep.length > 0 ? (
            <Animated.View style={[styles.statCard, animatedCardStyle, { backgroundColor: colors.card }]}>
              <FontAwesome5 name="brain" size={24} color={colors.primary} />
              <Text style={[styles.statTitle, { color: colors.text }]}>
                Nivel de Estrés ({getLatestDayData(fitnessData.heartRate, (acc, entry) => entry.value, 'heartRate').date})
              </Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {calculateStressScore(
                  parseFloat(getLatestDayData(fitnessData.heartRate, (acc, entry) => entry.value, 'heartRate').value),
                  parseFloat(getLatestDayData(fitnessData.sleep, (acc, entry) => acc + entry.value, 'sleep').value) / 3600
                )}%
              </Text>
            </Animated.View>
          ) : (
            <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
              No hay datos para calcular el nivel de estrés.
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
};

// Estilos para la interfaz
const styles = StyleSheet.create({
  container: {
    flex: 1, // Ocupa todo el espacio disponible
  },
  header: {
    flexDirection: 'row', // Alinea elementos horizontalmente
    justifyContent: 'center', // Centra horizontalmente
    alignItems: 'center', // Centra verticalmente
    padding: 16, // Espaciado interno
  },
  headerTitle: {
    fontSize: 24, // Tamaño de fuente del título
    fontWeight: 'bold', // Negrita
    marginLeft: 8, // Margen a la izquierda
  },
  centered: {
    flex: 1, // Ocupa todo el espacio
    justifyContent: 'center', // Centra verticalmente
    alignItems: 'center', // Centra horizontalmente
    padding: 20, // Espaciado interno
  },
  loadingText: {
    fontSize: 16, // Tamaño de fuente para texto de carga
    marginTop: 8, // Margen superior
  },
  statsContainer: {
    padding: 16, // Espaciado interno
    gap: 16, // Espacio entre elementos
  },
  statCard: {
    borderRadius: 12, // Bordes redondeados
    padding: 16, // Espaciado interno
    alignItems: 'center', // Centra contenido
    shadowColor: '#000', // Color de la sombra
    shadowOffset: { width: 0, height: 2 }, // Desplazamiento de la sombra
    shadowOpacity: 0.1, // Opacidad de la sombra
    shadowRadius: 4, // Radio de la sombra
    elevation: 2, // Elevación para Android
  },
  statTitle: {
    fontSize: 18, // Tamaño de fuente del título de estadísticas
    fontWeight: '600', // Peso de fuente
    marginTop: 8, // Margen superior
  },
  statValue: {
    fontSize: 24, // Tamaño de fuente del valor
    fontWeight: 'bold', // Negrita
    marginTop: 4, // Margen superior
  },
  noDataText: {
    fontSize: 16, // Tamaño de fuente para texto de "sin datos"
    textAlign: 'center', // Centrado
    marginTop: 20, // Margen superior
  },
  errorText: {
    fontSize: 16, // Tamaño de fuente para texto de error
    fontWeight: 'bold', // Negrita
    textAlign: 'center', // Centrado
    marginTop: 20, // Margen superior
  },
});

export default HealthScreen;