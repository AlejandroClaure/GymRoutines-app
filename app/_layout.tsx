import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  Alert,
  Platform,
  useColorScheme as useNativeColorScheme,
  View,
  Text,
  Linking,
  StyleSheet,
} from 'react-native';
import { Feather, FontAwesome, FontAwesome5  } from '@expo/vector-icons';
import { useAuth, AuthProvider } from '@/context/AuthContext';
import { Analytics } from "@vercel/analytics/react";
import Head from 'expo-router/head';

export default function RootLayout() {
  const colorScheme = useNativeColorScheme();

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) return null;

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Head>
          <title>Gym Routines</title>
          <link rel="icon" href="/favicon.png" />
        </Head>
        <AppNavigator />
        <AppFooter />
        <Analytics />
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthProvider>
  );
}

function AppNavigator() {
  const { session, signOut } = useAuth();

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
    const confirmed = await confirmLogout();
    if (!confirmed) return;

    try {
      await signOut();
    } catch (error) {
      console.error("❌ Error al cerrar sesión:", error);
    }
  };

  if (!session) return <Slot />;

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome5 name="dumbbell" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Gym Routines</Text>
            </View>
          ),
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#fff',
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
        }}
      />
      <Stack.Screen
        name="rutina/[id]"
        options={{
          title: 'Rutina',
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="rutina/editar/[id]"
        options={{
          title: 'Editar Rutina',
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#fff',
        }}
      />
    </Stack>
  );
}

function AppFooter() {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        © {new Date().getFullYear()} Gym Routines — Dev by{' '}
        <Text
          style={styles.link}
          onPress={() => Linking.openURL("https://github.com/AlejandroClaure")}
        >
          AlejandroClaure
        </Text>
      </Text>
      <View style={styles.socialIcons}>
        <Pressable onPress={() => Linking.openURL("https://github.com/AlejandroClaure")}>
          <FontAwesome name="github" size={20} color="#fff" />
        </Pressable>
        {/*
        <Pressable onPress={() => Linking.openURL("https://www.instagram.com/")}>
          <FontAwesome name="instagram" size={20} color="#fff" />
        </Pressable>
        <Pressable onPress={() => Linking.openURL("https://www.linkedin.com/in/")}>
          <FontAwesome name="linkedin" size={20} color="#fff" />
        </Pressable>
        */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  link: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
});
