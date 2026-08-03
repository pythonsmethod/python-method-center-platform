import { Redirect, router } from 'expo-router';
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
import {
  caseStatusLabels,
  directionLabels,
  loadCabinetSnapshot,
  nextStepForCase,
  type CabinetSnapshot,
} from '@/lib/cabinet-data';
import { supabase } from '@/lib/supabase';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function productLabel(product: string) {
  if (product === 'support_5_weeks') return '5 недель';
  if (product === 'support_15_weeks') return '100 дней';
  if (product === 'preliminary_assessment') return 'Предварительная оценка';
  return product;
}

export default function CabinetScreen() {
  const { session, loading: authLoading } = useAuth();
  const [snapshot, setSnapshot] = useState<CabinetSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    setError(null);
    try {
      const data = await loadCabinetSnapshot(session.user.id);
      setSnapshot(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось загрузить кабинет.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (session?.user.id) void load();
  }, [load, session?.user.id]);

  if (!authLoading && !session) return <Redirect href="/login" />;

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Загружаем ваш кабинет…</Text>
      </SafeAreaView>
    );
  }

  const profile = snapshot?.profile;
  const clientCase = snapshot?.clientCase;
  const period = snapshot?.servicePeriod;

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
        <Text style={styles.eyebrow}>PYTHON METHOD CENTER</Text>
        <Text style={styles.title}>Мой кабинет</Text>
        <Text style={styles.subtitle}>
          Те же данные, история и статус, которые доступны в веб-кабинете.
        </Text>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Не удалось обновить данные</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => void load()}>
              <Text style={styles.retryText}>Повторить</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Профиль</Text>
          <Text style={styles.cardTitle}>{profile?.full_name || 'Имя пока не указано'}</Text>
          <Text style={styles.meta}>{profile?.email || session?.user.email || '—'}</Text>
          {profile?.phone ? <Text style={styles.meta}>{profile.phone}</Text> : null}
        </View>

        <View style={styles.highlightCard}>
          <Text style={styles.cardLabel}>Следующий шаг</Text>
          <Text style={styles.nextStep}>{nextStepForCase(clientCase ?? null)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Текущий кейс</Text>
          <Text style={styles.cardTitle}>
            {clientCase
              ? caseStatusLabels[clientCase.status] ?? clientCase.status
              : 'Кейс ещё не создан'}
          </Text>
          {clientCase ? (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Номер</Text>
                <Text style={styles.rowValue}>{clientCase.case_number || 'Формируется'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Направление</Text>
                <Text style={styles.rowValue}>
                  {directionLabels[clientCase.direction] ?? clientCase.direction}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Создан</Text>
                <Text style={styles.rowValue}>{formatDate(clientCase.created_at)}</Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Сопровождение</Text>
          {period ? (
            <>
              <Text style={styles.cardTitle}>{productLabel(period.product)}</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Статус</Text>
                <Text style={styles.rowValue}>{period.status}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Период</Text>
                <Text style={styles.rowValue}>
                  {formatDate(period.starts_at)} — {formatDate(period.ends_at)}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>Активный период сопровождения пока не найден.</Text>
          )}
        </View>

        <Pressable style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Выйти из аккаунта</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0B0B0B' },
  centered: {
    flex: 1,
    backgroundColor: '#0B0B0B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: '#D8D0C4', fontSize: 15 },
  content: { padding: 20, paddingBottom: 42, gap: 15 },
  eyebrow: { color: '#C9A85C', fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#F6E7BA', fontSize: 32, fontWeight: '700' },
  subtitle: { color: '#BDB5A8', fontSize: 15, lineHeight: 22, marginBottom: 4 },
  card: {
    backgroundColor: '#151515',
    borderColor: '#3B3327',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  highlightCard: {
    backgroundColor: '#211C13',
    borderColor: '#7A6130',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  cardLabel: { color: '#AFA89C', fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  cardTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  nextStep: { color: '#F6E7BA', fontSize: 18, lineHeight: 27, fontWeight: '600' },
  meta: { color: '#D8D0C4', fontSize: 15 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    borderTopColor: '#2D2A25',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  rowLabel: { color: '#938B7E', fontSize: 14 },
  rowValue: { color: '#F2EEE7', fontSize: 14, textAlign: 'right', flex: 1 },
  emptyText: { color: '#BDB5A8', fontSize: 15, lineHeight: 22 },
  button: {
    borderColor: '#755F35',
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  buttonText: { color: '#E6C978', fontWeight: '700', fontSize: 16 },
  errorCard: {
    backgroundColor: '#261616',
    borderColor: '#7C4040',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  errorTitle: { color: '#FFD0D0', fontWeight: '700', fontSize: 16 },
  errorText: { color: '#E8B6B6', fontSize: 14, lineHeight: 20 },
  retryButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12 },
  retryText: { color: '#F1C1C1', fontWeight: '700' },
});
