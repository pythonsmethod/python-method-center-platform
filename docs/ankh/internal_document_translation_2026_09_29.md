# Internal document translation for Karen — 2026-09-29

## Scope

This candidate adds an internal Russian reading aid to the existing Case
picture. Staff can request a bounded batch of displayed saved evidence rows from a ready
document in an enabled PMC document-chain pilot Case. The existing model
provider translates each row's section, label and value, estimates that row's
source language, and returns one paired Russian rendering. The interface also
shows the exact original row and a link to the original document/page. One
report may contain multiple languages. A Swiss report can be in German,
French, Italian, Romansh or a mixture; nationality is not a language code.

This is a **translation of the saved extraction**, not a fresh reading of all
pixels or a certified translation of the full PDF. If a source row was missed
or misread by the original reader, this layer cannot recover it. Page-level
provenance is shown only when it exists; the current chain has no region/token
coordinates. Language labels are model estimates, not a validated detector.

## Boundary

The source document, first/second readings, agreed/disputed arrays, lab
values, normalization, comparison, trust states, Karen decisions and client
responses are unchanged. Translation is returned to the staff browser for
reading and is not persisted or fed into analysis/review generation. A batch
is bound to the current evidence row IDs, content, source snapshot token,
document and page. The action checks staff authentication and pilot membership
again on the server. A changed evidence snapshot requires refresh.

The model receives only the selected text rows, through the provider already
used for the pilot's document reading; it does not receive the PDF again.
Missing, extra or reordered rows, changed numeric/date tokens, comparison
symbols, known unit aliases or null fields cause the complete batch to be
withheld. This mechanical check cannot establish semantic translation
accuracy, correct negation or detect all possible unit expressions. Karen
must consult the original for ambiguous or consequential interpretations.
The translation never marks a fact VERIFIED or resolves an exception.

## Acceptance and rollout

Synthetic rows exercise Armenian, German, Bulgarian, Korean, Swiss French,
Swiss Italian, Romansh and Spanish scripts, grouping, numeric refusal and
RU/EN interface copy. These fixtures test pairing and safety boundaries;
they are **not measured language/OCR accuracy**. There is no real foreign
language Case acceptance yet. No all-client enablement, new PHI provider,
schema migration or learning event is part of this change. Before general
rollout, use consented, deidentified or authorized real documents across
language, layout and quality bands; measure missing rows, label/value
alignment, negation, units, dates, provenance and translation errors against
human review. The selected Elena pilot's existing documents do not establish
multilingual accuracy.
