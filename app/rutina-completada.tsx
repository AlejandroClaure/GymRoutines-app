import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";

// Componente para la pantalla de rutina completada
export default function RoutineCompleteScreen() {
  const router = useRouter();

  // Estado para el temporizador de redirección
  const [countdown, setCountdown] = useState(10);

  // Función para redirigir al menú principal
  const goToHome = useCallback(() => {
    console.log("🏠 Redirigiendo al menú principal desde RoutineCompleteScreen");
    setTimeout(() => {
      router.push("/");
    }, 0);
  }, [router]);

  // Efecto para manejar el temporizador de redirección
  useEffect(() => {
    console.log("🚀 Montando RoutineCompleteScreen");
    const timer = setInterval(() => {
      setCountdown((prev) => {
        console.log("⏳ Actualizando countdown:", prev);
        if (prev <= 1) {
          clearInterval(timer);
          goToHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      console.log("🧹 Desmontando RoutineCompleteScreen");
    };
  }, [goToHome]);

  // Renderizado de la pantalla
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏁 ¡Rutina Completada!</Text>
      <Text style={styles.subtitle}>
        Redirigiendo al menú principal en {countdown} segundos...
      </Text>
      <Pressable onPress={goToHome} style={styles.button}>
        <Text style={styles.buttonText}>Volver al Inicio</Text>
      </Pressable>
    </View>
  );
}

// Estilos para el componente
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111827",
    padding: 16,
  },
  title: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: "#93c5fd",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});