# RED_FLAG_EVENT_AND_URGENCY_PROTOCOL_V1

> Status: Draft v1 — P0 architecture contradiction closure
> Scope: Documentation only. No code, no SQL, no schema-file changes.
> Project / platform name: **Python Method**  ·  Legal payee entity: **Pythons & Co.**

---

## 1. Purpose

This document closes the P0 architecture contradiction between two requirements that previously appeared to conflict: the requirement that **AI must respond immediately and autonomously when a red flag is detected**, and the requirement that **only Karen holds durable case urgency, status, route, and case-level decision authority**.

It establishes one canonical protocol for what happens when a red flag is detected: what the AI says to the client immediately, what event the system records, which human is notified for which category of red flag, and the strict separation between a transient red_flag_event priority (which AI/System may set) and durable case urgency/status (which only Karen may set).

It is **documentation-only P0 closure work**. It does **not** introduce code, does **not** write SQL, and does **not** modify schema files. It records the canonical decision made by Anna and lists the downstream documents that must be updated to match.

Source documents: AI_GUARDRAILS_V1, AUTHORITY_MATRIX_V1, ACCESS_CONTROL_V1, SUPABASE_SCHEMA_V1, NEXTJS_STRUCTURE_V1, DATA_MODEL_V1, CANONICAL_LIFECYCLE_STATUS_MODEL_V1, DATA_MODEL_TO_SUPABASE_MAPPING_V1, and the Safety / Red-flags Protocol.

### Canonical decision (from Anna)

- AI must respond **immediately** when a red flag is detected; AI must **not** wait for Karen before giving safety guidance.
- AI tells the client that the situation **may be urgent** and that the client should contact appropriate **emergency medical services, a doctor, or local urgent care** depending on the situation.
- AI **briefly** explains what was detected as concerning — **without** diagnosis, treatment, guarantees, or medical decision-making.
- AI tells the client that their urgent message **has been sent to the responsible human team** and will be reviewed as soon as possible.
- The system **creates a red_flag_event**.
- For **physical/medical** red flags, the system **notifies Karen**.
- For **psychological/crisis** red flags (suicidal thoughts, self-harm language, panic crisis, severe emotional destabilization, danger to self or others), the system **notifies Anna/support immediately**.
- AI/System may mark the event as **requiring immediate review**, but this is **not** the same as durable case urgency/status.
- **Only Karen** can assign durable case urgency, change case status, change support route, or make case-level decisions.
- AI must **never** diagnose, prescribe, reassure falsely, minimize risk, or tell the client to wait for Karen instead of seeking urgent help.

---

## 2. Definitions

- **Red flag** — a signal in a client message (or attached content) suggesting an acute, potentially urgent, or life-threatening situation, whether physical/medical or psychological/crisis in nature. On any doubt, a signal is treated as a red flag in favor of client safety.
- **red_flag_event** — an immutable system record that a red flag was detected. It captures detector, category, timestamp, confidence, references to the triggering case/message, the immediate-review flag, and notification routing. It is created by AI/System; it is **not** a case decision.
- **Immediate-review flag** — a transient marker on a red_flag_event indicating the event should reach a human as soon as possible. It affects queue ordering and notification only. It is **not** durable case urgency or case status.
- **Durable case urgency** — the official case_urgency value (normal / elevated / critical) on the case. It is part of the durable case state and is owned exclusively by Karen.
- **Durable case status** — the official case_status value on the case (per CANONICAL_LIFECYCLE_STATUS_MODEL_V1). Owned exclusively by Karen.
- **Support route** — which human team accompanies a case. Changing the route is a case-level decision owned by Karen; psychological-crisis notification to Anna/support (below) is a **safety notification**, not a route change.
- **Client-facing AI** — the AI inside the client cabinet that produces the immediate client response. It never decides a case and never substitutes for emergency services.
- **Karen** — single source of truth for all case decisions, durable urgency, status, and route.
- **Anna / support** — the human support function (Anna at MVP) that receives psychological/crisis safety notifications and handles organizational/technical matters. Support does not make case decisions.
- **System** — deterministic mechanical actor that creates red_flag_event records, routes notifications, and writes the Audit Log. It makes no judgment and no case decision.

---

## 3. Red flag categories

Two categories are recognized. They differ in **who is notified**, not in whether the client receives an immediate safety response — every red flag triggers the immediate client response in section 6.

### 3.1 Physical / medical red flags

Signals of an acute physical/medical situation, including (non-exhaustive): severe or sharp pain; difficulty breathing or suffocation; loss of consciousness, fainting, or confusion; bleeding; sudden sharp deterioration; seizures; signs of stroke or heart attack (numbness, facial asymmetry, chest pain); or phrasings such as "I feel very bad", "I am dying", "I cannot go on", "urgent".

