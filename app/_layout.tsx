import {
  DrawerNavigationProp,
  DrawerContentScrollView,
  DrawerItem,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { useFonts } from "expo-font";
import { Stack, useLocalSearchParams } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import {
  Pressable,
  Alert,
  Platform,
  View,
  Text,
  Linking,
  StyleSheet,
} from "react-native";
import { Feather, FontAwesome, FontAwesome5 } from "@expo/vector-icons";
import { useAuth, AuthProvider } from "@/context/AuthContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { Analytics } from "@vercel/analytics/react";
import Head from "expo-router/head";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
  useNavigation,
} from "@react-navigation/native";

// Definimos los tipos de las rutas para el Drawer
type RootDrawerParamList = {
  index: undefined;
  health: undefined;
  settings: undefined;
  "rutina/[id]": { id: string };
  "rutina/reproducir/[id]": { id: string; routineName?: string };
  "rutina/importar": undefined;
  "rutina/editar/[id]": { id: string };
  "rutina/nueva": undefined;
};

// Componente para el botón de menú en el header
const HeaderLeft = () => {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const { resolvedTheme = "dark" } = useTheme(); // Valor por defecto: dark
  const colors = {
    icon: resolvedTheme === "dark" ? "#e5e7eb" : "#111827",
  };
  return (
    <Pressable
      onPress={() => navigation.toggleDrawer()}
      style={{ marginLeft: 16 }}
    >
      <Feather name="menu" size={24} color={colors.icon} />
    </Pressable>
  );
};

// Componente auxiliar para el título del header de rutina/reproducir/[id]
const RoutinePlayerHeaderTitle = () => {
  const { routineName } = useLocalSearchParams();
  const { resolvedTheme = "dark" } = useTheme(); // Valor por defecto: dark
  const colors = {
    text: resolvedTheme === "dark" ? "#e5e7eb" : "#111827",
  };
  console.log("📥 Received routineName in RoutinePlayerHeaderTitle:", routineName);
  const decodedRoutineName =
    typeof routineName === "string"
      ? decodeURIComponent(routineName)
      : "Rutina";
  console.log("📝 Decoded routineName:", decodedRoutineName);
  return (
    <Text style={{ color: colors.text, fontWeight: "bold", fontSize: 18 }}>
      {decodedRoutineName}
    </Text>
  );
};

// Definimos el componente principal de layout
export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) return null;

  return (
    <AuthProvider>
      <ThemeProvider>
        <View style={styles.rootContainer}>
          <RootContent />
          <Analytics />
          <StatusBar style="light" /> {/* Estilo claro para modo oscuro */}
        </View>
      </ThemeProvider>
    </AuthProvider>
  );
}

// Componente separado para manejar el contenido del layout
function RootContent() {
  const { isThemeLoading } = useTheme();
  const { session } = useAuth();

  // Fondo por defecto mientras el tema carga
  const defaultBackground = isThemeLoading ? "#0f172a" : undefined;

  // Mostrar pantalla de carga si el tema está cargando
  if (isThemeLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: defaultBackground }]}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <>
      <AppNavigator />
      {session && <AppFooter />} {/* Renderizar footer solo si hay sesión y tema cargado */}
    </>
  );
}

