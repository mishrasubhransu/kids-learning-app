import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, Clock, Target, Lightbulb, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ADMIN_EMAIL } from '../../lib/recordings';
import { useAuth } from '../../context/AuthContext';
import HomeButton from '../ui/HomeButton';

// Admin-only usage dashboard (/admin/analytics), reading the usage_events
// table that src/lib/analytics.js writes. Aggregation happens client-side:
// at family-app scale a range query is a few thousand rows at most.

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];
const PAGE = 1000;
const MAX_PAGES = 20;
// Single-series magnitude bars → one sequential hue (validated ≥3:1 on white)
const BAR_COLOR = '#4f46e5';

const fmtDur = (ms) => {
  const m = Math.round(ms / 60000);
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  if (m >= 1) return `${m}m`;
  return `${Math.max(1, Math.round(ms / 1000))}s`;
};

const fmtDay = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const prettyLabel = (key) =>
  (key || 'other')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' · ');

// good / warning / serious — always shown next to the numeric value,
// never as the only encoding
const accuracyColor = (rate) =>
  rate >= 0.8 ? '#15803d' : rate >= 0.6 ? '#a16207' : '#b91c1c';

const perUserSummary = (events) => {
  const users = new Map();
  for (const e of events) {
    let u = users.get(e.user_id);
    if (!u) {
      u = {
        userId: e.user_id,
        email: e.email || e.user_id.slice(0, 8),
        totalMs: 0,
        sessions: new Set(),
        lastActive: e.occurred_at,
        correct: 0,
        answers: 0,
      };
      users.set(e.user_id, u);
    }
    u.sessions.add(e.session_id);
    if (e.occurred_at > u.lastActive) u.lastActive = e.occurred_at;
    if (e.event === 'page_view') u.totalMs += e.duration_ms || 0;
    if (e.event === 'answer') {
      u.answers += 1;
      if (e.meta?.correct) u.correct += 1;
    }
  }
  return [...users.values()].sort((a, b) => b.totalMs - a.totalMs);
};

const breakdown = (events, days) => {
  const byCategory = new Map();
  const byMode = new Map();
  const byDay = new Map();
  const accuracy = new Map(); // category -> { correct, total }
  const items = new Map(); // "category · item" -> { wrong, total }

  for (const e of events) {
    if (e.event === 'page_view') {
      const ms = e.duration_ms || 0;
      const cat = e.category || 'other';
      byCategory.set(cat, (byCategory.get(cat) || 0) + ms);
      const mode = e.mode || 'browse';
      byMode.set(mode, (byMode.get(mode) || 0) + ms);
      const day = e.occurred_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) || 0) + ms);
    } else if (e.event === 'answer') {
      const cat = e.category || 'other';
      const a = accuracy.get(cat) || { correct: 0, total: 0 };
      a.total += 1;
      if (e.meta?.correct) a.correct += 1;
      accuracy.set(cat, a);
      if (e.item) {
        const key = `${prettyLabel(cat)} — ${e.item}`;
        const it = items.get(key) || { wrong: 0, total: 0 };
        it.total += 1;
        if (!e.meta?.correct) it.wrong += 1;
        items.set(key, it);
      }
    }
  }

  // Dense day axis so quiet days render as gaps instead of vanishing
  const dayList = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    dayList.push({ day: d, ms: byDay.get(d) || 0 });
  }

  const sortDesc = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  return {
    byCategory: sortDesc(byCategory),
    byMode: sortDesc(byMode),
    dayList,
    accuracy: [...accuracy.entries()].sort((a, b) => b[1].total - a[1].total),
    troubleItems: [...items.entries()]
      .filter(([, v]) => v.wrong > 0)
      .sort((a, b) => b[1].wrong - a[1].wrong)
      .slice(0, 8),
  };
};

