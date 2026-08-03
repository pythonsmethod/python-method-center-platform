import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function signUp() {
    if (password.length < 8) return Alert.alert('Пароль слишком короткий', 'Используйте не менее 8 символов.');
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setSubmitting(false);

    if (error) return Alert.alert('Не удалось создать аккаунт', error.message);
    if (data.session) return router.replace('/cabinet');
    Alert.alert('Проверьте почту', 'Мы отправили ссылку для подтверждения аккаунта. После подтверждения войдите в приложение.');
    router.replace('/login');
  }

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Создать аккаунт</Text>
        <Text style={styles.body}>Этот аккаунт будет одинаковым для сайта, мобильного сайта и приложения.</Text>
        <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor="#777" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} secureTextEntry placeholder="Пароль — минимум 8 символов" placeholderTextColor="#777" value={password} onChangeText={setPassword} />
        <Pressable style={styles.button} disabled={submitting} onPress={signUp}>
          <Text style={styles.buttonText}>{submitting ? 'Создаём…' : 'Создать аккаунт'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0B0B0B', padding: 20, justifyContent: 'center' },
  card: { backgroundColor: '#151515', borderColor: '#5A4727', borderWidth: 1, borderRadius: 24, padding: 24, gap: 14 },
  title: { color: '#F6E7BA', fontSize: 29, fontWeight: '700' },
  body: { color: '#D8D0C4', fontSize: 15, lineHeight: 22 },
  input: { backgroundColor: '#202020', color: '#FFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  button: { backgroundColor: '#C9A85C', borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
  buttonText: { color: '#111', fontWeight: '700', fontSize: 16 },
});
