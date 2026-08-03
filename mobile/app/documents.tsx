import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { loadCabinetSnapshot } from '@/lib/cabinet-data';
import { documentStatusLabels, loadDocuments, type MobileDocument } from '@/lib/case-content';

export default function DocumentsScreen() {
  const { session, loading } = useAuth();
  const [documents, setDocuments] = useState<MobileDocument[]>([]);
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
        setDocuments([]);
        return;
      }
      setHasCase(true);
      setDocuments(await loadDocuments(session.user.id, snapshot.clientCase.id));
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Не удалось загрузить документы.');
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
        <Text style={styles.eyebrow}>МОЙ КЕЙС</Text>
        <Text style={styles.title}>Документы</Text>
        <Text style={styles.subtitle}>Те же файлы, которые доступны в веб-кабинете.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!hasCase ? <View style={styles.card}><Text style={styles.cardTitle}>Кейс ещё не создан</Text><Text style={styles.text}>Сначала завершите анкету.</Text></View> : null}
        {hasCase && documents.length === 0 ? <View style={styles.card}><Text style={styles.cardTitle}>Документов пока нет</Text><Text style={styles.text}>Загрузку файлов добавим следующим подэтапом. Уже загруженные через сайт появятся здесь автоматически.</Text></View> : null}
        {documents.map((document) => (
          <View key={document.id} style={styles.card}>
            <Text style={styles.cardTitle}>{document.original_filename ?? 'Документ'}</Text>
            <Text style={styles.status}>{documentStatusLabels[document.document_status ?? document.status] ?? document.document_status ?? document.status}</Text>
            <Text style={styles.meta}>{new Date(document.created_at).toLocaleDateString('ru-RU')}</Text>
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
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' }, text: { color: '#D8D0C4', fontSize: 14, lineHeight: 21 },
  status: { color: '#E6C978', fontSize: 14 }, meta: { color: '#8F887D', fontSize: 12 }, error: { color: '#FFB4AB', lineHeight: 20 },
});
