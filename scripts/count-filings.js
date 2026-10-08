#!/usr/bin/env node
"use strict";

/**
 * Downloads one recent daily Florida Sunbiz corporate filings file and counts
 * recent new business filings in Hillsborough County, FL.
 *
 * Sources (official, public):
 * - Sunbiz SFTP server + public credentials: https://dos.fl.gov/sunbiz/other-services/data-downloads/daily-data/
 * - Corporate file fixed-width record layout: https://dos.sunbiz.org/data-definitions/cor.html
 * - Census 2020 ZCTA-to-county relationship file: https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.2020.html
 *
 * Privacy note: this script only reads business-level fields (entity name,
 * filing type, file date, principal ZIP, principal street address). It never
 * reads the officer or registered agent name/address fields in the record,
 * which live past column 544 in the 1440-character layout.
 */

import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";
import SftpClient from "ssh2-sftp-client";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

if (!process.env.SUNBIZ_SFTP_USERNAME || !process.env.SUNBIZ_SFTP_PASSWORD) {
  throw new Error(
    "Missing SUNBIZ_SFTP_USERNAME or SUNBIZ_SFTP_PASSWORD. Copy .env.example to .env and fill in the values."
  );
}

const SFTP_CONFIG = {
  host: "sftp.floridados.gov",
  port: 22,
  username: process.env.SUNBIZ_SFTP_USERNAME,
  password: process.env.SUNBIZ_SFTP_PASSWORD,
  readyTimeout: 20000,
};
const SFTP_COR_DIR = "./doc/cor";

const CENSUS_REL_FILE_URL =
  "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt";
const CENSUS_REL_FILE_NAME = "tab20_zcta520_county20_natl.txt";
const HILLSBOROUGH_COUNTY_FIPS = "12057";

// Official fixed-width layout from https://dos.sunbiz.org/data-definitions/cor.html
// Positions below are 1-based column start, matching the published spec.
const RECORD_LENGTH = 1440;
const FIELDS = {
  NAME: { start: 13, length: 192 },
  FILING_TYPE: { start: 206, length: 15 },
  PRINCIPAL_ADDRESS_1: { start: 221, length: 42 },
  PRINCIPAL_ZIP: { start: 335, length: 10 },
  FILE_DATE: { start: 473, length: 8 }, // MMDDYYYY
};
// Everything officer/registered-agent related starts at column 545 and is
// never referenced by this script.

const WITHIN_DAYS = 30;
const TOP_N_ADDRESSES = 10;

function extractField(line, field) {
  return line.substr(field.start - 1, field.length);
}

async function ensureDataDir() {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
}

async function findLatestDailyCorFile(sftp) {
  const entries = await sftp.list(SFTP_COR_DIR);
  const dailyFiles = entries
    .map((e) => e.name)
    .filter((name) => /^\d{8}c\.txt$/i.test(name))
    .sort();
  if (dailyFiles.length === 0) {
    throw new Error("No daily corporate filing files found on SFTP server.");
  }
  return dailyFiles[dailyFiles.length - 1];
}

async function downloadDailyCorporateFile() {
  const sftp = new SftpClient();
  try {
    await sftp.connect(SFTP_CONFIG);
    const fileName = await findLatestDailyCorFile(sftp);
    const localPath = path.join(DATA_DIR, fileName);

    if (fs.existsSync(localPath)) {
      console.log(`Using cached daily filings file: data/${fileName}`);
    } else {
      console.log(`Downloading daily filings file: ${fileName}`);
      await sftp.fastGet(`${SFTP_COR_DIR}/${fileName}`, localPath);
    }
    return { localPath, fileName };
  } finally {
    await sftp.end();
  }
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download ${url}: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", (err) => {
        fs.unlink(destPath, () => reject(err));
      });
  });
}

async function downloadCensusRelationshipFile() {
  const localPath = path.join(DATA_DIR, CENSUS_REL_FILE_NAME);
  if (fs.existsSync(localPath)) {
    console.log(`Using cached Census relationship file: data/${CENSUS_REL_FILE_NAME}`);
    return localPath;
  }
  console.log("Downloading Census 2020 ZCTA-to-county relationship file...");
  await downloadFile(CENSUS_REL_FILE_URL, localPath);
  return localPath;
}

