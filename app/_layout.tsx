import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Alert, Platform, useColorScheme as useNativeColorScheme } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth, AuthProvider } from '@/context/AuthContext';

export default function RootLayout() {
  const colorScheme = useNativeColorScheme();

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) return null;

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppNavigator />
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthProvider>
  );
}

function AppNavigator() {
  const { session, signOut } = useAuth();

  console.log("🟢 Estado de sesión en AppNavigator:", session);

  if (!session) return <Slot />;

  const confirmLogout = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (Platform.OS === "web") {
        const confirmed = confirm("¿Estás seguro que deseas cerrar sesión?");
        resolve(confirmed);
      } else {
        Alert.alert(
          "Cerrar sesión",
          "¿Estás seguro que deseas salir?",
          [
            { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
            { text: "Cerrar sesión", style: "destructive", onPress: () => resolve(true) },
          ],
          { cancelable: true }
        );
      }
    });
  };

  const handleLogout = async () => {
    console.log("👆 Botón de logout presionado. Mostrando confirmación...");
    const confirmed = await confirmLogout();
    if (!confirmed) {
      console.log("🚫 Logout cancelado por el usuario.");
      return;
    }

    try {
      console.log("🔒 Cerrando sesión...");
      await signOut();
      console.log("✅ Sesión cerrada correctamente");
    } catch (error) {
      console.error("❌ Error en signOut:", error);
    }
  };

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Mis Rutinas',
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#fff',
          headerTitleStyle: { color: '#fff' },
          headerRight: () => (
            <Pressable onPress={handleLogout} style={{ marginRight: 16 }}>
              <Feather name="log-out" size={24} color="#fff" />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="rutina/nueva"
        options={{
          title: 'Crear Rutina',
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#fff',
          headerTitleStyle: { color: '#fff' },
        }}
      />
      <Stack.Screen
        name="rutina/[id]"
        options={{
          title: 'Rutina',
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#fff',
          headerTitleStyle: { color: '#fff' },
        }}
      />
      <Stack.Screen
        name="rutina/editar/[id]"
        options={{
          title: 'Editar Rutina',
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#fff',
          headerTitleStyle: { color: '#fff' },
        }}
      />
    </Stack>
  );
}
