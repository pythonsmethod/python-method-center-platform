import type { Locale } from "@/lib/i18n/locale";

// The offer agreement, both languages side by side.
//
// Kept as content rather than as two PDFs on purpose: the two languages sit
// next to each other, so a change to one that is not made to the other is
// visible immediately, and every amendment to a contract shows up in a diff
// that can be read line by line.
//
// The Russian text is the binding one. The English is a faithful
// translation of it.
//
// --- v3 amendments, against the oferta-v2 PDF ---------------------------
// The v2 text priced the five-week programme at 1,060 USD, while the site
// charged 1,440 USD and had done throughout. The founder confirmed 1,440 is
// the correct figure, so the contract was wrong, not the site.
//
// 1,440 does not follow from 1,060 by any arithmetic, and it does not
// follow from the base price alone either: it is 1,200 + 5% service fee +
// 180 for delivery of the formula. The formula was never mentioned in v2 at
// all, though both the site and the assistant promise it on both
// programmes — so a client could not have derived the price they were
// charged from the contract they accepted.
//
// v3 therefore corrects the base price and states the formula and its
// delivery. Both changes are in the client's favour: they describe
// something they receive, and they make the total checkable.
//
// v3 also renames the long programme from "15 weeks" to "100 days". The
// system opens a 100-day support period (PLAN_DURATION_DAYS) and the site
// has always said 100 days; 15 weeks is 105, so the contract promised five
// days more than anything actually delivers.
//
// --- v4 amendment, clause 3 ---------------------------------------------
// The review was once the free launch format; v6 makes it a paid one at
// "helps you understand the direction and decide whether you need the
// support programme". The founder's correction: it is not a step towards a
// sale. It is an assessment of where the person stands today and what is
// happening with their body's markers.
//
// The site copy and the assistant were corrected first, and the contract
// was left behind — so for a while the document a client signed described
// the product differently from the page that sold it. Clause 3 now uses the
// same words as the site.
//
// Nothing about what is delivered, what it costs or what the client is
// entitled to changes; only the description of the purpose. tests/
// review-product.test.ts now checks the contract as well as the
// site, so the two cannot drift apart again.
//
// This wording has not been reviewed by a lawyer.

export type OfferSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type OfferDocument = {
  title: string;
  subtitle: string;
  intro: string | null;
  sections: OfferSection[];
  footer: string;
  trademark: string;
};