async function buildHillsboroughZipSet(censusFilePath) {
  const content = await fs.promises.readFile(censusFilePath, "utf8");
  const lines = content.replace(/^﻿/, "").split(/\r\n|\n/).filter(Boolean);
  const header = lines[0].split("|");
  const zctaIdx = header.indexOf("GEOID_ZCTA5_20");
  const countyIdx = header.indexOf("GEOID_COUNTY_20");
  if (zctaIdx === -1 || countyIdx === -1) {
    throw new Error("Unexpected Census relationship file format: missing expected columns.");
  }

  const zips = new Set();
  for (const line of lines.slice(1)) {
    const cols = line.split("|");
    if (cols[countyIdx] === HILLSBOROUGH_COUNTY_FIPS && cols[zctaIdx]) {
      zips.add(cols[zctaIdx].trim());
    }
  }
  return zips;
}

function parseFileDateFromName(fileName) {
  const m = fileName.match(/^(\d{4})(\d{2})(\d{2})c\.txt$/i);
  if (!m) throw new Error(`Unrecognized daily filename format: ${fileName}`);
  const [, yyyy, mm, dd] = m;
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
}

// Record file date is stored as MMDDYYYY.
function parseRecordFileDate(raw) {
  const digits = raw.trim();
  const m = digits.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  return Number.isNaN(date.getTime()) ? null : date;
}

// The ZIP field is frequently dirty (stray dashes, truncated extensions,
// non-digit garbage from a misaligned country field). Take the leading run
// of 5 digits, which is the ZCTA5-comparable ZIP code.
function parseZip5(raw) {
  const m = raw.trim().match(/^(\d{5})/);
  return m ? m[1] : null;
}

function daysBetween(dateA, dateB) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.abs(dateA.getTime() - dateB.getTime()) / msPerDay;
}

async function parseCorporateFile(localPath) {
  const buffer = await fs.promises.readFile(localPath, "latin1");
  const lines = buffer.split(/\r\n|\n|\r/).filter((l) => l.length === RECORD_LENGTH);

  const records = [];
  for (const line of lines) {
    records.push({
      name: extractField(line, FIELDS.NAME).trim(),
      filingType: extractField(line, FIELDS.FILING_TYPE).trim(),
      principalAddress1: extractField(line, FIELDS.PRINCIPAL_ADDRESS_1).trim(),
      zip5: parseZip5(extractField(line, FIELDS.PRINCIPAL_ZIP)),
      fileDate: parseRecordFileDate(extractField(line, FIELDS.FILE_DATE)),
    });
  }
  return records;
}

async function main() {
  await ensureDataDir();

  const [{ localPath: corFilePath, fileName }, censusFilePath] = await Promise.all([
    downloadDailyCorporateFile(),
    downloadCensusRelationshipFile(),
  ]);

  const hillsboroughZips = await buildHillsboroughZipSet(censusFilePath);
  const fileDate = parseFileDateFromName(fileName);
  const allRecords = await parseCorporateFile(corFilePath);

  const hillsboroughRecords = allRecords.filter(
    (r) => r.zip5 && hillsboroughZips.has(r.zip5)
  );
  const newHillsboroughFilings = hillsboroughRecords.filter(
    (r) => r.fileDate && daysBetween(r.fileDate, fileDate) <= WITHIN_DAYS
  );

  const addressCounts = new Map();
  for (const r of newHillsboroughFilings) {
    const key = r.principalAddress1.toUpperCase();
    if (!key) continue;
    addressCounts.set(key, (addressCounts.get(key) || 0) + 1);
  }
  const topAddresses = [...addressCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N_ADDRESSES);
  const topAddressTotal = topAddresses.reduce((sum, [, count]) => sum + count, 0);
  const topAddressPercent = newHillsboroughFilings.length
    ? (topAddressTotal / newHillsboroughFilings.length) * 100
    : 0;

  const fmtDate = fileDate.toISOString().slice(0, 10);
  console.log("");
  console.log(`File date used: ${fmtDate}`);
  console.log(`Total records in file: ${allRecords.length}`);
  console.log(`Hillsborough County records (by principal ZIP): ${hillsboroughRecords.length}`);
  console.log(
    `New Hillsborough filings (filed within ${WITHIN_DAYS} days of file date): ${newHillsboroughFilings.length}`
  );
  console.log("");
  console.log(
    `Top ${TOP_N_ADDRESSES} most repeated principal street addresses among new Hillsborough filings:`
  );
  topAddresses.forEach(([address, count], i) => {
    const pct = newHillsboroughFilings.length
      ? ((count / newHillsboroughFilings.length) * 100).toFixed(1)
      : "0.0";
    console.log(`  ${i + 1}. ${address} — ${count} filings (${pct}%)`);
  });
  console.log(
    `  These ${TOP_N_ADDRESSES} addresses cover ${topAddressTotal} of ${newHillsboroughFilings.length} new Hillsborough filings (${topAddressPercent.toFixed(1)}%).`
  );
  console.log("");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exitCode = 1;
});
