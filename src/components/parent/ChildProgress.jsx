import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Last 7 days for one child, from usage_events (readable by the family's
// parents since the family_accounts migration). Same conventions as the
// admin dashboard: page_view duration_ms is screen time, answer events
// carry meta.correct, sticker_earned is a sticker.

const DAYS = 7;

const prettyLabel = (key) =>
  (key || 'other')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const minutes = (ms) => Math.round(ms / 60000);
const timeLabel = (ms) => {
  const m = minutes(ms);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
};

const summarize = (events) => {
  const byDay = new Map();
  const byCategory = new Map();
  let totalMs = 0;
  let answers = 0;
  let correct = 0;
  let stickers = 0;
  const sessions = new Set();
  for (const e of events) {
    sessions.add(e.session_id);
    if (e.event === 'page_view') {
      const ms = e.duration_ms || 0;
      totalMs += ms;
      const day = e.occurred_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) || 0) + ms);
      if (e.category) byCategory.set(e.category, (byCategory.get(e.category) || 0) + ms);
    } else if (e.event === 'answer') {
      answers += 1;
      if (e.meta?.correct) correct += 1;
    } else if (e.event === 'sticker_earned') {
      stickers += 1;
    }
  }
  const lessons = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  // Oldest → newest strip of the last DAYS days, zero-filled
  const days = [];
  for (let i = DAYS - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), ms: byDay.get(key) || 0 });
  }
  return {
    totalMs,
    activeDays: [...byDay.values()].filter((ms) => ms > 0).length,
    sessions: sessions.size,
    answers,
    accuracy: answers ? Math.round((correct / answers) * 100) : null,
    stickers,
    lessons,
    days,
  };
};

const Tile = ({ value, label }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
    <div className="text-xl font-bold text-gray-800">{value}</div>
    <div className="text-xs text-gray-500">{label}</div>
  </div>
);

const ChildProgress = ({ child }) => {
  const [state, setState] = useState({ childId: null, summary: null, error: null });

  useEffect(() => {
    let cancelled = false;
    const since = new Date();
    since.setDate(since.getDate() - (DAYS - 1));
    since.setHours(0, 0, 0, 0);
    supabase
      .from('usage_events')
      .select('event, category, duration_ms, occurred_at, meta, session_id')
      .eq('child_id', child.id)
      .gte('occurred_at', since.toISOString())
      .order('occurred_at', { ascending: false })
      .limit(5000)
      .then(({ data, error }) => {
        if (cancelled) return;
        setState({
          childId: child.id,
          summary: error ? null : summarize(data || []),
          error: error?.message || null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [child.id]);

  const summary = state.childId === child.id ? state.summary : null;
  if (!summary) {
    return (
      <div className="text-sm text-gray-400">
        {state.error ? `Progress unavailable: ${state.error}` : 'Loading…'}
      </div>
    );
  }
  if (summary.totalMs === 0 && summary.answers === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm text-gray-500">
        Nothing played in the last {DAYS} days yet.
      </div>
    );
  }
  const maxDay = Math.max(...summary.days.map((d) => d.ms), 1);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile value={timeLabel(summary.totalMs)} label="screen time" />
        <Tile value={`${summary.activeDays} / ${DAYS}`} label="days played" />
        <Tile
          value={summary.accuracy == null ? '—' : `${summary.accuracy}%`}
          label={`right of ${summary.answers} answers`}
        />
        <Tile value={summary.stickers} label="stickers earned" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-end justify-between gap-1 h-16">
          {summary.days.map((d) => (
            <div key={d.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div
                className="w-full max-w-8 rounded-t-md bg-indigo-400"
                style={{ height: `${Math.max(4, (d.ms / maxDay) * 100)}%`, opacity: d.ms ? 1 : 0.25 }}
                title={`${d.key}: ${timeLabel(d.ms)}`}
              />
              <div className="text-[10px] text-gray-400">{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      {summary.lessons.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-1.5">
          {summary.lessons.map(([cat, ms]) => (
            <div key={cat} className="flex items-center gap-3 text-sm">
              <span className="w-28 truncate text-gray-700">{prettyLabel(cat)}</span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-indigo-400 rounded-full"
                  style={{ width: `${Math.max(3, (ms / summary.lessons[0][1]) * 100)}%` }}
                />
              </div>
              <span className="w-16 text-right text-gray-500 text-xs">{timeLabel(ms)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChildProgress;