// Definimos el componente de navegación
function AppNavigator() {
  const { session, signOut } = useAuth();
  const { resolvedTheme = "dark", isThemeLoading } = useTheme(); // Valor por defecto: dark

  const colors = {
    headerBackground: resolvedTheme === "dark" ? "#0f172a" : "#f9fafb",
    drawerBackground: resolvedTheme === "dark" ? "#1f2937" : "#ffffff",
    drawerActiveTint: "#3b82f6",
    drawerInactiveTint: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
    text: resolvedTheme === "dark" ? "#e5e7eb" : "#111827",
    icon: resolvedTheme === "dark" ? "#e5e7eb" : "#111827",
  };

  const confirmLogout = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (Platform.OS === "web") {
        const confirmed = confirm("¿Estás seguro que querés cerrar sesión?");
        resolve(confirmed);
      } else {
        Alert.alert(
          "Cerrar sesión",
          "¿Estás seguro que querés salir?",
          [
            {
              text: "Cancelar",
              style: "cancel",
              onPress: () => resolve(false),
            },
            {
              text: "Cerrar sesión",
              style: "destructive",
              onPress: () => resolve(true),
            },
          ],
          { cancelable: true }
        );
      }
    });
  };

  const handleLogout = async () => {
    const confirmed = await confirmLogout();
    if (!confirmed) return;

    try {
      await signOut();
    } catch (error) {
      console.error("❌ Error al cerrar sesión:", error);
    }
  };

  if (!session) {
    return (
      <Stack>
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    );
  }

  return (
    <Drawer
      screenOptions={{
        headerStyle: { backgroundColor: colors.headerBackground },
        headerTintColor: colors.text,
        drawerStyle: { backgroundColor: colors.drawerBackground },
        drawerActiveTintColor: colors.drawerActiveTint,
        drawerInactiveTintColor: colors.drawerInactiveTint,
      }}
      drawerContent={(props: DrawerContentComponentProps) => (
        <DrawerContentScrollView
          contentContainerStyle={{ backgroundColor: colors.drawerBackground }}
        >
          <View style={[styles.drawerHeader, { borderBottomColor: resolvedTheme === "dark" ? "#374151" : "#d1d5db" }]}>
            <Text style={[styles.drawerHeaderText, { color: colors.text }]}>Gym Routines</Text>
          </View>
          <DrawerItem
            label="Rutinas"
            labelStyle={{ color: colors.text, fontSize: 16 }}
            icon={({ size }) => (
              <FontAwesome5 name="dumbbell" size={size} color={colors.icon} />
            )}
            onPress={() => props.navigation.navigate("index")}
          />
          <DrawerItem
            label="Salud"
            labelStyle={{ color: colors.text, fontSize: 16 }}
            icon={({ size }) => (
              <FontAwesome5 name="heart" size={size} color={colors.icon} />
            )}
            onPress={() => props.navigation.navigate("health")}
          />
          <DrawerItem
            label="Comunidad"
            labelStyle={{ color: colors.text, fontSize: 16 }}
            icon={({ size }) => (
              <FontAwesome5 name="discord" size={size} color={colors.icon} />
            )}
            onPress={() => Linking.openURL("https://discord.gg/x5J45spu")}
          />
          <DrawerItem
            label="Configuraciones"
            labelStyle={{ color: colors.text, fontSize: 16 }}
            icon={({ size }) => (
              <Feather name="settings" size={size} color={colors.icon} />
            )}
            onPress={() => props.navigation.navigate("settings")}
          />
          <DrawerItem
            label="Cerrar Sesión"
            labelStyle={{ color: colors.text, fontSize: 16 }}
            icon={({ size }) => (
              <Feather name="log-out" size={size} color={colors.icon} />
            )}
            onPress={handleLogout}
          />
        </DrawerContentScrollView>
      )}
    >
      <Drawer.Screen
        name="index"
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FontAwesome5
                name="dumbbell"
                size={20}
                color={colors.icon}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: colors.text, fontWeight: "bold", fontSize: 18 }}>
                Gym Routines
              </Text>
            </View>
          ),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderLeft />,
          headerRight: () => (
            <Pressable onPress={handleLogout} style={{ marginRight: 16 }}>
              <Feather name="log-out" size={24} color={colors.icon} />
            </Pressable>
          ),
        }}
      />
      <Drawer.Screen
        name="health"
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FontAwesome5
                name="heart"
                size={20}
                color={colors.icon}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: colors.text, fontWeight: "bold", fontSize: 18 }}>
                Salud
              </Text>
            </View>
          ),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderLeft />,
          headerRight: () => (
            <Pressable onPress={handleLogout} style={{ marginRight: 16 }}>
              <Feather name="log-out" size={24} color={colors.icon} />
            </Pressable>
          ),
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather
                name="settings"
                size={20}
                color={colors.icon}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: colors.text, fontWeight: "bold", fontSize: 18 }}>
                Configuraciones
              </Text>
            </View>
          ),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderLeft />,
          headerRight: () => (
            <Pressable onPress={handleLogout} style={{ marginRight: 16 }}>
              <Feather name="log-out" size={24} color={colors.icon} />
            </Pressable>
          ),
        }}
      />
      <Drawer.Screen
        name="rutina/nueva"
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FontAwesome5
                name="dumbbell"
                size={20}
                color={colors.icon}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: colors.text, fontWeight: "bold", fontSize: 18 }}>
                Gym Routines
              </Text>
            </View>
          ),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderLeft />,
          headerRight: () => (
            <Pressable onPress={handleLogout} style={{ marginRight: 16 }}>
              <Feather name="log-out" size={24} color={colors.icon} />
            </Pressable>
          ),
        }}
      />
      <Drawer.Screen
        name="rutina/[id]"
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FontAwesome5
                name="dumbbell"
                size={20}
                color={colors.icon}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: colors.text, fontWeight: "bold", fontSize: 18 }}>
                Gym Routines
              </Text>
            </View>
          ),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderLeft />,
          headerRight: () => (
            <Pressable onPress={handleLogout} style={{ marginRight: 16 }}>
              <Feather name="log-out" size={24} color={colors.icon} />
            </Pressable>
          ),
        }}
      />
      <Drawer.Screen
        name="rutina/importar"
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FontAwesome5
                name="dumbbell"
                size={20}
                color={colors.icon}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: colors.text, fontWeight: "bold", fontSize: 18 }}>
                Gym Routines
              </Text>
            </View>
          ),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderLeft />,
          headerRight: () => (
            <Pressable onPress={handleLogout} style={{ marginRight: 16 }}>
              <Feather name="log-out" size={24} color={colors.icon} />
            </Pressable>
          ),
        }}
      />
      <Drawer.Screen
        name="rutina/editar/[id]"
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FontAwesome5
                name="dumbbell"
                size={20}
                color={colors.icon}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: colors.text, fontWeight: "bold", fontSize: 18 }}>
                Gym Routines
              </Text>
            </View>
          ),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderLeft />,
          headerRight: () => (
            <Pressable onPress={handleLogout} style={{ marginRight: 16 }}>
              <Feather name="log-out" size={24} color={colors.icon} />
            </Pressable>
          ),
        }}
      />
      <Drawer.Screen
        name="rutina/reproducir/[id]"
        options={{
          headerTitle: () => <RoutinePlayerHeaderTitle />,
          headerTitleAlign: "center",
          headerLeft: () => <HeaderLeft />,
          headerRight: () => (
            <Pressable onPress={handleLogout} style={{ marginRight: 16 }}>
              <Feather name="log-out" size={24} color={colors.icon} />
            </Pressable>
          ),
        }}
      />
    </Drawer>
  );
}

