# Nexora

Nico Ritacca — CUA Busch School AI Vibe Coding Contest, Fall 2026

**Live:** https://main.d1tg14xda4qrdj.amplifyapp.com

**Your companion for new opportunities.**

The name comes from *nexus* (Latin for "connection") and *ora* (Italian for "now").

## What it is

Nexora is a prospecting companion — not a lead list — for independent financial advisors in the Tampa area who are still building their client base.

> We're not trying to help advisors contact more people. We're helping them find better reasons to start conversations.

## How it works

1. **One-time profile.** The advisor describes their experience, specialties, current and ideal clients, preferred outreach style, the cities/ZIPs they cover, a weekly new-conversations goal, and their existing network — described by type or organization only (e.g. "a CPA firm that serves physicians"), never by personal name.
2. **Weekly top 5.** Each week, Nexora's AI picks up to 5 of the strongest opportunities — new businesses and upcoming events together — and explains, for each:
   - **Why it fits** the advisor
   - A **warm path** to an introduction, if anything in the advisor's own network plausibly connects
   - **How to get started** — a concrete first step, why that approach fits this advisor, and a conversation opener
3. **Start, save, or skip.** The advisor marks each pick "Start a conversation," "Save for later," or "Skip." Skipped opportunities stay hidden for the rest of the week; saved ones are tagged "Saved." A weekly progress line tracks conversations started against the advisor's own goal (e.g. "You've started 2 of your 5 conversations this week").

## Data sources

- **New Hillsborough County business filings** — downloaded directly from Sunbiz's official daily corporate-filings file over SFTP. No scraping. Only business-level fields are used: entity name, type, filing date, and ZIP.
- **Hand-entered networking events**, for the pilot.
- **Working Women of Tampa Bay's official RSS feed** of upcoming events.
- Every business filing's ZIP is flagged **full** or **partial** coverage, depending on whether it lies entirely within Hillsborough County or also extends into a neighboring county.

## The AI

Nexora uses **Claude Haiku** to rank opportunities. It's instructed to:

- Cite only facts actually present in the filing/event data and the advisor's profile — never invent revenue, industry, attendee details, or anything else.
- Never address or refer to anyone by a personal name.
- Never suggest visiting a business in person as a first step (a filing is evidence of a legal structure, not a public storefront); that suggestion is reserved for events with a stated public venue.
- Label every pick **"Potential client," "Potential referral partner,"** or **"Networking event,"** based only on the facts given.

If the AI is unavailable, the feed still loads with a basic ranking.

## Privacy

Only business-level data is ever stored, shown, or committed — entity name, type, filing date, and ZIP. Personal names (business owners, officers, registered agents) are never stored or printed. Some business names include a person's name; Nexora shows them only as business names and never treats them as people. API keys and credentials live only in a local, untracked `.env` file and are never committed to the repo.

## Current status

The live AI now runs on AWS: an Amplify backend with a Lambda function that calls Claude Haiku directly. The original AWS account's organization policy blocked the backend deploy, so the app moved to a new, standalone AWS account where that restriction doesn't apply. If the live AI is ever unavailable, the feed falls back to a saved preview ranking instead of failing.

## Run it locally

Needs Node.js (see `CLAUDE.md` for the exact version in use).

```
npm install
npm run dev
```

Open the printed URL (usually http://localhost:5173).

To pull real Sunbiz filings, copy `.env.example` to `.env`, fill in the Sunbiz SFTP credentials, then:

```
node scripts/count-filings.js
```

Add `--write-json` to also write the results to `public/opportunities.json`.

To regenerate the sample AI ranking shown on the live site, add `ANTHROPIC_API_KEY` to `.env`, then:

```
node scripts/test-ranking.js
```

## What we've learned

- A typical day's Sunbiz file has about 3,000 Florida filings and roughly 190 new Hillsborough businesses.
- The 10 most repeated addresses cover under 7% of filings, so formation services aren't drowning out real businesses.
- Two advisor interviews found that paid lead lists didn't work for either advisor, and that relationships and introductions matter most.
- The AI's strongest picks are events and likely referral partners, while generic new LLCs produce thinner reasons — confirming the riskiest assumption we set out to test.

## Roadmap

- Physicians finishing training
- IRS Form 990 data (private foundations)
- Form 5500 data (employer retirement plans)
- More event feeds, through partnerships
- Nearby counties beyond Hillsborough