const buildInsights = (data, summary) => {
  const insights = [];
  const totalMs = data.byCategory.reduce((s, [, ms]) => s + ms, 0);
  if (!totalMs) return insights;

  const learning = data.byCategory.filter(([c]) => c !== 'home' && c !== 'other');
  if (learning.length) {
    const [topCat, topMs] = learning[0];
    insights.push(
      `Most time goes to ${prettyLabel(topCat)} (${fmtDur(topMs)}, ${Math.round((topMs / totalMs) * 100)}% of tracked time).`
    );
    const untouched = learning.filter(([, ms]) => ms < 60000);
    if (learning.length > 3 && untouched.length) {
      insights.push(
        `Barely visited: ${untouched.slice(0, 3).map(([c]) => prettyLabel(c)).join(', ')} — worth surfacing on the home screen or rotating in.`
      );
    }
  }

  const homeMs = data.byCategory.find(([c]) => c === 'home')?.[1] || 0;
  if (totalMs > 10 * 60000 && homeMs / totalMs > 0.2) {
    insights.push(
      `${Math.round((homeMs / totalMs) * 100)}% of time is spent on the home screen — navigation may be a hurdle; consider a "continue where you left off" shortcut.`
    );
  }

  for (const [cat, a] of data.accuracy) {
    if (a.total < 10) continue;
    const rate = a.correct / a.total;
    if (rate < 0.6) {
      insights.push(
        `Quiz accuracy in ${prettyLabel(cat)} is ${Math.round(rate * 100)}% over ${a.total} answers — try easier difficulty or more Learn time before Test.`
      );
    } else if (rate > 0.9 && a.total >= 20) {
      insights.push(
        `Quiz accuracy in ${prettyLabel(cat)} is ${Math.round(rate * 100)}% — ready for a harder difficulty.`
      );
    }
  }

  const repeatMisses = data.troubleItems.filter(([, v]) => v.wrong >= 3);
  if (repeatMisses.length) {
    insights.push(
      `Frequently missed: ${repeatMisses.slice(0, 4).map(([k]) => k).join(', ')} — worth extra practice in Learn mode.`
    );
  }

  const sessions = summary.reduce((s, u) => s + u.sessions.size, 0);
  if (sessions >= 3) {
    const avg = totalMs / sessions;
    if (avg < 3 * 60000) {
      insights.push(
        `Sessions average ${fmtDur(avg)} — short bursts; autoplay lessons or the game interstitial may help extend them.`
      );
    }
  }

  return insights;
};

const StatTile = ({ icon, label, value }) => {
  const Icon = icon;
  return (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
      <Icon size={20} />
    </div>
    <div>
      <div className="text-xl font-bold text-gray-800">{value}</div>
      <div className="text-xs font-medium text-gray-500">{label}</div>
    </div>
  </div>
  );
};

