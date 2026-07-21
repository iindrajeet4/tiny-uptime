#!/usr/bin/env node
/**
 * tiny-uptime — serverless uptime checker.
 * Node 20+, zero dependencies (built-in fetch).
 *
 * Reads sites.json, checks each URL, writes:
 *   - docs/data/status.json            (current snapshot for all sites)
 *   - docs/data/history/<slug>.json    (append-only history, last 500 entries)
 *
 * Optional alerts on state change (up->down or down->up):
 *   - DISCORD_WEBHOOK        Discord webhook URL
 *   - LINE_MESSAGING_TOKEN   LINE Messaging API channel access token
 *   - LINE_TO                LINE userId/groupId to push to (required with token)
 * Both no-op gracefully when absent.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const SITES_FILE = path.join(ROOT, "sites.json");
const DATA_DIR = path.join(ROOT, "docs", "data");
const HISTORY_DIR = path.join(DATA_DIR, "history");
const STATUS_FILE = path.join(DATA_DIR, "status.json");

const TIMEOUT_MS = 15000;
const MAX_HISTORY = 500;
const ATTEMPTS = 2; // retry once on failure to avoid flagging transient blips
const RETRY_DELAY_MS = 3000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "site";
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function checkOnce(site) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  let httpCode = 0;
  let up = false;
  try {
    const res = await fetch(site.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "tiny-uptime/1.0 (+https://github.com)" },
    });
    httpCode = res.status;
    up = res.status >= 200 && res.status < 400;
    // Drain body so the connection closes cleanly (ignore errors).
    try { await res.arrayBuffer(); } catch {}
  } catch {
    up = false;
  } finally {
    clearTimeout(timer);
  }
  return {
    timestamp: new Date().toISOString(),
    status: up ? "up" : "down",
    httpCode,
    responseTimeMs: Date.now() - started,
  };
}

// Retry once before declaring a site down, so a single transient network
// blip (DNS hiccup, runner cold start) does not show as an outage.
async function checkSite(site) {
  let result = await checkOnce(site);
  for (let attempt = 2; attempt <= ATTEMPTS && result.status === "down"; attempt++) {
    console.log(`  ${site.name}: attempt ${attempt - 1} failed, retrying...`);
    await sleep(RETRY_DELAY_MS);
    result = await checkOnce(site);
  }
  return result;
}

async function sendDiscord(webhook, text) {
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
  } catch (err) {
    console.error("Discord alert failed:", err.message);
  }
}

async function sendLine(token, to, text) {
  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
    });
  } catch (err) {
    console.error("LINE alert failed:", err.message);
  }
}

async function alertStateChange(site, prev, curr) {
  const emoji = curr.status === "up" ? "✅" : "🔴";
  const text =
    `${emoji} ${site.name} is ${curr.status.toUpperCase()} ` +
    `(was ${prev.status}) — HTTP ${curr.httpCode}, ${curr.responseTimeMs}ms\n${site.url}`;

  const discord = process.env.DISCORD_WEBHOOK;
  const lineToken = process.env.LINE_MESSAGING_TOKEN;
  const lineTo = process.env.LINE_TO;

  if (discord) await sendDiscord(discord, text);
  if (lineToken && lineTo) await sendLine(lineToken, lineTo, text);
  if (!discord && !(lineToken && lineTo)) {
    console.log("State change (no alert channels configured):", text);
  }
}

async function main() {
  const sites = readJson(SITES_FILE, null);
  if (!Array.isArray(sites) || sites.length === 0) {
    console.error("sites.json missing or empty — nothing to check.");
    process.exit(1);
  }

  fs.mkdirSync(HISTORY_DIR, { recursive: true });
  const prevStatus = readJson(STATUS_FILE, { sites: [] });

  const snapshot = { generatedAt: new Date().toISOString(), sites: [] };
  const usedSlugs = new Set();
  let failures = 0;

  for (const site of sites) {
    if (!site || !site.name || !site.url) {
      console.warn("Skipping invalid site entry:", JSON.stringify(site));
      continue;
    }
    // Ensure slugs are unique so two sites never share a history file.
    let slug = site.slug || slugify(site.name);
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${site.slug || slugify(site.name)}-${n++}`;
    usedSlugs.add(slug);

    // A failure processing one site must not abort the whole run.
    try {
      const result = await checkSite(site);
      console.log(
        `${site.name}: ${result.status} (HTTP ${result.httpCode}, ${result.responseTimeMs}ms)`
      );

      // Append to per-site history, keep last MAX_HISTORY entries.
      const historyFile = path.join(HISTORY_DIR, `${slug}.json`);
      const stored = readJson(historyFile, []);
      const history = Array.isArray(stored) ? stored : [];
      history.push(result);
      const trimmed = history.slice(-MAX_HISTORY);
      fs.writeFileSync(historyFile, JSON.stringify(trimmed, null, 2) + "\n");

      snapshot.sites.push({ name: site.name, url: site.url, slug, ...result });

      // Alert on state change.
      const prev = (prevStatus.sites || []).find((s) => s.slug === slug);
      if (prev && prev.status !== result.status) {
        await alertStateChange(site, prev, result);
      }
    } catch (err) {
      failures++;
      console.error(`Error while processing ${site.name}:`, err.message);
      // Carry forward the previous snapshot entry (if any) so the site
      // does not silently vanish from the status page.
      const prev = (prevStatus.sites || []).find((s) => s.slug === slug);
      if (prev) snapshot.sites.push(prev);
    }
  }

  fs.writeFileSync(STATUS_FILE, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`Wrote ${STATUS_FILE}`);
  if (failures > 0) {
    console.warn(`${failures} site(s) had processing errors (see above).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
