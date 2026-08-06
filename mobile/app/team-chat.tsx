import { Redirect } from 'expo-router';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { VoiceMessage } from '@/components/voice-message';
import { useAuth } from '@/lib/auth-context';
import {
  loadTeamChat,
  sendTeamChatMessage,
  sendVoiceMessage,
  type TeamChatMessage,
} from '@/lib/team-chat';

function senderLabel(role: string) {
  if (role === 'client') return 'Вы';
  if (role === 'karen') return 'Карен';
  return 'Команда центра';
}

function messageTime(value: string) {
  return new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export default function TeamChatScreen() {
  const { session, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);

  const refresh = useCallback(async (silent = false) => {
    try {
      if (!silent) setError(null);
      setMessages(await loadTeamChat());
    } catch (value) {
      if (!silent) setError(value instanceof Error ? value.message : 'Не удалось загрузить чат.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    void refresh();
    const interval = setInterval(() => void refresh(true), 3000);
    return () => clearInterval(interval);
  }, [refresh, session]);

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages.length]);

  async function sendText() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const message = await sendTeamChatMessage(text);
      setMessages((current) => [...current, message]);
      setBody('');
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Не удалось отправить сообщение.');
    } finally {
      setSending(false);
    }
  }

  async function toggleRecording() {
    if (sending) return;
    setError(null);

    try {
      if (recorderState.isRecording) {
        const durationSeconds = Math.max(1, Math.round(recorderState.durationMillis / 1000));
        await recorder.stop();
        if (!recorder.uri) throw new Error('Запись не сохранилась.');
        setSending(true);
        const message = await sendVoiceMessage(recorder.uri, durationSeconds);
        setMessages((current) => [...current, message]);
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        return;
      }

      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error('Разрешите доступ к микрофону в настройках iPhone.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Не удалось записать голосовое сообщение.');
    } finally {
      if (!recorderState.isRecording) setSending(false);
    }
  }

  if (!authLoading && !session) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>СВЯЗЬ С ЦЕНТРОМ</Text>
          <Text style={styles.title}>Чат с командой</Text>
          <Text style={styles.subtitle}>Переписка и голосовые едины для приложения и веб-кабинета.</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.loading}><ActivityIndicator /><Text style={styles.loadingText}>Загружаем переписку…</Text></View>
        ) : (
          <ScrollView ref={scrollRef} style={styles.thread} contentContainerStyle={styles.threadContent}>
            {messages.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Диалог ещё не начат</Text><Text style={styles.emptyText}>Напишите или запишите сообщение команде центра.</Text></View> : null}
            {messages.map((message) => {
              const own = message.sender_role === 'client';
              return (
                <View key={message.id} style={[styles.messageRow, own ? styles.ownRow : styles.teamRow]}>
                  <View style={[styles.bubble, own ? styles.ownBubble : styles.teamBubble]}>
                    <Text style={styles.sender}>{senderLabel(message.sender_role)}</Text>
                    {message.body ? <Text style={styles.messageText}>{message.body}</Text> : null}
                    {message.audio_url ? <VoiceMessage url={message.audio_url} duration={message.audio_duration_seconds} /> : message.audio_path ? <Text style={styles.audioNote}>Голосовое недоступно для воспроизведения</Text> : null}
                    <Text style={styles.time}>{messageTime(message.created_at)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {recorderState.isRecording ? <View style={styles.recordingBar}><Text style={styles.recordingText}>● Запись {Math.round(recorderState.durationMillis / 1000)} сек.</Text></View> : null}

        <View style={styles.composer}>
          <Pressable onPress={() => void toggleRecording()} disabled={sending} style={[styles.micButton, recorderState.isRecording && styles.micActive]}>
            <Text style={styles.micText}>{recorderState.isRecording ? 'Стоп' : 'Голос'}</Text>
          </Pressable>
          <TextInput value={body} onChangeText={setBody} placeholder="Напишите сообщение…" placeholderTextColor="#777064" multiline maxLength={8000} style={styles.input} />
          <Pressable onPress={() => void sendText()} disabled={!body.trim() || sending || recorderState.isRecording} style={[styles.sendButton, (!body.trim() || sending || recorderState.isRecording) && styles.sendDisabled]}>
            <Text style={styles.sendText}>{sending ? '…' : 'Отправить'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0B0B0B' }, header: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, gap: 5 },
  eyebrow: { color: '#C9A85C', fontSize: 11, letterSpacing: 1.8, fontWeight: '700' }, title: { color: '#F6E7BA', fontSize: 27, fontWeight: '700' },
  subtitle: { color: '#AFA89C', fontSize: 13, lineHeight: 19 }, error: { color: '#FFB4AB', paddingHorizontal: 18, paddingBottom: 8 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }, loadingText: { color: '#BDB5A8' }, thread: { flex: 1 },
  threadContent: { padding: 14, gap: 10, flexGrow: 1, justifyContent: 'flex-end' }, messageRow: { width: '100%', flexDirection: 'row' }, ownRow: { justifyContent: 'flex-end' }, teamRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '84%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 4 }, ownBubble: { backgroundColor: '#3A2E17', borderBottomRightRadius: 5 },
  teamBubble: { backgroundColor: '#1D1D1D', borderColor: '#39342C', borderWidth: 1, borderBottomLeftRadius: 5 }, sender: { color: '#C9A85C', fontSize: 11, fontWeight: '700' },
  messageText: { color: '#F2EEE7', fontSize: 15, lineHeight: 21 }, audioNote: { color: '#D8D0C4', fontSize: 13 }, time: { color: '#8D867A', fontSize: 10, alignSelf: 'flex-end' },
  emptyCard: { backgroundColor: '#151515', borderRadius: 18, padding: 20, gap: 7 }, emptyTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' }, emptyText: { color: '#BDB5A8', fontSize: 14, lineHeight: 21 },
  recordingBar: { backgroundColor: '#311B1B', paddingVertical: 8, paddingHorizontal: 16 }, recordingText: { color: '#FFB4AB', fontWeight: '700' },
  composer: { borderTopColor: '#2E2A24', borderTopWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: '#101010' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: '#1B1B1B', color: '#FFF', borderRadius: 15, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  micButton: { borderColor: '#755F35', borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 13 }, micActive: { backgroundColor: '#6E2929', borderColor: '#A34E4E' },
  micText: { color: '#F6E7BA', fontWeight: '700', fontSize: 13 }, sendButton: { backgroundColor: '#C9A85C', borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13 },
  sendDisabled: { opacity: 0.45 }, sendText: { color: '#111', fontWeight: '800', fontSize: 14 },
});
