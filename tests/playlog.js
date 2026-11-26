// Play tracking: durations freeze while the page is hidden, modes split
// a visit, and pruning keeps all-time totals. No browser.
// Run: node tests/playlog.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../lib/playlog.js'), 'utf8');

function harness(initial) {
  const map = new Map(Object.entries(initial || {}));
  const context = vm.createContext({
    clock: Date.parse('2026-11-26T15:00:00'),
    localStorage: {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
    },
    Date, Math, JSON, Number, Object, String, Array,
  });
  vm.runInContext(source, context);
  vm.runInContext('LawsonPlay._setNow(() => clock)', context);
  return {
    map,
    advance(ms) { context.clock += ms; },
    play: context.LawsonPlay,
  };
}

// Hidden time does not count, and a short lock continues the same visit.
{
  const h = harness();
  h.play.enter('pop', 'free');
  h.advance(5000);
  h.play.setHidden(true);
  const frozen = h.play.snapshot().ranges.all.ms;
  assert.ok(frozen >= 5000 && frozen < 6000, `visible time should be about 5s, got ${frozen}`);
  h.advance(60000);
  assert.equal(h.play.snapshot().ranges.all.ms, frozen, 'a locked screen must not add time');
  h.play.setHidden(false);
  h.advance(2000);
  const resumed = h.play.snapshot().ranges.all.ms;
  assert.ok(resumed >= frozen + 2000, `resume should keep counting, got ${resumed}`);
  assert.equal(h.play.snapshot().ranges.all.sessions, 1, 'a short lock stays one session');
  const pop = h.play.snapshot().ranges.all.games.find((g) => g.id === 'pop');
  assert.ok(pop, 'pop should be listed');
  assert.equal(pop.plays, 1);
  assert.ok(pop.modes.some((m) => m.id === 'free' && m.plays === 1));
}

// Waiting on the menu counts for the visit, not for the next game.
{
  const h = harness();
  h.play.enter('pop', 'free');
  h.advance(1000);
  h.play.leave();
  h.advance(5000);
  h.play.enter('piano', 'Free play');
  h.advance(1000);
  h.play.leave();
  const all = h.play.snapshot().ranges.all;
  const piano = all.games.find((g) => g.id === 'piano');
  const pop = all.games.find((g) => g.id === 'pop');
  assert.equal(piano.plays, 1);
  assert.ok(piano.ms >= 1000 && piano.ms < 2000, `piano should be the second stretch only, got ${piano.ms}`);
  assert.ok(pop.ms >= 1000 && pop.ms < 2000, `pop should stay at its own stretch, got ${pop.ms}`);
  assert.ok(all.ms >= 7000 && all.ms < 8000, `the visit keeps the menu wait, got ${all.ms}`);
}

// A long gap closes the visit. Switching mode splits time and plays.
{
  const h = harness();
  h.play.enter('pop', '');
  h.play.setMode('free');
  h.advance(1000);
  h.play.setMode('letters');
  h.advance(2000);
  h.play.setMode('letters'); // same mode does not split
  h.advance(1000);
  h.play.leave();
  h.play.onPageHide();
  const held = h.play.snapshot().ranges.all.ms;
  h.advance(30000);
  assert.equal(h.play.snapshot().ranges.all.ms, held, 'pagehide must freeze the clock');
  h.advance(h.play.limits.resumeGapMs);
  h.play.setHidden(false);
  h.advance(1000);
  const all = h.play.snapshot().ranges.all;
  const pop = all.games.find((g) => g.id === 'pop');
  assert.ok(pop.ms >= 4000, `pop should keep both modes, got ${pop.ms}`);
  const free = pop.modes.find((m) => m.id === 'free');
  const abc = pop.modes.find((m) => m.id === 'letters');
  assert.equal(free.plays, 1);
  assert.ok(free.ms >= 1000 && free.ms < 2000, `free mode about 1s, got ${free.ms}`);
  assert.equal(abc.plays, 1);
  assert.ok(abc.ms >= 3000, `ABC should include both stretches, got ${abc.ms}`);
  assert.equal(all.sessions, 2, 'the gap starts a second session');
}

