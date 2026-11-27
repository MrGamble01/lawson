// ---------- Play tracking ----------
// What was opened, and for how long, so a parent can see it later.
// Stored under one key ("lawson:playlog"). High scores, stickers, the
// kid's name and every other setting live in their own keys and are
// never read or written here.
//
// A session is one foreground visit. Hiding the page (screen lock, app
// switch) freezes the clock; coming back within a few minutes continues
// the same visit, otherwise a new one starts. Game time is a segment
// inside the session. Switching game or mode closes the segment.
//
// Shape (version 1):
//   totals: all-time ms / sessions / plays, plus per game and mode
//   days:   same numbers by local YYYY-MM-DD, so Today and 7 days
//           survive after old session detail is pruned
//   sessions: recent visits, oldest dropped first
//   open:   the visit in progress, so a killed page still has an end time
const PLAYLOG_KEY = "lawson:playlog";
const PLAYLOG_VERSION = 1;

var LawsonPlay = (function () {
  const LIMITS = {
    maxSessions: 60,
    maxPlays: 40,
    maxDays: 90,
    maxJson: 350000,
    resumeGapMs: 3 * 60 * 1000,
    minSegmentMs: 500,
    minSessionMs: 1000,
  };

  let now = () => Date.now();
  let data = null;
  let session = null;
  let segment = null;
  let tickingFrom = null;
  let hidden = false;
  let bound = false;

  function num(n) {
    n = Number(n);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 1e12) : 0;
  }

  function dayKey(ts) {
    const d = new Date(ts);
    const z = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
  }

  function shiftDay(key, delta) {
    const parts = String(key).split("-").map(Number);
    const dt = new Date(parts[0], parts[1] - 1, parts[2] + delta);
    return dayKey(dt.getTime());
  }

  function blank() {
    return {
      v: PLAYLOG_VERSION,
      totals: { ms: 0, sessions: 0, plays: 0, games: {} },
      days: {},
      sessions: [],
      open: null,
    };
  }

  function cleanGame(id) {
    const s = String(id || "").trim().toLowerCase();
    return /^[a-z0-9]{1,24}$/.test(s) ? s : "";
  }

  function cleanMode(mode) {
    return String(mode || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 40);
  }

  function gameBucket(games, id) {
    if (!games[id] || typeof games[id] !== "object") games[id] = { ms: 0, plays: 0, modes: {} };
    if (!games[id].modes || typeof games[id].modes !== "object") games[id].modes = {};
    return games[id];
  }

  function modeBucket(game, mode) {
    if (!mode) return null;
    if (!game.modes[mode]) game.modes[mode] = { ms: 0, plays: 0 };
    return game.modes[mode];
  }

  function dayBucket(tsOrKey) {
    const key = typeof tsOrKey === "string" ? tsOrKey : dayKey(tsOrKey);
    if (!data.days[key] || typeof data.days[key] !== "object") {
      data.days[key] = { ms: 0, sessions: 0, plays: 0, games: {} };
    }
    const day = data.days[key];
    day.ms = num(day.ms);
    day.sessions = num(day.sessions);
    day.plays = num(day.plays);
    if (!day.games || typeof day.games !== "object") day.games = {};
    return day;
  }

  function freshSegment(game, mode) {
    const t = now();
    return { game, mode, start: t, end: t, ms: 0, committedMs: 0, counted: false };
  }

  function pending() {
    if (tickingFrom == null) return 0;
    return Math.max(0, now() - tickingFrom);
  }

  function checkpoint() {
    const extra = pending();
    if (extra && session) {
      session.ms += extra;
      session.end = now();
    }
    if (extra && segment) {
      segment.ms += extra;
      segment.end = now();
    }
    if (tickingFrom != null) tickingFrom = now();
  }

  function addMs(bucket, ms) {
    if (ms > 0) bucket.ms = num(bucket.ms) + ms;
  }

  function commitSegment(seg) {
    if (!seg || seg.ms < LIMITS.minSegmentMs) return;
    const delta = seg.ms - num(seg.committedMs);
    if (delta <= 0) return;
    addMs(gameBucket(data.totals.games, seg.game), delta);
    const mode = modeBucket(gameBucket(data.totals.games, seg.game), seg.mode);
    if (mode) addMs(mode, delta);
    const day = dayBucket(now());
    addMs(gameBucket(day.games, seg.game), delta);
    const dayMode = modeBucket(gameBucket(day.games, seg.game), seg.mode);
    if (dayMode) addMs(dayMode, delta);
    seg.committedMs = seg.ms;
  }

  function countPlay(seg) {
    if (!seg || seg.counted || seg.ms < LIMITS.minSegmentMs) return;
    seg.counted = true;
    const g = gameBucket(data.totals.games, seg.game);
    g.plays = num(g.plays) + 1;
    data.totals.plays = num(data.totals.plays) + 1;
    const mode = modeBucket(g, seg.mode);
    if (mode) mode.plays = num(mode.plays) + 1;
    const day = dayBucket(now());
    day.plays += 1;
    const dg = gameBucket(day.games, seg.game);
    dg.plays = num(dg.plays) + 1;
    const dayMode = modeBucket(dg, seg.mode);
    if (dayMode) dayMode.plays = num(dayMode.plays) + 1;
  }

  function commitSession() {
    if (!session || session.ms < LIMITS.minSessionMs) return;
    const delta = session.ms - num(session.committedMs);
    if (delta <= 0) return;
    const key = dayKey(now());
    data.totals.ms = num(data.totals.ms) + delta;
    dayBucket(key).ms += delta;
    if (!session.committedByDay) session.committedByDay = {};
    session.committedByDay[key] = num(session.committedByDay[key]) + delta;
    session.committedMs = session.ms;
  }

  function rollbackSession() {
    if (!session) return;
    const committed = num(session.committedMs);
    if (!committed) return;
    data.totals.ms = Math.max(0, num(data.totals.ms) - committed);
    const byDay = session.committedByDay || {};
    Object.keys(byDay).forEach((key) => {
      if (data.days[key]) data.days[key].ms = Math.max(0, num(data.days[key].ms) - num(byDay[key]));
    });
    session.committedMs = 0;
    session.committedByDay = {};
  }

  function closeSegment() {
    if (!segment) return;
    checkpoint();
    const seg = segment;
    segment = null;
    if (seg.ms < LIMITS.minSegmentMs) return;
    commitSegment(seg);
    countPlay(seg);
    if (!session) return;
    session.plays.push({
      game: seg.game,
      mode: seg.mode,
      start: seg.start,
      end: seg.end || now(),
      ms: seg.ms,
    });
    if (session.plays.length > LIMITS.maxPlays) {
      session.plays.splice(0, session.plays.length - LIMITS.maxPlays);
    }
  }

  function jsonSize() {
    try { return JSON.stringify(data).length; } catch (_) { return 0; }
  }

  function prune() {
    data.sessions.sort((a, b) => num(a && a.start) - num(b && b.start));
    while (data.sessions.length > LIMITS.maxSessions) data.sessions.shift();
    const today = dayKey(now());
    const cutoff = shiftDay(today, -LIMITS.maxDays);
    Object.keys(data.days).forEach((key) => { if (key < cutoff) delete data.days[key]; });
    let guard = 0;
    while (jsonSize() > LIMITS.maxJson && data.sessions.length > 1 && guard < 80) {
      data.sessions.shift();
      guard += 1;
    }
    guard = 0;
    while (jsonSize() > LIMITS.maxJson && guard < 120) {
      const keys = Object.keys(data.days).sort();
      if (keys.length <= 1) break;
      const oldest = keys[0] === today && keys.length > 1 ? keys[1] : keys[0];
      if (!oldest || oldest === today) break;
      delete data.days[oldest];
      guard += 1;
    }
  }

  function serializeOpen() {
    return {
      id: session.id,
      start: session.start,
      end: session.end,
      ms: session.ms,
      committedMs: session.committedMs || 0,
      committedByDay: session.committedByDay || {},
      plays: session.plays,
      hiddenAt: session.hiddenAt || null,
      segment: segment ? {
        game: segment.game,
        mode: segment.mode,
        start: segment.start,
        end: segment.end,
        ms: segment.ms,
        committedMs: segment.committedMs || 0,
        counted: !!segment.counted,
      } : null,
    };
  }

  function persist() {
    if (!data) return;
    data.open = session ? serializeOpen() : null;
    prune();
    try {
      localStorage.setItem(PLAYLOG_KEY, JSON.stringify(data));
    } catch (_) {
      data.sessions.splice(0, Math.ceil(data.sessions.length / 2));
      try { localStorage.setItem(PLAYLOG_KEY, JSON.stringify(data)); } catch (__) {}
    }
  }

  function restoreOpen(open) {
    session = {
      id: typeof open.id === "string" ? open.id : "s" + now().toString(36),
      start: num(open.start) || now(),
      end: num(open.end) || num(open.start) || now(),
      ms: num(open.ms),
      committedMs: num(open.committedMs),
      committedByDay: open.committedByDay && typeof open.committedByDay === "object" ? open.committedByDay : {},
      plays: Array.isArray(open.plays) ? open.plays.slice(-LIMITS.maxPlays) : [],
      hiddenAt: num(open.hiddenAt) || now(),
    };
    const seg = open.segment;
    segment = seg && cleanGame(seg.game) ? {
      game: cleanGame(seg.game),
      mode: cleanMode(seg.mode),
      start: num(seg.start) || session.start,
      end: num(seg.end) || session.end,
      ms: num(seg.ms),
      committedMs: num(seg.committedMs),
      counted: !!seg.counted,
    } : null;
    tickingFrom = null;
  }

  function load() {
    data = blank();
    let open = null;
    try {
      const raw = localStorage.getItem(PLAYLOG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.v === PLAYLOG_VERSION && parsed.totals && typeof parsed.totals === "object" && !Array.isArray(parsed.totals.games)) {
          data.totals.ms = num(parsed.totals.ms);
          data.totals.sessions = num(parsed.totals.sessions);
          data.totals.plays = num(parsed.totals.plays);
          data.totals.games = parsed.totals.games && typeof parsed.totals.games === "object" ? parsed.totals.games : {};
          data.days = parsed.days && typeof parsed.days === "object" && !Array.isArray(parsed.days) ? parsed.days : {};
          data.sessions = Array.isArray(parsed.sessions) ? parsed.sessions.filter((s) => s && num(s.start)).slice(-LIMITS.maxSessions) : [];
          open = parsed.open && typeof parsed.open === "object" ? parsed.open : null;
        }
      }
    } catch (_) {
      data = blank();
      open = null;
    }
    if (open) {
      restoreOpen(open);
      finalizeSession();
    }
  }

  function ready() {
    if (!data) load();
  }

  function startSession() {
    const t = now();
    session = {
      id: "s" + t.toString(36) + Math.random().toString(36).slice(2, 8),
      start: t,
      end: t,
      ms: 0,
      committedMs: 0,
      committedByDay: {},
      plays: [],
      hiddenAt: null,
    };
    segment = null;
    tickingFrom = hidden ? null : t;
    persist();
  }

  function finalizeSession() {
    checkpoint();
    closeSegment();
    if (session) {
      const keep = session.ms >= LIMITS.minSessionMs || session.plays.length > 0;
      if (keep) {
        commitSession();
        data.totals.sessions = num(data.totals.sessions) + 1;
        dayBucket(session.start).sessions += 1;
        data.sessions.push({
          id: session.id,
          start: session.start,
          end: session.end || session.start,
          ms: session.ms,
          plays: session.plays,
        });
      } else {
        rollbackSession();
      }
    }
    session = null;
    segment = null;
    tickingFrom = null;
    persist();
  }

  function flush() {
    ready();
    if (!session) return;
    checkpoint();
    commitSession();
    if (segment) {
      commitSegment(segment);
      countPlay(segment);
    }
    persist();
  }

  function pause() {
    ready();
    if (!session) return;
    checkpoint();
    tickingFrom = null;
    session.hiddenAt = now();
    commitSession();
    if (segment) {
      commitSegment(segment);
      countPlay(segment);
    }
    persist();
  }

  function resume() {
    ready();
    if (!session) { startSession(); return; }
    if (!session.hiddenAt && tickingFrom != null) return;
    if (session.hiddenAt && now() - session.hiddenAt >= LIMITS.resumeGapMs) {
      finalizeSession();
      startSession();
      return;
    }
    session.hiddenAt = null;
    if (tickingFrom == null && !hidden) tickingFrom = now();
    persist();
  }

  // Time spent with no game open (the menu, a hub) belongs to the
  // session. Starting a game begins its own clock, or the wait on the
  // menu would be filed under that game.
  function armClock() {
    const extra = pending();
    if (extra && session) {
      session.ms += extra;
      session.end = now();
    }
    if (!hidden) tickingFrom = now();
  }

  function enter(game, mode) {
    const id = cleanGame(game);
    if (!id) return;
    ready();
    if (!session) startSession();
    else if (!hidden && tickingFrom == null) tickingFrom = now();
    const m = cleanMode(mode);
    if (segment && segment.game === id && segment.mode === m) return;
    closeSegment();
    armClock();
    segment = freshSegment(id, m);
    persist();
  }

  function setMode(mode) {
    if (!segment) return;
    const m = cleanMode(mode);
    if (segment.mode === m) return;
    const game = segment.game;
    closeSegment();
    segment = freshSegment(game, m);
    persist();
  }

  function leave() {
    if (!segment) return;
    closeSegment();
    persist();
  }

  function setHidden(next) {
    hidden = !!next;
    if (hidden) pause();
    else resume();
  }

  function onPageHide() {
    hidden = true;
    pause();
  }

  function copyGames(src, dest) {
    if (!src || typeof src !== "object") return;
    Object.keys(src).forEach((id) => {
      if (!cleanGame(id)) return;
      const g = src[id];
      if (!g || typeof g !== "object") return;
      if (!dest[id]) dest[id] = { ms: 0, plays: 0, modes: {} };
      dest[id].ms += num(g.ms);
      dest[id].plays += num(g.plays);
      dest[id].rounds = num(dest[id].rounds) + num(g.rounds);
      const modes = g.modes && typeof g.modes === "object" ? g.modes : {};
      Object.keys(modes).forEach((m) => {
        const mode = cleanMode(m);
        if (!mode || !modes[m]) return;
        if (!dest[id].modes[mode]) dest[id].modes[mode] = { ms: 0, plays: 0 };
        dest[id].modes[mode].ms += num(modes[m].ms);
        dest[id].modes[mode].plays += num(modes[m].plays);
      });
    });
  }

  function gameList(games) {
    return Object.keys(games).map((id) => {
      const g = games[id];
      const modes = Object.keys(g.modes).map((m) => ({
        id: m,
        ms: g.modes[m].ms,
        plays: g.modes[m].plays,
      })).filter((m) => m.ms > 0 || m.plays > 0);
      return { id, ms: g.ms, plays: g.plays, rounds: num(g.rounds), modes };
    }).filter((g) => g.ms > 0 || g.plays > 0 || g.rounds > 0);
  }

  function rangeSummary(dayKeys) {
    const games = {};
    let ms = 0;
    let plays = 0;
    let sessions = 0;
    if (dayKeys == null) {
      ms = num(data.totals.ms);
      plays = num(data.totals.plays);
      sessions = num(data.totals.sessions);
      copyGames(data.totals.games, games);
    } else {
      dayKeys.forEach((key) => {
        const day = data.days[key];
        if (!day) return;
        ms += num(day.ms);
        plays += num(day.plays);
        sessions += num(day.sessions);
        copyGames(day.games, games);
      });
    }
    if (session) {
      const live = session.ms + pending();
      ms += Math.max(0, live - num(session.committedMs));
      const started = dayKey(session.start);
      const inRange = dayKeys == null || dayKeys.indexOf(started) !== -1;
      const segLive = segment ? segment.ms + pending() : 0;
      const qualifies = live >= LIMITS.minSessionMs || session.plays.length > 0 || segLive >= LIMITS.minSegmentMs;
      if (inRange && qualifies) sessions += 1;
      if (segment) {
        const segLive = segment.ms + pending();
        if (segLive >= LIMITS.minSegmentMs) {
          const g = gameBucket(games, segment.game);
          g.ms += Math.max(0, segLive - num(segment.committedMs));
          if (segment.mode) {
            const mode = modeBucket(g, segment.mode);
            if (mode) mode.ms += Math.max(0, segLive - num(segment.committedMs));
          }
          if (!segment.counted) {
            g.plays += 1;
            plays += 1;
            if (segment.mode) {
              const mode = modeBucket(g, segment.mode);
              if (mode) mode.plays += 1;
            }
          }
        }
      }
    }
    return { ms, plays, sessions, games: gameList(games) };
  }

  function publicPlay(p) {
    return {
      game: p.game,
      mode: p.mode || "",
      start: num(p.start),
      end: num(p.end),
      ms: num(p.ms),
    };
  }

  function recentSessions() {
    const list = data.sessions.map((s) => ({
      id: s.id,
      start: num(s.start),
      end: num(s.end) || num(s.start),
      ms: num(s.ms),
      plays: Array.isArray(s.plays) ? s.plays.map(publicPlay) : [],
      live: false,
    }));
    if (session) {
      const liveMs = session.ms + pending();
      const plays = session.plays.map(publicPlay);
      if (segment && segment.ms + pending() >= LIMITS.minSegmentMs) {
        plays.push({
          game: segment.game,
          mode: segment.mode,
          start: segment.start,
          end: now(),
          ms: segment.ms + pending(),
        });
      }
      if (liveMs >= LIMITS.minSessionMs || plays.length) {
        list.push({
          id: session.id,
          start: session.start,
          end: now(),
          ms: liveMs,
          plays,
          live: true,
        });
      }
    }
    list.sort((a, b) => b.start - a.start);
    return list.slice(0, 8);
  }

  function weekDays() {
    const today = dayKey(now());
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const key = shiftDay(today, -i);
      const day = data.days[key];
      days.push({ key, ms: day ? num(day.ms) : 0 });
    }
    if (session) {
      const extra = Math.max(0, session.ms + pending() - num(session.committedMs));
      const bar = days.find((item) => item.key === dayKey(session.start));
      if (bar && extra) bar.ms += extra;
    }
    return days;
  }

  const DOLLHOUSE_ROOMS = [
    "Kitchen",
    "Craft Room",
    "Music Room",
    "Bathroom",
    "Fairy Tail Garden",
    "Playroom",
    "Bedroom",
  ];

  function recentGameIds(limit) {
    ready();
    const cap = limit > 0 ? Math.min(limit, 8) : 4;
    const ids = [];
    const sessions = recentSessions();
    for (let s = 0; s < sessions.length && ids.length < cap; s++) {
      const plays = sessions[s].plays || [];
      for (let i = plays.length - 1; i >= 0 && ids.length < cap; i--) {
        const id = cleanGame(plays[i].game);
        if (id && ids.indexOf(id) === -1) ids.push(id);
      }
    }
    return ids;
  }

  function milestones(snap) {
    const source = snap && snap.ranges ? snap : snapshot();
    const all = source.ranges && source.ranges.all ? source.ranges.all : { games: [] };
    const games = (all.games || []).filter((g) => (g.plays || 0) > 0 || (g.ms || 0) > 0);
    const doll = games.find((g) => g.id === "dollhouse");
    const modes = {};
    ((doll && doll.modes) || []).forEach((m) => {
      if ((m.plays || 0) > 0 || (m.ms || 0) > 0) modes[m.id] = true;
    });
    let rooms = 0;
    DOLLHOUSE_ROOMS.forEach((name) => { if (modes[name]) rooms += 1; });
    const ranked = games.slice().sort((a, b) => (b.ms || 0) - (a.ms || 0) || (b.plays || 0) - (a.plays || 0));
    const train = games.find((g) => g.id === "animaltrain");
    return {
      firstGame: games.length >= 1,
      fiveGames: games.length >= 5,
      rooms: rooms,
      allRooms: rooms >= DOLLHOUSE_ROOMS.length,
      trainRide: !!(train && (train.rounds || 0) >= 1),
      favorite: ranked.length ? ranked[0].id : "",
    };
  }

  // One finished Animal Train toot. Time still comes from the open visit;
  // this only counts the ride so Play Stats can show rounds.
  function noteRound() {
    if (!segment || !segment.game) return;
    const id = segment.game;
    const g = gameBucket(data.totals.games, id);
    g.rounds = num(g.rounds) + 1;
    const day = dayBucket(now());
    const dg = gameBucket(day.games, id);
    dg.rounds = num(dg.rounds) + 1;
    persist();
  }

  function snapshot() {
    ready();
    const today = dayKey(now());
    const week = [];
    for (let i = 0; i < 7; i++) week.push(shiftDay(today, -i));
    return {
      ranges: {
        today: rangeSummary([today]),
        week: rangeSummary(week),
        all: rangeSummary(null),
      },
      days: weekDays(),
      recent: recentSessions(),
    };
  }

  function exportJson() {
    flush();
    try { return JSON.stringify(data, null, 2); } catch (_) { return "{}"; }
  }

  function reset() {
    session = null;
    segment = null;
    tickingFrom = null;
    data = blank();
    try { localStorage.removeItem(PLAYLOG_KEY); } catch (_) {}
    if (!hidden) startSession();
  }

  function bind() {
    if (bound) return;
    bound = true;
    hidden = typeof document !== "undefined" && !!document.hidden;
    ready();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => setHidden(document.hidden));
    }
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", onPageHide);
      window.addEventListener("pageshow", () => {
        if (typeof document === "undefined" || !document.hidden) setHidden(false);
      });
    }
    setInterval(() => { if (!hidden) flush(); }, 15000);
    if (!hidden && !session) startSession();
  }

  return {
    limits: LIMITS,
    enter,
    setMode,
    noteRound,
    leave,
    setHidden,
    onPageHide,
    flush,
    snapshot,
    milestones,
    recentGameIds,
    exportJson,
    reset,
    bind,
    _setNow(fn) { now = typeof fn === "function" ? fn : () => Date.now(); },
  };
})();
