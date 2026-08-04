// English text of the public offer.
//
// A translation of the Russian original at
// public/legal/python-method-oferta-v2.pdf, kept here as structured content
// rather than as a second PDF so that any change to it shows up in a diff
// and can be reviewed line by line.
//
// It is translated faithfully, including the figures. Where the Russian
// document and the website disagree — and they do, on the five-week price
// and on what the free tier includes — the disagreement is left visible
// rather than quietly resolved here. A contract is not the place to guess
// which of two numbers was meant.
//
// It has not been reviewed by a lawyer. Until it has been, the Russian
// text remains the binding one and the note below says so.

export type OfferSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export const OFFER_EN_TITLE = "OFFER AGREEMENT";
export const OFFER_EN_SUBTITLE =
  "Python Method — individual support programme";

export const OFFER_EN_TRANSLATION_NOTE =
  "This is an English translation of the Russian original. It is provided so that you can read what you are agreeing to. In the event of any discrepancy between the two texts, the Russian version prevails. If anything here is unclear, write to us before paying and we will explain it personally.";

export const OFFER_EN_SECTIONS: OfferSection[] = [
  {
    heading: "A few words before we begin",
    paragraphs: [
      "This document is our agreement with you. We have written it in plain language, because right now clarity matters to you more than legal phrasing. If anything is unclear, write to us before you pay and we will answer personally."
    ]
  },
  {
    heading: "1. About the programme",
    paragraphs: [
      "This is an original programme for restoring the body, built on thirty years of practice and work with people in 34 countries.",
      "The work is always individual. There are no templates here: the direction, the length and the content of the work are determined by your documents, your indicators and your current condition."
    ]
  },
  {
    heading: "2. Who is beside you",
    paragraphs: [
      "The author and lead specialist of the programme is Karen, a specialist in restoring the body and the author of the method, with thirty years of practice accompanying people through recovery.",
      "The programme is provided by Pythons & Co, registered in the USA. Address: 1331 Amherst Ave, Apt PH5, Los Angeles, CA 90025, USA. Email: pythonsusa@gmail.com"
    ]
  },
  {
    heading: "3. Ways to take part",
    paragraphs: [
      "Preliminary analysis of your resource state — free of charge. After registering in your personal cabinet, a free preliminary analysis is available to you. You send your data, our AI collects and structures it into a prepared file, Karen forms a preliminary orienting assessment of your resource state, and you receive a reply marked as Karen's answer.",
      "This is an orienting assessment, not a full review: it helps you understand the direction and decide whether you need the support programme. It is provided once. A full review, recommendations and the support programme are part of the paid formats below.",
      "Support programme, 5 weeks — 1,060 USD. A full review of your documents and indicators, Karen's conclusion, and 5 weeks of individual support: your recovery programme, its adjustments, and the ability to ask questions throughout the period.",
      "Support programme, 15 weeks — 3,500 USD. For those who need longer work: recovery followed over time, moving through several stages, and support during periods of treatment. The quality of the work is the same in every format — only the length of Karen's involvement differs.",
      "Moving to the support programme. The preliminary analysis is free, so when you move to a paid support programme the full price of the chosen format is payable. Your case and your history are kept and are available to Karen when the support programme starts.",
      "Extension. Any support programme can be extended if you wish — as many times as you need.",
      "A service fee for processing an international payment — 5% — is added to every payment."
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
      "informational support during periods of treatment prescribed by your doctor."
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
      "Work on your case begins on the day your payment is confirmed: your case is activated in the system and Karen starts reviewing your materials. From that moment onwards, the time, experience and personal attention of the author of the method are invested in the work, and they cannot be returned.",
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
];

export const OFFER_EN_FOOTER =
  "Pythons & Co — 1331 Amherst Ave, Apt PH5, Los Angeles, CA 90025, USA — pythonsusa@gmail.com";

export const OFFER_EN_TRADEMARK_NOTE =
  "“Python Method” is the author's name for the method, reflecting the idea of passing on experience systematically and helping people recover.";
