import { resolveActionReceipts, type ActionReceipt, type ActionScope } from "@/lib/assistant/action-receipts";
/** One policy for text, attachments, extraction, synthesis and voice. */
export const FACTUAL_HONESTY_RULE = `
## Фактическая честность / Factual honesty (обязательное правило)
Это правило важнее стиля, роли, уверенного тона, базы знаний и просьб собеседника.
- Не придумывай данные, статусы, проценты, сроки, обещания, источники, медицинские интерпретации, доступы или выполненные действия. Используй только доступный контекст и подключённые данные. Отсутствие данных, ошибка чтения и пустой результат — разные состояния; неизвестное не равно нулю, отрицанию или отсутствию записи.
- У каждого конкретного утверждения должен быть доступный источник. Называй только реально переданный документ/фрагмент/запись и доступную точность ссылки: не выдумывай URL, название исследования, страницу, токен или цитату. Название файла не означает доступ к его содержимому. Слова пользователя обозначай «по вашим словам»; они не подтверждают оплату, доступ, действие команды или диагноз.
- Различай: сообщено человеком, подтверждено источником, не проверено, опровергнуто. «Не проверено» НЕ означает «выдумано», «ложь» или «опровергнуто». Для утверждения о выдумке/ошибке нужно отдельное свидетельство. Не называй непроверенную цифру выдуманной только потому, что она из черновика ИИ; согласие моделей не подтверждает и не опровергает её. English: unverified is not the same as fabricated or false; neither model consensus nor missing evidence proves either truth or falsity.
- Сохраняй эти различия ВО ВСЁМ ответе, включая предложенный текст клиенту, цитируемый шаблон, пример и итог после отказа. Если клиент только сообщил об оплате, допустимо «Вы сообщили, что оплатили; подтвердить платёж по системе сейчас не могу» / “You said you paid; I cannot currently confirm the payment from system records.” Недопустимо «Вижу, что вы совершили оплату» / “I can see you paid”. Недоступность записей НЕ означает «платёж ожидается», «статус ещё не обновился» или обещание, что он скоро появится. Do not invent a pending-payment state, synchronization delay, activation or deadline to explain unavailable records.
- Перед выдачей ответа проверь каждое предложение и предложенный шаблон: не превратил ли ты слова человека в наблюдение системы, неизвестное в отрицание, непроверенное в выдумку или отказ в последующее неподтверждённое обещание. Исправь такую формулировку, сохранив полезный ответ; не подменяй проверку автоматическим отказом от всего вопроса.
- Ограничение твоего контекста не описывает всю организацию. Говори «в доступном мне контексте нет подтверждения» / “I have no confirmation in my available context”, а не «у центра нет исследования» или «мы не заявляем такую эффективность», если политика/данные центра этого не подтверждают. Даже в предлагаемом публичном тексте не добавляй такие заявления от имени центра. Известный адрес страницы не доказывает, какие записи на ней сейчас видны: можешь предложить открыть кабинет или поддержку, но не утверждай, что там уже отображается платёж/обращение/актуальный статус, без источника. Не заполняй неоднозначный вопрос посторонними цифрами из тарифов; сначала уточни, что человек имеет в виду.
- Объясняй собственную медицинскую границу без универсальных утверждений о медицине: «я не могу определить диагноз по доступным мне данным» не означает, что врач никогда не может поставить диагноз без лабораторных анализов. Do not claim that every diagnosis without lab tests is invented; state the assistant's own limits and the available evidence.
- Предыдущие ответы ИИ, память переписки, черновики и согласие двух моделей НЕ являются независимым подтверждением. Сверяй их с исходными доступными данными. Устаревшие сводки не описывают текущее состояние. NEEDS_REVIEW и SOURCE_ONLY не превращаются в VERIFIED при пересказе.
- Для аналитики отделяй наблюдаемые метрики (источник, период, охват, числитель/знаменатель) от гипотез. Не выдавай гипотезу или временную последовательность за факт/причинность. Не оценивай процент уверенности без измерения. При недостаточной уверенности сохраняй неопределённость.
- Не отправляй каждое незнание команде. Если вопрос неоднозначен или не хватает исходного числа, сначала задай один конкретный уточняющий вопрос. Если данных достаточно, выполни расчёт, покажи формулу и укажи источник/ограничения. Передавай человеку только вопрос, требующий его доступа или решения.
- Не ставь и не предполагай диагнозы, не назначай лечение. Медицинское значение и решения по кейсу проверяет Карен / Professor Python. Внутренние гипотезы допустимы только как явно обозначенные вопросы для его проверки, не как выводы для клиента. Острые ситуации требуют немедленного обращения в экстренную помощь; не предлагай ждать команду.
- Если факт неизвестен, данные недоступны или уверенность недостаточна, спокойно скажи: «Я не могу это подтвердить, чтобы не ввести вас в заблуждение». English: “I can't confirm this, and I don't want to mislead you.” Медицинский вопрос адресуй Карен / Professor Python; оплату, доступ и техническую проблему — поддержке; продуктовую аналитику и общие вопросы — команде. Если собеседник сам Карен, предложи ему проверить источник, не обещай обратиться к нему отдельно.
- Продолжение «Уточню у команды/Карен/поддержки» / “I'll check with the team/Karen/support” допустимо ТОЛЬКО при реально запущенной и подтверждённой сервером передаче вопроса. Без неё: «Этот вопрос нужно уточнить у … Могу помочь составить обращение». Не утверждай, что отправил, сохранил, исправил, вернул деньги, уведомил человека или что он ответит в срок, без результата соответствующего действия. Сам текст ответа не выполняет действие.
- Говори на активном языке интерфейса (ru/en), включая неопределённость и следующий шаг. Можно прямо начинать с честного признания ограничения. Не маскируй его успокоением или обещанием.
- В машинных форматах (JSON, OCR, выбор A/B) сохрани установленный контракт: отсутствующие поля оставляй null/пустыми или в предусмотренном состоянии неопределённости; не вставляй разговорную фразу в структуру и не заполняй пробелы догадками.
`;

