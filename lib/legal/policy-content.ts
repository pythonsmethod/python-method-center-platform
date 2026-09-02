import type { Locale } from "@/lib/i18n/locale";

// The privacy policy and the refund terms, both languages side by side —
// the same arrangement as the offer, and for the same reason: a change to
// one language that is not made to the other shows up in a diff.
//
// These two documents are written from what the platform actually does,
// not from a template. Every processor named below is a host the code
// really calls, every table named below is a table the code really writes
// to, and the two disclosures that a boilerplate policy would never have
// made — that a safety escalation carries the client's email and up to 600
// characters of what they wrote to Telegram, and that guest chat is
// counted against a hashed IP address — are in here because the code does
// those things.
//
// The refund document adds no obligation that the offer does not already
// carry, with one exception, marked in place: a duplicate or unmatched
// charge is returned. That is not a refund for services rendered — it is
// money taken for nothing — so it does not sit against clause 8.
//
// The binding refund terms remain clause 8 of the offer, and the Russian
// text of the offer remains the prevailing one. This page explains them;
// it does not replace them.
//
// Neither document has been reviewed by a lawyer.

export const POLICY_UPDATED_ISO = "2026-08-09";

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  subtitle: string;
  intro: string | null;
  sections: LegalSection[];
  footer: string;
};

