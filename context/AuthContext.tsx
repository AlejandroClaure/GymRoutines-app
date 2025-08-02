import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // Cliente Supabase ya inicializado para autenticación
import * as AuthSession from "expo-auth-session"; // Biblioteca para manejar sesiones de autenticación OAuth
import * as WebBrowser from "expo-web-browser"; // Para abrir el navegador para autenticación externa
import { router } from "expo-router"; // Sistema de navegación para redirigir entre pantallas
import { Alert } from "react-native"; // Componente para mostrar alertas al usuario

// Definimos el tipo para la sesión basado en el resultado de getSession de Supabase
type SessionType = Awaited<
  ReturnType<typeof supabase.auth.getSession>
>["data"]["session"];

// Definimos la interfaz del contexto de autenticación
interface AuthContextType {
  session: SessionType | null; // Sesión actual del usuario (null si no está autenticado)
  isLoading: boolean; // Indica si se está procesando una operación de autenticación
  signInWithGoogle: () => Promise<void>; // Función para iniciar sesión con Google
  signOut: () => Promise<void>; // Función para cerrar sesión
  getAccessToken: () => Promise<string | null>; // Obtiene el token de acceso para Google Fit
}

// Creamos el contexto de autenticación con valores iniciales vacíos
const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  getAccessToken: async () => null,
});