// Componente del pie de página (footer) de la aplicación
function AppFooter() {
  // Obtenemos el tema actual, usando "dark" como valor por defecto
  const { resolvedTheme = "dark" } = useTheme();

  // Definimos los colores según el tema para mantener consistencia visual
  const colors = {
    background: resolvedTheme === "dark" ? "#0f172a" : "#f1f5f9", // Fondo oscuro o claro
    border: resolvedTheme === "dark" ? "#374151" : "#d1d5db", // Color del borde superior
    text: resolvedTheme === "dark" ? "#9ca3af" : "#4b5563", // Texto legible
    link: "#3b82f6", // Color del enlace
    icon: resolvedTheme === "dark" ? "#e5e7eb" : "#1f2937", // Íconos con contraste
    iconWrapper: resolvedTheme === "dark" ? "#1f2937" : "#e2e8f0", // Fondo del contenedor de íconos
  };

  return (
    // Contenedor principal del footer con fondo y borde dinámicos
    <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      {/* Texto del footer con información de copyright y enlace al desarrollador */}
      <Text style={[styles.footerText, { color: colors.text }]}>
        © {new Date().getFullYear()} Gym Routines — Desarrollado por{" "}
        <Text
          style={[styles.link, { color: colors.link }]}
          onPress={() => Linking.openURL("https://github.com/AlejandroClaure")}
        >
          AlejandroClaure
        </Text>
      </Text>
      {/* Contenedor para los íconos de redes sociales */}
      <View style={styles.socialContainer}>
        {/* Contenedor del ícono de GitHub con sombra */}
        <View style={[styles.socialIconWrapper, { backgroundColor: colors.iconWrapper, shadowColor: resolvedTheme === "dark" ? "#000" : "#6b7280" }]}>
          <Pressable
            onPress={() => Linking.openURL("https://github.com/AlejandroClaure")}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <FontAwesome name="github" size={20} color={colors.icon} />
          </Pressable>
        </View>
        {/* Contenedor del ícono de Discord con sombra */}
        <View style={[styles.socialIconWrapper, { backgroundColor: colors.iconWrapper, shadowColor: resolvedTheme === "dark" ? "#000" : "#6b7280" }]}>
          <Pressable
            onPress={() => Linking.openURL("https://discord.gg/x5J45spu")}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <FontAwesome5 name="discord" size={20} color={colors.icon} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Definimos los estilos para el layout de la aplicación
const styles = StyleSheet.create({
  // Estilo para el contenedor raíz de la aplicación
  rootContainer: {
    flex: 1, // Ocupa todo el espacio disponible
    backgroundColor: "#0f172a", // Fondo oscuro por defecto
  },
  // Estilo para centrar contenido en pantallas de carga
  centered: {
    flex: 1, // Ocupa todo el espacio disponible
    justifyContent: "center", // Centra verticalmente
    alignItems: "center", // Centra horizontalmente
    backgroundColor: "#0f172a", // Fondo oscuro para la pantalla de carga
  },
  // Estilo para el texto de carga
  loadingText: {
    fontSize: 16, // Tamaño de fuente
    color: "#e5e7eb", // Color claro para modo oscuro
  },
  // Estilo para el contenedor del pie de página (footer)
  footer: {
    paddingVertical: 16, // Espaciado vertical
    paddingHorizontal: 24, // Espaciado horizontal
    borderTopWidth: 1, // Borde superior de 1 píxel
    alignItems: "center", // Centra los elementos horizontalmente
    justifyContent: "center", // Centra los elementos verticalmente
  },
  // Estilo para el texto del footer
  footerText: {
    fontSize: 14, // Tamaño de fuente
    marginBottom: 8, // Margen inferior para separar del contenedor de íconos
    textAlign: "center", // Centra el texto
  },
  // Estilo para los enlaces dentro del texto del footer
  link: {
    textDecorationLine: "underline", // Subrayado para indicar que es un enlace
  },
  // Estilo para el contenedor de los íconos de redes sociales
  socialContainer: {
    flexDirection: "row", // Dispone los íconos en fila
    justifyContent: "center", // Centra los íconos horizontalmente
    alignItems: "center", // Centra los íconos verticalmente
    gap: 24, // Espacio entre los íconos
  },
  // Estilo para el contenedor de cada ícono social
  socialIconWrapper: {
    padding: 8, // Espaciado interno
    borderRadius: 12, // Bordes redondeados
    shadowOffset: { width: 0, height: 2 }, // Desplazamiento de la sombra
    shadowOpacity: 0.1, // Opacidad de la sombra
    shadowRadius: 4, // Radio de difuminado de la sombra
    elevation: 3, // Elevación para sombra en Android
  },
  // Estilo para el encabezado del drawer
  drawerHeader: {
    padding: 16, // Espaciado interno
    borderBottomWidth: 1, // Borde inferior de 1 píxel
  },
  // Estilo para el texto del encabezado del drawer
  drawerHeaderText: {
    fontSize: 20, // Tamaño de fuente
    fontWeight: "bold", // Texto en negrita
  },
});