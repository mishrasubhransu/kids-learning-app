import { supabase } from './supabase';

// Lightweight usage analytics: events queue up locally and flush to the
// usage_events table in batches, so tracking never blocks the UI and a
// flaky connection just means a slightly late batch. Screen time is
// measured as "segments" — one per (path, category, mode) — closed when
// any of those change, the tab hides, or the page unloads.

const FLUSH_INTERVAL_MS = 10_000;
// Ignore sub-second segments (redirects, mode-switch churn) …
const MIN_SEGMENT_MS = 1_000;
// … and cap a single segment so a tablet left face-up on a lesson all
// afternoon doesn't count as hours of learning
const MAX_SEGMENT_MS = 30 * 60 * 1000;

const sessionId = crypto.randomUUID();

let auth = null; // { userId, email, token }
let queue = [];
let flushTimer = null;
let segment = null; // { path, category, mode, startedAt }
let context = { category: null, mode: null };
// Segment paused because the tab went hidden; restored on return
let pendingResume = null;

supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    auth = {
      userId: session.user.id,
      email: session.user.email ?? null,
      token: session.access_token,
    };
  } else {
    auth = null;
    queue = [];
    segment = null;
    pendingResume = null;
  }
});

const row = (event, fields = {}) => ({
  user_id: auth.userId,
  email: auth.email,
  session_id: sessionId,
  event,
  path: fields.path ?? null,
  category: fields.category ?? null,
  mode: fields.mode ?? null,
  item: fields.item ?? null,
  duration_ms: fields.durationMs ?? null,
  meta: fields.meta ?? {},
  occurred_at: new Date().toISOString(),
});

// keepalive lets the final batch survive page unload (sendBeacon can't set
// the auth headers Supabase needs, plain fetch can)
const flush = () => {
  if (!auth || queue.length === 0) return;
  const batch = queue;
  queue = [];
  fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/usage_events`, {
    method: 'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${auth.token}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(batch),
  }).catch(() => {
    // Network hiccup: put the batch back and let the next flush retry
    queue = batch.concat(queue);
  });
};

export const track = (event, fields = {}) => {
  if (!auth) return;
  queue.push(row(event, fields));
  if (!flushTimer) {
    flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  }
};

const endSegment = () => {
  if (!segment) return;
  const { path, category, mode, startedAt } = segment;
  segment = null;
  const durationMs = Math.min(Date.now() - startedAt, MAX_SEGMENT_MS);
  if (durationMs < MIN_SEGMENT_MS) return;
  track('page_view', { path, category, mode, durationMs });
};

// Both the route watcher (path + category) and screen components (mode)
// call this with partial patches; whichever runs first, the segment
// converges on the right (path, category, mode) and the sub-second
// intermediate segments are dropped by MIN_SEGMENT_MS.
export const setScreenContext = (patch) => {
  if (!auth) return;
  const path = window.location.pathname;
  context = { ...context, ...patch };
  if (
    segment &&
    segment.path === path &&
    segment.category === context.category &&
    segment.mode === context.mode
  ) {
    return;
  }
  endSegment();
  segment = {
    path,
    category: context.category,
    mode: context.mode,
    startedAt: Date.now(),
  };
};

// A hidden tab stops the clock: close out the running segment (a killed
// mobile tab never fires pagehide) and restart it if the child comes back
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    pendingResume = segment
      ? { path: segment.path, category: segment.category, mode: segment.mode }
      : null;
    endSegment();
    flush();
  } else if (pendingResume) {
    segment = { ...pendingResume, startedAt: Date.now() };
    pendingResume = null;
  }
});

window.addEventListener('pagehide', () => {
  endSegment();
  flush();
});
