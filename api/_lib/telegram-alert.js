/* global process */
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// Server-side error alerts to the same Telegram chat as /api/submit-feedback.
// Each ISSUE TYPE is capped at 4 sends per UTC day: serverless instances
// share no memory, so the counter lives in Supabase (alert_throttle table,
// bumped via the bump_alert RPC). Fails closed — if the throttle can't be
// bumped, nothing is sent; the error is still in the function logs either
// way. Never throws: alerting must not break the request that triggered it.

const MAX_PER_DAY = 4;

// "Same issue" is not "same text": two Gemini 429s differ in their JSON
// payload, two upload failures differ in path and timestamp. The throttle
// key is a hash of the message with the variable parts masked (Sentry-style
// grouping): JSON payloads dropped, paths, uuids and digit runs collapsed —
// except
// 3-digit HTTP statuses, which DO distinguish issues (429 quota vs 503
// flaky). Over-splitting is the bounded failure mode: an unforeseen
// variable part means a few extra buckets, each still capped at 4/day.
export const fingerprint = (text) =>
  createHash('sha256')
    .update(
      text
        .replace(/\{[\s\S]*/, '{')
        .replace(/\S*\/\S*/g, '#')
        .replace(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
          '#'
        )
        .replace(/\d+/g, (m) => (m.length === 3 && /^[1-5]/.test(m) ? m : '#'))
        .toLowerCase()
        .slice(0, 300)
    )
    .digest('hex');

// `context` (endpoint/action label) is shown in the message but kept OUT of
// the throttle key, so one root cause hitting several endpoints — a quota
// outage failing both name and praise actions — still shares one budget.
export async function alertTelegram(message, context = '') {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_SERVICE_ROLE_KEY } =
    process.env;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const body = String(message);
    // Telegram caps messages at 4096
    const text = (context ? `${context}\n${body}` : body).slice(0, 3500);
    if (!SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
      throw new Error('Supabase env missing — cannot throttle');
    }
    const admin = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const key = fingerprint(body);
    const { data: count, error } = await admin.rpc('bump_alert', {
      p_key: key,
      p_message: text,
    });
    if (error) throw new Error(`throttle: ${error.message}`);
    if (count > MAX_PER_DAY) return;
    const suffix =
      count === MAX_PER_DAY
        ? `(${count}/${MAX_PER_DAY} today — muted until tomorrow UTC)`
        : `(${count}/${MAX_PER_DAY} today)`;
    const resp = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No parse_mode: raw error text is full of { } _ * that would make
        // Telegram reject the message as broken Markdown
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: `\u{1F6A8} ${text}\n\n${suffix}`,
        }),
      }
    );
    if (!resp.ok) throw new Error(`telegram: ${await resp.text()}`);
  } catch (err) {
    console.error('telegram alert failed:', err.message);
  }
}