**Routing:** the system creates a red_flag_event (category = physical_medical) and **notifies Karen** for accompaniment. The client is simultaneously directed to emergency medical services / urgent care.

### 3.2 Psychological / crisis red flags

Signals of a psychological crisis or danger to self or others, including (non-exhaustive): suicidal thoughts or intent; self-harm language; acute panic crisis; severe emotional destabilization; expressions of danger to self or to other people.

**Routing:** the system creates a red_flag_event (category = psychological_crisis) and **notifies Anna/support immediately**. The client is simultaneously directed to appropriate emergency help (emergency services, a crisis line, or local urgent care as appropriate to the situation).

**Note:** category is a detection/routing attribute on the red_flag_event. It does **not** set case urgency or change the case route — those remain Karen-only (sections 9–10). A single message may raise both categories; if so, both notifications fire and both are recorded.

---

## 4. Physical / medical red flags

When a physical/medical red flag is detected, the following happens **simultaneously and immediately**, without waiting for any human:

1. The client-facing AI delivers the immediate client response (section 6): it tells the client the situation may be urgent and that they should contact emergency medical services, a doctor, or local urgent care as appropriate; it briefly names what was detected as concerning (no diagnosis); and it confirms the urgent message was sent to the responsible human team.
2. The system creates a red_flag_event with category = physical_medical, sets requires_immediate_review = true, and references the triggering case and message.
3. The system **notifies Karen** so that Karen can accompany the case as soon as possible.
4. The system writes an Audit Log entry for the detection, the event creation, and the notification (section 13).

Karen, after notification, reviews the case, may assign durable case urgency/status, and contacts the client directly if needed. Karen accompanies; Karen does **not** replace emergency services.

---

## 5. Psychological / crisis red flags

When a psychological/crisis red flag is detected, the following happens **simultaneously and immediately**, without waiting for any human:

1. The client-facing AI delivers the immediate client response (section 6): it tells the client the situation may be urgent and that they should reach appropriate emergency help right now (emergency services, a crisis line, or local urgent care as appropriate); it briefly and gently names what was detected as concerning (no diagnosis, no minimization); and it confirms the urgent message was sent to the responsible human team.
2. The system creates a red_flag_event with category = psychological_crisis, sets requires_immediate_review = true, and references the triggering case and message.
3. The system **notifies Anna/support immediately** so a human can respond to the crisis without delay.
4. The system writes an Audit Log entry for the detection, the event creation, and the notification (section 13).

Anna/support, after notification, responds to the crisis and escalates anything that is a case decision to Karen. The notification to Anna/support is a **safety notification**, not a transfer of case authority and not a route change.

---

## 6. AI immediate client response

On **any** red flag, the client-facing AI responds immediately and autonomously, before and independent of any human review. The response must do all of the following and nothing beyond:

- **State possible urgency and direct to real help.** Tell the client this may be an urgent situation and that they should contact appropriate emergency medical services, a doctor, or local urgent care depending on the situation — clearly and without softening.
- **Briefly explain what was detected.** Name, in one or two sentences, what in the message was concerning — as an observation only, with no diagnosis, no treatment, no guarantee, and no medical decision-making.
- **Confirm human hand-off.** Tell the client that their urgent message has been sent to the responsible human team and that the team will review it as soon as possible.

The AI must **not**: diagnose or imply a diagnosis; prescribe or suggest treatment, medication, or dosage; promise a result, remission, or recovery; reassure falsely or minimize risk ("it is nothing", "it will pass", "do not worry"); tell the client to wait for Karen (or any human) **instead of** seeking urgent help; or dissuade the client from contacting emergency services. The AI never waits for Karen before giving this safety guidance.

---

## 7. Human notification routing

| Red flag category | Immediate AI client response | red_flag_event | Human notified immediately | Sets durable urgency/status/route? |
|---|---|---|---|---|
| Physical / medical | Yes (section 6) | Created (category = physical_medical, requires_immediate_review = true) | **Karen** | No — Karen decides separately |
| Psychological / crisis | Yes (section 6) | Created (category = psychological_crisis, requires_immediate_review = true) | **Anna / support** | No — notification only; Karen decides case-level matters |

Routing rules:

- Routing is determined by the **detected category**, not by AI judgment about the case.
- Notification is a **signal to a human**, never a case decision. Neither notification changes case_urgency, case_status, or the support route.
- If both categories are present in one message, both notifications fire and the event records both (or two linked events are created), so neither Karen nor Anna/support is left out.
- Anna/support escalates any case-level matter arising from a psychological-crisis notification to Karen; Karen remains the single decision owner.
- The notification path is always reachable and is never blocked by paywall, onboarding state, or active/inactive client state (consistent with NEXTJS_STRUCTURE_V1 §7 red-flag UX).

