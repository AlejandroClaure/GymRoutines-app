import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

type SessionType = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];

interface AuthContextType {
  session: SessionType | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<SessionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (isLoading) return; // Previene múltiples clics

    setIsLoading(true);

    try {
      const redirectTo = AuthSession.makeRedirectUri();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });

      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type !== 'success') {
        console.warn('Inicio de sesión cancelado o fallido');
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error('Error al iniciar sesión con Google:', err.message);
      } else {
        console.error('Error desconocido al iniciar sesión con Google:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
  console.log("🧨 Ejecutando signOut()");
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("❌ Error al cerrar sesión:", error.message);
  } else {
    setSession(null);
    console.log("✅ signOut completo, navegando a /login");
    router.replace('/login');
  }
};

  return (
    <AuthContext.Provider value={{ session, isLoading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
