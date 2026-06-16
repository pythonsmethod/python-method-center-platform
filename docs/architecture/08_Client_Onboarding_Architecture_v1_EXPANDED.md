# 08 — Client Onboarding Architecture v1 (Expanded)

## Status

Approved for MVP launch of the Center.

This document defines the complete onboarding process that occurs after payment and before a case is transferred to Karen.

---

# Mission of Onboarding

The purpose of onboarding is to:

- collect complete client information;
- collect required documents;
- prepare a structured case for Karen;
- prevent loss of important information;
- create a single source of truth for the client case;
- reduce chaos and repeated requests for information.

---

# Core Principle

Onboarding is a single unified process.

It is not divided into a questionnaire and document upload.

A case is only considered complete when all required information and required documents have been submitted.

---

# Principle of Case Integrity

Karen does not receive documents separately from information.

Karen receives a complete case.

Information and documents always remain connected.

---

# Required Personal Information

The client must provide:

- First Name
- Last Name
- Middle Name (if applicable)
- Email Address
- Phone Number

Phone number is mandatory.

---

# Delivery Address

The client must provide a complete delivery address.

Required fields:

- Country
- State / Region
- City
- Street
- Building Number
- Apartment (if applicable)
- Postal Code
- Recipient Name

For international shipments the address should preferably be written in English.

---

# Required Medical Information

The client must indicate:

### Official Diagnosis

If available, specify the diagnosis.

### Previous Operations

Describe previous operations if applicable.

### Current Situation

The client describes:

- current condition;
- current stage;
- primary concerns;
- what is happening now.

---

# Required Document

### Complete Blood Count (CBC)

Must be performed within the last month.

Reason:

In serious conditions laboratory values may change rapidly.

---

# Additional Documents

The client may upload:

- blood chemistry;
- physician reports;
- discharge summaries;
- MRI;
- CT;
- PET-CT;
- pathology;
- histology;
- operation protocols;
- specialist conclusions;
- any other relevant documents.

---

# Description Format

Option A:

Free-form description.

Option B:

Guided AI-assisted interview.

---

# Consent and Authorization

Before completing onboarding the client confirms:

- consent to storage of submitted documents;
- consent to processing of submitted documents;
- consent to AI-assisted document processing for case preparation;
- consent to storage of case history inside the system.

---

# Language Independence

The client may upload documents in any language.

AI may:

- identify language;
- translate content;
- prepare structured summaries for Karen.

---

# Document Quality Verification

AI automatically checks:

- readability;
- completeness;
- image quality;
- missing pages;
- blurred content;
- cropped documents.

---

# Re-upload Request

If a document cannot be read confidently:

AI requests a new upload from the client.

---

# Low Quality Original Documents

If the client states that no better version exists:

AI stores the document and flags it for Karen.

Karen is informed that document quality is insufficient for reliable extraction.

---

# Confidence Levels

For each document AI records:

- High Confidence
- Medium Confidence
- Low Confidence

---

# No Guessing Principle

AI must never:

- guess laboratory values;
- invent missing numbers;
- assume unreadable information;
- hide uncertainty.

If information cannot be read reliably, AI must say so.

---

# Completeness Verification

AI verifies:

- name;
- email;
- phone number;
- address;
- diagnosis or indication of no diagnosis;
- operation history;
- current situation;
- CBC from the last month.

---

# Case Readiness Checklist

The client sees a readiness checklist showing completed and missing elements.

---

# Interrupted Onboarding

If the client leaves before completion:

Progress is saved automatically.

The client may continue later from the same point.

---

# Reminder System

If onboarding remains incomplete:

AI reminds the client that the case is not yet ready for Karen review and displays missing items.

---

# Final Client Review

Before submission to Karen, AI presents a final summary including:

- personal information;
- address;
- diagnosis;
- operation history;
- current situation;
- uploaded documents.

The client is asked:

"Would you like to add anything else before your case is submitted to Karen?"

A button is available:

### Add More Information

---

# Onboarding Statuses

- Onboarding Not Started
- Onboarding In Progress
- Additional Information Required
- Onboarding Completed
- Ready For Karen Review

---

# AI Role During Onboarding

AI may:

- explain fields;
- assist with completion;
- identify missing information;
- identify missing documents;
- organize information;
- reduce anxiety during onboarding;
- prepare a structured case.

AI may not:

- make decisions about the case;
- provide Karen's conclusions;
- replace Karen;
- interpret documents on behalf of Karen.

---

# Final Outcome

The result of onboarding is a complete structured review-ready case.

A case may only be transferred to Karen after onboarding has been fully completed.
