import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the actual browser storage bridge with isolated storage, never a user's profile.
const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const journalSource = source.slice(source.indexOf('let mem='), source.indexOf('/* ---------- CHAT ---------- */'));
const riskSource = source.split('\n').find(line => line.startsWith('const RISK='));
const entry = (id, mood = 3) => ({ id, mood, tx: `Moment ${id}`, gd: 'A kind message' });
const copy = value => JSON.parse(JSON.stringify(value));
function fixture(initial = {}) {
  const data = copy(initial);
  const blocked = new Set();
  let adapter;
  const context = vm.createContext({
    main: { innerHTML: '' }, $: () => ({}), careHTML: '<p>Support remains available.</p>',
    document: { documentElement: { dataset: {} } }, matchMedia: () => ({ matches: false }),
    st: { get: (key, fallback) => copy(data[key] ?? fallback), set: (key, value) => {
      if (blocked.has(key)) return false;
      data[key] = copy(value); return true;
    } },
    window: { safeSpaceJournal: { mount: (_host, bridge) => { adapter = bridge; } } },
  });
  vm.runInContext(`${riskSource}\n${journalSource}\nmem=readJournal('journal_entries');journalTrash=readJournal('journal_trash');jourWrite();`, context);
  return { adapter, data, blocked };
}

test('journal keeps existing entry text, date and mood without migration', () => {
  const existing = { ...entry(100), tx: '<script>alert(1)</script>\nA second line', mood: 1 };
  const { adapter, data } = fixture({ journal_entries: [existing] });
  assert.deepEqual(copy(adapter.entries()), [existing]);
  assert.equal(adapter.save(entry(200, 5)), true);
  assert.deepEqual(data.journal_entries, [entry(200, 5), existing]);
});
test('failed save preserves draft and saved entries', () => {
  const { adapter, blocked, data } = fixture({ journal_entries: [entry(100)] });
  const draft = { tx: 'Keep these words', gd: '', mood: 2 };
  adapter.setDraft(draft); blocked.add('journal_entries');
  assert.equal(adapter.save(entry(200)), false);
  assert.deepEqual(copy(adapter.draft()), draft);
  assert.deepEqual(copy(adapter.entries()), [entry(100)]);
  assert.deepEqual(data.journal_entries, [entry(100)]);
});
test('delete and restore preserve the full entry and original order', () => {
  const { adapter, data } = fixture({ journal_entries: [entry(200), entry(100, 1)] });
  assert.equal(adapter.remove(100), true);
  assert.deepEqual(data.journal_entries, [entry(200)]);
  assert.deepEqual(copy(adapter.trash()), [entry(100, 1)]);
  // A fresh page can recover the deleted entry.
  const reload = fixture(data);
  assert.equal(reload.adapter.restore(100), true);
  assert.deepEqual(reload.data.journal_entries, [entry(200), entry(100, 1)]);
  assert.deepEqual(copy(reload.adapter.trash()), []);
});
test('blocked trash or journal writes cannot remove the original entry', () => {
  const { adapter, data, blocked } = fixture({ journal_entries: [entry(100)] });
  blocked.add('journal_trash'); assert.equal(adapter.remove(100), false);
  assert.deepEqual(data.journal_entries, [entry(100)]);
  blocked.clear(); blocked.add('journal_entries'); assert.equal(adapter.remove(100), false);
  assert.deepEqual(copy(adapter.entries()), [entry(100)]);
  assert.deepEqual(copy(adapter.trash()), []); // Duplicated safety copy isn't shown as deleted.
  assert.deepEqual(data.journal_entries, [entry(100)]);
});
test('saving after another tab writes retains its new entry', () => {
  const { adapter, data } = fixture({ journal_entries: [entry(100)] });
  data.journal_entries.unshift(entry(200));
  assert.equal(adapter.save(entry(300)), true);
  assert.deepEqual(data.journal_entries, [entry(300), entry(200), entry(100)]);
});
test('low moods and risk phrases still trigger the existing support message', () => {
  const { adapter } = fixture();
  assert.equal(adapter.needsCare({ tx: '', gd: '', mood: 1 }), true);
  assert.equal(adapter.needsCare({ tx: 'I want to die', gd: '', mood: 3 }), true);
  assert.equal(adapter.needsCare({ tx: '', gd: 'I might hurt myself', mood: null }), true);
  assert.equal(adapter.needsCare({ tx: 'A pleasant walk', gd: '', mood: 5 }), false);
});
test('malformed storage does not crash the journal', () => {
  const { adapter } = fixture({ journal_entries: [null, { id: 1e100, tx: 'bad', gd: '' }, { ...entry(100), mood: 99 }] });
  assert.deepEqual(copy(adapter.entries()), [{ ...entry(100), mood: null }]);
  assert.deepEqual(copy(fixture({ journal_entries: 'invalid' }).adapter.entries()), []);
});
test('journal theme is remembered separately from entries and handles invalid settings', () => {
  const { adapter, data } = fixture({ journal_entries: [entry(100)] });
  assert.equal(adapter.theme(), 'light');
  adapter.setTheme('dark');
  assert.equal(adapter.theme(), 'dark');
  assert.equal(fixture(data).adapter.theme(), 'dark');
  assert.deepEqual(data.journal_entries, [entry(100)]);
  assert.equal(fixture({ journal_theme: 'invalid' }).adapter.theme(), 'light');
});
