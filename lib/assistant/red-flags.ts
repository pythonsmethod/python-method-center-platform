export type RedFlagCategory = "physical" | "psychological";

// Recognising crisis language in a person's own message.
//
// This used to be the first strand of an automatic escalation: a match
// created an event and pinged the team through Telegram. That mechanism is
// gone by the owner's decision — the centre does rehabilitation, not
// emergency care, and a person in danger needs an ambulance rather than a
// platform that promises to notice. What remains is the recognition
// itself, used in one place: to refuse to file an emergency as a sleep
// note and tell the person plainly where to go instead.
//
// Tuned deliberately toward false positives: a spurious refusal costs the
// person a sentence; a missed one files a crisis under "sleep". Patterns
// are scoped to first-person crisis language, not to any mention of a
// symptom word.
const CRISIS_PATTERNS_PSYCHOLOGICAL: RegExp[] = [
  /не\s+хочу\s+(больше\s+)?жить/i,
  /не\s+вижу\s+смысла\s+жить/i,
  /покончить\s+с\s+собой/i,
  /покончу\s+с\s+собой/i,
  /суицид/i,
  /убить\s+себя/i,
  /убью\s+себя/i,
  /свести\s+счёты\s+с\s+жизнью/i,
  /наложить\s+на\s+себя\s+руки/i,
  /причинить\s+себе\s+вред/i,
  /режу\s+себя/i,
  /kill\s+myself/i,
  /end\s+my\s+life/i,
  /suicid/i,
  /self.?harm/i,
  /hurt\s+myself/i,
  /don'?t\s+want\s+to\s+live/i,
  /no\s+reason\s+to\s+live/i
];

const CRISIS_PATTERNS_PHYSICAL: RegExp[] = [
  /боль\s+в\s+груди/i,
  /давит\s+в\s+груди/i,
  /не\s+могу\s+дышать/i,
  /нечем\s+дышать/i,
  /задыхаюсь/i,
  /теряю\s+сознание/i,
  /потерял[аи]?\s+сознание/i,
  /сильное\s+кровотечение/i,
  /кровотечение\s+не\s+останавливается/i,
  /рвота\s+с\s+кровью/i,
  /кровь\s+в\s+рвоте/i,
  /немеет\s+(рука|лицо|нога|половина)/i,
  /онемел[аио]?\s+(рука|лицо|нога|половина)/i,
  /перекосило\s+лицо/i,
  /нарушилась\s+речь/i,
  /chest\s+pain/i,
  /can'?t\s+breathe/i,
  /cannot\s+breathe/i,
  /losing\s+consciousness/i,
  /passed\s+out/i,
  /severe\s+bleeding/i,
  /vomiting\s+blood/i,
  /face\s+droop/i,
  /slurred\s+speech/i
];

// Reads the person's own words. Physical wins a tie: a medical emergency
// with psychological language still needs the ambulance first.
export function detectRedFlagInMessage(
  message: string
): RedFlagCategory | null {
  if (CRISIS_PATTERNS_PHYSICAL.some((pattern) => pattern.test(message))) {
    return "physical";
  }

  if (CRISIS_PATTERNS_PSYCHOLOGICAL.some((pattern) => pattern.test(message))) {
    return "psychological";
  }

  return null;
}
