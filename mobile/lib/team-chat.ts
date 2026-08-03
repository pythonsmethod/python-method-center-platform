import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://pythonmethodcenter.com';

export type TeamChatMessage = {
  id: string;
  sender_role: string;
  body: string | null;
  audio_path: string | null;
  audio_duration_seconds: number | null;
  created_at: string;
  read_at: string | null;
};

async function accessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Сессия завершена. Войдите снова.');
  return data.session.access_token;
}

async function request(path: string, init?: RequestInit) {
  const token = await accessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'Не удалось связаться с центром.');
  return payload;
}

export async function loadTeamChat(): Promise<TeamChatMessage[]> {
  const payload = await request('/api/mobile/messages');
  return (payload.messages ?? []) as TeamChatMessage[];
}

export async function sendTeamChatMessage(body: string): Promise<TeamChatMessage> {
  const payload = await request('/api/mobile/messages', {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  return payload.message as TeamChatMessage;
}
