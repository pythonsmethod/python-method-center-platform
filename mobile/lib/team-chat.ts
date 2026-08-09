import { accessToken, API_BASE_URL, apiRequest } from '@/lib/api-client';

export type TeamChatMessage = {
  id: string;
  sender_role: string;
  body: string | null;
  audio_path: string | null;
  audio_url?: string | null;
  audio_duration_seconds: number | null;
  created_at: string;
  read_at: string | null;
};

export async function loadTeamChat(): Promise<TeamChatMessage[]> {
  const payload = await apiRequest('/api/mobile/messages');
  return (payload.messages ?? []) as TeamChatMessage[];
}

export async function loadUnreadTeamMessages(): Promise<number> {
  const payload = await apiRequest('/api/mobile/messages?peek=1');
  return Number(payload.unread ?? 0);
}

export async function sendTeamChatMessage(body: string): Promise<TeamChatMessage> {
  const payload = await apiRequest('/api/mobile/messages', {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  return payload.message as TeamChatMessage;
}

export async function sendVoiceMessage(uri: string, durationSeconds: number): Promise<TeamChatMessage> {
  const token = await accessToken();
  const form = new FormData();
  form.append('duration', String(durationSeconds));
  form.append('audio', {
    uri,
    name: `voice-${Date.now()}.m4a`,
    type: 'audio/mp4',
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/api/mobile/messages/audio`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'Не удалось отправить голосовое сообщение.');
  return payload.message as TeamChatMessage;
}
