// context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";
import { useAuth } from "./AuthContext";
import { upsertThemePreference, getThemePreference, ThemeOption } from "@/lib/supabaseService";

interface ThemeContextType {
  theme: ThemeOption;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeOption) => Promise<void>;
  isThemeLoading: boolean;
}

// Crear contexto con valores iniciales
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Proveedor del contexto
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  const [theme, setThemeState] = useState<ThemeOption>("dark"); // Tema por defecto: dark
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark"); // Tema resuelto por defecto: dark
  const [isThemeLoading, setIsThemeLoading] = useState(true);

  // Cargar la preferencia de tema desde Supabase
  useEffect(() => {
    const loadThemePreference = async () => {
      if (!session?.user.id) {
        console.log("No hay usuario autenticado, usando tema por defecto: dark");
        setIsThemeLoading(false);
        return;
      }
      try {
        console.log("Cargando preferencia de tema para usuario:", session.user.id);
        const stored = await getThemePreference(session.user.id);
        if (stored) {
          console.log("Tema cargado desde Supabase:", stored);
          setThemeState(stored);
        } else {
          console.log("No se encontró tema válido, usando por defecto: dark");
        }
      } catch (error: any) {
        console.error("Error al cargar la preferencia de tema:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      } finally {
        setIsThemeLoading(false);
      }
    };
    loadThemePreference();
  }, [session?.user.id]);

  // Actualizar el tema resuelto según el tema seleccionado
  useEffect(() => {
    const updateResolvedTheme = () => {
      const systemColorScheme = Appearance.getColorScheme() ?? "dark";
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
        const success = await upsertThemePreference(session.user.id, newTheme);
        if (!success) {
          throw new Error("No se pudo guardar el tema en Supabase");
        }
        console.log("✅ Tema guardado exitosamente en Supabase.");
      } else {
        console.warn("No hay usuario autenticado para guardar el tema.");
      }
    } catch (error: any) {
      console.error("❌ Error al guardar el tema en Supabase:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
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