import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>ЕДИНАЯ ПЛАТФОРМА</Text>
        <Text style={styles.title}>Python Method Center</Text>
        <Text style={styles.body}>
          Мобильное приложение подключено к той же системе аккаунтов и данных, что и веб-платформа.
        </Text>

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Состояние сессии</Text>
          <Text style={styles.statusValue}>
            {session ? `Выполнен вход: ${session.user.email ?? session.user.id}` : 'Вход ещё не выполнен'}
          </Text>
        </View>

        {session ? (
          <Pressable style={styles.button} onPress={() => supabase.auth.signOut()}>
            <Text style={styles.buttonText}>Выйти</Text>
          </Pressable>
        ) : (
          <Text style={styles.note}>
            Следующий шаг разработки — общий экран входа, использующий существующий Supabase Auth.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
    padding: 20,
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0B0B0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: '#5A4727',
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#151515',
    gap: 16,
  },
  eyebrow: {
    color: '#C9A85C',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '700',
  },
  title: {
    color: '#F6E7BA',
    fontSize: 30,
    fontWeight: '700',
  },
  body: {
    color: '#E8E0D2',
    fontSize: 16,
    lineHeight: 24,
  },
  statusBox: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#202020',
    gap: 6,
  },
  statusLabel: {
    color: '#AFA89C',
    fontSize: 12,
  },
  statusValue: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  button: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#C9A85C',
  },
  buttonText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
  },
  note: {
    color: '#BDB5A8',
    fontSize: 14,
    lineHeight: 21,
  },
});
