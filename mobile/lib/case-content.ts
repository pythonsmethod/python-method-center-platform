import { supabase } from '@/lib/supabase';

export type MobileDocument = {
  id: string;
  original_filename: string | null;
  document_type: string;
  status: string;
  document_status: string | null;
  created_at: string;
};

export type MobileLifecycleEvent = {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  actor_role: string;
  notes: string | null;
  created_at: string;
};

export async function loadDocuments(profileId: string, caseId: string): Promise<MobileDocument[]> {
  const { data, error } = await supabase
    .from('uploaded_documents')
    .select('id, original_filename, document_type, status, document_status, created_at')
    .eq('profile_id', profileId)
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as MobileDocument[];
}

export async function loadCaseHistory(profileId: string, caseId: string): Promise<MobileLifecycleEvent[]> {
  const { data, error } = await supabase
    .from('case_lifecycle_events')
    .select('id, event_type, from_status, to_status, actor_role, notes, created_at')
    .eq('profile_id', profileId)
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as MobileLifecycleEvent[];
}

export const documentStatusLabels: Record<string, string> = {
  uploaded: 'Загружен',
  processing: 'Обрабатывается',
  accepted: 'Принят',
  needs_reupload: 'Нужно загрузить повторно',
  archived: 'В архиве',
};

export const lifecycleLabels: Record<string, string> = {
  case_created: 'Кейс создан',
  onboarding_submitted: 'Анкета отправлена',
  status_changed: 'Статус кейса изменён',
  payment_recorded: 'Оплата зарегистрирована',
  service_period_started: 'Сопровождение началось',
  service_period_completed: 'Сопровождение завершено',
  support_requested: 'Создано обращение в поддержку',
  escalation_created: 'Создано важное обращение',
  consent_recorded: 'Согласие зарегистрировано',
  admin_note_added: 'Добавлена служебная запись',
};
