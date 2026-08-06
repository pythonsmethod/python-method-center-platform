import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function signIn() {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);

    if (error) return Alert.alert('Не удалось войти', error.message);
    router.replace('/cabinet');
  }

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>ЕДИНЫЙ АККАУНТ</Text>
        <Text style={styles.title}>Войти в центр</Text>
        <Text style={styles.body}>Используйте тот же email и пароль, что и на сайте.</Text>
        <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor="#777" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} secureTextEntry placeholder="Пароль" placeholderTextColor="#777" value={password} onChangeText={setPassword} />
        <Pressable style={styles.button} disabled={submitting} onPress={signIn}>
          <Text style={styles.buttonText}>{submitting ? 'Входим…' : 'Войти'}</Text>
        </Pressable>
        <Link href="/recovery" style={styles.link}>Забыли пароль?</Link>
        <Link href="/sign-up" style={styles.link}>Создать аккаунт</Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0B0B0B', padding: 20, justifyContent: 'center' },
  card: { backgroundColor: '#151515', borderColor: '#5A4727', borderWidth: 1, borderRadius: 24, padding: 24, gap: 14 },
  eyebrow: { color: '#C9A85C', fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#F6E7BA', fontSize: 30, fontWeight: '700' },
  body: { color: '#D8D0C4', fontSize: 15, lineHeight: 22 },
  input: { backgroundColor: '#202020', color: '#FFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  button: { backgroundColor: '#C9A85C', borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
  buttonText: { color: '#111', fontWeight: '700', fontSize: 16 },
  link: { color: '#E6C978', fontSize: 15, textAlign: 'center', paddingVertical: 4 },
});
