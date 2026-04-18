#!/usr/bin/env node
/**
 * AutoFlow Master Audit — Node.js Runner
 * Calls autoflow_health.php and presents results with full ANSI formatting.
 *
 * Usage:
 *   node scripts/audit.mjs
 *   node scripts/audit.mjs --url https://automation.ideas.edu.vn/mail_api
 *   node scripts/audit.mjs --url https://... --token your-token
 */

import https from 'https';
import http  from 'http';
import { URL } from 'url';

// ─── Config ──────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const getArg  = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i+1] : null; };

const BASE_URL = getArg('--url')   || 'https://automation.ideas.edu.vn/mail_api';
const TOKEN    = getArg('--token') || 'autoflow-admin-001';
const ENDPOINT = `${BASE_URL}/autoflow_health.php?admin_token=${TOKEN}`;

// ─── ANSI Colors ─────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
  white:  '\x1b[97m',
  bgGreen:  '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed:    '\x1b[41m',
};

const STATUS_ICON = {
  PASS: `${C.green}✓ PASS${C.reset}`,
  WARN: `${C.yellow}⚠ WARN${C.reset}`,
  FAIL: `${C.red}✗ FAIL${C.reset}`,
  INFO: `${C.blue}ℹ INFO${C.reset}`,
};

const STATUS_COLOR = { PASS: C.green, WARN: C.yellow, FAIL: C.red, INFO: C.blue };

// ─── HTTP helper (no external deps) ──────────────────────────────────────────
function fetch(urlStr) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(urlStr);
    const lib     = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'GET',
      timeout:  30000,
      headers:  { 'User-Agent': 'AutoFlow-Audit/1.0' },
      rejectUnauthorized: false,   // allow self-signed on dev
    };
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end',  () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error',   reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.end();
  });
}

// ─── Formatters ──────────────────────────────────────────────────────────────
function hr(char = '─', width = 70) { return char.repeat(width); }

function printHeader() {
  console.log(`\n${C.bold}${C.cyan}${hr('═')}${C.reset}`);
  console.log(`${C.bold}${C.white}  🔍  AutoFlow Master Audit — ${new Date().toLocaleString('vi-VN')}${C.reset}`);
  console.log(`${C.bold}${C.cyan}${hr('═')}${C.reset}\n`);
  console.log(`${C.dim}  Endpoint: ${ENDPOINT}${C.reset}\n`);
}

function printSection(section) {
  console.log(`\n${C.bold}${C.white}  ┌─ ${section.name.toUpperCase()} ${hr('─', 55 - section.name.length)}${C.reset}`);

  for (const item of section.items) {
    const icon  = STATUS_ICON[item.status]  || STATUS_ICON.INFO;
    const col   = STATUS_COLOR[item.status] || C.blue;
    const label = item.label.padEnd(48);
    const value = item.value ? `${C.dim}${item.value}${C.reset}` : '';
    console.log(`  │  ${icon}  ${col}${label}${C.reset}  ${value}`);
    if (item.detail) {
      console.log(`  │     ${C.dim}  ↳ ${item.detail}${C.reset}`);
    }
  }
  console.log(`${C.dim}  └${hr('─', 68)}${C.reset}`);
}

function printSummary(summary, overall, generatedAt) {
  console.log(`\n${C.bold}${C.cyan}${hr('═')}${C.reset}`);

  const overallColor = overall === 'PASS' ? `${C.bgGreen}${C.white}` :
                       overall === 'WARN' ? `${C.bgYellow}${C.white}` : `${C.bgRed}${C.white}`;

  console.log(`\n  ${C.bold}OVERALL STATUS: ${overallColor}  ${overall}  ${C.reset}\n`);

  const parts = [
    `${C.green}✓ ${summary.PASS} PASS${C.reset}`,
    `${C.yellow}⚠ ${summary.WARN} WARN${C.reset}`,
    `${C.red}✗ ${summary.FAIL} FAIL${C.reset}`,
    `${C.blue}ℹ ${summary.INFO} INFO${C.reset}`,
  ];
  console.log(`  ${parts.join('    ')}`);
  console.log(`\n${C.dim}  Report generated: ${generatedAt}${C.reset}`);
  console.log(`${C.bold}${C.cyan}${hr('═')}${C.reset}\n`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  printHeader();

  console.log(`${C.dim}  Connecting to health endpoint...${C.reset}`);

  let report;
  try {
    const { status, body } = await fetch(ENDPOINT);

    if (status === 403) {
      console.error(`\n${C.red}✗ Auth failed (403). Check admin_token.${C.reset}\n`);
      process.exit(1);
    }
    if (status === 404) {
      console.error(`\n${C.red}✗ Endpoint not found (404).${C.reset}`);
      console.error(`${C.yellow}  → Upload api/autoflow_health.php to the server first.${C.reset}\n`);
      process.exit(1);
    }
    if (status !== 200) {
      console.error(`\n${C.red}✗ HTTP ${status}${C.reset}\n${body.slice(0,500)}\n`);
      process.exit(1);
    }

    // Strip any PHP warnings before JSON
    const jsonStart = body.indexOf('{');
    const jsonStr   = jsonStart >= 0 ? body.slice(jsonStart) : body;
    report = JSON.parse(jsonStr);

  } catch (err) {
    console.error(`\n${C.red}✗ Request failed: ${err.message}${C.reset}\n`);
    console.error(`${C.yellow}  → Make sure the server is reachable and the file is uploaded.${C.reset}\n`);
    process.exit(1);
  }

  for (const section of report.sections) {
    printSection(section);
  }

  printSummary(report.summary, report.overall, report.generated_at);

  // Exit code for CI/monitoring
  process.exit(report.overall === 'FAIL' ? 1 : 0);
}

main();
