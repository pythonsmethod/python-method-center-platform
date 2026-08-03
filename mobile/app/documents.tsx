import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { loadCabinetSnapshot } from '@/lib/cabinet-data';
import { documentStatusLabels, loadDocuments, type MobileDocument } from '@/lib/case-content';
import { openPrivateDocument, pickAndUploadDocument } from '@/lib/document-storage';

export default function DocumentsScreen() {
  const { session, loading } = useAuth();
  const [documents, setDocuments] = useState<MobileDocument[]>([]);
  const [busy, setBusy] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setError(null);
      const snapshot = await loadCabinetSnapshot(session.user.id);
      if (!snapshot.clientCase) {
        setCaseId(null);
        setDocuments([]);
        return;
      }
      setCaseId(snapshot.clientCase.id);
      setDocuments(await loadDocuments(session.user.id, snapshot.clientCase.id));
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Не удалось загрузить документы.');
    } finally {
      setBusy(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loading && !session) return <Redirect href="/login" />;
  if (busy) return <SafeAreaView style={styles.center}><ActivityIndicator /></SafeAreaView>;

  async function upload() {
    if (!session || !caseId || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const result = await pickAndUploadDocument({ profileId: session.user.id, caseId });
      if (result.status === 'uploaded') await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Не удалось загрузить документ.');
    } finally {
      setUploading(false);
    }
  }

  async function open(document: MobileDocument) {
    if (!document.storage_path || openingId) return;
    setOpeningId(document.id);
    setError(null);
    try {
      await openPrivateDocument(document.storage_path);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Не удалось открыть документ.');
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor="#C9A85C"
          />
        }
      >
        <Text style={styles.eyebrow}>МОЙ КЕЙС</Text>
        <Text style={styles.title}>Документы</Text>
        <Text style={styles.subtitle}>Файлы синхронизированы с веб-кабинетом и хранятся в закрытом хранилище.</Text>

        {error ? <View style={styles.errorCard}><Text style={styles.error}>{error}</Text></View> : null}

        {caseId ? (
          <Pressable style={styles.uploadButton} onPress={upload} disabled={uploading}>
            <Text style={styles.uploadText}>{uploading ? 'Загружаем…' : 'Загрузить документ'}</Text>
          </Pressable>
        ) : null}

        {!caseId ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Кейс ещё не создан</Text>
            <Text style={styles.text}>Сначала завершите анкету.</Text>
          </View>
        ) : null}

        {caseId && documents.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Документов пока нет</Text>
            <Text style={styles.text}>Можно выбрать PDF или изображение размером до 25 МБ.</Text>
          </View>
        ) : null}

        {documents.map((document) => (
          <Pressable
            key={document.id}
            style={styles.card}
            onPress={() => void open(document)}
            disabled={!document.storage_path || openingId === document.id}
          >
            <Text style={styles.cardTitle}>{document.original_filename ?? 'Документ'}</Text>
            <Text style={styles.status}>
              {documentStatusLabels[document.document_status ?? document.status] ??
                document.document_status ??
                document.status}
            </Text>
            <Text style={styles.meta}>{new Date(document.created_at).toLocaleDateString('ru-RU')}</Text>
            <Text style={styles.openHint}>
              {openingId === document.id ? 'Открываем…' : document.storage_path ? 'Нажмите, чтобы открыть' : 'Файл недоступен'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0B0B0B' },
  center: { flex: 1, backgroundColor: '#0B0B0B', justifyContent: 'center' },
  content: { padding: 20, gap: 14, paddingBottom: 42 },
  eyebrow: { color: '#C9A85C', fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#F6E7BA', fontSize: 30, fontWeight: '700' },
  subtitle: { color: '#BDB5A8', fontSize: 15, lineHeight: 22 },
  uploadButton: { backgroundColor: '#C9A85C', borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
  uploadText: { color: '#111111', fontWeight: '700', fontSize: 16 },
  card: { backgroundColor: '#151515', borderColor: '#5A4727', borderWidth: 1, borderRadius: 18, padding: 18, gap: 7 },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  text: { color: '#D8D0C4', fontSize: 14, lineHeight: 21 },
  status: { color: '#E6C978', fontSize: 14 },
  meta: { color: '#8F887D', fontSize: 12 },
  openHint: { color: '#B9A268', fontSize: 13, marginTop: 3 },
  errorCard: { backgroundColor: '#261616', borderColor: '#7C4040', borderWidth: 1, borderRadius: 16, padding: 14 },
  error: { color: '#FFB4AB', lineHeight: 20 },
});
