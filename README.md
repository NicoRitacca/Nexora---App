# Nexora---App
Nexora is a personalized opportunity-discovery platform for independent financial advisors currently operating in the Tampa area. Advisors complete a short profile describing their experience, current and ideal clients, location, and weekly prospecting goals. Nexora starts with new business registrations in Hillsborough County, identifying recently formed businesses and ranking them based on factors such as advisor fit, recency, relevance, and location. Instead of overwhelming advisors with a generic list of leads, Nexora provides a small, prioritized feed of opportunities and explains why each one is relevant to that specific advisor.
Nico Ritacca CUA Busch School AI Vibe Coding Contest, Fall 2026

## Run it locally

You'll need [Node.js](https://nodejs.org) (LTS version) installed.

```
npm install
npm run dev
```

Then open the URL printed in the terminal (usually http://localhost:5173).

`node scripts/count-filings.js` downloads the latest daily Sunbiz file and prints the count of new Hillsborough filings.

## MVP scope

The first version of Nexora will use a single data source: new business registrations in Hillsborough County, Florida, published by the Florida Division of Corporations through Sunbiz. A brand-new business owner faces immediate decisions about insurance, retirement plans, payroll, and banking, which makes them one of the highest-value people an advisor can reach early. For the MVP, Nexora will pull recent filings, rank them for one specific advisor, and explain why each business made the list. New homeowners and local events are on the roadmap for later versions.

Hillsborough is matched by principal address ZIP code. Nexora includes any ZIP that touches Hillsborough County, even partly, using the 2020 Census ZIP-to-county relationship file (58 ZIPs). This captures every Hillsborough business, at the cost of including some filings from border areas near Pasco, Polk, Pinellas, and Manatee counties. Only business-level fields are loaded: entity name, type, filing date, and ZIP. Officer and registered agent names are never stored.