---

## 8. red_flag_event data model

red_flag_event is a new conceptual entity (no table exists yet in SUPABASE_SCHEMA_V1 — see DATA_MODEL_TO_SUPABASE_MAPPING_V1). It is **created by AI/System** and is **immutable** after creation. Conceptual fields (no SQL, no schema change here):

| Field | Conceptual type | Notes |
|---|---|---|
| id | uuid | Primary identifier. |
| case_id | uuid (ref) | Case the event belongs to. |
| message_id | uuid (ref) | Triggering message (if any). |
| detected_by | enum | client_facing_ai / system. |
| category | enum | physical_medical / psychological_crisis. |
| signals | text/jsonb | Brief, non-diagnostic description of what was detected (observation only). |
| confidence | enum | high / medium / low (detection confidence, never a medical certainty). |
| requires_immediate_review | boolean | Transient priority marker; NOT durable case urgency. |
| notified_role | enum | karen / support (who was notified for this event). |
| notified_at | timestamptz | When the notification was emitted. |
| client_response_sent | boolean | Whether the immediate AI safety response was delivered. |
| created_at | timestamptz | Append-only; event is immutable. |
| created_by | uuid | Actor reference (AI/System). |

Rules:

- red_flag_event is **append-only**. It is never edited to express a case decision; corrections are new events, not mutations.
- requires_immediate_review lives **only** on the event. It must never be written into case_urgency or case_status by AI/System.
- The event references the case but does **not** own or alter case state.
- signals is an observation, never a diagnosis; it must not contain medical conclusions, treatment, or guarantees.

---

## 9. Difference between red_flag_event priority and durable case urgency

This separation is the core of the P0 closure.

| Aspect | red_flag_event priority (requires_immediate_review) | Durable case urgency/status |
|---|---|---|
| Owner | AI / System (mechanical) | **Karen only** |
| Nature | Transient signal that a human should look now | Durable, official case state |
| Where stored | On the red_flag_event | On the case (case_urgency, case_status) |
| Effect | Notification + queue ordering | Drives case routing, decisions, official record |
| Can AI set it? | Yes (detection-driven) | No — never |
| Can it change the case route? | No | Yes (Karen decision) |
| Audited? | Yes | Yes |

In words: AI/System may signal "look at this now" by creating a red_flag_event and flagging it for immediate review, and may notify the correct human (Karen for physical/medical, Anna/support for psychological/crisis). That signal is **not** the same as the case being officially "critical". Marking the official case as critical, changing case_status, or changing the support route are durable decisions reserved entirely to Karen. AI raising an alarm and Karen setting durable urgency are two different acts; the first never performs the second.

---

## 10. Karen authority

- Karen is the **single source of truth** for all case decisions.
- **Only Karen** may assign or change durable case_urgency (normal / elevated / critical).
- **Only Karen** may change case_status.
- **Only Karen** may change the support route.
- Karen reviews red_flag_event records and the cases they reference, and decides what durable urgency/status (if any) the case warrants.
- Karen accompanies the client; Karen does **not** replace emergency services.
- AI/System creating an event or marking it for immediate review never pre-empts, overrides, or substitutes for the durable decision that belongs to Karen.

---

## 11. Anna / support authority

- Anna/support receives **psychological/crisis** notifications immediately and responds to the crisis without delay.
- Anna/support handles organizational/technical matters and crisis-response coordination, but does **not** make case decisions, set durable case urgency/status, or change the case route.
- Anna/support **escalates** any case-level matter to Karen.
- The psychological-crisis notification to Anna/support is a **safety notification**, not a transfer of case authority.
- Anna authored the canonical routing decision recorded in this document; that authorship is a governance decision and does not grant Anna/support case-decision authority.

---

## 12. Client-facing language boundaries

The immediate AI response must stay within these boundaries:

- **Allowed:** stating that the situation may be urgent; directing the client to emergency medical services, a doctor, a crisis line, or local urgent care as appropriate; briefly and neutrally naming the observed concerning signal; confirming the message was sent to the responsible human team; calm, respectful reassurance that the client is not alone and a human will review the message soon.
- **Forbidden:** diagnosis or implied diagnosis; treatment, medication, or dosage advice; any guarantee of result, remission, or recovery; false reassurance or minimization of risk ("it is nothing", "it will pass"); telling the client to wait for Karen or any human instead of seeking urgent help; dissuading the client from contacting emergency services; assessing the state as "dangerous" or "not dangerous" as a medical conclusion.

