import { Redirect, router } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function CabinetScreen() {
  const { session, loading } = useAuth();

  if (!loading && !session) return <Redirect href="/login" />;

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>ЕДИНАЯ ПЛАТФОРМА</Text>
        <Text style={styles.title}>Мой кабинет</Text>
        <Text style={styles.body}>Вход выполнен через тот же аккаунт, который работает на веб-сайте.</Text>
        <View style={styles.status}>
          <Text style={styles.label}>Аккаунт</Text>
          <Text style={styles.value}>{session?.user.email ?? 'Загрузка…'}</Text>
        </View>
        <Text style={styles.note}>Следующий модуль подключит реальный профиль, кейс, документы и историю из общей базы.</Text>
        <Pressable style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Выйти</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0B0B0B', padding: 20, justifyContent: 'center' },
  card: { backgroundColor: '#151515', borderColor: '#5A4727', borderWidth: 1, borderRadius: 24, padding: 24, gap: 15 },
  eyebrow: { color: '#C9A85C', fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#F6E7BA', fontSize: 30, fontWeight: '700' },
  body: { color: '#D8D0C4', fontSize: 15, lineHeight: 22 },
  status: { backgroundColor: '#202020', borderRadius: 14, padding: 16, gap: 5 },
  label: { color: '#AFA89C', fontSize: 12 },
  value: { color: '#FFF', fontSize: 16 },
  note: { color: '#BDB5A8', fontSize: 14, lineHeight: 21 },
  button: { borderColor: '#755F35', borderWidth: 1, borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
  buttonText: { color: '#E6C978', fontWeight: '700', fontSize: 16 },
});
