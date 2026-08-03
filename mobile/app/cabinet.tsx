import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { caseStatusLabels, directionLabels, loadCabinetSnapshot, nextStepForCase, type CabinetSnapshot } from '@/lib/cabinet-data';
import { supabase } from '@/lib/supabase';

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('ru-RU') : '—';
const productLabel = (value: string) => value === 'support_5_weeks' ? '5 недель' : value === 'support_15_weeks' ? '100 дней' : value;

export default function CabinetScreen() {
  const { session, loading: authLoading } = useAuth();
  const [snapshot, setSnapshot] = useState<CabinetSnapshot | null>(null);
  const [busy, setBusy] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setError(null);
      setSnapshot(await loadCabinetSnapshot(session.user.id));
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Не удалось загрузить кабинет.');
    } finally {
      setBusy(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => { void load(); }, [load]);
  if (!authLoading && !session) return <Redirect href="/login" />;
  if (authLoading || busy) return <SafeAreaView style={styles.center}><ActivityIndicator /><Text style={styles.meta}>Загружаем кабинет…</Text></SafeAreaView>;

  const profile = snapshot?.profile;
  const clientCase = snapshot?.clientCase;
  const period = snapshot?.servicePeriod;

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
        <Text style={styles.eyebrow}>PYTHON METHOD CENTER</Text>
        <Text style={styles.title}>Мой кабинет</Text>
        <Text style={styles.subtitle}>Единые данные для приложения и веб-платформы.</Text>
        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}

        <View style={styles.card}>
          <Text style={styles.label}>Профиль</Text>
          <Text style={styles.cardTitle}>{profile?.full_name || 'Имя пока не указано'}</Text>
          <Text style={styles.meta}>{profile?.email || session?.user.email || '—'}</Text>
          {profile?.phone ? <Text style={styles.meta}>{profile.phone}</Text> : null}
        </View>

        <View style={styles.highlight}>
          <Text style={styles.label}>Следующий шаг</Text>
          <Text style={styles.next}>{nextStepForCase(clientCase ?? null)}</Text>
        </View>

        <Pressable style={styles.chatButton} onPress={() => router.push('/team-chat')}>
          <View style={styles.chatCopy}>
            <Text style={styles.chatTitle}>Чат с командой</Text>
            <Text style={styles.chatText}>Сообщения синхронизируются с веб-кабинетом</Text>
          </View>
          <Text style={styles.chatArrow}>›</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.label}>Текущий кейс</Text>
          <Text style={styles.cardTitle}>{clientCase ? caseStatusLabels[clientCase.status] ?? clientCase.status : 'Кейс ещё не создан'}</Text>
          {clientCase ? <>
            <Text style={styles.meta}>№ {clientCase.case_number || 'формируется'}</Text>
            <Text style={styles.meta}>{directionLabels[clientCase.direction] ?? clientCase.direction}</Text>
            <Text style={styles.meta}>Создан: {formatDate(clientCase.created_at)}</Text>
          </> : null}
        </View>

        <View style={styles.menuRow}>
          <Pressable style={styles.menuButton} onPress={() => router.push('/documents')}><Text style={styles.menuTitle}>Документы</Text><Text style={styles.menuText}>Файлы и статусы</Text></Pressable>
          <Pressable style={styles.menuButton} onPress={() => router.push('/history')}><Text style={styles.menuTitle}>История</Text><Text style={styles.menuText}>Этапы маршрута</Text></Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Сопровождение</Text>
          {period ? <><Text style={styles.cardTitle}>{productLabel(period.product)}</Text><Text style={styles.meta}>Статус: {period.status}</Text><Text style={styles.meta}>{formatDate(period.starts_at)} — {formatDate(period.ends_at)}</Text></> : <Text style={styles.meta}>Активный период пока не найден.</Text>}
        </View>

        <Pressable style={styles.logout} onPress={async () => { await supabase.auth.signOut(); router.replace('/login'); }}><Text style={styles.logoutText}>Выйти из аккаунта</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0B0B0B' }, center: { flex: 1, backgroundColor: '#0B0B0B', alignItems: 'center', justifyContent: 'center', gap: 12 },
  content: { padding: 20, paddingBottom: 42, gap: 15 }, eyebrow: { color: '#C9A85C', fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#F6E7BA', fontSize: 32, fontWeight: '700' }, subtitle: { color: '#BDB5A8', fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: '#151515', borderColor: '#3B3327', borderWidth: 1, borderRadius: 20, padding: 20, gap: 8 },
  highlight: { backgroundColor: '#211C13', borderColor: '#7A6130', borderWidth: 1, borderRadius: 20, padding: 20, gap: 8 },
  label: { color: '#AFA89C', fontSize: 12, textTransform: 'uppercase' }, cardTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  meta: { color: '#D8D0C4', fontSize: 15 }, next: { color: '#F6E7BA', fontSize: 18, lineHeight: 27, fontWeight: '600' },
  chatButton: { backgroundColor: '#2A2112', borderColor: '#8A6C32', borderWidth: 1, borderRadius: 18, padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chatCopy: { flex: 1, gap: 4 }, chatTitle: { color: '#F6E7BA', fontSize: 18, fontWeight: '800' }, chatText: { color: '#BDB5A8', fontSize: 13, lineHeight: 18 }, chatArrow: { color: '#E6C978', fontSize: 32, marginLeft: 12 },
  menuRow: { flexDirection: 'row', gap: 12 }, menuButton: { flex: 1, backgroundColor: '#151515', borderColor: '#755F35', borderWidth: 1, borderRadius: 18, padding: 16, gap: 5 },
  menuTitle: { color: '#F6E7BA', fontSize: 16, fontWeight: '700' }, menuText: { color: '#AFA89C', fontSize: 12 },
  logout: { borderColor: '#755F35', borderWidth: 1, borderRadius: 14, alignItems: 'center', paddingVertical: 14 }, logoutText: { color: '#E6C978', fontWeight: '700' },
  error: { backgroundColor: '#261616', borderColor: '#7C4040', borderWidth: 1, borderRadius: 16, padding: 16 }, errorText: { color: '#FFD0D0' },
});