const RU: OfferDocument = {
  title: "ДОГОВОР-ОФЕРТА",
  subtitle: "Python Method — программа индивидуального сопровождения",
  intro: null,
  sections: [
    {
      heading: "Несколько слов перед началом",
      paragraphs: [
        "Этот документ — наши договорённости с вами. Мы написали его простым языком, потому что вам сейчас важнее ясность, чем юридические обороты. Если что-то непонятно — напишите нам до оплаты, мы ответим лично."
      ]
    },
    {
      heading: "1. О программе",
      paragraphs: [
        "Это авторская программа восстановления организма, созданная на основе тридцатилетней практики и опыта работы с людьми в 36 странах.",
        "Работа всегда индивидуальна. Здесь нет шаблонов: направление, продолжительность и содержание работы определяются по вашим документам, показателям и текущему состоянию."
      ]
    },
    {
      heading: "2. Кто рядом с вами",
      paragraphs: [
        "Автор и ведущий специалист программы — Карен, в дальнейшем именуемый Professor Python, специалист по восстановлению организма, автор метода с тридцатилетней практикой сопровождения людей в восстановлении.",
        "Программа предоставляется компанией Pythons & Co, зарегистрированной в США. Адрес: 1331 Amherst Ave, Apt PH5, Los Angeles, CA 90025, USA. Email: pythonsusa@gmail.com"
      ]
    },
    {
      heading: "3. Форматы участия",
      paragraphs: [
        "Разбор анализов — 500 USD. Личный разбор ваших анализов от Professor Python без сопровождения: обратная связь по состоянию организма и рекомендации файлом в личный кабинет — до трёх рабочих дней после загрузки документов, затем три рабочих дня открытого чата с Professor Python для вопросов. Предоставляется один раз за одну оплату и ни к чему не обязывает: переходить на сопровождение или нет, вы решаете сами. Сервисный сбор за обработку международного платежа включён в эту цену: к оплате ровно 500 USD.",
        "Сопровождение 5 недель — 1 200 USD. Полный разбор ваших документов и показателей, заключение Professor Python и 5 недель индивидуального сопровождения: ваша восстановительная программа, её корректировки и возможность задавать вопросы на всём протяжении срока.",
        "Сопровождение 100 дней — 3 500 USD. Для тех, кому нужна длительная работа: восстановление в динамике, прохождение нескольких этапов, поддержка в периоды лечения. Качество работы во всех форматах одинаковое — отличается только продолжительность участия Professor Python.",
        "Формула Professor Python. На обоих форматах сопровождения Professor Python отправляет свою формулу от своего имени как подарок: 200 капсул на формате «5 недель» и 600 капсул на формате «100 дней». На формате «5 недель» доставка формулы оплачивается отдельно — 180 USD, и входит в итоговую сумму к оплате. На формате «100 дней» доставку Professor Python берёт на себя. В разбор анализов формула не входит.",
        "Итоговая сумма к оплате. К платежам за сопровождение добавляется сервисный сбор за обработку международного платежа — 5%; в цену разбора анализов он уже включён. Итог по формату «5 недель»: 1 200 USD + 5% + 180 USD доставки = 1 440 USD. Итог по формату «100 дней»: 3 500 USD + 5% = 3 675 USD. Итог по формату «Разбор анализов»: 500 USD.",
        "Переход на сопровождение. Разбор анализов оплачивается отдельно, и при переходе на сопровождение оплачивается полная стоимость выбранного формата. Ваш кейс и история сохраняются и доступны Professor Python при старте сопровождения.",
        "Продление. Любое сопровождение можно продлить по вашему желанию — столько раз, сколько вам нужно."
      ]
    },
    {
      heading: "4. Что входит в сопровождение",
      bullets: [
        "изучение предоставленных вами документов и показателей для понимания вашей ситуации;",
        "индивидуальная восстановительная программа, сформированная на основе ваших личных данных;",
        "регулярные корректировки программы с учётом изменений вашего самочувствия;",
        "сопровождение через личный кабинет на сайте;",
        "видеозвонки по необходимости;",
        "возможность задавать вопросы в течение действия программы;",
        "информационная поддержка в периоды прохождения лечения, назначенного вашим врачом;",
        "формула Professor Python в подарок, на условиях раздела 3."
      ]
    },
    {
      heading: "5. Что важно понимать о программе",
      paragraphs: [
        "Программа — это передача опыта, знаний и индивидуальных рекомендаций по восстановлению. Она не является медицинской услугой, не заменяет лечение и не отменяет наблюдение у ваших врачей.",
        "Если вы проходите назначенное лечение — пожалуйста, продолжайте его. Любые решения об изменении терапии принимаются вами вместе с вашим лечащим врачом. Программа дополняет ваш путь, а не заменяет его.",
        "Программа не является службой экстренной помощи. При резком ухудшении состояния немедленно обращайтесь к вашему лечащему врачу или в службу неотложной помощи.",
        "Результат зависит от вовлечённости, дисциплины и индивидуальных особенностей. Каждый человек уникален — поэтому и работа ведётся персонально."
      ]
    },
    {
      heading: "6. О взаимном уважении",
      paragraphs: [
        "Мы работаем с людьми, проходящими через очень сложные периоды жизни, и относимся к каждому с уважением и заботой. Мы просим того же в ответ. В редких случаях грубого или деструктивного поведения мы оставляем за собой право прекратить сопровождение — это нужно для сохранения здоровой среды, в которой мы можем помогать."
      ]
    },
    {
      heading: "7. Возраст участников",
      paragraphs: [
        "Программа предназначена для участников старше 21 года. Участие младше 21 года возможно только вместе с родителями или законными представителями и при их письменном согласии с условиями этого договора."
      ]
    },
    {
      heading: "8. Перед оплатой",
      paragraphs: [
        "Работа с вашим кейсом начинается в день подтверждения оплаты: ваш кейс активируется в системе, и Professor Python приступает к разбору материалов. С этого момента в работу вкладывается время, опыт и личное внимание автора метода, которые невозможно вернуть обратно.",
        "Поэтому возврат денежных средств после оплаты не предусмотрен. Перед оплатой вы отдельно подтверждаете, что просите начать работу немедленно и понимаете, что в связи с немедленным началом исполнения право отказа от договора, предусмотренное законодательством некоторых стран, не применяется.",
        "Доступ к методу, материалам и рекомендациям — персональный. Передача их третьим лицам форматом участия не предусмотрена."
      ]
    },
    {
      heading: "9. Ваши данные",
      paragraphs: [
        "Для работы нам нужны ваши данные: имя, контакты, медицинская информация, результаты анализов. Мы относимся к ним с особой бережностью, используем только для вашей программы и не передаём третьим лицам без вашего согласия, кроме случаев, прямо предусмотренных законом.",
        "Вы можете в любой момент запросить удаление своих данных, написав на pythonsusa@gmail.com."
      ]
    },
    {
      heading: "10. Если что-то пойдёт не по плану",
      paragraphs: [
        "Если события вне нашего контроля временно помешают сопровождению, ваше время не сгорит — мы продлим срок программы на этот период и сообщим вам через личный кабинет или email."
      ]
    },
    {
      heading: "11. Если возникнут разногласия",
      paragraphs: [
        "Мы верим, что любые вопросы решаются разговором — напишите нам, и мы ответим лично. Настоящий договор регулируется правом штата Калифорния (США); в редких случаях, когда вопрос не удаётся решить вместе, он рассматривается в судах округа Лос-Анджелес, Калифорния."
      ]
    },
    {
      heading: "12. Актуальность условий",
      paragraphs: [
        "Действует версия договора на момент подтверждения вашего участия. Условия могут обновляться по мере развития метода, но изменения касаются только новых оплат — участников, уже находящихся в программе, они не затрагивают."
      ]
    },
    {
      heading: "13. Подтверждение участия",
      paragraphs: [
        "Участие подтверждается в два шага:",
        "1. Вы знакомитесь с этим договором и подтверждаете готовность к участию, включая просьбу начать работу немедленно.",
        "2. Вы производите оплату через защищённую платёжную систему.",
        "Эти два шага вместе фиксируют ваше осознанное согласие с условиями договора."
      ]
    }
  ],
  footer:
    "Pythons & Co — 1331 Amherst Ave, Apt PH5, Los Angeles, CA 90025, USA — pythonsusa@gmail.com",
  trademark:
    "«Python Method» — авторское название метода, отражающее концепцию системной передачи опыта и помощи в восстановлении."
};

