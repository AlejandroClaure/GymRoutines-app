import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // Cliente Supabase ya inicializado
import * as AuthSession from "expo-auth-session"; // Manejo de sesiones de autenticación (OAuth)
import * as WebBrowser from "expo-web-browser";   // Para abrir la pantalla de autenticación externa
import { router } from "expo-router";             // Navegación entre pantallas
import { Alert } from "react-native";             // Para mostrar alertas al usuario

// Tipo de sesión basado en el resultado del método getSession de Supabase
type SessionType = Awaited<
  ReturnType<typeof supabase.auth.getSession>
>["data"]["session"];

// Definimos la forma del contexto de autenticación
interface AuthContextType {
  session: SessionType | null;                 // Sesión actual (null si no hay sesión)
  isLoading: boolean;                          // Estado de carga mientras se autentica
  signInWithGoogle: () => Promise<void>;       // Función para iniciar sesión con Google
  signOut: () => Promise<void>;                // Función para cerrar sesión
  getAccessToken: () => Promise<string | null>;// Devuelve el token de acceso a la API de Google Fit
}

// Creamos el contexto con valores iniciales vacíos
const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  getAccessToken: async () => null,
});

// Componente proveedor del contexto
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<SessionType | null>(null); // Estado para la sesión
  const [isLoading, setIsLoading] = useState(false);                // Estado de carga

  useEffect(() => {
  // Completa la sesión de autenticación si se usó WebBrowser (evita sesiones colgadas)
  WebBrowser.maybeCompleteAuthSession();

  // Función asincrónica para inicializar o refrescar sesión
  const initSession = async () => {
    // Intentamos obtener la sesión actual almacenada localmente
    const { data, error } = await supabase.auth.getSession();
    let currentSession = data.session;

    // Si no hay token del proveedor (Google), puede estar vencido o faltar
    if (!currentSession?.provider_token) {
      console.log("🔄 No hay provider_token, intentando refreshSession...");

      // Intentamos refrescar la sesión usando el token de refresh de Supabase
      const refreshResult = await supabase.auth.refreshSession();

      if (refreshResult.error) {
        // Si hay error al refrescar, mostramos advertencia y mantenemos sesión null
        console.warn("⚠️ Error al refrescar la sesión:", refreshResult.error.message);
      } else {
        // Si se pudo refrescar, actualizamos la sesión con la nueva
        currentSession = refreshResult.data.session;
        console.log("✅ Sesión refrescada exitosamente.");
      }
    }

    // Si luego de refrescar seguimos sin provider_token, cerramos sesión automáticamente
    if (!currentSession?.provider_token) {
      console.warn("❌ No se pudo obtener un provider_token válido. Cerrando sesión...");
      await supabase.auth.signOut();
      setSession(null);
    } else {
      // Si todo está bien, actualizamos el estado con la sesión activa
      setSession(currentSession);
    }
  };

  // Ejecutamos la función al montar el componente
  initSession();

  // Suscripción a cambios de sesión (login/logout/refresh automático de Supabase)
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
  });

  // Limpieza al desmontar: quitamos la suscripción
  return () => listener.subscription.unsubscribe();
}, []);


  // Función para iniciar sesión con Google (OAuth)
  const signInWithGoogle = async () => {
    if (isLoading) return; // Evitamos múltiples inicios simultáneos
    setIsLoading(true);

    try {
      // Definimos la URL de redirección (usamos variable de entorno o fallback local)
      const redirectTo = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:8081';

      // Iniciamos el flujo de autenticación con Google usando Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          scopes: [
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/fitness.activity.read",
            "https://www.googleapis.com/auth/fitness.body.read",
            "https://www.googleapis.com/auth/fitness.heart_rate.read",
            "https://www.googleapis.com/auth/fitness.sleep.read",
          ].join(" "),
        },
      });

      // Si hay error, lanzamos la excepción
      if (error) throw error;

      // Abrimos la URL de autenticación usando el navegador
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      // Verificamos si el resultado fue exitoso
      if (result.type !== "success") {
        console.warn("Inicio de sesión cancelado o fallido");
        Alert.alert("Error", "Inicio de sesión cancelado o fallido.");
      } else {
        // Revalidamos la sesión para acceder al token
        const { data: sessionData } = await supabase.auth.getSession();

        // Si no se otorgó el token de Google Fit, informamos al usuario
        if (!sessionData.session?.provider_token) {
          Alert.alert("Error", "No se concedieron los permisos para Google Fit.");
        } else {
          // Redirigimos a la pantalla principal
          router.replace("/");
        }
      }
    } catch (err) {
      // Manejo de errores (distinguiendo si es Error de JS o genérico)
      if (err instanceof Error) {
        console.error("Error al iniciar sesión con Google:", err.message);
        Alert.alert("Error", `Error al iniciar sesión: ${err.message}`);
      } else {
        console.error("Error desconocido al iniciar sesión con Google:", err);
        Alert.alert("Error", "Error desconocido al iniciar sesión.");
      }
    } finally {
      // Quitamos el estado de carga
      setIsLoading(false);
    }
  };

  // Función para cerrar sesión
  const signOut = async () => {
    console.log("🧨 Ejecutando signOut()");
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("❌ Error al cerrar sesión:", error.message);
      Alert.alert("Error", `Error al cerrar sesión: ${error.message}`);
    } else {
      setSession(null); // Borramos la sesión local
      console.log("✅ signOut completo, navegando a /login");
      router.replace("/login"); // Redirigimos al login
    }
  };

  // Función que devuelve el token de acceso (Google Fit)
  const getAccessToken = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.provider_token) {
      console.error("Error al obtener el token de acceso:", error?.message);
      Alert.alert("Error", "No se pudo obtener el token de acceso para Google Fit.");
      return null;
    }

    // Retornamos el token para usar con Google Fit API
    return data.session.provider_token;
  };

  // Proveemos el contexto con todos los valores y funciones necesarias
  return (
    <AuthContext.Provider
      value={{ session, isLoading, signInWithGoogle, signOut, getAccessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para consumir el contexto
export const useAuth = () => useContext(AuthContext);
