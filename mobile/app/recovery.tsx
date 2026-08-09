import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PASSWORD_RESET_REDIRECT_URL } from '@/lib/deep-links';
import { supabase } from '@/lib/supabase';

export default function RecoveryScreen() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function recover() {
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: PASSWORD_RESET_REDIRECT_URL,
    });
    setSubmitting(false);

    if (error) return Alert.alert('Не удалось отправить письмо', error.message);
    Alert.alert('Письмо отправлено', 'Откройте ссылку из письма на этом телефоне.');
  }

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Восстановить доступ</Text>
        <Text style={styles.body}>Введите email единого аккаунта Python Method Center.</Text>
        <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor="#777" value={email} onChangeText={setEmail} />
        <Pressable style={styles.button} disabled={submitting} onPress={recover}>
          <Text style={styles.buttonText}>{submitting ? 'Отправляем…' : 'Отправить ссылку'}</Text>
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
