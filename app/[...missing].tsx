// app/[...missing].tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function CatchAllNotFound() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚫 Página no encontrada</Text>
      <Pressable onPress={() => router.replace("/")}>
        <Text style={styles.link}>Volver al inicio</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#fff",
  },
  title: {
    fontSize: 24, fontWeight: "bold", marginBottom: 16, color: "#000",
  },
  link: {
    fontSize: 18, color: "#3b82f6",
  },
});
