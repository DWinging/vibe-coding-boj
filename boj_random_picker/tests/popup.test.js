import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const turn = () => new Promise(resolve => setImmediate(resolve));

test('popup UI preserves account, tier, presets, persistence, draw and error behavior', async () => {
  const html = await readFile(new URL('../popup.html', import.meta.url), 'utf8');
  const source = await readFile(new URL('../js/popup.js', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
  const elements = Object.fromEntries(ids.map(id => [id, {
    value: '', textContent: '', hidden: false, disabled: false, options: [],
    attributes: {}, styles: {}, classes: new Set(),
    add(option) { this.options.push(option); },
    setAttribute(name, value) { this.attributes[name] = value; },
    style: { setProperty(name, value) { elements[id].styles[name] = value; } },
    classList: { toggle(name, enabled) { enabled ? elements[id].classes.add(name) : elements[id].classes.delete(name); } }
  }]));
  globalThis.document = { getElementById(id) { assert.ok(elements[id], 'Missing DOM ID: ' + id); return elements[id]; } };
  globalThis.Option = class { constructor(text, value) { this.text = text; this.value = value; } };
  const originalInterval = globalThis.setInterval;
  let tick;
  globalThis.setInterval = callback => { tick = callback; return 0; };
  const sync = { userSettings: { min: 14, max: 19 }, customPresets: { DP: ['dp'] }, lastPreset: 'DP' };
  const local = {};
  const requests = [];
  let opened = 0, failDraw = false, pendingDraw;
  globalThis.chrome = {
    storage: {
      sync: { get: async () => structuredClone(sync), set: async data => Object.assign(sync, structuredClone(data)) },
      local: { get: async () => ({ ...local }) }
    },
    runtime: {
      openOptionsPage() { opened++; },
      async sendMessage(message) {
        requests.push(message);
        if (message.type === 'status' || message.type === 'connect') return { ok: true, data: { handle: 'dong20' } };
        if (message.type === 'disconnect') return { ok: true, data: { handle: null } };
        if (failDraw) return { ok: false, error: '계정을 다시 연결해 주세요.' };
        return new Promise(resolve => { pendingDraw = () => resolve({ ok: true, data: {} }); });
      }
    }
  };
  const moduleSource = source
    .replace("'./utils.js'", JSON.stringify(new URL('../js/utils.js', import.meta.url).href))
    .replace("'./storage.js'", JSON.stringify(new URL('../js/storage.js', import.meta.url).href))
    .replace("'./protocol.js'", JSON.stringify(new URL('../js/protocol.js', import.meta.url).href));
  try {
    await import('data:text/javascript;base64,' + Buffer.from(moduleSource).toString('base64'));
    await turn();
    assert.equal(elements.tierText.textContent, 'G2 - P2');
    assert.equal(elements.minTier.attributes['aria-valuetext'], 'G2');
    assert.equal(elements.accountText.textContent, 'dong20');
    assert.equal(elements.connectionStatus.textContent, '연결됨');
    assert.equal(elements.connectBtn.hidden, true);
    assert.equal(elements.disconnectBtn.hidden, false);
    assert.equal(elements.presetSelect.value, 'DP');

    elements.minTier.value = '30';
    elements.minTier.onchange({ target: { id: 'minTier' } });
    await turn();
    assert.equal(Number(elements.maxTier.value), 30);
    assert.equal(elements.tierText.textContent, 'R1 - R1');
    assert.equal(elements.tierSlider.styles['--range-start'], '100%');
    assert.deepEqual(sync.userSettings, { min: 30, max: 30 });
    elements.minTier.value = '1'; elements.maxTier.value = '30';
    elements.maxTier.onchange({ target: { id: 'maxTier' } });
    await turn();
    assert.equal(elements.tierText.textContent, 'B5 - R1');
    assert.equal(elements.tierSlider.styles['--range-start'], '0%');

    elements.presetSelect.value = '';
    elements.presetSelect.onchange({ target: { id: 'presetSelect' } });
    await turn();
    assert.equal(sync.lastPreset, '');
    assert.match(html, /option value="">전체 알고리즘/);
    elements.settingsBtn.onclick(); assert.equal(opened, 1);

    const draw = elements.drawBtn.onclick();
    assert.equal(elements.drawBtn.textContent, '처리 중…');
    assert.equal(elements.statusText.textContent, '');
    await turn(); await tick();
    assert.equal(elements.drawBtn.disabled, true);
    assert.equal(elements.drawBtn.textContent, '처리 중…');
    assert.deepEqual(requests.at(-1).settings, { min: 1, max: 30, tags: [], requireAccount: true });
    pendingDraw(); await draw;
    assert.equal(elements.drawBtn.disabled, false);
    assert.equal(elements.drawBtn.textContent, '문제 뽑기');

    local.blockedUntil = Date.now() + 120000;
    await tick();
    assert.equal(elements.drawBtn.disabled, true);
    assert.match(elements.drawBtn.textContent, /초 후 이용 가능/);
    delete local.blockedUntil;

    await elements.disconnectBtn.onclick();
    assert.equal(elements.connectionStatus.textContent, '미연결');
    assert.equal(elements.accountText.hidden, true);
    assert.equal(elements.connectBtn.hidden, false);
    assert.equal(elements.disconnectBtn.hidden, true);
    await elements.connectBtn.onclick();
    assert.equal(elements.connectionStatus.textContent, '연결됨');

    failDraw = true;
    await elements.drawBtn.onclick();
    assert.equal(elements.statusText.textContent, '계정을 다시 연결해 주세요.');
    assert.equal(elements.connectionStatus.textContent, '미연결');
    assert.equal(elements.connectBtn.hidden, false);
    assert.equal(elements.drawBtn.disabled, false);
  } finally {
    globalThis.setInterval = originalInterval;
    delete globalThis.document; delete globalThis.Option; delete globalThis.chrome;
  }
});