// A tap-and-leave under half a second is not a play. Other saved keys stay.
{
  const h = harness({
    'lawson:kidName': 'Lawson',
    'lawson:popBest': '12',
    'lawson:stickers': '["finder"]',
  });
  h.play.enter('whack', '');
  h.advance(200);
  h.play.leave();
  assert.equal(h.play.snapshot().ranges.all.plays, 0);
  h.play.reset();
  assert.equal(h.map.get('lawson:kidName'), 'Lawson');
  assert.equal(h.map.get('lawson:popBest'), '12');
  assert.equal(h.map.get('lawson:stickers'), '["finder"]');
  assert.equal(h.play.snapshot().ranges.all.plays, 0);
  assert.equal(h.play.snapshot().days.length, 7);
  assert.equal(h.play.snapshot().days.every((d) => d.ms === 0), true);
  const exported = h.play.exportJson();
  assert.equal(exported.includes('Lawson'), false, 'export must not contain the kid name');
  assert.equal(exported.includes('popBest'), false);
}

// Corrupt storage is replaced; neighbouring keys are left alone.
{
  const h = harness({
    'lawson:playlog': '{not json',
    'lawson:kidName': 'Lawson',
    'lawson:farmBest': '4',
  });
  h.play.enter('farm', '');
  h.advance(1500);
  h.play.leave();
  const saved = JSON.parse(h.map.get('lawson:playlog'));
  assert.equal(saved.v, 1);
  assert.equal(saved.totals.plays, 1);
  assert.equal(h.map.get('lawson:kidName'), 'Lawson');
  assert.equal(h.map.get('lawson:farmBest'), '4');
}

// Detail is capped, all-time totals are not.
{
  const h = harness();
  for (let i = 0; i < 65; i++) {
    h.play.enter('find', i % 2 ? 'letters' : 'free');
    h.advance(2000);
    h.play.leave();
    h.play.setHidden(true);
    h.advance(h.play.limits.resumeGapMs);
    h.play.setHidden(false);
  }
  const saved = JSON.parse(h.play.exportJson());
  assert.ok(saved.sessions.length <= h.play.limits.maxSessions, `sessions ${saved.sessions.length}`);
  assert.equal(saved.totals.plays, 65);
  assert.equal(saved.totals.sessions, 65);
  assert.ok(saved.totals.ms >= 65 * 2000);
  const today = h.play.snapshot().ranges.today;
  assert.equal(today.plays, 65);
  assert.equal(h.play.snapshot().recent.length <= 8, true);
}

// Today vs an older day.
{
  const h = harness();
  h.play.enter('story', '');
  h.play.setMode('The Little Duck');
  h.advance(3000);
  h.play.leave();
  h.play.setHidden(true);
  h.advance(h.play.limits.resumeGapMs);
  h.play.setHidden(false);
  h.play.setHidden(true);
  h.advance(2 * 86400000);
  h.play.setHidden(false);
  h.play.enter('piano', 'Free play');
  h.advance(4000);
  h.play.setMode('Twinkle Twinkle');
  h.advance(2000);
  const snap = h.play.snapshot();
  const today = snap.ranges.today;
  const week = snap.ranges.week;
  assert.equal(today.games.some((g) => g.id === 'story'), false, 'a two-day-old story is not today');
  assert.ok(today.games.some((g) => g.id === 'piano'));
  assert.ok(week.games.some((g) => g.id === 'story'), 'the story is still inside 7 days');
  assert.ok(week.ms >= today.ms);
  assert.equal(snap.days.length, 7, 'a week is seven daily bars');
  assert.ok(snap.days[6].ms >= 6000, 'today is the last bar');
  assert.ok(snap.days.some((d, i) => i < 6 && d.ms >= 3000), 'an older day keeps its own bar');
  const sum = snap.days.reduce((n, d) => n + d.ms, 0);
  assert.ok(Math.abs(sum - week.ms) < 5, `daily bars ${sum} should match the 7-day total ${week.ms}`);
}

console.log('PASS: play log — hidden time, modes, reset, prune, today/7-day');