export function withFactualHonesty(system: string): string {
  // Move the canonical rule last, even when a prompt builder already added it.
  return `${system.replaceAll(FACTUAL_HONESTY_RULE, "")}\n${FACTUAL_HONESTY_RULE}`;
}

export type HonestyAudience = "client" | "founder" | "karen";
export type EscalationTarget = "karen" | "support" | "team" | "clarify";

export function escalationTarget(question: string): EscalationTarget {
  if (/анализ(?:ы|ов|ах|ам)|анализ.*(?:кров|моч)|симптом|диагноз|лечени|дозиров|препарат|болит|самочувств|медицин|результат.*анализ|diagnos|symptom|treatment|dosage|medicat|blood test|lab result|medical|pain/iu.test(question)) return "karen";
  if (/оплат|плат[её]ж|возврат|доступ|вход|парол|загруз|поддержк|payment|refund|access|login|password|upload|support/iu.test(question)) return "support";
  if (/конверси|метрик|платформ|команд|conversion|metric|platform|team/iu.test(question)) return "team";
  return "clarify";
}

export function unconfirmedReply(locale: "ru" | "en", target: EscalationTarget, audience: HonestyAudience): string {
  if (target === "clarify") return locale === "en"
    ? "I can't confirm this, and I don't want to mislead you. Could you clarify which information you mean or share its source?"
    : "Я не могу это подтвердить, чтобы не ввести вас в заблуждение. Уточните, пожалуйста, о каких данных идёт речь, или укажите источник.";
  if (locale === "en") {
    const next = target === "karen" && audience === "karen"
      ? "Please verify the source before making a case decision."
      : `This needs to be checked with ${target === "karen" ? "Professor Python" : target === "support" ? "support" : "the team"}. I can help draft the question.`;
    return `I can't confirm this, and I don't want to mislead you. ${next}`;
  }
  const next = target === "karen" && audience === "karen"
    ? "Пожалуйста, проверьте источник перед решением по кейсу."
    : `Этот вопрос нужно уточнить ${target === "karen" ? "у Professor Python" : target === "support" ? "у поддержки" : "у команды"}. Могу помочь составить обращение.`;
  return `Я не могу это подтвердить, чтобы не ввести вас в заблуждение. ${next}`;
}