// Proveedor del contexto de autenticación
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Estado para almacenar la sesión actual
  const [session, setSession] = useState<SessionType | null>(null);
  // Estado para indicar si se está cargando una operación de autenticación
  const [isLoading, setIsLoading] = useState(false);

  // Efecto para inicializar y mantener actualizada la sesión
  useEffect(() => {
    // Completa cualquier sesión de autenticación pendiente (por ejemplo, tras redirección OAuth)
    WebBrowser.maybeCompleteAuthSession();

    // Función para inicializar o refrescar la sesión
    const initSession = async () => {
      // Obtenemos la sesión actual almacenada localmente
      const { data, error } = await supabase.auth.getSession();
      let currentSession = data.session;

      // Si hay un error al obtener la sesión, mostramos un mensaje
      if (error) {
        console.warn("⚠️ Error al obtener la sesión:", error.message);
      }

      // Si no hay un provider_token (necesario para Google Fit), intentamos refrescar la sesión
      if (!currentSession?.provider_token) {
        console.log("🔄 No hay provider_token, intentando refreshSession...");
        const refreshResult = await supabase.auth.refreshSession();

        if (refreshResult.error) {
          // Si falla el refresco, mostramos un mensaje de advertencia
          console.warn("⚠️ Error al refrescar la sesión:", refreshResult.error.message);
        } else {
          // Si el refresco es exitoso, actualizamos la sesión
          currentSession = refreshResult.data.session;
          console.log("✅ Sesión refrescada exitosamente.");
        }
      }

      // Si después de intentar refrescar no hay provider_token, cerramos la sesión
      if (!currentSession?.provider_token) {
        console.warn("❌ No se pudo obtener un provider_token válido. Cerrando sesión...");
        await supabase.auth.signOut();
        setSession(null);
      } else {
        // Si la sesión es válida, actualizamos el estado
        setSession(currentSession);
      }
    };

    // Ejecutamos la inicialización de la sesión
    initSession();

    // Suscribimos un listener para detectar cambios en el estado de autenticación
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session); // Actualizamos el estado con la nueva sesión
      if (!session) {
        console.log("🚪 Sesión cerrada, redirigiendo a /login");
        router.replace("/login"); // Redirigimos al login si no hay sesión
      }
    });

    // Limpieza: desuscribimos el listener al desmontar el componente
    return () => listener.subscription.unsubscribe();
  }, []);

  // Función para iniciar sesión con Google usando OAuth
  const signInWithGoogle = async () => {
    if (isLoading) return; // Evitamos múltiples inicios de sesión simultáneos
    setIsLoading(true); // Indicamos que está en curso una operación

    try {
      // Definimos la URL de redirección para OAuth || 'http://localhost:8081'
      const redirectTo = process.env.EXPO_PUBLIC_BASE_URL ;

      // Iniciamos el flujo de autenticación con Google a través de Supabase
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
          ].join(" "), // Scopes necesarios para Google Fit
        },
      });

      // Si hay un error en la autenticación, lo lanzamos
      if (error) throw error;

      // Abrimos el navegador para que el usuario inicie sesión
      const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo);

      // Verificamos si la autenticación fue exitosa
      if (result.type !== "success") {
        console.warn("⚠️ Inicio de sesión cancelado o fallido");
        Alert.alert("Error", "Inicio de sesión cancelado o fallido.");
      } else {
        // Revalidamos la sesión para obtener el provider_token
        const { data: sessionData } = await supabase.auth.getSession();

        // Si no se obtuvo el provider_token, informamos al usuario
        if (!sessionData.session?.provider_token) {
          Alert.alert("Error", "No se concedieron los permisos para Google Fit.");
        } else {
          // Redirigimos a la pantalla principal
          router.replace("/");
        }
      }
    } catch (err) {
      // Manejamos errores de autenticación
      if (err instanceof Error) {
        console.error("❌ Error al iniciar sesión con Google:", err.message);
        Alert.alert("Error", `Error al iniciar sesión: ${err.message}`);
      } else {
        console.error("❌ Error desconocido al iniciar sesión con Google:", err);
        Alert.alert("Error", "Error desconocido al iniciar sesión.");
      }
    } finally {
      setIsLoading(false); // Finalizamos el estado de carga
    }
  };

  // Función para cerrar sesión
  const signOut = async () => {
    console.log("🧨 Ejecutando signOut()");
    const { error } = await supabase.auth.signOut();

    if (error) {
      // Si hay un error al cerrar sesión, mostramos una alerta
      console.error("❌ Error al cerrar sesión:", error.message);
      Alert.alert("Error", `Error al cerrar sesión: ${error.message}`);
    } else {
      // Cerramos la sesión localmente y redirigimos al login
      setSession(null);
      console.log("✅ signOut completo, navegando a /login");
      router.replace("/login");
    }
  };

  // Función para obtener el token de acceso de Google Fit
  const getAccessToken = async (): Promise<string | null> => {
    // Obtenemos la sesión actual
    const { data, error } = await supabase.auth.getSession();
    
    // Si hay un error o no hay sesión, intentamos refrescar
    if (error || !data.session) {
      console.log("🔄 No hay sesión, intentando refrescar...");
      const refreshResult = await supabase.auth.refreshSession();
      if (refreshResult.error || !refreshResult.data.session?.provider_token) {
        // Si falla el refresco o no hay provider_token, cerramos la sesión
        console.error("❌ Error al refrescar el token:", refreshResult.error?.message);
        Alert.alert("Error", "Sesión expirada. Por favor, iniciá sesión nuevamente.");
        await supabase.auth.signOut();
        router.replace("/login");
        return null;
      }
      // Retornamos el provider_token de la sesión refrescada
      return refreshResult.data.session.provider_token;
    }

    // Si no hay provider_token en la sesión actual, intentamos refrescar
    if (!data.session.provider_token) {
      console.log("🔄 No hay provider_token, intentando refrescar...");
      const refreshResult = await supabase.auth.refreshSession();
      if (refreshResult.error || !refreshResult.data.session?.provider_token) {
        // Si falla el refresco o no hay provider_token, cerramos la sesión
        console.error("❌ Error al refrescar el token:", refreshResult.error?.message);
        Alert.alert("Error", "Sesión expirada. Por favor, iniciá sesión nuevamente.");
        await supabase.auth.signOut();
        router.replace("/login");
        return null;
      }
      // Retornamos el provider_token de la sesión refrescada
      return refreshResult.data.session.provider_token;
    }

    // Retornamos el provider_token de la sesión actual
    return data.session.provider_token;
  };

  // Proveemos el contexto con las funciones y estados necesarios
  return (
    <AuthContext.Provider
      value={{ session, isLoading, signInWithGoogle, signOut, getAccessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para consumir el contexto de autenticación
export const useAuth = () => useContext(AuthContext);