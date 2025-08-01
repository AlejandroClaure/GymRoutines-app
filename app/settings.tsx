import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Checkbox } from "expo-checkbox";
import * as Notifications from "expo-notifications";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";

// Definimos los tipos para los días de la semana
type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

type ThemeOption = "light" | "dark" | "system";

// Lista de días de la semana
const daysOfWeek: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Nombres de los días en español argentino
const dayNames: Record<DayOfWeek, string> = {
  Monday: "Lunes",
  Tuesday: "Martes",
  Wednesday: "Miércoles",
  Thursday: "Jueves",
  Friday: "Viernes",
  Saturday: "Sábado",
  Sunday: "Domingo",
};

// Mapeo de días a números de semana para las notificaciones
const dayToWeekday: Record<DayOfWeek, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

export default function SettingsScreen() {
  const { theme, resolvedTheme, setTheme, isThemeLoading } = useTheme();
  const [selectedDays, setSelectedDays] = useState<Record<DayOfWeek, boolean>>({
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
    Saturday: false,
    Sunday: false,
  });
  const [hour, setHour] = useState<number>(8);
  const [minute, setMinute] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Escalas animadas para las opciones de tema
  const themeOptionScales = useRef<Record<ThemeOption, Animated.Value>>({
    light: new Animated.Value(1),
    dark: new Animated.Value(1),
    system: new Animated.Value(1),
  }).current;

  const isDark = resolvedTheme === "dark";

  // Definimos los colores según el tema
  const colors = {
    background: isDark ? "#0f172a" : "#f9fafb", // Fondo principal
    card: isDark ? "rgba(255,255,255,0.3)" : "#fff", // Fondo de las tarjetas (más opaco en modo oscuro)
    text: isDark ? "#e5e7eb" : "#111827", // Color del texto general
    labelText: isDark ? "#ffffff" : "#111827", // Color de las etiquetas (blanco puro en modo oscuro)
    primary: "#10b981", // Color principal (verde)
    border: isDark ? "#374151" : "#d1d5db", // Color del borde
    buttonText: "#e5e7eb", // Texto de los botones
    checkboxActive: "#10b981", // Checkbox activo
    checkboxInactive: isDark ? "#6b7280" : "#9ca3af", // Checkbox inactivo
    pickerBackground: isDark ? "#374151" : "#f3f4f6", // Fondo del picker (gris más claro en modo oscuro)
    pickerText: isDark ? "#000000ff" : "#1f2937", // Color del texto del picker (blanco puro en modo oscuro)
  };

  // Cargar preferencias al montar el componente
  useEffect(() => {
    async function fetchPreferences() {
      console.log("🔔 Iniciando carga de preferencias...");
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.error("❌ No se pudo obtener el usuario autenticado.");
          Alert.alert("Error", "No se pudo obtener el usuario autenticado.");
          return;
        }
        console.log("👤 Usuario autenticado:", user.id);

        const { data, error } = await supabase
          .from("notification_preferences")
          .select("selected_days, hour, minute")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("❌ Error al consultar preferencias:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          throw error;
        }

        if (data && data.selected_days) {
          console.log("✅ Preferencias cargadas:", data);
          const newSelectedDays: Record<DayOfWeek, boolean> = {
            Monday: false,
            Tuesday: false,
            Wednesday: false,
            Thursday: false,
            Friday: false,
            Saturday: false,
            Sunday: false,
          };
          daysOfWeek.forEach((day) => {
            newSelectedDays[day] = data.selected_days.includes(day);
          });
          setSelectedDays(newSelectedDays);
          setHour(data.hour ?? 8);
          setMinute(data.minute ?? 0);
          console.log("📅 Días seleccionados actualizados:", newSelectedDays);
          console.log("⏰ Hora y minutos actualizados:", { hour: data.hour, minute: data.minute });
        } else {
          console.log("ℹ️ No se encontraron preferencias previas.");
        }
      } catch (error: any) {
        console.error("❌ Error al cargar preferencias:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        Alert.alert("Error", "No se pudieron cargar las preferencias.");
      } finally {
        setLoading(false);
        console.log("🛑 Carga de preferencias finalizada.");
      }
    }
    fetchPreferences();
  }, []);

  // Manejar cambio de día seleccionado
  const handleDayChange = (day: DayOfWeek) => {
    console.log(`📅 Cambiando selección del día: ${day}`);
    setSelectedDays((prev) => {
      const newState = { ...prev, [day]: !prev[day] };
      console.log("📅 Nuevo estado de días seleccionados:", newState);
      return newState;
    });
  };

  // Animación y guardado al presionar el botón
  const handleButtonPress = () => {
    console.log("💾 Botón de guardar presionado.");
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      console.log("💾 Iniciando guardado de preferencias...");
      savePreferences();
    });
  };

  // Manejar cambio de tema con animación
  const handleThemePress = async (themeOption: ThemeOption) => {
    console.log(`🎨 Tema seleccionado: ${themeOption}`);
    Animated.sequence([
      Animated.timing(themeOptionScales[themeOption], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(themeOptionScales[themeOption], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await setTheme(themeOption);
      console.log(`✅ Tema cambiado exitosamente a: ${themeOption}`);
    } catch (error: any) {
      console.error("❌ Error al cambiar tema:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      Alert.alert("Error", "No se pudo cambiar el tema.");
    }
  };

  // Guardar preferencias en Supabase y programar notificaciones
  const savePreferences = async () => {
    console.log("💾 Guardando preferencias...");
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("❌ No se pudo obtener el usuario autenticado.");
        Alert.alert("Error", "No se pudo obtener el usuario autenticado.");
        return;
      }
      console.log("👤 Usuario para guardar preferencias:", user.id);

      const selectedDaysArray = Object.entries(selectedDays)
        .filter(([_, v]) => v)
        .map(([k]) => k) as DayOfWeek[];
      console.log("📅 Días seleccionados para guardar:", selectedDaysArray);

      if (selectedDaysArray.length === 0) {
        console.warn("⚠️ No seleccionaste ningún día.");
        Alert.alert("Error", "Seleccioná al menos un día.");
        return;
      }

      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      console.log("📋 Preferencias existentes:", existing);

      if (existing) {
        const { error } = await supabase
          .from("notification_preferences")
          .update({
            selected_days: selectedDaysArray,
            hour,
            minute,
          })
          .eq("user_id", user.id);
        if (error) {
          console.error("❌ Error al actualizar preferencias:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          throw error;
        }
        console.log("✅ Preferencias actualizadas en Supabase.");
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            selected_days: selectedDaysArray,
            hour,
            minute,
          });
        if (error) {
          console.error("❌ Error al insertar preferencias:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          throw error;
        }
        console.log("✅ Preferencias insertadas en Supabase.");
      }

      console.log("🔔 Programando notificaciones...");
      await scheduleNotifications(selectedDaysArray, hour, minute);
      console.log("✅ Notificaciones programadas exitosamente.");

      Alert.alert("Éxito", "Preferencias guardadas y notificaciones programadas.");
    } catch (error: any) {
      console.error("❌ Error al guardar preferencias:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      Alert.alert(
        "Error",
        "No se pudieron guardar las preferencias o programar las notificaciones."
      );
    } finally {
      setLoading(false);
      console.log("🛑 Guardado de preferencias finalizado.");
    }
  };

  // Programar notificaciones para los días seleccionados
  const scheduleNotifications = async (
    days: DayOfWeek[],
    notificationHour: number,
    notificationMinute: number
  ) => {
    console.log("🔔 Iniciando programación de notificaciones...");
    if (Platform.OS === "web") {
      console.log("ℹ️ Plataforma web detectada, omitiendo notificaciones.");
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("🔔 Notificaciones previas canceladas.");

    for (const day of days) {
      console.log(`🔔 Programando notificación para ${day} a las ${notificationHour}:${notificationMinute}`);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "¡Hora de entrenar! 💪",
          body: "Es el momento de tu entrenamiento. ¡Dale con todo!",
          sound: true,
        },
        trigger: {
          type: "calendar",
          weekday: dayToWeekday[day],
          hour: notificationHour,
          minute: notificationMinute,
          repeats: true,
        } as Notifications.CalendarTriggerInput,
      });
    }
    console.log("✅ Notificaciones programadas para todos los días seleccionados.");
  };

  // Mostrar pantalla de carga si está cargando
  if (loading || isThemeLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={
        isDark
          ? ["#0f172a", "#1e40af", "#334155"] // Gradiente para modo oscuro
          : ["#e0f2fe", "#bae6fd", "#7dd3fc"] // Gradiente para modo claro
      }
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.text }]}>
            Configurá tus Preferencias
          </Text>
        </View>

        {/* Sección de selección de tema */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionIcon, { color: colors.text }]}>🎨</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Tema de la app
            </Text>
          </View>

          <View style={styles.pickerContainer}>
            {(["light", "dark", "system"] as const).map((option: ThemeOption) => (
              <Animated.View
                key={option}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor:
                      theme === option ? colors.primary + "55" : colors.card,
                    borderColor: theme === option ? colors.primary : "transparent",
                    transform: [{ scale: themeOptionScales[option] }],
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => handleThemePress(option)}
                  disabled={loading || isThemeLoading}
                  style={styles.themeOptionTouchable}
                >
                  <Text style={[styles.themeOptionText, { color: colors.text }]}>
                    {option === "light" ? "Claro" : option === "dark" ? "Oscuro" : "Sistema"}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Sección de días para entrenar */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionIcon, { color: colors.text }]}>📅</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Días para entrenar
            </Text>
          </View>

          {daysOfWeek.map((day) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.checkboxContainer,
                {
                  backgroundColor: selectedDays[day]
                    ? colors.primary + "22"
                    : isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.05)",
                },
              ]}
              onPress={() => handleDayChange(day)}
              disabled={loading || isThemeLoading}
            >
              <Checkbox
                value={selectedDays[day]}
                onValueChange={() => handleDayChange(day)}
                color={
                  selectedDays[day]
                    ? colors.checkboxActive
                    : colors.checkboxInactive
                }
                disabled={loading || isThemeLoading}
                style={styles.checkbox}
              />
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                {dayNames[day]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sección de horario de notificación */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionIcon, { color: colors.text }]}>⏰</Text>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Horario de notificación
            </Text>
          </View>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerWrapper}>
              <Text style={[styles.pickerLabel, { color: colors.labelText }]}>Hora</Text>
              <View style={[styles.pickerBox, { backgroundColor: colors.pickerBackground }]}>
                <Picker
                  selectedValue={hour}
                  onValueChange={(value: number) => {
                    console.log(`⏰ Hora seleccionada: ${value}`);
                    setHour(value);
                  }}
                  style={[styles.picker, { color: colors.pickerText }]}
                  itemStyle={{ color: colors.pickerText, fontSize: 16 }} // Forzar color en ítems no seleccionados
                  enabled={!loading && !isThemeLoading}
                  dropdownIconColor={colors.pickerText}
                >
                  {[...Array(24).keys()].map((h) => (
                    <Picker.Item
                      key={h}
                      label={h.toString().padStart(2, "0")}
                      value={h}
                      color={colors.pickerText}
                    />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.pickerWrapper}>
              <Text style={[styles.pickerLabel, { color: colors.labelText }]}>Minutos</Text>
              <View style={[styles.pickerBox, { backgroundColor: colors.pickerBackground }]}>
                <Picker
                  selectedValue={minute}
                  onValueChange={(value: number) => {
                    console.log(`⏰ Minutos seleccionados: ${value}`);
                    setMinute(value);
                  }}
                  style={[styles.picker, { color: colors.pickerText }]}
                  itemStyle={{ color: colors.pickerText, fontSize: 16 }} // Forzar color en ítems no seleccionados
                  enabled={!loading && !isThemeLoading}
                  dropdownIconColor={colors.pickerText}
                >
                  {[0, 15, 30, 45].map((m) => (
                    <Picker.Item
                      key={m}
                      label={m.toString().padStart(2, "0")}
                      value={m}
                      color={colors.pickerText}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* Botón de guardar */}
        <Animated.View
          style={[styles.buttonContainer, { transform: [{ scale: buttonScale }] }]}
        >
          <TouchableOpacity
            style={[
              styles.saveButton,
              loading && styles.saveButtonDisabled,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleButtonPress}
            disabled={loading || isThemeLoading}
          >
            <Text style={[styles.buttonIcon, { color: colors.buttonText }]}>💾</Text>
            <Text style={[styles.saveButtonText, { color: colors.buttonText }]}>
              {loading ? "Guardando..." : "Guardar Preferencias"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, // Contenedor principal
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center", // Centra el contenido para la pantalla de carga
  },
  scrollContent: { padding: 24, paddingBottom: 40 }, // Contenido del ScrollView
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32, // Encabezado principal
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3, // Estilo del título
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6, // Estilo de las tarjetas
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 }, // Encabezado de sección
  sectionIcon: { fontSize: 24, marginRight: 8 }, // Ícono de sección
  sectionTitle: { fontSize: 20, fontWeight: "600" }, // Título de sección
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10, // Contenedor de checkbox
  },
  checkbox: { borderRadius: 6, borderWidth: 1 }, // Estilo del checkbox
  checkboxLabel: { fontSize: 16, fontWeight: "500", marginLeft: 12 }, // Etiqueta del checkbox
  pickerContainer: { flexDirection: "row", justifyContent: "space-between" }, // Contenedor de los pickers
  pickerWrapper: { flex: 1, marginHorizontal: 8 }, // Envoltura de cada picker
  pickerLabel: { fontSize: 16, fontWeight: "500", marginBottom: 8 }, // Etiqueta del picker
  pickerBox: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3, // Caja del picker
  },
  picker: { fontSize: 16 }, // Estilo del picker
  buttonContainer: { marginTop: 30, marginBottom: 20 }, // Contenedor del botón
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6, // Botón de guardar
  },
  saveButtonDisabled: {
    opacity: 0.5, // Estilo del botón deshabilitado
  },
  buttonIcon: { fontSize: 24, marginRight: 8 }, // Ícono del botón
  saveButtonText: { fontSize: 18, fontWeight: "600" }, // Texto del botón
  themeOption: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 6,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1, // Opción de tema
  },
  themeOptionTouchable: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 12, // Área tocable de la opción de tema
  },
  themeOptionText: { fontSize: 16, fontWeight: "500" }, // Texto de la opción de tema
});