# AGE_AND_CARE_RECIPIENT_POLICY_V1

> Status: Draft v1 — P0 age / minor policy closure
> Scope: Documentation only. No code, no SQL, no schema-file changes.
> Canonical source: Anna (age policy and Client / Care Recipient model).
> Project / platform name: **Python Method**  ·  Legal payee entity: **Pythons & Co.**

---

## 1. Purpose

This document defines the canonical age policy and the **Client vs Care Recipient** model for the platform. It closes a P0 risk: ensuring that **no minor (or person under another person responsibility) is ever treated as the responsible decision-maker** for registration, consent, payment, or communication.

It establishes who may independently use the platform, how support is provided for minors and dependents through an adult **responsible Client**, and the onboarding, consent, data-model, access-control, and dashboard implications that follow. It is documentation-only: it introduces no code, no SQL, and no schema changes. It records required future changes as a checklist for later implementation.

---

## 2. Canonical age policy

- Independent platform registration is allowed **only for users age 21 or older**.
- A person **under 21** cannot independently do any of the following:
  - register
  - create a case
  - accept the offer
  - sign consent
  - purchase support
  - communicate with the platform as the responsible Client
- Minors and people under another person responsibility may receive support **only through an adult responsible Client**.
- The responsible Client must be one of:
  - parent
  - legal guardian
  - authorized caregiver / representative
- The responsible Client is the **Client** in the system. The person receiving support is a separate entity: the **Care Recipient**.

> This 21+ threshold is a canonical product decision by Anna. It is **not** a clinical or legal age-of-majority determination and must be confirmed in the Legal review section below.

---

## 3. Definitions

- **Client** — the adult (age 21+) who registers, owns the account, accepts the offer, signs consent, makes payment, and carries communication and decision responsibility. Every case has exactly one responsible Client.
- **Care Recipient** — the person whose condition, documents, or situation is being reviewed. A Care Recipient may be a minor, a dependent, or another person under the Client responsibility. A Care Recipient is **not** a platform account holder and never acts as the responsible decision-maker.
- **Self case** — a case where the Client is also the person receiving support (Care Recipient equals Client, or is represented by a `self_case` flag).
- **Child / dependent case** — a case where the Client creates and owns the case on behalf of a separate Care Recipient.
- **Responsible client** — the role asserting that the Client is the parent, legal guardian, or authorized representative of the Care Recipient.

---

## 4. Client vs Care Recipient

The platform separates **account/responsibility** from **subject-of-support**:

| Concern | Owner |
| --- | --- |
| Account registration | Client |
| Offer acceptance | Client |
| Consent signature | Client |
| Payment | Client |
| Platform communication | Client |
| Decision responsibility | Client |
| Condition / documents under review | Care Recipient |

A **Case links one Client and one Care Recipient**. The Client is always an adult (21+). The Care Recipient may be any age, including a minor, but holds no responsibility role.

---

## 5. Self case vs child / dependent case

One Client may create cases for:

- **self** — Care Recipient equals Client, or is represented by a `self_case` flag.
- **child** — Care Recipient is the Client minor child.
- **dependent / another person under their responsibility** — Care Recipient is a dependent or other person the Client is authorized to represent.

In all non-self cases, a **separate Care Recipient entity** is created and linked to the Case. In self cases, no separate Care Recipient form is required; the `self_case` flag indicates the Client and Care Recipient are the same person.

---

## 6. Registration rules

- Only users who are **21 or older** may register independently and act as a Client.
- A person under 21 must **not** be able to independently register, create a case, accept the offer, sign consent, purchase support, or communicate as the responsible Client.
- Support for a person under 21 (or any person under another responsibility) is provided **only** through an adult responsible Client who registers and owns the account.
- The platform must not create an account, consent record, or payment obligation in the name of a Care Recipient.

---

## 7. Onboarding UX rules

Website onboarding must include a **required question**:

> “Who is this case for?”

Options:

