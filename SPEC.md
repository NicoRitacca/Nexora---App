# Nexora Spec

## Product

Nexora is a prospecting companion for independent financial advisors in the Tampa area who are still building their client base. It is not a lead list. Each week it suggests a few opportunities worth a conversation, explains why each fits the advisor, points out warm paths to an introduction, and suggests how to get started.

## Job to Be Done

Each week, know where to start a few new conversations, why, who could help introduce me, and how to approach them.

## Core Workflow (MVP)

1. **Advisor creates a profile**, including:
   - Experience
   - Specialties
   - Current clients
   - Ideal clients
   - Preferred outreach style (e.g. in person, introductions, or online)
   - Location and ZIPs they cover
   - Weekly conversation goal
   - Existing network, described by type or organization only (e.g. "a CPA firm that serves physicians" or "member of the local chamber of commerce") — no personal names

2. **Nexora loads recent opportunities.** MVP sources:
   - New Hillsborough County business filings from Sunbiz, using business-level fields only plus the full/partial ZIP flag.
   - A small set of upcoming Tampa-area networking events, entered by hand for the pilot (event name, event type, date, ZIP, hosting organization). No personal names.

3. **The AI picks the top 5 to 10 opportunities** for this advisor. For each:
   - **Why it fits** — a short reason citing only facts present in the data or the profile
   - **Warm path** — a suggested introduction if something in the advisor's network matches
   - **How to get started** — a suggested first step (e.g. visiting in person, asking a network contact for an introduction, or reaching out through the business's public website), a short explanation of why that approach fits this advisor, and a natural conversation opener. For events, the suggestion is about attending and who the advisor might meet there, based only on the event details and the advisor's profile.

4. **The advisor marks each opportunity**: start a conversation, save for later, or skip.

## Data Model

- **Opportunity** — id, source, type ("business" or "event"), name, entity type, date, ZIP, ZIP coverage (full or partial). Designed so new sources and types can be added later. For events, hosting organization is used instead of entity type.
- **Advisor Profile** — the fields from step 1 above.
- **Action** — opportunity id, choice (conversation / save / skip), date.

## Business Rules

- Never store or show personal names; business-level data only.
- Reasons, warm paths, and how-to-get-started suggestions may cite only facts in the data or the advisor's profile; never invent revenue, industry, or other details.
- Partial-ZIP opportunities are included but labeled, and the advisor can filter them out.
- AI calls happen on the back end only; API keys never go in the browser or the code.

## Out of Scope for the MVP

- New homeowners
- Doctors and fellowships (roadmap, pending professor guidance)
- Automatically collecting events (manual entry for the pilot)
- Contact details for business owners
- CRM integration
- Email alerts
- Multiple user accounts

## Done Means

On the live Amplify site, an advisor can fill out a profile, see a ranked weekly list built from real recent filings — each with why it fits, any warm path, and how to get started — and mark each one.
