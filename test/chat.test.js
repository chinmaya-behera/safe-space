import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatSession } from '../lib/chat-session.ts';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const fixture = (options = {}) => createChatSession({
  getProvider: async () => null, system: 'Safe Space support prompt',
  isRisk: text => /hurt myself|want to die/i.test(text), ...options,
});

test('guided support produces a real reply and keeps the conversation across navigation', async () => {
  const session = fixture();
  session.open(); session.setDraft('  A difficult day  ');
  assert.equal(await session.send(), true);
  const state = session.getSnapshot();
  assert.equal(state.connection, 'guided');
  assert.equal(state.busy, false);
  assert.equal(state.draft, '');
  assert.equal(state.messages[0].text, 'A difficult day');
  assert.ok(state.messages[1].text.length > 20);
  session.setDraft('An unfinished thought'); session.hide(); session.open();
  assert.equal(session.getSnapshot().draft, 'An unfinished thought');
  assert.deepEqual(session.getSnapshot().messages, state.messages);
});
test('empty, hidden and duplicate submissions are not sent', async () => {
  const answer = deferred(), started = deferred();
  const session = fixture({ getProvider: async () => async () => { started.resolve(); return answer.promise; } });
  assert.equal(await session.send('hidden'), false);
  session.open(); assert.equal(await session.send('   '), false);
  const pending = session.send('one message'); await started.promise;
  assert.equal(await session.send('duplicate'), false);
  answer.resolve({ text: 'I am listening.' }); await pending;
  assert.equal(session.getSnapshot().messages.filter(message => message.role === 'user').length, 1);
});
test('streaming updates the same message, with bounded history and the support prompt', async () => {
  const answer = deferred(), started = deferred();
  const session = fixture({ getProvider: async () => async (messages, options) => {
    started.resolve({ messages, options }); return answer.promise;
  } });
  session.open(); const pending = session.send('Tell me more');
  const { messages, options } = await started.promise;
  assert.match(messages[0].content, /Safe Space support prompt/);
  assert.equal(messages.at(-1).content, 'Tell me more');
  assert.equal(options.cache, false);
  options.onText({ text: 'I’m listening' });
  const id = session.getSnapshot().messages.at(-1).id;
  assert.equal(session.getSnapshot().messages.at(-1).text, 'I’m listening');
  options.onText({ text: 'I’m listening. Take your time.' });
  answer.resolve({ text: 'I’m listening. Take your time.' }); await pending;
  assert.equal(session.getSnapshot().messages.at(-1).id, id);
  assert.equal(session.getSnapshot().messages.length, 2);
  assert.equal(session.getSnapshot().connection, 'ready');
});
test('support links are offered immediately, before a pending AI response', async () => {
  const connection = deferred();
  const session = fixture({ getProvider: () => connection.promise });
  session.open(); const pending = session.send('I want to die');
  const warning = session.getSnapshot().messages.find(message => message.role === 'support');
  assert.match(warning.text, /112/); assert.match(warning.text, /14416/);
  assert.equal(session.getSnapshot().busy, true);
  connection.resolve(null); await pending;
});
test('account reset clears draft, conversation and ignores late streams or replies', async () => {
  const answer = deferred(), started = deferred();
  const session = fixture({ getProvider: async () => async (_messages, options) => {
    started.resolve(options); return answer.promise;
  } });
  session.open(); const pending = session.send('Previous account message');
  const options = await started.promise;
  session.setDraft('Private draft'); session.reset();
  options.onText({ text: 'A late private stream' });
  answer.resolve({ text: 'A late private response' });
  assert.equal(await pending, false);
  assert.deepEqual(session.getSnapshot().messages, []);
  assert.equal(session.getSnapshot().draft, '');
  assert.equal(session.getSnapshot().active, false);
});
test('late provider initialization cannot replace the next account’s provider', async () => {
  const first = deferred(); let calls = 0;
  const session = fixture({ getProvider: () => ++calls === 1 ? first.promise : Promise.resolve(null) });
  session.open(); await Promise.resolve();
  session.reset(); session.open();
  await session.send('Next account');
  first.resolve(async () => ({ text: 'Previous provider' }));
  await Promise.resolve(); await Promise.resolve();
  assert.equal(session.getSnapshot().connection, 'guided');
  assert.equal(session.getSnapshot().messages.some(message => message.text === 'Previous provider'), false);
});
test('failed or empty provider replies release the composer and use guided support', async () => {
  for (const provider of [async () => { throw new Error('Unavailable'); }, async () => ({ text: '' })]) {
    const session = fixture({ getProvider: async () => provider });
    session.open(); assert.equal(await session.send('Hello'), true);
    assert.equal(session.getSnapshot().busy, false);
    assert.equal(session.getSnapshot().connection, 'guided');
    assert.ok(session.getSnapshot().messages.at(-1).text);
  }
});
test('timeout recovers the composer and ignores subsequent stream callbacks', async () => {
  let stream;
  const session = fixture({ timeoutMs: 15, getProvider: async () => (_messages, options) => {
    stream = options.onText; return new Promise(() => {});
  } });
  session.open(); await session.send('A slow response');
  const state = session.getSnapshot();
  assert.equal(state.busy, false); assert.equal(state.connection, 'guided');
  stream({ text: 'Too late' });
  assert.equal(session.getSnapshot(), state);
});
test('subscriptions unsubscribe and long drafts are bounded', () => {
  const session = fixture(); let changes = 0;
  const unsubscribe = session.subscribe(() => changes++);
  session.setDraft('x'.repeat(5000));
  assert.equal(session.getSnapshot().draft.length, 4096);
  assert.equal(changes, 1); unsubscribe(); session.setDraft('');
  assert.equal(changes, 1);
});
test('provider context stays bounded and excludes support notices', async () => {
  const requests = [];
  const session = fixture({ getProvider: async () => async messages => {
    requests.push(messages); return { text: 'I am listening.' };
  } });
  session.open();
  await session.send('UI safety test: I want to die');
  for (let index = 0; index < 12; index++) await session.send(`Follow-up ${index}`);
  const latest = requests.at(-1);
  assert.ok(latest.length <= 22);
  assert.equal(latest.at(-1).content, 'Follow-up 11');
  assert.equal(latest.some(message => message.content.includes("You're not alone, and your life matters.")), false);
  assert.equal(session.getSnapshot().messages.some(message => message.role === 'support'), true);
});