The reassurance that "a human will review this soon" must **never** be phrased as a reason to delay seeking urgent help. Safety guidance comes first; human hand-off is communicated alongside it, not as a substitute.

---

## 13. Audit log requirements

Every red-flag handling step emits immutable Audit Log entries (append-only, System is the sole writer, consistent with ACCESS_CONTROL_V1 and AUTHORITY_MATRIX_V1):

- **Detection** — that a red flag was detected, with category and detection confidence.
- **Event creation** — creation of the red_flag_event (id, category, requires_immediate_review).
- **Client response** — that the immediate AI safety response was delivered to the client.
- **Notification** — which human role was notified (Karen for physical/medical, Anna/support for psychological/crisis) and when.
- **Karen durable action (if any)** — any later change by Karen to case_urgency, case_status, or route is audited as a separate Karen-owned action, clearly distinct from the AI/System event.

Audit entries for red-flag events are restricted in read scope (Karen case-scope, support scope, Admin read + grant) and are never editable or deletable by any role.

---

## 14. Required updates to other documents

This protocol changes the previous "all red flags route to Karen" assumption. The following documents must be updated to match (documentation-only; tracked here, not performed in this file):

- **AI_GUARDRAILS_V1** — §9 (Red Flag Escalation Rules) currently routes every red flag to Karen only. Update to: AI responds immediately; physical/medical notifies Karen; psychological/crisis notifies Anna/support; AI/System sets only red_flag_event immediate-review, never durable case urgency. Add the psychological-crisis category and Anna/support routing to the §12 action table.
- **AUTHORITY_MATRIX_V1** — add red_flag_event creation (AI/System, Auto) and notification routing rows; reaffirm durable case_urgency/case_status/route as Karen-only; add Anna/support as recipient of psychological-crisis safety notifications (not a decision owner).
- **ACCESS_CONTROL_V1** — add red_flag_event access rules (AI/System create; Karen and Anna/support scoped read; immutable; audited) and the psychological-crisis notification path to §3.9.
- **SUPABASE_SCHEMA_V1** — add the red_flag_event table (fields per section 8), separate from case_urgency/case_status; index for the immediate-review queue; confirm append-only/immutability. (No SQL written here.)
- **NEXTJS_STRUCTURE_V1** — §7 red-flag UX must reflect dual routing (Karen for physical/medical, Anna/support for psychological/crisis) and that the immediate client safety surface is always reachable and never gated.
- **MVP_BUILD_PLAN_V1** — Phase 7 (Karen workspace), Phase 8 (Support/Admin), and Phase 9 (AI guarded interaction) must include red_flag_event creation, dual notification routing, and the immediate AI safety response within AI_GUARDRAILS boundaries; add to "before the first paying client" the working red-flag detection + dual notification + audit path.

These are the downstream edits required to make the wider documentation set consistent with this canonical decision. They are listed for follow-up and are out of scope for this documentation-only file.

---

## 15. Self-check

- No code changed. (ok)
- No database schema changed; no SQL written; no schema files modified. (ok)
- AI responds immediately on any red flag and never waits for Karen before giving safety guidance. (ok)
- AI tells the client the situation may be urgent and to contact emergency services / a doctor / local urgent care as appropriate. (ok)
- AI briefly explains the concerning signal with no diagnosis, treatment, guarantees, or medical decision-making. (ok)
- AI confirms the urgent message was sent to the responsible human team. (ok)
- System creates a red_flag_event on every red flag. (ok)
- Physical/medical red flags notify Karen; psychological/crisis red flags notify Anna/support immediately. (ok)
- AI/System may mark requires_immediate_review but never sets durable case urgency/status. (ok)
- Only Karen assigns durable case urgency, changes case status, changes support route, or makes case-level decisions. (ok)
- AI never diagnoses, prescribes, reassures falsely, minimizes risk, or tells the client to wait for Karen instead of seeking urgent help. (ok)
- red_flag_event priority is clearly separated from durable case urgency (section 9). (ok)
- Audit Log requirements defined for detection, event creation, client response, notification, and any Karen durable action. (ok)
- Required updates to AI_GUARDRAILS_V1, AUTHORITY_MATRIX_V1, ACCESS_CONTROL_V1, SUPABASE_SCHEMA_V1, NEXTJS_STRUCTURE_V1, and MVP_BUILD_PLAN_V1 are listed (section 14). (ok)
- Brand/entity facts honored (Python Method platform; Pythons & Co. payee). (ok)

Open contradictions: None unresolved in this document. The "all red flags to Karen" wording in AI_GUARDRAILS_V1 and the absence of a red_flag_event table in SUPABASE_SCHEMA_V1 are tracked as required downstream updates in section 14.

End of RED_FLAG_EVENT_AND_URGENCY_PROTOCOL_V1.
