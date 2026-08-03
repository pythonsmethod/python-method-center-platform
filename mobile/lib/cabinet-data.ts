import { supabase } from '@/lib/supabase';

export type MobileProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  locale: string;
  status: string;
};

export type MobileCase = {
  id: string;
  case_number: string | null;
  status: string;
  urgency: string;
  direction: string;
  title: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

export type MobileServicePeriod = {
  product: string;
  status: string;
  starts_at: string;
  ends_at: string;
};

export type CabinetSnapshot = {
  profile: MobileProfile | null;
  clientCase: MobileCase | null;
  servicePeriod: MobileServicePeriod | null;
};

export async function loadCabinetSnapshot(profileId: string): Promise<CabinetSnapshot> {
  const [profileResult, caseResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, phone, locale, status')
      .eq('id', profileId)
      .maybeSingle(),
    supabase
      .from('client_cases')
      .select('id, case_number, status, urgency, direction, title, summary, created_at, updated_at')
      .eq('profile_id', profileId)
      .maybeSingle(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (caseResult.error) throw caseResult.error;

  const clientCase = caseResult.data as MobileCase | null;
  let servicePeriod: MobileServicePeriod | null = null;

  if (clientCase) {
    const periodResult = await supabase
      .from('service_periods')
      .select('product, status, starts_at, ends_at')
      .eq('case_id', clientCase.id)
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (periodResult.error) throw periodResult.error;
    servicePeriod = periodResult.data as MobileServicePeriod | null;
  }

  return {
    profile: profileResult.data as MobileProfile | null,
    clientCase,
    servicePeriod,
  };
}

export const caseStatusLabels: Record<string, string> = {
  created: 'Кейс создан',
  awaiting_onboarding: 'Нужно заполнить анкету',
  ready_for_review: 'Материалы готовы к проверке',
  in_review: 'Материалы рассматриваются',
  active_support: 'Сопровождение активно',
  inactive_support: 'Сопровождение приостановлено',
  completed: 'Сопровождение завершено',
  archived: 'Кейс находится в архиве',
};

export const directionLabels: Record<string, string> = {
  recovery: 'Восстановление',
  rehabilitation: 'Реабилитация',
  preservation: 'Сохранение',
  not_set: 'Направление ещё не определено',
};

export function nextStepForCase(clientCase: MobileCase | null): string {
  if (!clientCase) return 'Заполните анкету, чтобы создать свой кейс.';

  switch (clientCase.status) {
    case 'created':
    case 'awaiting_onboarding':
      return 'Завершите анкету и отправьте исходную информацию.';
    case 'ready_for_review':
      return 'Материалы получены. Ожидайте начала проверки.';
    case 'in_review':
      return 'Команда рассматривает материалы. Следите за сообщениями.';
    case 'active_support':
      return 'Продолжайте выполнять текущий план и отмечать изменения.';
    case 'inactive_support':
      return 'Свяжитесь с поддержкой, чтобы уточнить дальнейший маршрут.';
    case 'completed':
      return 'Сохраните результаты и следуйте итоговым рекомендациям.';
    case 'archived':
      return 'Обратитесь в поддержку, если хотите возобновить работу.';
    default:
      return 'Следите за обновлениями в кабинете.';
  }
}
