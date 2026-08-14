# Repository boundary

- Work only in `pythonsmethod/python-method-center-platform`.
- Never clone, connect to, fetch from, inspect, modify, or reuse code from the archived legacy repository `pythonsmethod/python-method-center`.
- Do not add the legacy repository as a Git remote or source dependency.

# Bilingual interface quality gate

- Every user-facing feature must be complete in both Russian (`ru`) and English (`en`).
- Never mix Russian interface prose into the English version or English interface prose into the Russian version. Brand names, email addresses, and proper nouns are allowed.
- Visible copy, accessibility labels, validation messages, page titles, metadata, navigation labels, and empty/error/success states must follow the active locale.
- Every language switcher must preserve the current route, switch the whole rendered screen, and be verified in both directions.
- Before an interface change is complete, run relevant automated checks and manually verify both language versions of every changed screen and control.
