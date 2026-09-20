#!/usr/bin/env node
/* Fetches @nymetrowx's latest post from X's public syndication endpoint
   (the same one their official embed widget uses) and writes it to
   tweet.json at the repo root. Run once daily by
   .github/workflows/tweet.yml — never called from a visitor's browser,
   so individual visitors never hit X's rate limits.

   This endpoint is undocumented and could change shape without notice.
   On any failure we exit non-zero and leave the existing tweet.json in
   place, so a bad day never blanks out the last known-good tweet. */

import { writeFile } from 'node:fs/promises';

const SCREEN_NAME = 'nymetrowx';
const OUT_FILE = new URL('../tweet.json', import.meta.url);

function findTweet(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (
    !Array.isArray(obj) &&
    typeof (obj.full_text ?? obj.text) === 'string' &&
    (obj.id_str || obj.id)
  ) {
    return obj;
  }
  for (const key of Object.keys(obj)) {
    const found = findTweet(obj[key]);
    if (found) return found;
  }
  return null;
}

function extractScreenName(tweet) {
  return (
    tweet.user?.screen_name ||
    tweet.core?.user_results?.result?.legacy?.screen_name ||
    tweet.core?.user_results?.result?.core?.screen_name ||
    SCREEN_NAME
  );
}

async function main() {
  const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${SCREEN_NAME}?showReplies=false&dnt=true&lang=en`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; mta-dashboard-tweet-fetch/1.0)' },
  });

  if (!res.ok) {
    throw new Error(`Fetch failed: HTTP ${res.status}`);
  }

  const html = await res.text();
  const match = html.match(
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) {
    console.error('--- response snippet for debugging ---');
    console.error(html.slice(0, 1000));
    throw new Error('Could not find embedded __NEXT_DATA__ tweet data in response');
  }

  const data = JSON.parse(match[1]);
  const tweet = findTweet(data);
  if (!tweet) {
    console.error('--- parsed data for debugging ---');
    console.error(JSON.stringify(data).slice(0, 2000));
    throw new Error('Could not locate a tweet object in the parsed data');
  }

  const text = tweet.full_text ?? tweet.text;
  const id = tweet.id_str || String(tweet.id);
  const screenName = extractScreenName(tweet);

  const out = {
    screenName,
    text,
    url: `https://x.com/${screenName}/status/${id}`,
    createdAt: tweet.created_at || null,
    fetchedAt: new Date().toISOString(),
  };

  await writeFile(OUT_FILE, JSON.stringify(out, null, 2) + '\n');
  console.log('Wrote tweet.json:', out);
}

main().catch((err) => {
  console.error('fetch-tweet failed:', err.message);
  process.exit(1);
});