const EN: OfferDocument = {
  title: "OFFER AGREEMENT",
  subtitle: "Python Method — individual support programme",
  intro:
    "This is an English translation of the Russian original. It is provided so that you can read what you are agreeing to. In the event of any discrepancy between the two texts, the Russian version prevails. If anything here is unclear, write to us before paying and we will explain it personally.",
  sections: [
    {
      heading: "A few words before we begin",
      paragraphs: [
        "This document is our agreement with you. We have written it in plain language, because right now clarity matters to you more than legal phrasing. If anything is unclear, write to us before you pay and we will answer personally."
      ]
    },
    {
      heading: "1. About the programme",
      paragraphs: [
        "This is an original programme for restoring the body, built on thirty years of practice and work with people in 36 countries.",
        "The work is always individual. There are no templates here: the direction, the length and the content of the work are determined by your documents, your indicators and your current condition."
      ]
    },
    {
      heading: "2. Who is beside you",
      paragraphs: [
        "The author and lead specialist of the programme is Karen, hereinafter referred to as Professor Python, a specialist in restoring the body and the author of the method, with thirty years of practice accompanying people through recovery.",
        "The programme is provided by Pythons & Co, registered in the USA. Address: 1331 Amherst Ave, Apt PH5, Los Angeles, CA 90025, USA. Email: pythonsusa@gmail.com"
      ]
    },
    {
      heading: "3. Ways to take part",
      paragraphs: [
        "Analyses review — 500 USD. A personal review of your test results by Professor Python without the support programme: feedback on the state of your body and recommendations as a file in your personal cabinet — within three working days of uploading your documents, followed by three working days of open chat with Professor Python for questions. Provided once per payment and without obligation: whether to move on to a support programme is your decision. The service fee for processing an international payment is included in this price: exactly 500 USD is payable.",
        "Support programme, 5 weeks — 1,200 USD. A full review of your documents and indicators, Professor Python's conclusion, and 5 weeks of individual support: your recovery programme, its adjustments, and the ability to ask questions throughout the period.",
        "Support programme, 100 days — 3,500 USD. For those who need longer work: recovery followed over time, moving through several stages, and support during periods of treatment. The quality of the work is the same in every format — only the length of Professor Python's involvement differs.",
        "Professor Python's formula. On both support formats Professor Python sends his formula personally, as a gift: 200 capsules on the 5-week format and 600 capsules on the 100-day format. On the 5-week format, delivery of the formula is paid separately — 180 USD, included in the final amount payable. On the 100-day format Professor Python covers delivery himself. The formula is not part of the analyses review.",
        "The final amount payable. A service fee for processing an international payment — 5% — is added to the support programmes; the analyses review price already includes it. Total for the 5-week format: 1,200 USD + 5% + 180 USD delivery = 1,440 USD. Total for the 100-day format: 3,500 USD + 5% = 3,675 USD. Total for the analyses review: 500 USD.",
        "Moving to the support programme. The analyses review is paid separately, and when you move to a support programme the full price of the chosen format is payable. Your case and your history are kept and are available to Professor Python when the support programme starts.",
        "Extension. Any support programme can be extended if you wish — as many times as you need."
      ]
    },
    {
      heading: "4. What the support programme includes",
      bullets: [
        "study of the documents and indicators you provide, in order to understand your situation;",
        "an individual recovery programme, formed on the basis of your personal data;",
        "regular adjustments to the programme as your wellbeing changes;",
        "support through your personal cabinet on the website;",
        "video calls where needed;",
        "the ability to ask questions for as long as the programme runs;",
        "informational support during periods of treatment prescribed by your doctor;",
        "Professor Python's formula as a gift, on the terms set out in section 3."
      ]
    },
    {
      heading: "5. What is important to understand about the programme",
      paragraphs: [
        "The programme is the passing on of experience, knowledge and individual recommendations for recovery. It is not a medical service, it does not replace treatment, and it does not remove the need for observation by your doctors.",
        "If you are undergoing prescribed treatment, please continue it. Any decision to change your therapy is taken by you together with your treating doctor. The programme complements your path; it does not replace it.",
        "The programme is not an emergency service. If your condition deteriorates sharply, contact your treating doctor or emergency services immediately.",
        "The outcome depends on your involvement, your discipline and your individual characteristics. Every person is unique — which is why the work is carried out personally."
      ]
    },
    {
      heading: "6. On mutual respect",
      paragraphs: [
        "We work with people going through very difficult periods of their lives, and we treat each of them with respect and care. We ask for the same in return. In the rare cases of rude or destructive behaviour, we reserve the right to end the support programme — this is necessary to preserve the healthy environment in which we are able to help."
      ]
    },
    {
      heading: "7. Age of participants",
      paragraphs: [
        "The programme is intended for participants over 21 years of age. Participation under the age of 21 is possible only together with parents or legal guardians and with their written agreement to the terms of this contract."
      ]
    },
    {
      heading: "8. Before you pay",
      paragraphs: [
        "Work on your case begins on the day your payment is confirmed: your case is activated in the system and Professor Python starts reviewing your materials. From that moment onwards, the time, experience and personal attention of the author of the method are invested in the work, and they cannot be returned.",
        "For this reason, no refund of funds is provided after payment. Before paying, you separately confirm that you are asking for the work to begin immediately, and that you understand that, because performance begins immediately, the right of withdrawal from the contract provided for by the legislation of some countries does not apply.",
        "Access to the method, the materials and the recommendations is personal. Passing them on to third parties is not part of any format of participation."
      ]
    },
    {
      heading: "9. Your data",
      paragraphs: [
        "To do this work we need your data: your name, your contact details, medical information and test results. We treat it with particular care, use it only for your programme, and do not pass it to third parties without your consent, other than in cases directly provided for by law.",
        "You may request the deletion of your data at any time by writing to pythonsusa@gmail.com."
      ]
    },
    {
      heading: "10. If something does not go to plan",
      paragraphs: [
        "If events beyond our control temporarily interrupt the support programme, your time will not be lost — we will extend the term of the programme by that period and let you know through your personal cabinet or by email."
      ]
    },
    {
      heading: "11. If a disagreement arises",
      paragraphs: [
        "We believe any question can be settled by talking — write to us and we will answer personally. This contract is governed by the law of the State of California (USA); in the rare cases where a question cannot be resolved together, it is heard in the courts of Los Angeles County, California."
      ]
    },
    {
      heading: "12. Currency of the terms",
      paragraphs: [
        "The version of the contract in force at the moment your participation is confirmed applies. The terms may be updated as the method develops, but changes affect only new payments — they do not affect participants already in the programme."
      ]
    },
    {
      heading: "13. Confirmation of participation",
      paragraphs: [
        "Participation is confirmed in two steps:",
        "1. You read this contract and confirm that you are ready to take part, including your request that the work begin immediately.",
        "2. You make payment through a secure payment system.",
        "These two steps together record your informed agreement to the terms of the contract."
      ]
    }
  ],
  footer:
    "Pythons & Co — 1331 Amherst Ave, Apt PH5, Los Angeles, CA 90025, USA — pythonsusa@gmail.com",
  trademark:
    "“Python Method” is the author's name for the method, reflecting the idea of passing on experience systematically and helping people recover."
};

export const OFFER_CONTENT: Record<Locale, OfferDocument> = { ru: RU, en: EN };
