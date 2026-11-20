import { WORKER_URL } from './config.js';
import { retrySeconds, problemDestination } from './protocol.js';
let queue = Promise.resolve();
const authStore = chrome.storage.session;
const ready = (async () => {
  await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  await authStore.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  // Preserve an existing connection for this browser session, then remove disk credentials.
  const { auth: legacyAuth } = await chrome.storage.local.get('auth');
  try {
    const { auth } = await authStore.get('auth');
    if (legacyAuth && !auth) await authStore.set({ auth: legacyAuth });
  } finally {
    await chrome.storage.local.remove('auth');
  }
  await chrome.storage.local.remove(['cachedProblems', 'currentIndex', 'savedHandle', 'lastCacheTime']);
})();
async function call(path, body, token) {
  if (!WORKER_URL || new URL(WORKER_URL).protocol !== 'https:') throw new Error('서비스 연결 준비 중입니다. 배포된 Worker 주소 설정이 필요합니다.');
  const { blockedUntil = 0 } = await chrome.storage.local.get('blockedUntil');
  if (Date.now() < blockedUntil) throw new Error(Math.ceil((blockedUntil - Date.now()) / 1000) + '초 후 다시 시도해 주세요.');
  const res = await fetch(WORKER_URL.replace(/\/$/, '') + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify(body || {}), credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(20000)
  });
  const text = await res.text();
  if (res.status === 429) {
    const seconds = retrySeconds(res.headers.get('Retry-After'));
    await chrome.storage.local.set({ blockedUntil: Date.now() + seconds * 1000 });
    throw new Error('요청이 많습니다. ' + seconds + '초 후 다시 시도해 주세요.');
  }
  if (!res.ok && /(?:error\s*(?:code\s*)?:?\s*1027|Error\s*1027)/i.test(text)) {
    await chrome.storage.local.set({ blockedUntil: (Math.floor(Date.now() / 86400000) + 1) * 86400000 });
    throw new Error('오늘의 서비스 요청 한도에 도달했습니다. 한국 시간 오전 9시에 다시 이용해 주세요.');
  }
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('서비스 응답을 받지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
  if (!res.ok) {
    if (['AUTH_REQUIRED', 'invalid_grant'].includes(data.error?.code)) await authStore.remove('auth');
    throw new Error(data.error?.message || '서비스 요청에 실패했습니다.');
  }
  return data;
}
function randomString() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
async function saveTokens(tokens) {
  if (!tokens.access_token || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0) throw new Error('로그인 응답이 올바르지 않습니다.');
  const auth = { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: Date.now() + tokens.expires_in * 1000 };
  await authStore.set({ auth });
  return auth;
}
async function session() {
  let { auth } = await authStore.get('auth');
  if (!auth) return null;
  if (auth.expiresAt > Date.now() + 60000) return auth;
  if (!auth.refreshToken) { await authStore.remove('auth'); return null; }
  const { blockedUntil = 0 } = await chrome.storage.local.get('blockedUntil');
  if (Date.now() < blockedUntil) throw new Error(Math.ceil((blockedUntil - Date.now()) / 1000) + '초 후 다시 시도해 주세요.');
  // Rotating refresh tokens are one-use. Never retry an exchange with an uncertain outcome.
  const refresh = auth.refreshToken;
  await authStore.remove('auth');
  try {
    return await saveTokens(await call('/oauth/token', { grant_type: 'refresh_token', refresh_token: refresh }));
  } catch (error) {
    throw new Error(error.message + ' 계정을 다시 연결해 주세요.');
  }
}
async function connect() {
  const config = await call('/config');
  const redirectUri = chrome.identity.getRedirectURL('oauth');
  if (config.redirectUri !== redirectUri) throw new Error('확장 프로그램의 로그인 반환 주소가 등록된 주소와 다릅니다.');
  const state = randomString(), verifier = randomString();
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const challenge = btoa(String.fromCharCode(...hash)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const url = new URL('https://solved.ac/oauth/authorize');
  url.search = new URLSearchParams({ response_type: 'code', client_id: config.clientId, redirect_uri: redirectUri,
    scope: 'profile offline.access', state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
  const result = await chrome.identity.launchWebAuthFlow({ url: url.href, interactive: true });
  const callback = new URL(result);
  if (callback.origin + callback.pathname !== redirectUri || callback.searchParams.get('state') !== state) throw new Error('로그인 확인 값이 일치하지 않습니다.');
  if (callback.searchParams.has('error') || !callback.searchParams.get('code')) throw new Error('계정 연결이 취소되었습니다.');
  await saveTokens(await call('/oauth/token', { grant_type: 'authorization_code', code: callback.searchParams.get('code'),
    code_verifier: verifier, redirect_uri: redirectUri }));
  return status();
}
async function status() {
  const auth = await session();
  return auth ? call('/me', {}, auth.accessToken) : { handle: null };
}
async function dispatch(message) {
  await ready;
  if (message.type === 'status') return status();
  if (message.type === 'connect') {
    if (message.consent !== true) throw new Error('개인정보 처리 안내를 확인하고 동의한 뒤 연결해 주세요.');
    return connect();
  }
  if (message.type === 'disconnect') {
    const { auth } = await authStore.get('auth');
    if (auth) await call('/oauth/revoke', { token: auth.refreshToken || auth.accessToken });
    await authStore.remove('auth');
    return { handle: null };
  }
  if (message.type === 'draw') {
    const { nextDrawAt = 0 } = await chrome.storage.local.get('nextDrawAt');
    if (Date.now() < nextDrawAt) throw new Error('잠시 후 다시 시도해 주세요.');
    await chrome.storage.local.set({ nextDrawAt: Date.now() + 2000 });
    const auth = await session();
    if (message.settings?.requireAccount && !auth) throw new Error('계정을 다시 연결해 주세요.');
    const p = await call('/random', message.settings, auth?.accessToken);
    await chrome.tabs.create({ url: problemDestination(p) });
    return {};
  }
  throw new Error('지원하지 않는 요청입니다.');
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) return false;
  const task = queue.then(() => dispatch(message));
  queue = task.catch(() => {});
  task.then(data => respond({ ok: true, data }), error => respond({ ok: false, error: error.message }));
  return true;
});

