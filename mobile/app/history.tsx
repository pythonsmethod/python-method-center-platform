import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { loadCabinetSnapshot } from '@/lib/cabinet-data';
import { lifecycleLabels, loadCaseHistory, type MobileLifecycleEvent } from '@/lib/case-content';

export default function HistoryScreen() {
  const { session, loading } = useAuth();
  const [events, setEvents] = useState<MobileLifecycleEvent[]>([]);
  const [busy, setBusy] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCase, setHasCase] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setError(null);
      const snapshot = await loadCabinetSnapshot(session.user.id);
      if (!snapshot.clientCase) {
        setHasCase(false);
        setEvents([]);
        return;
      }
      setHasCase(true);
      setEvents(await loadCaseHistory(session.user.id, snapshot.clientCase.id));
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Не удалось загрузить историю кейса.');
    } finally {
      setBusy(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => { void load(); }, [load]);

  if (!loading && !session) return <Redirect href="/login" />;
  if (busy) return <SafeAreaView style={styles.center}><ActivityIndicator /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
        <Text style={styles.eyebrow}>МОЙ МАРШРУТ</Text>
        <Text style={styles.title}>История кейса</Text>
        <Text style={styles.subtitle}>События синхронизированы с веб-кабинетом и рабочей зоной команды.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!hasCase ? <View style={styles.card}><Text style={styles.cardTitle}>Кейс ещё не создан</Text><Text style={styles.text}>После завершения анкеты здесь появится история маршрута.</Text></View> : null}
        {hasCase && events.length === 0 ? <View style={styles.card}><Text style={styles.cardTitle}>История пока пуста</Text><Text style={styles.text}>Новые этапы и изменения статуса появятся здесь автоматически.</Text></View> : null}
        {events.map((event) => (
          <View key={event.id} style={styles.row}>
            <View style={styles.dot} />
            <View style={styles.eventBody}>
              <Text style={styles.cardTitle}>{lifecycleLabels[event.event_type] ?? event.event_type}</Text>
              {event.notes ? <Text style={styles.text}>{event.notes}</Text> : null}
              {event.from_status || event.to_status ? <Text style={styles.status}>{[event.from_status, event.to_status].filter(Boolean).join(' → ')}</Text> : null}
              <Text style={styles.meta}>{new Date(event.created_at).toLocaleString('ru-RU')}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0B0B0B' }, center: { flex: 1, backgroundColor: '#0B0B0B', justifyContent: 'center' },
  content: { padding: 20, gap: 14 }, eyebrow: { color: '#C9A85C', fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#F6E7BA', fontSize: 30, fontWeight: '700' }, subtitle: { color: '#BDB5A8', fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: '#151515', borderColor: '#5A4727', borderWidth: 1, borderRadius: 18, padding: 18, gap: 7 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 8 }, dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C9A85C', marginTop: 6 },
  eventBody: { flex: 1, backgroundColor: '#151515', borderRadius: 16, padding: 16, gap: 6 }, cardTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  text: { color: '#D8D0C4', fontSize: 14, lineHeight: 21 }, status: { color: '#E6C978', fontSize: 13 }, meta: { color: '#8F887D', fontSize: 12 }, error: { color: '#FFB4AB', lineHeight: 20 },
});
