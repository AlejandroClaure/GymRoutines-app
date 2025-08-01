import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { fetchFitnessData, saveFitnessData } from '@/utils/googleFit';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

// Definimos el tipo para los datos de fitness
type FitnessData = {
  calories: any[];
  heartRate: any[];
  sleep: any[];
  weight: any[];
};

// Definimos el componente principal de la pantalla de Salud
const HealthScreen = () => {
  const { session, getAccessToken } = useAuth();
  const { resolvedTheme, isThemeLoading } = useTheme();

  // Estado para almacenar los datos de fitness de Google Fit
  const [fitnessData, setFitnessData] = useState<FitnessData>({
    calories: [],
    heartRate: [],
    sleep: [],
    weight: [],
  });

  // Estado para indicar si se están cargando los datos
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

  // Definir colores según el tema
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
    if (!Array.isArray(data)) {
      console.warn(`⚠️ ${dataType} no es un array:`, data);
      return { date: 'Sin datos', value: 0 };
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dailyData = data.filter((entry) => {
      if (!entry || !entry.startTime || !entry.value) {
        console.warn(`⚠️ Dato inválido en ${dataType}:`, entry);
        return false;
      }
      const entryDate = new Date(entry.startTime).toISOString().split('T')[0];
      return entryDate === todayStr;
    });

    if (dailyData.length === 0) {
      console.log(`⚠️ No hay datos para ${dataType} en ${todayStr}`);
      return { date: todayStr, value: 0 };
    }

    const value = dailyData.reduce((sum, entry) => sum + aggregator(0, entry), 0);
    return { date: todayStr, value: value.toFixed(2) };
  };

  // Efecto para obtener datos de Google Fit
  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.id) {
        console.log('❌ No hay sesión de usuario:', session);
        setError('Por favor, iniciá sesión para ver tus datos de salud.');
        return;
      }

      console.log('🧨 Iniciando carga de datos de Google Fit...');
      setIsFetching(true);
      setError(null);

      try {
        const accessToken = await getAccessToken();
        console.log('🔑 Access Token:', accessToken ? 'Obtenido' : 'No disponible');
        if (!accessToken) {
          console.error('❌ No se pudo obtener el accessToken');
          setError('No se pudo obtener el token de acceso para Google Fit.');
          return;
        }

        const today = new Date();
        const startTime = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endTime = new Date(today.setHours(23, 59, 59, 999)).toISOString();
        console.log('📅 Rango de fechas (hoy):', startTime, 'a', endTime);

        const calories = await fetchFitnessData(accessToken, startTime, endTime, 'com.google.calories.expended');
        console.log('🔥 Calorías:', calories);
        const heartRate = await fetchFitnessData(accessToken, startTime, endTime, 'com.google.heart_rate.bpm');
        console.log('💓 Frecuencia Cardíaca:', heartRate);
        const sleep = await fetchFitnessData(accessToken, startTime, endTime, 'com.google.sleep.segment');
        console.log('😴 Sueño:', sleep);
        const weight = await fetchFitnessData(accessToken, startTime, endTime, 'com.google.weight');
        console.log('⚖️ Peso:', weight);

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

        const validatedData: FitnessData = {
          calories: validateData(calories, 'calories'),
          heartRate: validateData(heartRate, 'heartRate'),
          sleep: validateData(sleep, 'sleep'),
          weight: validateData(weight, 'weight'),
        };

        setFitnessData(validatedData);
        console.log('✅ Datos de fitness actualizados:', validatedData);

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

        cardOpacity.value = withTiming(1, { duration: 600 });
        cardScale.value = withSpring(1, { damping: 12, stiffness: 120 });
      } catch (err: any) {
        console.error('❌ Error al obtener datos de Google Fit:', {
          message: err.message,
          details: err.details,
          code: err.code,
        });
        setError('Error al cargar los datos de salud. Verificá tu conexión o permisos.');
        Alert.alert('Error', 'No se pudieron cargar los datos de salud.');
      } finally {
        setIsFetching(false);
        console.log('🛑 Carga de datos finalizada');
      }
    };

    fetchData();
  }, [session, cardOpacity, cardScale, getAccessToken]);

  // Función para calcular el nivel de estrés
  const calculateStressScore = (heartRate: number, sleepHours: number) => {
    const heartRateScore = Math.min((heartRate - 60) / 20, 1);
    const sleepScore = Math.min((8 - sleepHours) / 2, 1);
    const stressScore = (heartRateScore * 0.6 + sleepScore * 0.4) * 100;
    return Math.round(stressScore);
  };

  // Renderizado del componente
  if (isThemeLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session?.user?.id) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Por favor, iniciá sesión para ver tus datos de salud.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <FontAwesome5 name="heart" size={28} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mis Estadísticas de Salud</Text>
      </View>

      {isFetching ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Cargando datos...</Text>
        </View>
      ) : (
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 8,
  },
  statsContainer: {
    padding: 16,
    gap: 16,
  },
  statCard: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  noDataText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default HealthScreen;