const PRIVACY_RU: LegalDocument = {
  title: "ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ",
  subtitle: "Python Method — как мы обращаемся с вашими данными",
  intro:
    "Вы доверяете нам самое личное: анализы, историю болезни, то, о чём не всегда говорят вслух. Этот документ написан прямо и без общих слов — здесь перечислено, что именно мы храним, где, кто это видит и какие сервисы получают часть этих данных. Если после прочтения останется вопрос — напишите нам, мы ответим лично.",
  sections: [
    {
      heading: "1. Кто отвечает за ваши данные",
      paragraphs: [
        "Оператором персональных данных является Pythons & Co, 1331 Amherst Ave, Apt PH5, Los Angeles, CA 90025, USA. Связаться по любому вопросу о данных: pythonsusa@gmail.com.",
        "Платформа не является медицинским учреждением. Материалы, которые вы загружаете, — это материалы для сопровождения, а не медицинская карта."
      ]
    },
    {
      heading: "2. Какие данные мы собираем",
      paragraphs: [
        "Мы собираем только то, что нужно для работы с вашим кейсом. Ничего из перечисленного не собирается «на всякий случай»."
      ],
      bullets: [
        "Регистрация: email и пароль (пароль хранится у нашего провайдера аутентификации в виде хеша — мы его не видим).",
        "Профиль: имя и фамилия, телефон, страна, язык интерфейса.",
        "Анкета: цель обращения, описание ситуации, для кого ведётся сопровождение, подтверждение возраста, а при участии несовершеннолетнего — имя и дата рождения участника и данные родителя или опекуна.",
        "Документы: файлы, которые вы загружаете, — анализы, выписки, снимки.",
        "Переписка: сообщения в вашем кейсе, включая голосовые, и вложения к ним.",
        "Диалоги с ИИ-помощником: ваши вопросы и его ответы.",
        "Показатели, добавки и сон: значения, которые вы вносите сами, состав приёма и записи о сне — время засыпания и подъёма, продолжительность, ваша оценка самочувствия и заметки. Сюда же попадает то, что вы переносите файлом из приложения часов, кольца или браслета.",
        "Оплаты: сумма, тариф, валюта, дата и ссылка на платёж у платёжного провайдера. Данные банковской карты к нам не поступают и у нас не хранятся никогда.",
        "Согласия: отметка о принятии оферты и согласия на обработку данных — с датой, версией документа и языком, на котором вы его читали.",
        "Служебные записи: журнал действий с кейсом, счётчики обращений к помощнику."
      ]
    },
    {
      heading: "3. Зачем мы это делаем",
      paragraphs: [
        "Основание обработки — ваше согласие, которое вы даёте отдельной отметкой в анкете, и исполнение договора-оферты, который вы принимаете там же.",
        "Медицинскую информацию мы обрабатываем только на основании вашего явного согласия и только для подготовки и ведения вашего кейса. Мы не используем ваши данные для рекламы и не продаём их."
      ]
    },
    {
      heading: "4. Где данные хранятся и кто их видит",
      paragraphs: [
        "База данных и файловые хранилища размещены в Supabase. Загруженные документы и голосовые сообщения лежат в закрытых хранилищах: прямой ссылки на файл не существует, доступ выдаётся по временной ссылке и только тому, кто имеет право на этот кейс.",
        "Доступ к строкам базы разграничен на уровне самой базы: клиент видит только свой кейс, свои документы, свою переписку и свои показатели. Это правило действует не в интерфейсе, а в базе — обойти его из браузера нельзя.",
        "Внутри команды доступ к кейсу имеют Professor Python и сотрудники поддержки — ровно в объёме, который нужен для работы с вами. Каждое действие с кейсом записывается в журнал."
      ]
    },
    {
      heading: "5. Кому мы передаём данные",
      paragraphs: [
        "Мы не продаём данные и не передаём их третьим лицам для их собственных целей. Ниже — полный список сервисов, которые получают часть данных, чтобы платформа работала."
      ],
      bullets: [
        "Supabase (США) — база данных, аутентификация и хранилище файлов. Получает все данные платформы.",
        "Vercel (США) — хостинг сайта. Обрабатывает сетевые запросы, включая IP-адрес.",
        "Stripe (США) — приём оплат. Получает сумму, валюту, ваш email и идентификатор вашего профиля. Данные карты вы вводите на стороне Stripe, минуя нас.",
        "PayPal — альтернативный способ оплаты для стран, где недоступен основной. Получает те же платёжные сведения.",
        "Anthropic (США) — модель, на которой работает ИИ-помощник. Получает текст вашего сообщения, историю диалога, вложения к сообщению и краткую справку по вашему кейсу.",
        "OpenAI (США) — вторая модель, используемая как проверяющая инстанция для части ответов. Получает текст обращения и подготовленный ответ.",
        "Telegram — служебные уведомления команде: новое обращение или сообщение в поддержку (его тема), оплата и её сумма, сбой обработки. Туда уходят идентификаторы, тема и ссылка на рабочее место — не ваши документы, не переписка по кейсу и не содержимое анализов.",
        "Государственные органы — только если этого прямо требует закон."
      ]
    },
    {
      heading: "6. Как работает ИИ-помощник",
      paragraphs: [
        "Помощник — программа, а не врач. Он не ставит диагнозов и не назначает лечения; всё, что он говорит, — это рекомендация, а решение остаётся за вами и вашим лечащим врачом.",
        "Гостю на сайте помощник отвечает только на вопросы о центре и не имеет доступа ни к каким личным данным. После регистрации он видит ваш профиль и анкету. После начала сопровождения — материалы вашего кейса.",
        "Переписка с помощником сохраняется в вашем кейсе. Команда может её прочитать: помощник — часть сопровождения, а не отдельный анонимный чат."
      ]
    },
    {
      heading: "7. Гости сайта, счётчики и cookie",
      paragraphs: [
        "Чтобы помощник на главной странице не был исчерпан одним посетителем, обращения гостей считаются. Для счётчика IP-адрес не сохраняется: он необратимо преобразуется в хеш с секретной солью, и в базе остаётся только этот хеш. Восстановить из него адрес нельзя, и ни с каким профилем он не связывается.",
        "Мы используем cookie: технические cookie сессии — чтобы вы оставались в системе, и cookie выбранного языка. Рекламных и трекинговых cookie на платформе нет, сторонние аналитические системы не подключены."
      ]
    },
    {
      heading: "8. Сколько мы храним данные",
      paragraphs: [
        "Данные вашего кейса хранятся, пока идёт сопровождение, и после его завершения — потому что к пройденному пути возвращаются: вы можете вернуться через год, и история должна быть на месте.",
        "Записи об оплатах и согласиях мы храним дольше остальных данных: они подтверждают, на каких условиях и когда вы приняли договор, и нужны для отчётности.",
        "Вы можете в любой момент попросить удалить свои данные — как это сделать, в следующем разделе."
      ]
    },
    {
      heading: "9. Ваши права",
      paragraphs: [
        "Напишите на pythonsusa@gmail.com с адреса, на который зарегистрирован кабинет, и укажите, что именно вам нужно. Мы отвечаем в течение 30 дней."
      ],
      bullets: [
        "Получить копию данных, которые у нас есть о вас.",
        "Исправить неточность — часть данных вы можете поправить сами в кабинете.",
        "Удалить данные. Мы удалим их, кроме записей об оплатах и согласиях, которые обязаны сохранить.",
        "Отозвать согласие на обработку. Отзыв означает, что мы не сможем продолжать сопровождение, потому что оно на этих данных и держится.",
        "Возразить против обработки или потребовать её ограничения.",
        "Обратиться с жалобой в надзорный орган вашей страны, если наш ответ вас не устроит."
      ]
    },
    {
      heading: "10. Несовершеннолетние участники",
      paragraphs: [
        "Регистрацию проходит человек 21 года и старше. Если сопровождение нужно тому, кто младше, анкету заполняет родитель или законный опекун, отдельно подтверждая это в анкете и указывая данные участника. Согласие на обработку данных ребёнка даёт взрослый, и оно записывается отдельной строкой.",
        "Мы не собираем данные детей напрямую и не обращаемся к ним минуя взрослого."
      ]
    },
    {
      heading: "11. Безопасность",
      paragraphs: [
        "Соединение с сайтом шифруется. Документы и голосовые сообщения лежат в закрытых хранилищах и выдаются по временным ссылкам. Разграничение доступа действует на уровне базы данных. Действия с кейсом записываются в журнал.",
        "Ни одна система не защищена абсолютно. Если произойдёт утечка, затрагивающая ваши данные, мы сообщим вам об этом — через кабинет или на email."
      ]
    },
    {
      heading: "12. Изменения политики",
      paragraphs: [
        "Если этот документ изменится, наверху страницы поменяется дата редакции. О существенных изменениях мы сообщим в кабинете или на email."
      ]
    },
    {
      heading: "13. Как с нами связаться",
      paragraphs: [
        "По любым вопросам о данных: pythonsusa@gmail.com. Почтовый адрес: Pythons & Co, 1331 Amherst Ave, Apt PH5, Los Angeles, CA 90025, USA."
      ]
    }
  ],
  footer:
    "Этот документ дополняет договор-оферту. В части персональных данных действуют оба; при расхождении применяется настоящая политика."
};