- Myself
- My child
- A dependent / another person under my responsibility

- If **“My child”** or **“Dependent”** is selected, the platform must open an **additional Care Recipient form** (see section 8).
- If **“Myself”** is selected, the case is a self case and the `self_case` flag is set; no separate Care Recipient form is shown.
- The “Who is this case for?” question must be answered before a case can proceed. It cannot be skipped or defaulted silently.

---

## 8. Required Care Recipient fields

When “My child” or “Dependent / another person” is selected, the Care Recipient form must collect:

- full name
- date of birth
- age
- relationship to client
- country / location
- reason for representation
- confirmation that the client is parent / legal guardian / authorized representative
- consent to submit care recipient data
- responsibility acknowledgment

All fields are required to submit a child / dependent case. The confirmation, consent, and responsibility acknowledgment are explicit affirmative actions by the Client and must be auditable.

---

## 9. Consent and responsibility rules

- The **Client** signs consent, accepts the offer, and makes payment. Consent and responsibility always rest with the adult Client.
- For a child / dependent case, the Client must additionally affirm: (a) that they are the parent, legal guardian, or authorized representative; (b) consent to submit Care Recipient data; and (c) a responsibility acknowledgment.
- A Care Recipient never signs consent, accepts the offer, or makes payment.
- Every consent, offer-acceptance, payment, and responsibility-acknowledgment action must be **auditable** (who, what, when).
- Karen remains the single source of all case decisions; this policy does not alter Karen decision authority, only who may act as the responsible Client.

---

## 10. Case ownership model

- The **Client** owns the **account, consent, payment, and responsibility**.
- The **Care Recipient** is the person whose condition / documents are being reviewed.
- A **Case links Client + Care Recipient**.
- If the Client is creating a case for self, the Care Recipient may equal the Client or be represented by a `self_case` flag.
- A single Client may own multiple Cases, each linked to its own Care Recipient (self, child, or dependent).

---

## 11. AI behavior rules

- The AI and the system must **never treat a minor as the responsible decision-maker**.
- All platform decisions, consent, payment, and communication responsibility remain with the **adult Client**.
- The AI must direct all responsibility-bearing interactions (offer, consent, payment, status communication) to the Client, never to the Care Recipient.
- If input suggests the person interacting is under 21 and attempting to act as the responsible party, the AI must not proceed as if they were the Client and must route to the adult responsible Client path.
- The AI must not diagnose, prescribe, or assign durable case state; case decisions remain with Karen (per existing guardrails).

---

## 12. Access control implications

- Only an authenticated adult **Client** may create, view, or act on a Case and its linked Care Recipient.
- A Care Recipient is **not** an account holder and has no login, no independent access, and no responsibility permissions.
- Care Recipient personal data (name, date of birth, age, location, reason for representation) is sensitive and must be readable only by the owning Client and authorized internal roles (Karen / Admin per their existing scopes).
- Access rules must enforce that responsibility-bearing actions (consent, offer, payment) can only be performed by the Client, never by or on behalf of a Care Recipient acting independently.

---

## 13. Data model implications

The conceptual data model must distinguish Client from Care Recipient and link them through the Case:

- **Client** entity — the adult account holder; owns account, consent, payment, responsibility.
- **Care Recipient** entity — the subject of support; not an account holder.
- **Case** entity — links one Client and one Care Recipient; carries a `case_for` value (self / child / dependent) and a `self_case` flag.
- Care Recipient attributes: full name, date of birth, age, relationship to client, country / location, reason for representation, plus the Client confirmations (representative confirmation, data consent, responsibility acknowledgment).
- Responsibility and consent records always reference the **Client**, never the Care Recipient.

---

## 14. Supabase future schema implications

Documented for **future** implementation only — do not write SQL or change schema now:

