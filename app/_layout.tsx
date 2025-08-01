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
import { ThemeProvider, useTheme } from "@/context/ThemeContext"; // Import custom ThemeProvider and useTheme
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
  const { resolvedTheme } = useTheme();
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
  const { resolvedTheme } = useTheme();
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
        <AppNavigator />
        <AppFooter />
        <Analytics />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

// Definimos el componente de navegación
function AppNavigator() {
  const { session, signOut } = useAuth();
  const { resolvedTheme, isThemeLoading } = useTheme();

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

  if (isThemeLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.headerBackground }]}>
        <Text style={{ color: colors.text }}>Cargando...</Text>
      </View>
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

function AppFooter() {
  const { resolvedTheme } = useTheme();
  const colors = {
    background: resolvedTheme === "dark" ? "#0f172a" : "#f9fafb",
    border: resolvedTheme === "dark" ? "#374151" : "#d1d5db",
    text: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
    link: "#3b82f6",
    icon: resolvedTheme === "dark" ? "#e5e7eb" : "#111827",
    iconWrapper: resolvedTheme === "dark" ? "#1f2937" : "#e5e7eb",
  };

  return (
    <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      <Text style={[styles.footerText, { color: colors.text }]}>
        © {new Date().getFullYear()} Gym Routines — Desarrollado por{" "}
        <Text
          style={[styles.link, { color: colors.link }]}
          onPress={() => Linking.openURL("https://github.com/AlejandroClaure")}
        >
          AlejandroClaure
        </Text>
      </Text>
      <View style={styles.socialContainer}>
        <View style={[styles.socialIconWrapper, { backgroundColor: colors.iconWrapper }]}>
          <Pressable
            onPress={() => Linking.openURL("https://github.com/AlejandroClaure")}
          >
            <FontAwesome name="github" size={20} color={colors.icon} />
          </Pressable>
        </View>
        <View style={[styles.socialIconWrapper, { backgroundColor: colors.iconWrapper }]}>
          <Pressable
            onPress={() => Linking.openURL("https://discord.gg/x5J45spu")}
          >
            <FontAwesome5 name="discord" size={20} color={colors.icon} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  link: {
    textDecorationLine: "underline",
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
  },
  socialIconWrapper: {
    padding: 8,
    borderRadius: 12,
  },
  drawerHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  drawerHeaderText: {
    fontSize: 20,
    fontWeight: "bold",
  },
});