const PRIVACY_EN: LegalDocument = {
  title: "PRIVACY POLICY",
  subtitle: "Python Method — how we handle your data",
  intro:
    "You trust us with the most personal things: test results, medical history, things people do not always say out loud. This document is written plainly and without generalities — it lists what exactly we keep, where, who sees it, and which services receive part of it. If a question remains after reading it, write to us and we will answer personally.",
  sections: [
    {
      heading: "1. Who is responsible for your data",
      paragraphs: [
        "The data controller is Pythons & Co, 1331 Amherst Ave, Apt PH5, Los Angeles, CA 90025, USA. For any question about your data: pythonsusa@gmail.com.",
        "The platform is not a medical institution. The materials you upload are materials for your support programme, not a medical record."
      ]
    },
    {
      heading: "2. What data we collect",
      paragraphs: [
        "We collect only what the work on your case needs. Nothing on this list is collected just in case."
      ],
      bullets: [
        "Registration: email and password (the password is held by our authentication provider as a hash — we never see it).",
        "Profile: first and last name, phone number, country, interface language.",
        "Questionnaire: your goal, a description of your situation, who the support is for, age confirmation, and — where a minor takes part — the participant's name and date of birth together with the parent's or guardian's details.",
        "Documents: the files you upload — test results, discharge summaries, scans.",
        "Correspondence: the messages in your case, including voice messages and their attachments.",
        "Conversations with the AI assistant: your questions and its answers.",
        "Metrics, supplements and sleep: the values you enter yourself, your intake plan, and your sleep records — bedtime and wake-up time, duration, your own rating of how you felt, and notes. This also covers what you bring over as a file from the app of a watch, ring or bracelet.",
        "Payments: amount, plan, currency, date and a reference to the payment held by the payment provider. Card details never reach us and are never stored by us.",
        "Consents: the record that you accepted the offer and consented to the processing of your data — with the date, the version of the document and the language you read it in.",
        "Service records: the log of actions on your case and counters of assistant usage."
      ]
    },
    {
      heading: "3. Why we do this",
      paragraphs: [
        "The basis for processing is your consent, given by a separate tick in the questionnaire, and the performance of the offer agreement you accept in the same place.",
        "We process medical information only on the basis of your explicit consent and only to prepare and run your case. We do not use your data for advertising and we do not sell it."
      ]
    },
    {
      heading: "4. Where the data is kept and who sees it",
      paragraphs: [
        "The database and the file storage are hosted on Supabase. Uploaded documents and voice messages sit in private storage: no direct link to a file exists, and access is granted through a temporary link and only to someone entitled to that case.",
        "Access to rows is separated at the level of the database itself: a client sees only their own case, their own documents, their own correspondence and their own metrics. That rule lives in the database, not in the interface — it cannot be bypassed from a browser.",
        "Within the team, Professor Python and the support staff have access to a case, to exactly the extent the work with you requires. Every action on a case is written to a log."
      ]
    },
    {
      heading: "5. Who we pass data to",
      paragraphs: [
        "We do not sell data and do not pass it to third parties for their own purposes. Below is the complete list of services that receive part of the data so that the platform can work."
      ],
      bullets: [
        "Supabase (USA) — database, authentication and file storage. Receives all platform data.",
        "Vercel (USA) — website hosting. Processes network requests, including the IP address.",
        "Stripe (USA) — payment processing. Receives the amount, the currency, your email and your profile identifier. You enter your card details on Stripe's side, not ours.",
        "PayPal — an alternative payment route for countries where the main one is unavailable. Receives the same payment details.",
        "Anthropic (USA) — the model the AI assistant runs on. Receives the text of your message, the conversation history, the attachments to your message and a brief summary of your case.",
        "OpenAI (USA) — a second model used to review part of the answers. Receives the text of the enquiry and the prepared answer.",
        "Telegram — service notifications to the team: a new support request or message (its subject), a payment and its amount, a processing failure. What goes there is identifiers, the subject and a link to the workspace — not your documents, not your case correspondence and not the content of your test results.",
        "Public authorities — only where the law directly requires it."
      ]
    },
    {
      heading: "6. How the AI assistant works",
      paragraphs: [
        "The assistant is a program, not a doctor. It does not diagnose and does not prescribe treatment; everything it says is a recommendation, and the decision stays with you and your treating physician.",
        "For a visitor to the site, the assistant answers only questions about the centre and has no access to any personal data. After registration it sees your profile and your questionnaire. Once your support programme begins, it sees the materials of your case.",
        "Your conversation with the assistant is stored in your case. The team can read it: the assistant is part of your support programme, not a separate anonymous chat."
      ]
    },
    {
      heading: "7. Site visitors, counters and cookies",
      paragraphs: [
        "So that one visitor cannot exhaust the assistant on the front page, visitors' messages are counted. The IP address is not stored for that counter: it is irreversibly turned into a hash with a secret salt, and only the hash remains in the database. The address cannot be recovered from it, and it is not linked to any profile.",
        "We use cookies: technical session cookies, so that you stay signed in, and a cookie for your chosen language. There are no advertising or tracking cookies on the platform, and no third-party analytics are connected."
      ]
    },
    {
      heading: "8. How long we keep data",
      paragraphs: [
        "The data of your case is kept while the support programme runs, and afterwards — because people come back to the road they have travelled: you may return a year later, and the history should still be there.",
        "Records of payments and consents are kept longer than the rest: they show on what terms and when you accepted the contract, and they are needed for accounting.",
        "You can ask us to delete your data at any time — the next section explains how."
      ]
    },
    {
      heading: "9. Your rights",
      paragraphs: [
        "Write to pythonsusa@gmail.com from the address your cabinet is registered to and tell us what you need. We answer within 30 days."
      ],
      bullets: [
        "Receive a copy of the data we hold about you.",
        "Correct an inaccuracy — part of the data you can correct yourself in your cabinet.",
        "Delete your data. We will delete it, other than the records of payments and consents that we are obliged to keep.",
        "Withdraw your consent to processing. Withdrawal means we cannot continue the support programme, because the programme rests on that data.",
        "Object to processing or ask for it to be restricted.",
        "Complain to the supervisory authority in your country if our answer does not satisfy you."
      ]
    },
    {
      heading: "10. Participants under 21",
      paragraphs: [
        "Registration is completed by a person aged 21 or over. If the support is needed by someone younger, the questionnaire is filled in by a parent or legal guardian, who confirms this separately in the form and gives the participant's details. Consent to the processing of a child's data is given by the adult, and it is recorded as a separate entry.",
        "We do not collect children's data directly and do not approach a child without the adult."
      ]
    },
    {
      heading: "11. Security",
      paragraphs: [
        "The connection to the site is encrypted. Documents and voice messages sit in private storage and are served through temporary links. Access separation is enforced at the database level. Actions on a case are written to a log.",
        "No system is absolutely secure. If a breach affecting your data occurs, we will tell you about it — through your cabinet or by email."
      ]
    },
    {
      heading: "12. Changes to this policy",
      paragraphs: [
        "If this document changes, the revision date at the top of the page changes with it. We will announce material changes in your cabinet or by email."
      ]
    },
    {
      heading: "13. How to reach us",
      paragraphs: [
        "For any question about data: pythonsusa@gmail.com. Postal address: Pythons & Co, 1331 Amherst Ave, Apt PH5, Los Angeles, CA 90025, USA."
      ]
    }
  ],
  footer:
    "This document supplements the offer agreement. Both apply to personal data; where they differ, this policy prevails."
};

