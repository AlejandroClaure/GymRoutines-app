// context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";
import { useAuth } from "./AuthContext";
import { upsertThemePreference, getThemePreference } from "@/lib/supabaseService";

// Tipos válidos para el tema
type ThemeOption = "light" | "dark" | "system";

interface ThemeContextType {
  theme: ThemeOption;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeOption) => Promise<void>;
  isThemeLoading: boolean; // Añadir esta propiedad
}

// Crear contexto con valores iniciales
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Proveedor del contexto
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  const [theme, setThemeState] = useState<ThemeOption>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    Appearance.getColorScheme() ?? "light"
  );
  const [isThemeLoading, setIsThemeLoading] = useState(true); // Añadir estado para isThemeLoading

  // Cargar la preferencia de tema desde Supabase
  useEffect(() => {
    const loadThemePreference = async () => {
      if (!session?.user.id) {
        console.log("No hay usuario autenticado, usando tema por defecto: system");
        setIsThemeLoading(false); // Marcar carga como completa
        return;
      }
      try {
        console.log("Cargando preferencia de tema para usuario:", session.user.id);
        const stored = await getThemePreference(session.user.id);
        if (stored === "light" || stored === "dark" || stored === "system") {
          console.log("Tema cargado desde Supabase:", stored);
          setThemeState(stored);
        } else {
          console.log("No se encontró tema válido, usando por defecto: system");
        }
      } catch (error) {
        console.error("Error al cargar la preferencia de tema:", error);
      } finally {
        setIsThemeLoading(false); // Marcar carga como completa
      }
    };
    loadThemePreference();
  }, [session?.user.id]);

  // Actualizar el tema resuelto según el tema seleccionado o el sistema
  useEffect(() => {
    const updateResolvedTheme = () => {
      const systemColorScheme = Appearance.getColorScheme() ?? "light";
      console.log("Actualizando tema resuelto. Tema seleccionado:", theme, "Esquema del sistema:", systemColorScheme);
      setResolvedTheme(theme === "system" ? systemColorScheme : theme);
    };

    updateResolvedTheme();
    const listener = Appearance.addChangeListener(updateResolvedTheme);
    return () => listener.remove();
  }, [theme]);

  // Cambiar y guardar el tema
  const setTheme = async (newTheme: ThemeOption) => {
    console.log("Cambiando tema a:", newTheme);
    try {
      setThemeState(newTheme); // Actualizar el estado local inmediatamente
      if (session?.user.id) {
        console.log("Guardando tema en Supabase para usuario:", session.user.id);
        await upsertThemePreference(session.user.id, newTheme);
        console.log("Tema guardado exitosamente en Supabase.");
      } else {
        console.warn("No hay usuario autenticado para guardar el tema.");
      }
    } catch (error) {
      console.error("Error al guardar el tema en Supabase:", error);
      throw error; // Lanzar error para que el componente consumidor lo maneje
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, isThemeLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook para usar el contexto
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de un ThemeProvider");
  }
  return context;
};