// Horizontal magnitude bars: thin marks, 4px rounded data-end, flat
// baseline, 2px gaps, value labels in ink (never in the series color)
const BarList = ({ title, rows, total }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
    <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
    {rows.length === 0 ? (
      <p className="text-sm text-gray-400">No activity in this range.</p>
    ) : (
      <div className="flex flex-col gap-[2px]">
        {rows.map(([key, ms]) => (
          <div
            key={key}
            className="grid grid-cols-[7rem_1fr_3.5rem] items-center gap-2 py-1"
            title={`${prettyLabel(key)}: ${fmtDur(ms)}`}
          >
            <span className="text-xs text-gray-600 truncate">{prettyLabel(key)}</span>
            <div className="h-3">
              <div
                className="h-3 rounded-r-[4px]"
                style={{
                  width: `${Math.max(1, (ms / (total || 1)) * 100)}%`,
                  backgroundColor: BAR_COLOR,
                }}
              />
            </div>
            <span className="text-xs text-gray-700 text-right tabular-nums">{fmtDur(ms)}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [days, setDays] = useState(30);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [truncated, setTruncated] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setTruncated(false);
      const from = new Date(Date.now() - days * 86400000).toISOString();
      const all = [];
      try {
        for (let page = 0; page < MAX_PAGES; page++) {
          const { data, error: err } = await supabase
            .from('usage_events')
            .select('user_id,email,session_id,event,category,mode,item,duration_ms,meta,occurred_at')
            .gte('occurred_at', from)
            .order('occurred_at', { ascending: false })
            .range(page * PAGE, page * PAGE + PAGE - 1);
          if (err) throw err;
          all.push(...data);
          if (data.length < PAGE) break;
          if (page === MAX_PAGES - 1 && !cancelled) setTruncated(true);
        }
        if (!cancelled) setEvents(all);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, days, reloadKey]);

  const summary = useMemo(() => perUserSummary(events), [events]);
  const scoped = useMemo(
    () => (selectedUser ? events.filter((e) => e.user_id === selectedUser) : events),
    [events, selectedUser]
  );
  const data = useMemo(() => breakdown(scoped, days), [scoped, days]);
  const scopedSummary = useMemo(
    () => (selectedUser ? summary.filter((u) => u.userId === selectedUser) : summary),
    [summary, selectedUser]
  );
  const insights = useMemo(() => buildInsights(data, scopedSummary), [data, scopedSummary]);

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  const totalMs = data.byCategory.reduce((s, [, ms]) => s + ms, 0);
  const sessions = scopedSummary.reduce((s, u) => s + u.sessions.size, 0);
  const answers = scopedSummary.reduce((s, u) => s + u.answers, 0);
  const correct = scopedSummary.reduce((s, u) => s + u.correct, 0);
  const maxDayMs = Math.max(...data.dayList.map((d) => d.ms), 1);
  const dayTick = Math.max(1, Math.ceil(days / 6));

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col overflow-y-auto">
      <div className="bg-white shadow-sm border-b border-gray-100 p-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <HomeButton to="/home" />
            <h1 className="text-2xl font-bold text-gray-800">Usage Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {RANGES.map((r) => (
                <button
                  key={r.days}
                  onClick={() => setDays(r.days)}
                  className={`min-h-10 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    days === r.days
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="min-h-10 px-3 py-2 rounded-lg bg-gray-100 text-gray-500 hover:text-gray-700"
              aria-label="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : undefined} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col gap-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            Couldn't load usage data: {error}
          </div>
        )}
        {truncated && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-4 text-sm">
            Showing the most recent {PAGE * MAX_PAGES} events only — narrow the date range for complete numbers.
          </div>
        )}

        {/* Overview tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile icon={Clock} label="Screen time" value={loading ? '…' : fmtDur(totalMs)} />
          <StatTile icon={Users} label={selectedUser ? 'Sessions' : `Users · Sessions`} value={loading ? '…' : selectedUser ? sessions : `${summary.length} · ${sessions}`} />
          <StatTile icon={Target} label="Quiz answers" value={loading ? '…' : answers} />
          <StatTile
            icon={Target}
            label="Quiz accuracy"
            value={loading ? '…' : answers ? `${Math.round((correct / answers) * 100)}%` : '—'}
          />
        </div>

        {/* Per-user table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Users</h2>
            {selectedUser && (
              <button
                onClick={() => setSelectedUser(null)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                Show all users
              </button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400">
                <th className="py-1 pr-4 font-medium">User</th>
                <th className="py-1 pr-4 font-medium">Time</th>
                <th className="py-1 pr-4 font-medium">Sessions</th>
                <th className="py-1 pr-4 font-medium">Accuracy</th>
                <th className="py-1 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((u) => (
                <tr
                  key={u.userId}
                  onClick={() => setSelectedUser(u.userId === selectedUser ? null : u.userId)}
                  className={`cursor-pointer border-t border-gray-50 hover:bg-indigo-50/50 ${
                    u.userId === selectedUser ? 'bg-indigo-50' : ''
                  }`}
                >
                  <td className="py-2 pr-4 text-gray-700">{u.email}</td>
                  <td className="py-2 pr-4 text-gray-700 tabular-nums">{fmtDur(u.totalMs)}</td>
                  <td className="py-2 pr-4 text-gray-700 tabular-nums">{u.sessions.size}</td>
                  <td className="py-2 pr-4 text-gray-700 tabular-nums">
                    {u.answers ? `${Math.round((u.correct / u.answers) * 100)}% of ${u.answers}` : '—'}
                  </td>
                  <td className="py-2 text-gray-500">{fmtDay(u.lastActive)}</td>
                </tr>
              ))}
              {!loading && summary.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-400">
                    No usage recorded in this range yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Lightbulb size={16} className="text-amber-500" />
              Insights{selectedUser ? ` — ${scopedSummary[0]?.email}` : ''}
            </h2>
            <ul className="flex flex-col gap-2">
              {insights.map((text) => (
                <li key={text} className="text-sm text-gray-600 flex gap-2">
                  <span className="text-indigo-400" aria-hidden="true">•</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Time breakdowns */}
        <div className="grid md:grid-cols-2 gap-4">
          <BarList title="Time by lesson" rows={data.byCategory} total={data.byCategory[0]?.[1]} />
          <BarList title="Time by mode" rows={data.byMode} total={data.byMode[0]?.[1]} />
        </div>

        {/* Daily activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Daily activity</h2>
          <div className="flex items-end gap-[2px] h-24">
            {data.dayList.map(({ day, ms }) => (
              <div
                key={day}
                className="flex-1 flex flex-col justify-end h-full"
                title={`${fmtDay(day)}: ${ms ? fmtDur(ms) : 'no activity'}`}
              >
                <div
                  className="rounded-t-[4px] w-full"
                  style={{
                    height: ms ? `${Math.max(3, (ms / maxDayMs) * 100)}%` : '0',
                    backgroundColor: BAR_COLOR,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-[2px] mt-1">
            {data.dayList.map(({ day }, i) => (
              <div key={day} className="flex-1 text-[10px] text-gray-400 text-center overflow-visible whitespace-nowrap">
                {i % dayTick === 0 ? fmtDay(day) : ''}
              </div>
            ))}
          </div>
        </div>

        {/* Accuracy + trouble items */}
        <div className="grid md:grid-cols-2 gap-4 pb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Quiz accuracy by lesson</h2>
            {data.accuracy.length === 0 ? (
              <p className="text-sm text-gray-400">No quiz answers in this range.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.accuracy.map(([cat, a]) => {
                  const rate = a.correct / a.total;
                  return (
                    <div key={cat} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: accuracyColor(rate) }}
                          aria-hidden="true"
                        />
                        {prettyLabel(cat)}
                      </span>
                      <span className="text-gray-700 tabular-nums">
                        {Math.round(rate * 100)}% of {a.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Most-missed items</h2>
            {data.troubleItems.length === 0 ? (
              <p className="text-sm text-gray-400">No wrong answers in this range. 🎉</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.troubleItems.map(([key, v]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 truncate pr-2">{key}</span>
                    <span className="text-gray-700 tabular-nums whitespace-nowrap">
                      {v.wrong} wrong / {v.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