const REFUND_RU: LegalDocument = {
  title: "УСЛОВИЯ ОПЛАТЫ И ВОЗВРАТА",
  subtitle: "Python Method — что происходит с деньгами после оплаты",
  intro:
    "Коротко: возврат средств после оплаты не предусмотрен, потому что работа над вашим кейсом начинается в день оплаты. Мы говорим об этом до оплаты, а не после — на странице оплаты вы подтверждаете это отдельной отметкой. Ниже подробно: почему так, что происходит, если что-то пойдёт не по плану, и что делать при ошибке списания.",
  sections: [
    {
      heading: "1. Что можно попробовать до оплаты",
      paragraphs: [
        "Помощник центра на сайте и в личном кабинете, дневник показателей и чек-лист добавок доступны до всякой оплаты. Мы намеренно устроили так, чтобы вы платили не вслепую.",
        "Разбор анализов (500 USD, сервисный сбор включён) и сопровождение оплачиваются по договору-оферте. Разбор начинается сразу после оплаты, поэтому на него распространяются те же правила, что и на сопровождение, — они описаны ниже."
      ]
    },
    {
      heading: "2. Когда начинается работа",
      paragraphs: [
        "Оплаченное сопровождение начинается в день подтверждения оплаты: ваш кейс активируется в системе, и Professor Python приступает к разбору ваших материалов. С этого момента в работу вложено время и личное внимание автора метода — их нельзя вернуть обратно.",
        "Именно поэтому возврат средств после оплаты не предусмотрен. Это условие пункта 8 договора-оферты, который вы принимаете перед оплатой."
      ]
    },
    {
      heading: "3. Что вы подтверждаете перед оплатой",
      paragraphs: [
        "На странице оплаты стоят две отметки, и обе обязательны. Первая — что вы ознакомились с офертой и принимаете её условия. Вторая — что вы просите начать работу немедленно и понимаете, что в связи с немедленным началом исполнения право отказа от договора, предусмотренное законодательством некоторых стран, не применяется, а возврат средств после оплаты не предусмотрен.",
        "Обе отметки записываются с датой, версией оферты и языком, на котором вы её читали. Это защищает и вас: видно, что именно вам показали в момент оплаты."
      ]
    },
    {
      heading: "4. Из чего складывается сумма",
      paragraphs: [
        "Сопровождение 5 недель: 1 200 USD программа + 5% сервисный сбор + 180 USD доставка индивидуальной формулы (200 капсул). Итого 1 440 USD.",
        "Сопровождение 100 дней: 3 500 USD программа + 5% сервисный сбор. Итого 3 675 USD. Индивидуальная формула на весь срок (600 капсул) входит в стоимость.",
        "Сервисный сбор 5% — это комиссия платёжной системы, он указан отдельно, а не спрятан в цене."
      ]
    },
    {
      heading: "5. Если что-то пойдёт не по плану с нашей стороны",
      paragraphs: [
        "Если события вне нашего контроля временно помешают сопровождению, ваше время не сгорит: срок программы продлевается на этот период, и мы сообщаем вам через кабинет или на email. Это пункт 10 оферты.",
        "Мы не отменяем оплаченное сопровождение в одностороннем порядке. Если по какой-то причине мы не сможем его провести совсем, мы свяжемся с вами и решим вопрос лично — этот случай не описан заранее, потому что он не случался, и решать его шаблоном было бы нечестно."
      ]
    },
    {
      heading: "6. Ошибка списания — другой случай",
      paragraphs: [
        "Возврат не предусмотрен за уже начатую работу. Но если деньги списались за то, чего не было, это не оплата услуги, а ошибка, и мы её исправляем.",
        "Мы возвращаем средства полностью, если: платёж прошёл дважды за один и тот же тариф; списание произошло, но доступ к сопровождению так и не открылся; списана сумма, отличная от указанной на странице оплаты.",
        "Напишите на pythonsusa@gmail.com, приложив дату и сумму списания. Мы отвечаем в течение 3 рабочих дней и возвращаем средства тем же способом, которым была совершена оплата."
      ]
    },
    {
      heading: "7. Если вы хотите оспорить платёж в банке",
      paragraphs: [
        "Права, которые даёт вам ваш банк или платёжная система, эта страница не отменяет. Но прежде чем открывать спор, напишите нам: если это ошибка списания, мы вернём деньги быстрее, чем пройдёт банковская процедура.",
        "Открытый спор приостанавливает работу по кейсу до его разрешения — не в наказание, а потому что средства на время спора заморожены."
      ]
    },
    {
      heading: "7. Смена тарифа",
      paragraphs: [
        "Перейти с 5 недель на 100 дней можно: вы доплачиваете разницу, а пройденное время засчитывается. Обратный переход с возвратом разницы не предусмотрен — работа по расширенной программе к этому моменту уже ведётся.",
        "Напишите нам, и мы посчитаем доплату лично для вашего случая."
      ]
    },
    {
      heading: "8. Куда писать",
      paragraphs: [
        "По любому вопросу об оплате: pythonsusa@gmail.com или страница «Поддержка» в кабинете. Мы отвечаем на email в течение 24 часов в рабочие дни.",
        "Если что-то в условиях непонятно — спросите до оплаты. Мы отвечаем на такие вопросы лично и не считаем их лишними."
      ]
    }
  ],
  footer:
    "Обязательными являются условия договора-оферты, пункт 8. Эта страница объясняет их простым языком и не заменяет их; при расхождении применяется оферта в русской редакции."
};

