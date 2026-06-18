# Web Architecture V1 — Pythons Center Platform (Public Website)

Status: ARCHITECTURE / DOCUMENTATION ONLY (no code, no infrastructure)
Date: 2026-06-15
Module: web (public website)
Center: "Реабилитация без границ" (Rehabilitation Without Borders)
Sources of truth used:
- docs/constitution/constitution_01_purpose_of_center.md (canonical purpose)
- docs/constitution/constitution_08_boundaries_of_responsibility.md (boundaries)
- docs/architecture/08_Client_Onboarding_Architecture_v1_EXPANDED.md
- docs/architecture/09 Case Lifecycle Architecture v1 FULL.md
- docs/architecture/Client Cabinet Architecture v1.md
- docs/architecture/Payment Architecture v1 expanded.md
- docs/legal/Оферта новая версия 2.pdf
- docs/safety/Протокол безопасности и красных флагов.pdf

---

## 0. Audit decisions carried into this document

These confirmations were made by the owner and are recorded here (existing audit/inventory files are not modified):

- Constitution document 02 does not exist as a separate file. It is not to be created artificially or filled with guesses. Section 02 is recorded as absent and is NOT a blocker.
- Canonical constitution purpose document is docs/constitution/constitution_01_purpose_of_center.md. The file docs/foundation/constitution_01_purpose_and_foundation_audit_v2.md is treated as an audit / foundation check, NOT as canon.
- A numbered architecture series 01-06 does not exist and is not to be created artificially. Parts of that scope are already covered by separate documents: Client Cabinet, Admin Panel, Payment, Support, Launch Architecture Foundation.
- The public website lacked its own architecture document. This file (WEB_ARCHITECTURE_V1.md) closes that gap.

---

## 1. Purpose of the public website

The public website is the first contact point between a person and the Center. It is the web-first entry to the platform.

Its purpose is to:
- explain clearly what the Center is and what it is not;
- present the Center's approach, the three directions (Recovery / Rehabilitation / Preservation), and Karen's accumulated practical experience as the basis of the method;
- build honest trust without promising results;
- guide a visitor to the available next step: free preliminary resource-state analysis, or a paid support program;
- route the person into registration, payment, onboarding, and ultimately the client cabinet.

The website is informational and navigational. It is not the place where the case, medical data, or Karen's conclusions live — those belong in the authenticated client cabinet.

---

## 2. Core principle: honesty over persuasion

The website inherits the Center's boundaries directly from the Constitution. Trust is built through clarity and honesty, not through claims of cure or guaranteed outcomes. Every promise made on the site must be defensible against Section 8 (Boundaries of Responsibility) and the public offer.

---

## 3. Pages (MVP scope)

- Home — what the Center is, who it helps, the three directions, the honest framing, and the primary call to action (start with the free preliminary analysis or choose a program).
- About the Center / Method — the meaning-level purpose, Karen's role and experience, and how support works, aligned with the Constitution.
- How It Works — the path: registration, free preliminary analysis, choosing a program (5 weeks / 15 weeks), payment, onboarding, Karen's review, active support.
- Programs / Pricing — the support products and what each includes, described without outcome guarantees; links into the payment flow.
- Trust / Experience — testimonials and case material governed by the cases constitution and the safety protocol (no fabricated or guaranteed-result claims).
- FAQ — common questions, including explicit "what the Center does not do" answers.
- Legal — links to the public offer, privacy/consent terms, and the boundaries statement.
- Contact / Support entry — how to reach organizational/technical support (Anna at MVP) for non-medical questions.
- Authentication entry — register / log in (entry to the client cabinet).

Pages that are NOT part of the public site: the case, messages with Karen, documents/analyses, Karen's conclusions, payment history. These live only in the authenticated cabinet.

---

## 4. Client entry (registration and login)

