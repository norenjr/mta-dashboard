#!/usr/bin/env node
/* Fetches @nymetrowx's latest post by loading their real x.com profile
   page in a headless browser and reading the tweet text out of the
   rendered DOM — X's undocumented syndication API (used by their own
   embed widget) turned out to rate-limit persistently, including from
   GitHub Actions' own IPs, so this reads the same public page a normal
   logged-out visitor sees instead.

   Run once daily by .github/workflows/tweet.yml — never called from a
   visitor's browser, so individual visitors never hit any of this.

   On any failure we exit non-zero and leave the existing tweet.json in
   place, so a bad day never blanks out the last known-good tweet. A
   screenshot is always saved for debugging (uploaded as a CI artifact). */

import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SCREEN_NAME = 'nymetrowx';
const OUT_FILE = fileURLToPath(new URL('../tweet.json', import.meta.url));
const DEBUG_SCREENSHOT = fileURLToPath(new URL('../debug-screenshot.png', import.meta.url));
const PROFILE_URL = `https://x.com/${SCREEN_NAME}`;

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  try {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    try {
      await page.waitForSelector('article', { timeout: 20000 });
    } catch (waitErr) {
      const title = await page.title().catch(() => '(unknown)');
      const url = page.url();
      const bodyText = await page
        .evaluate(() => document.body.innerText.slice(0, 1500))
        .catch(() => '(could not read body text)');
      console.error(`No <article> found. title="${title}" url="${url}"`);
      console.error('--- page body text (first 1500 chars) ---');
      console.error(bodyText);
      throw waitErr;
    }

    const tweet = await page.evaluate(() => {
      const article = document.querySelector('article');
      if (!article) return null;
      const textEl = article.querySelector('[data-testid="tweetText"]');
      const timeEl = article.querySelector('time');
      const linkEl = timeEl ? timeEl.closest('a') : null;
      return {
        text: textEl ? textEl.innerText : null,
        createdAt: timeEl ? timeEl.getAttribute('datetime') : null,
        permalink: linkEl ? linkEl.getAttribute('href') : null,
      };
    });

    if (!tweet || !tweet.text) {
      throw new Error('Could not find tweet text in the rendered page');
    }

    const url = tweet.permalink
      ? tweet.permalink.startsWith('http')
        ? tweet.permalink
        : `https://x.com${tweet.permalink}`
      : PROFILE_URL;

    const out = {
      screenName: SCREEN_NAME,
      text: tweet.text,
      url,
      createdAt: tweet.createdAt || null,
      fetchedAt: new Date().toISOString(),
    };

    await writeFile(OUT_FILE, JSON.stringify(out, null, 2) + '\n');
    console.log('Wrote tweet.json:', out);
  } finally {
    await page.screenshot({ path: DEBUG_SCREENSHOT, fullPage: false }).catch(() => {});
    await browser.close();
  }
}

main().catch((err) => {
  console.error('fetch-tweet failed:', err.message);
  process.exit(1);
});