const REFUND_EN: LegalDocument = {
  title: "PAYMENT AND REFUND TERMS",
  subtitle: "Python Method — what happens to the money after you pay",
  intro:
    "In short: no refund is provided after payment, because work on your case begins on the day you pay. We say this before you pay rather than after — on the payment page you confirm it with a separate tick. Below is the detail: why it works this way, what happens if something does not go to plan, and what to do about a billing error.",
  sections: [
    {
      heading: "1. What you can try before paying",
      paragraphs: [
        "The centre's assistant on the site and in your cabinet, the metrics diary and the supplement checklist are available before any payment. We arranged it this way deliberately, so that you are not paying blind.",
        "The analyses review (500 USD, service fee included) and the support programmes are paid under the offer contract. The review begins immediately after payment, so the same rules apply to it as to the support programmes — they are set out below."
      ]
    },
    {
      heading: "2. When the work begins",
      paragraphs: [
        "A paid support programme begins on the day your payment is confirmed: your case is activated in the system and Professor Python starts reviewing your materials. From that moment the time and personal attention of the author of the method have been invested — and they cannot be taken back.",
        "This is why no refund is provided after payment. It is the term set out in clause 8 of the offer agreement, which you accept before paying."
      ]
    },
    {
      heading: "3. What you confirm before paying",
      paragraphs: [
        "There are two tick boxes on the payment page, and both are required. The first is that you have read the offer and accept its terms. The second is that you are asking for the work to begin immediately and understand that, because performance begins immediately, the right of withdrawal from the contract provided for by the legislation of some countries does not apply, and that no refund is provided after payment.",
        "Both ticks are recorded with the date, the version of the offer and the language you read it in. That protects you too: it is visible exactly what you were shown at the moment of payment."
      ]
    },
    {
      heading: "4. What the amount is made of",
      paragraphs: [
        "Five-week support programme: 1,200 USD for the programme + a 5% service fee + 180 USD for delivery of the individual formula (200 capsules). Total 1,440 USD.",
        "100-day support programme: 3,500 USD for the programme + a 5% service fee. Total 3,675 USD. The individual formula for the whole term (600 capsules) is included.",
        "The 5% service fee is the payment system's commission; it is shown separately rather than hidden inside the price."
      ]
    },
    {
      heading: "5. If something goes wrong on our side",
      paragraphs: [
        "If events beyond our control temporarily interrupt the support programme, your time is not lost: the term of the programme is extended by that period, and we tell you through your cabinet or by email. That is clause 10 of the offer.",
        "We do not cancel a paid support programme unilaterally. If for some reason we could not carry it out at all, we would contact you and settle the matter personally — that case is not described in advance because it has not happened, and settling it with a template would not be honest."
      ]
    },
    {
      heading: "6. A billing error is a different matter",
      paragraphs: [
        "No refund is provided for work already begun. But if money was taken for something that did not happen, that is not payment for a service — it is an error, and we correct it.",
        "We return the funds in full if: the payment went through twice for the same plan; the charge was made but access to the support programme never opened; or an amount different from the one shown on the payment page was charged.",
        "Write to pythonsusa@gmail.com with the date and the amount of the charge. We reply within 3 working days and return the funds by the same route the payment was made."
      ]
    },
    {
      heading: "7. If you want to dispute a payment with your bank",
      paragraphs: [
        "This page does not remove the rights your bank or payment system gives you. But before opening a dispute, write to us: if it is a billing error, we will return the money faster than the bank's procedure runs.",
        "An open dispute pauses work on the case until it is resolved — not as a penalty, but because the funds are frozen while the dispute lasts."
      ]
    },
    {
      heading: "7. Changing your plan",
      paragraphs: [
        "You can move from the five-week programme to the 100-day one: you pay the difference and the time already spent counts towards it. Moving back, with the difference returned, is not provided for — by that point the work on the longer programme is already under way.",
        "Write to us and we will calculate the difference for your particular case."
      ]
    },
    {
      heading: "8. Where to write",
      paragraphs: [
        "For any question about payment: pythonsusa@gmail.com, or the Support page in your cabinet. We answer email within 24 hours on working days.",
        "If anything in the terms is unclear, ask before you pay. We answer such questions personally and never consider them a nuisance."
      ]
    }
  ],
  footer:
    "The binding terms are those of the offer agreement, clause 8. This page explains them in plain language and does not replace them; where they differ, the offer in its Russian edition prevails."
};

export const PRIVACY_CONTENT: Record<Locale, LegalDocument> = {
  ru: PRIVACY_RU,
  en: PRIVACY_EN
};

export const REFUND_CONTENT: Record<Locale, LegalDocument> = {
  ru: REFUND_RU,
  en: REFUND_EN
};
