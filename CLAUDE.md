# Nexora

Nexora gives independent financial advisors in the Tampa area a short, AI-ranked list of new Hillsborough County businesses, with a plain-language reason for each. MVP data source: Florida Sunbiz daily corporate filings (via SFTP).

## How to run

```
npm install
npm run dev       # vite — local dev server, usually http://localhost:5173
npm run build     # vite build — production build
npm run preview   # vite preview — preview the production build
```

Filings script (needs `.env` — copy from `.env.example` and fill in Sunbiz SFTP credentials first):

```
node scripts/count-filings.js
```

Downloads the latest daily Sunbiz corporate filings file and prints the count of new Hillsborough County filings.

## Versions in use

- Node.js: v24.21.0
- React / react-dom: 18.3.1
- Vite: 5.4.21
- @vitejs/plugin-react: 4.7.0
- dotenv: 18.0.6
- ssh2-sftp-client: 12.1.1

Before any major-version upgrade (e.g. React 18 → 19, Vite 5 → 6), check that version's docs/changelog and ask me first.

## Rules

- Never store, print, or commit personal names, including officer and registered agent names. Use business-level fields only: entity name, type, filing date, ZIP.
- Keep secrets in `.env`. Never print or commit them.
- Never commit anything in `data/`.
- AI-written reasons may cite only facts actually present in the data. Never invent revenue, industry, or other details.
- Never add a package without asking me first.
- Work in small steps. After each change, explain what you did in plain English.
- If the same problem fails after two attempted fixes, stop and explain the evidence instead of trying again.

## Out of scope for now

New homeowners, local events, contact details for business owners, CRM integration, email alerts.