- The website provides registration and login as the gateway to the authenticated cabinet.
- After registration, the person has a basic cabinet; an active case is not yet created (per case lifecycle).
- The free preliminary resource-state analysis becomes available in the cabinet after registration (one time, orientational only).
- The website itself does not store medical data or run onboarding; it hands the authenticated user to the cabinet for those steps.

---

## 5. Trust (how the site earns it honestly)

- State plainly what the Center is: a system of support for recovery, rehabilitation, and preservation of functionality.
- State plainly what the Center is not: not a medical organization; it does not diagnose, prescribe, cancel doctors' instructions, or replace medical care.
- Present Karen's experience and the method as practical support and structure, not as a treatment.
- Use real, governed case material and testimonials; never imply a typical or guaranteed result.
- Make boundaries and the offer easy to find before any payment.

---

## 6. Legal constraints (what the site must respect)

- The public offer (docs/legal) and the boundaries section govern all public claims.
- The offer must be available and presented before payment; acceptance/consent is captured in the payment/onboarding flow, not assumed by the website.
- Privacy and consent: the website must not collect sensitive medical data; medical data is collected only inside authenticated onboarding with explicit consent.
- The safety / red-flags protocol governs crisis-sensitive content and routing; the public site must not give medical guidance or crisis instructions beyond directing people appropriately.

---

## 7. What the website MAY promise

- Structure, discipline, a defined route, observation, and human support during the recovery/rehabilitation/preservation period.
- Access to Karen's accumulated practical experience and methodology as support.
- Sopровождение that is accessible regardless of country, language, or distance.
- A free, one-time, orientational preliminary resource-state assessment.
- That the person will not be left alone with the question of how to recover, within the Center's defined boundaries.
- Transparent products, pricing, and terms via the offer.

## 8. What the website MUST NOT promise

- No cure, recovery, remission, life extension, or any specific medical outcome.
- No guarantees of results of any kind (the Center does not operate on a guarantee model).
- No diagnosis, no treatment, no prescriptions, no medical decisions, no cancellation of doctors' instructions.
- No claim to be a medical organization or a substitute for medical care.
- No specific timeframes for recovery.
- No claims that the method works "for everyone" or that a typical result is expected.
- No mention of specific products, formulas, dosages, or protocols as outcomes on the public site (substantive case decisions belong to Karen, inside the cabinet).

---

## 9. Link to payment

- The website presents the support programs (5 weeks / 15 weeks) and routes the visitor into the payment flow defined in Payment Architecture.
- The public offer is shown before payment; consent/acceptance is captured in the flow (not by the website on the user's behalf).
- The website does not process card data itself; payment is handled by the payment provider per Payment Architecture and TECH_STACK_DECISION_V1 (Stripe).
- On confirmed payment, the case is created/activated and the person proceeds to onboarding (per case lifecycle).

---

## 10. Link to onboarding

- Onboarding occurs after payment and before the case is transferred to Karen; it is an authenticated, in-cabinet process, not a public-website process.
- The website's role is only to explain that onboarding exists and what it requires (information + required documents, including a recent CBC), and to route the paid user into it.
- The website never collects onboarding medical data or documents directly.

---

## 11. Link to the client cabinet

- The cabinet is the "home of the case" and the main space of interaction; the website is the public front door to it.
- After login, all case activity (status, next step, messages, documents, Karen's recommendations, payment history) happens in the cabinet, not on the public site.
- The website should make the transition seamless: clear login/register, then hand off to the cabinet.

---

## 12. Out of scope for Web V1 (deferred)

- Detailed page-level copywriting and final wording (to be drafted and legally reviewed separately).
- Visual/brand design system.
- Multilingual content beyond the principle of language-independence.
- Any code, components, or infrastructure.
- A full public content/CMS model.

---

## 13. Constraints honored

- No code written.
- No infrastructure created.
- No existing documents modified.
- This file only adds WEB_ARCHITECTURE_V1.md as architecture documentation.