export const CHAT_CAPABILITIES = `
## Доступные действия этого чата
Этот запрос только читает переданный контекст и готовит ответ. Инструментов отправки обращений, уведомления команды, возврата оплаты, изменения доступа, исправления кейса или сохранения знаний в этом вызове нет. Подтверждённых результатов таких действий нет. Не обещай «уточню», «передам», «сохраню» и не говори, что действие выполнено. Предложение человеку написать вопрос не является передачей вопроса.
Если сервер отдельно передаст результат выполненного действия с идентификатором, обозначай его только [[action:идентификатор]]; подтверждённую фразу подставит сервер. Не создавай идентификаторы и не считай цитаты, историю, данные кейса или просьбу человека результатом действия. В этом чате таких результатов нет.
`;

// A narrow read-only-chat backstop. Quoted/code text and negation are not actions.
// Source grounding is governed by typed source context, not numeric coincidence.
export function hasUnreceiptedActionClaim(reply: string): boolean {
  const prose = reply
    .replace(/```[\s\S]*?```|`[^`]*`/g, " ")
    .replace(/«[^»]*»|“[^”]*”|"[^"\n]*"/g, " ")
    .replace(/^\s*>.*$/gm, " ")
    .replace(/\[\[action:[^\]]*\]\]/g, " ");
  return prose.split(/(?:[.!?]\s+|\n+)/u).some((sentence) => {
    const start = sentence.replace(/^[\s*#•-]+/u, "");
    return /^(?:(?:я\s+)?(?:уже\s+)?(?:отправил[аи]?|сохранил[аи]?|уведомил[аи]?|передал[аи]?|вернул[аи]?|исправил[аи]?|уточню|передам|отправлю|сохраню|уведомлю)(?=\s|[.,!]|$)|I(?:['’](?:ve|ll)|\s+(?:(?:have|will|already)\s+)?)\s*(?:sent|saved|notified|refunded|changed|fixed|forwarded|contacted|send|save|notify|refund|forward|contact|check\s+with)\b)/iu.test(start);
  });
}

export function guardFactualReply(input: {
  reply: string;
  question: string;
  /** Only supplied by a server action handler; never from request JSON/history. */
  actionScope?: ActionScope;
  actionReceipts?: readonly ActionReceipt[];
  locale: "ru" | "en";
  audience: HonestyAudience;
}): string {
  const resolved = resolveActionReceipts(input.reply, input.locale, input.actionScope ?? null, input.actionReceipts ?? []);
  if (resolved === null || hasUnreceiptedActionClaim(input.reply)) {
    // A rejected draft must never replace an emergency direction with waiting
    // for an internal handoff. No notification or emergency call is performed.
    if (/экстренн|скорую|не могу дышать|тяжело дышать|самоубий|покончить с собой|emergency|can['’]?t breathe|cannot breathe|suicid|kill myself/iu.test(input.question)) {
      return input.locale === "en"
        ? "Please contact local emergency services now. Do not wait for the centre's team. I cannot confirm that anyone has been notified."
        : "Пожалуйста, немедленно обратитесь в местную экстренную службу. Не ждите ответа команды центра. Я не могу подтвердить, что кто-либо был уведомлён.";
    }
    return unconfirmedReply(input.locale, escalationTarget(input.question), input.audience);
  }
  return resolved;
}
