type EmergencyNoticeProps = {
  text?: string;
};

const DEFAULT_TEXT =
  "Платформа не оказывает экстренную помощь. При угрозе жизни, резком ухудшении состояния или мыслях о причинении себе вреда немедленно звоните в местную службу экстренной помощи (например, 112) или обратитесь в ближайшую больницу — не ждите ответа команды через платформу.";

export function EmergencyNotice({ text = DEFAULT_TEXT }: EmergencyNoticeProps) {
  return (
    <p className="fine-print" role="note">
      {text}
    </p>
  );
}
