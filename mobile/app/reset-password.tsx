import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { supabase } from '@/lib/supabase';

type Stage =
  | { name: 'opening' }
  | { name: 'ready' }
  | { name: 'invalid'; message: string };

// Supabase can hand the recovery credentials over in two shapes depending on
// the flow the project is configured for: a PKCE "code" query parameter, or
// an implicit-flow pair carried in the URL fragment. The session client is
// created with detectSessionInUrl: false — correct for a native app, where
// there is no browser to read the URL — so the exchange happens here.
async function establishRecoverySession(url: string): Promise<string | null> {
  const parsed = Linking.parse(url);
  const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? error.message : null;
  }

  // The fragment survives Linking.parse only as raw text, so read it directly.
  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return error ? error.message : null;
  }

  const described = params.get('error_description') ?? parsed.queryParams?.error_description;
  return typeof described === 'string' && described
    ? described
    : 'Ссылка недействительна или уже использована.';
}

export default function ResetPasswordScreen() {
  // Covers both cases: the app opened cold by the link, and the app already
  // running when the link arrives.
  const incomingUrl = Linking.useURL();
  const [stage, setStage] = useState<Stage>({ name: 'opening' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // A recovery session may already exist if Supabase restored it before
      // this screen mounted.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        setStage({ name: 'ready' });
        return;
      }

      if (!incomingUrl) return;

      const failure = await establishRecoverySession(incomingUrl);
      if (cancelled) return;

      setStage(failure ? { name: 'invalid', message: failure } : { name: 'ready' });
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [incomingUrl]);

  async function save() {
    if (password.length < 8) {
      setError('Пароль должен быть не короче 8 символов.');
      return;
    }
    if (password !== confirm) {
      setError('Пароли не совпадают.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(
        /same password|different from the old/i.test(updateError.message)
          ? 'Новый пароль совпадает со старым — придумайте другой.'
          : 'Не удалось обновить пароль. Запросите новую ссылку и попробуйте ещё раз.',
      );
      return;
    }

    router.replace('/cabinet');
  }

  if (stage.name === 'opening') {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.body}>Проверяем ссылку…</Text>
      </SafeAreaView>
    );
  }

  if (stage.name === 'invalid') {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.title}>Ссылка не подошла</Text>
          <Text style={styles.body}>{stage.message}</Text>
          <Pressable style={styles.button} onPress={() => router.replace('/recovery')}>
            <Text style={styles.buttonText}>Запросить новую ссылку</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Новый пароль</Text>
        <Text style={styles.body}>Он будет действовать и на сайте, и в приложении.</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Новый пароль — минимум 8 символов"
          placeholderTextColor="#777"
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Повторите пароль"
          placeholderTextColor="#777"
          value={confirm}
          onChangeText={setConfirm}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} disabled={submitting} onPress={() => void save()}>
          <Text style={styles.buttonText}>{submitting ? 'Сохраняем…' : 'Сохранить пароль'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0B0B0B', padding: 20, justifyContent: 'center' },
  center: { flex: 1, backgroundColor: '#0B0B0B', alignItems: 'center', justifyContent: 'center', gap: 12 },
  card: { backgroundColor: '#151515', borderColor: '#5A4727', borderWidth: 1, borderRadius: 24, padding: 24, gap: 14 },
  title: { color: '#F6E7BA', fontSize: 29, fontWeight: '700' },
  body: { color: '#D8D0C4', fontSize: 15, lineHeight: 22 },
  input: { backgroundColor: '#202020', color: '#FFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  button: { backgroundColor: '#C9A85C', borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
  buttonText: { color: '#111', fontWeight: '700', fontSize: 16 },
  error: { color: '#FFB4AB', fontSize: 14, lineHeight: 20 },
});
