import { getTierName } from './utils.js';
import { loadSettings, saveSettings } from './storage.js';
import { buildQuery } from './protocol.js';
const el = id => document.getElementById(id);
let presets = {}, handle = null, busy = false;
const buttons = ['drawBtn', 'connectBtn', 'disconnectBtn', 'confirmConnectBtn'];
async function command(type, settings) {
  const result = await chrome.runtime.sendMessage({ type, settings, ...(type === 'connect' ? { consent: true } : {}) });
  if (!result?.ok) throw new Error(result?.error || '서비스 연결에 실패했습니다.');
  return result.data;
}
function account(data) {
  handle = data.handle;
  el('accountText').textContent = handle || '';
  el('accountText').title = handle || '';
  el('accountText').hidden = !handle;
  el('connectionStatus').textContent = handle ? '연결됨' : '미연결';
  el('connectionStatus').classList.toggle('is-connected', !!handle);
  el('connectBtn').hidden = !!handle; el('disconnectBtn').hidden = !handle;
}
async function run(action) {
  if (busy) return;
  busy = true; buttons.forEach(id => el(id).disabled = true);
  el('statusText').textContent = '';
  el('drawBtn').textContent = '처리 중…';
  try { await action(); el('statusText').textContent = ''; }
  catch (error) {
    if (error.message.includes('다시 연결')) account({ handle: null });
    el('statusText').textContent = error.message;
  }
  finally { busy = false; await tick(); }
}
function update(event) {
  let min = Number(el('minTier').value), max = Number(el('maxTier').value);
  if (min > max) {
    if (event?.target.id === 'minTier') el('maxTier').value = max = min;
    else el('minTier').value = min = max;
  }
  el('tierText').textContent = getTierName(min) + ' - ' + getTierName(max);
  el('minTier').setAttribute('aria-valuetext', getTierName(min));
  el('maxTier').setAttribute('aria-valuetext', getTierName(max));
  el('tierSlider').style.setProperty('--range-start', ((min - 1) / 29 * 100) + '%');
  el('tierSlider').style.setProperty('--range-end', ((max - 1) / 29 * 100) + '%');
}
async function tick() {
  const { blockedUntil = 0 } = await chrome.storage.local.get('blockedUntil');
  const seconds = Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000));
  buttons.forEach(id => el(id).disabled = busy || seconds > 0);
  el('drawBtn').textContent = seconds ? seconds + '초 후 이용 가능' : busy ? '처리 중…' : '문제 뽑기';
}
el('drawBtn').onclick = () => run(async () => {
  const settings = { min: Number(el('minTier').value), max: Number(el('maxTier').value), tags: presets[el('presetSelect').value] || [], requireAccount: !!handle };
  buildQuery(settings, handle || '');
  await command('draw', settings);
});
el('connectBtn').onclick = () => {
  if (!busy && !el('connectBtn').disabled) el('connectionDialog').showModal();
};
el('cancelConnectBtn').onclick = () => el('connectionDialog').close();
el('confirmConnectBtn').onclick = () => {
  el('connectionDialog').close();
  return run(async () => account(await command('connect')));
};
el('disconnectBtn').onclick = () => run(async () => account(await command('disconnect')));
el('settingsBtn').onclick = () => chrome.runtime.openOptionsPage();
['minTier', 'maxTier', 'presetSelect'].forEach(id => el(id).oninput = update);
let saveQueue = Promise.resolve();
function persistSelection() {
  const settings = { min: Number(el('minTier').value), max: Number(el('maxTier').value) };
  const lastPreset = el('presetSelect').value;
  saveQueue = saveQueue.then(async () => {
    await saveSettings(settings);
    await chrome.storage.sync.set({ lastPreset });
  }).catch(() => { el('statusText').textContent = '설정을 저장하지 못했습니다. 다시 변경해 주세요.'; });
}
['minTier', 'maxTier', 'presetSelect'].forEach(id => el(id).onchange = event => {
  update(event);
  persistSelection();
});
async function init() {
  const settings = await loadSettings();
  el('minTier').value = settings.min; el('maxTier').value = settings.max;
  const data = await chrome.storage.sync.get(['customPresets', 'lastPreset']);
  presets = data.customPresets || {};
  Object.keys(presets).forEach(name => el('presetSelect').add(new Option(name, name)));
  el('presetSelect').value = presets[data.lastPreset] ? data.lastPreset : '';
  update(); account({ handle: null });
  await run(async () => account(await command('status')));
}
init().catch(error => { el('statusText').textContent = error.message; });
setInterval(tick, 1000);