- Future `care_recipient` entity with fields: `full_name`, `date_of_birth`, `age`, `relationship_to_client`, `country`, `reason_for_representation`, `client_is_authorized_representative` (bool), `care_recipient_data_consent` (bool), `responsibility_acknowledgment` (bool).
- Future fields on the case/owning entity: `case_for` (enum: self / child / dependent), `self_case` (bool), `client_id` (responsible Client), `care_recipient_id` (linked Care Recipient).
- Future ownership / audit fields capturing who accepted the offer, signed consent, and made payment (always the Client).
- Row-level access must restrict Care Recipient data to the owning Client and authorized internal roles.

> No SQL is written and no schema file is modified by this document. These are requirements for a later schema pass.

---

## 15. Admin / Karen dashboard implications

- Case views must clearly display **both** the responsible Client and the linked Care Recipient, and whether the case is self / child / dependent.
- Karen review must show Care Recipient details (age, relationship, reason for representation) alongside the Client responsibility confirmations.
- Admin views must surface the responsibility / representative confirmation and consent state for audit, without granting the Care Recipient any account or access.
- Dashboards must make it unambiguous that all decisions, consent, payment, and communication are owned by the adult Client.

---

## 16. Legal review required

The following require legal confirmation before or alongside implementation:

- The 21+ independent-registration threshold and its relationship to local age-of-majority and consent laws.
- The wording and sufficiency of the representative confirmation, Care Recipient data consent, and responsibility acknowledgment.
- Cross-border data handling for Care Recipient personal data (country / location field) and applicable minor-data protections.
- Retention of Care Recipient and consent records.

> This policy records the canonical product decision; it does not constitute legal advice and must be validated by legal review.

---

## 17. Required updates to other documents

The following documents must be updated to reflect this policy. Each update is applied as part of this P0 closure (documentation only):

- **DATA_MODEL_V1** — add Client vs Care Recipient distinction, the Case link, `case_for` / `self_case`, and Care Recipient attributes.
- **ACCESS_CONTROL_V1** — add access rules: only adult Client may register/act; Care Recipient is not an account holder; Care Recipient data restricted to owning Client + authorized internal roles.
- **AUTHORITY_MATRIX_V1** — add that the responsible Client (21+) owns registration, offer acceptance, consent, payment, and communication; Care Recipient holds no authority; AI/System must never treat a minor as decision-maker.
- **SUPABASE_SCHEMA_V1** — document (no SQL) the future `care_recipient` entity and `case_for` / `self_case` / `client_id` / `care_recipient_id` fields.
- **NEXTJS_STRUCTURE_V1** — document the onboarding “Who is this case for?” question and the conditional Care Recipient form UI locations.
- **MVP_BUILD_PLAN_V1** — make the 21+ age gate and Client / Care Recipient onboarding MVP-required, not deferred.

---

## 18. Self-check

- No code changed. (ok)
- No database schema changed; no SQL written; no schema files modified. (ok)
- Canonical age policy: independent registration 21+ only; under-21 cannot independently register / create case / accept offer / sign consent / purchase / communicate as Client. (ok)
- Client vs Care Recipient separation defined; Case links Client + Care Recipient. (ok)
- Self case vs child / dependent case defined; `self_case` flag documented. (ok)
- Onboarding required question “Who is this case for?” with three options; conditional Care Recipient form documented. (ok)
- All required Care Recipient fields listed. (ok)
- Consent, payment, responsibility remain with the adult Client; all such actions auditable. (ok)
- AI must never treat a minor as the responsible decision-maker. (ok)
- Access control, data model, future Supabase schema, and dashboard implications documented. (ok)
- Legal review section included. (ok)
- Required updates to DATA_MODEL_V1, ACCESS_CONTROL_V1, AUTHORITY_MATRIX_V1, SUPABASE_SCHEMA_V1, NEXTJS_STRUCTURE_V1, MVP_BUILD_PLAN_V1 listed. (ok)
- Brand/entity facts honored (Python Method platform; Pythons & Co. payee; Karen single source of case decisions). (ok)

End of AGE_AND_CARE_RECIPIENT_POLICY_V1.
