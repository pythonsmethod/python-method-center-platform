import { supabase } from '@/lib/supabase';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://pythonmethodcenter.com';

// Every call to the platform carries the person's own Supabase access token.
// The server derives their case from it and never accepts a case id from the
// request, so a token can only ever reach its owner's data.
export async function accessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Сессия завершена. Войдите снова.');
  return data.session.access_token;
}

export async function apiRequest(path: string, init?: RequestInit) {
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
