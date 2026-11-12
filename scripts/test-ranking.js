#!/usr/bin/env node
"use strict";

/**
 * Local test harness for the AI ranking prompt - lets you refine the prompt
 * and inspect Claude's output before the Lambda backend is reachable.
 *
 * Loads the same instructions the Lambda handler uses
 * (amplify/functions/rank-opportunities/prompt.js), a fictional advisor
 * profile (scripts/sample-profile.json), and matches opportunities/events
 * from public/opportunities.json, public/events.json, and
 * public/events-feed.json the same way src/HomePage.jsx does. Does not
 * touch .env contents beyond loading ANTHROPIC_API_KEY.
 *
 * Usage: node scripts/test-ranking.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { rankOpportunitiesBasic } from "../src/rankingFallback.js";
import {
  MODEL_ID,
  MAX_OUTPUT_TOKENS,
  EFFORT,
  buildSystemPrompt,
  buildUserPrompt,
  parseRanking,
  capItems,
} from "../amplify/functions/rank-opportunities/prompt.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");

dotenv.config({ path: path.join(ROOT_DIR, ".env") });

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error(
    "Missing ANTHROPIC_API_KEY. Copy .env.example to .env and fill in the value."
  );
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8"));
}

// Mirrors parseZips() in src/HomePage.jsx.
function parseZips(zipsText) {
  return zipsText
    .split(/[,\s]+/)
    .map((z) => z.trim())
    .filter(Boolean);
}

// Mirrors getTodayStr() in src/HomePage.jsx.
function getTodayStr() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const MAX_OPPORTUNITIES = 10;
const MAX_EVENTS = 10;

// Same matching rules as the `matched` memo in src/HomePage.jsx.
function matchOpportunities(opportunities, profile) {
  const cities = new Set(profile.cities);
  const zips = new Set(parseZips(profile.zips || ""));
  const filtered = opportunities.filter((o) => cities.has(o.city) || zips.has(o.zip));
  return rankOpportunitiesBasic(filtered).slice(0, MAX_OPPORTUNITIES);
}

// Same matching rules as the `aiEligibleEvents` memo in src/HomePage.jsx -
// an advisor can't plan ahead for an event happening today or already past,
// so those are excluded here (the "Upcoming events" list in the app itself
// still shows today's events, with a "Today"/"Tonight" tag - that's a
// display-only concern this script doesn't need to reproduce).
function matchEvents(events, profile) {
  const cities = new Set(profile.cities);
  const todayStr = getTodayStr();
  return events
    .filter((e) => cities.has(e.city) && e.date > todayStr)
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)))
    .slice(0, MAX_EVENTS);
}

function printResult(item, ranked) {
  const kind = item.hostingOrg !== undefined ? "event" : "business";
  console.log("");
  console.log(`#${ranked?.rank ?? "?"} ${item.name}`);
  if (kind === "business") {
    console.log(`   ${item.entityType} · ${item.city} · filed ${item.date} · ${item.zipCoverage}-ZIP`);
  } else {
    console.log(`   ${item.eventType} · ${item.city} · ${item.date} ${item.startTime} · hosted by ${item.hostingOrg}`);
  }
  if (!ranked) {
    console.log("   (Claude did not return a result for this item)");
    return;
  }
  console.log(`   Category:        ${ranked.category ?? "(none)"}`);
  console.log(`   Why it fits:     ${ranked.reason}`);
  console.log(`   Why now:         ${ranked.whyNow}`);
  console.log(`   Warm path:       ${ranked.warmPath}`);
  console.log(`   First step:      ${ranked.howToStart.firstStep}`);
  console.log(`   Why this way:    ${ranked.howToStart.whyThisApproach}`);
  console.log(`   Opener:          ${ranked.howToStart.opener}`);
}

async function main() {
  const profile = readJson("scripts/sample-profile.json");
  const opportunities = readJson("public/opportunities.json");
  const handEnteredEvents = readJson("public/events.json");
  const feedEvents = readJson("public/events-feed.json");

  const matchedOpportunities = matchOpportunities(opportunities, profile);
  const matchedEvents = matchEvents([...handEnteredEvents, ...feedEvents], profile);
  const items = capItems([...matchedOpportunities, ...matchedEvents]);

  console.log(`Advisor profile: ${profile.experience} experience, ${profile.specialties}`);
  console.log(`Covers: ${profile.cities.join(", ")}`);
  console.log(`Matched ${matchedOpportunities.length} business filing(s) and ${matchedEvents.length} event(s).`);

  if (items.length === 0) {
    console.log("Nothing matched this profile - nothing to send to Claude.");
    return;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const startedAt = Date.now();
  const response = await client.messages.create({
    model: MODEL_ID,
    max_tokens: MAX_OUTPUT_TOKENS,
    output_config: { effort: EFFORT },
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: buildUserPrompt(items, profile) }],
  });
  const elapsedMs = Date.now() - startedAt;
  console.log(`Claude call took ${elapsedMs} ms (effort: ${EFFORT}).`);
  console.log(`Thinking tokens: ${response.usage.output_tokens_details?.thinking_tokens ?? 0} of ${response.usage.output_tokens} output tokens.`);

  const textBlock = response.content.find((block) => block.type === "text");
  const ranking = textBlock && textBlock.type === "text" ? parseRanking(textBlock.text, items) : [];
  const byId = {};
  ranking.forEach((r) => {
    byId[r.id] = r;
  });

  // Only the items Claude actually selected (parseRanking already caps this
  // at MAX_RESULTS and sorts by rank) - not every candidate sent to it.
  const selected = ranking.map((r) => items.find((item) => item.id === r.id)).filter(Boolean);

  console.log("");
  console.log(`=== Top ${selected.length} result(s) ===`);
  selected.forEach((item) => printResult(item, byId[item.id]));
  console.log("");

  // Save the same shape the real backend returns (an array of
  // { id, rank, reason, warmPath, howToStart }, already capped to
  // MAX_RESULTS) so the frontend's mock-AI path can load it directly in
  // place of a live rankOpportunities call.
  const mockPath = path.join(ROOT_DIR, "public/mock-ai-ranking.json");
  fs.writeFileSync(mockPath, JSON.stringify(ranking, null, 2) + "\n");
  console.log(`Saved ${ranking.length} result(s) to public/mock-ai-ranking.json for the mock AI feed.`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exitCode = 1;
});
