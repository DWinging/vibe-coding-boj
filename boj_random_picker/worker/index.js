import { buildQuery, retrySeconds, bojProblemId } from '../js/protocol.js';
const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const fail = (code, message, status = 400, headers) => json({ error: { code, message } }, status, headers);
export class ApiBudget {
  constructor(ctx) { this.ctx = ctx; }
  async fetch(request) {
    const { blockSeconds } = await request.json();
    return this.ctx.blockConcurrencyWhile(async () => {
      const now = Date.now();
      const state = await this.ctx.storage.get('budget') || { tokens: 60, at: now, blocked: 0 };
      if (blockSeconds) {
        state.blocked = Math.max(state.blocked, now + blockSeconds * 1000);
        await this.ctx.storage.put('budget', state);
        return json({});
      }
      state.tokens = Math.min(60, state.tokens + Math.max(0, now - state.at) / 1000 * 2);
      state.at = now;
      // Worst case per recommendation: /me (1) + problem search (3).
      const wait = Math.max((state.blocked - now) / 1000, (4 - state.tokens) / 2);
      if (wait > 0) return fail('RATE_LIMITED', '요청이 많습니다. 잠시 후 다시 시도해 주세요.', 429, { 'Retry-After': String(Math.ceil(wait)) });
      state.tokens -= 4;
      await this.ctx.storage.put('budget', state);
      return json({});
    });
  }
}
export async function handle(request, env, fetcher = fetch) {
  const origin = request.headers.get('Origin');
  const ids = (env.EXTENSION_IDS || env.EXTENSION_ID || '').split(',').map(id => id.trim()).filter(Boolean);
  const missing = ['CLIENT_ID', 'CLIENT_SECRET'].filter(name => !env[name]);
  if (missing.length) return fail('NOT_CONFIGURED', 'Cloudflare Worker에 ' + missing.join(', ') + ' 설정이 필요합니다.', 503);
  if (!ids.length || ids.some(id => !/^[a-p]{32}$/.test(id)))
    return fail('NOT_CONFIGURED', 'Cloudflare Worker의 EXTENSION_IDS 설정을 확인해 주세요.', 503);
  const extensionId = ids.find(id => origin === 'chrome-extension://' + id);
  if (!extensionId) return fail('FORBIDDEN', '이 개발 버전의 확장 ID가 Worker에 등록되지 않았습니다.', 403);
  const allowed = 'chrome-extension://' + extensionId;
  const cors = { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Expose-Headers': 'Retry-After', Vary: 'Origin' };
  const finish = res => {
    // Service-binding responses may have immutable headers.
    const headers = new Headers(res.headers);
    for (const [k,v] of Object.entries(cors)) headers.set(k,v);
    return new Response(res.body, { status: res.status, headers });
  };
  if (request.method === 'OPTIONS') return finish(new Response(null, { status: 204 }));
  if (request.method !== 'POST') return finish(fail('METHOD', '지원하지 않는 요청입니다.', 405));
  const path = new URL(request.url).pathname;
  if (!['/config', '/oauth/token', '/oauth/revoke', '/me', '/random'].includes(path)) return finish(fail('NOT_FOUND', '없는 경로입니다.', 404));
  const redirectUri = 'https://' + extensionId + '.chromiumapp.org/oauth';
  if (!env.BUDGET || typeof env.BUDGET.get !== 'function' || typeof env.BUDGET.idFromName !== 'function')
    return finish(fail('BUDGET_NOT_CONFIGURED', 'Worker의 BUDGET 저장소 연결이 없습니다. worker 폴더에서 wrangler deploy로 배포해 주세요.', 503));
  try { new Headers({ 'x-client-id': env.CLIENT_ID, 'x-client-secret': env.CLIENT_SECRET }); }
  catch { return finish(fail('INVALID_CREDENTIAL_FORMAT', 'Cloudflare의 CLIENT_ID 또는 CLIENT_SECRET에 잘못된 문자나 줄바꿈이 있습니다. 값을 다시 등록해 주세요.', 503)); }
  if (path === '/config') return finish(json({ clientId: env.CLIENT_ID, redirectUri }));
  let phase = 'input';
  try {
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return finish(fail('INPUT', 'JSON 요청이 필요합니다.'));
    // Stream limit also covers requests without Content-Length.
    const reader = request.body?.getReader();
    let chunks = [], size = 0;
    if (reader) {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 16384) { await reader.cancel(); return finish(fail('INPUT', '요청이 너무 큽니다.', 413)); }
        chunks.push(value);
      }
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = JSON.parse(new TextDecoder().decode(bytes) || '{}');
    let payload;
    if (path === '/oauth/token') {
      if (body.grant_type === 'authorization_code' && typeof body.code === 'string' && body.code.length <= 4096 &&
          body.redirect_uri === redirectUri && /^[A-Za-z0-9._~-]{43,128}$/.test(body.code_verifier || '')) {
        payload = { grant_type: body.grant_type, code: body.code, redirect_uri: redirectUri, code_verifier: body.code_verifier };
      } else if (body.grant_type === 'refresh_token' && typeof body.refresh_token === 'string' && body.refresh_token.length <= 8192) {
        payload = { grant_type: body.grant_type, refresh_token: body.refresh_token };
      } else return finish(fail('INPUT', '로그인 요청을 확인해 주세요.'));
    }
    if (path === '/oauth/revoke') {
      if (typeof body.token !== 'string' || !body.token || body.token.length > 8192) return finish(fail('INPUT', '유효하지 않은 토큰입니다.'));
      payload = { token: body.token };
    }
    if (path === '/random') buildQuery(body); // Validate before consuming upstream quota.
    const auth = request.headers.get('Authorization');
    if (body.requireAccount && !auth) return finish(fail('AUTH_REQUIRED', '계정을 다시 연결해 주세요.', 401));
    if ((auth && !/^Bearer [^\s]{1,8192}$/.test(auth)) || (path === '/me' && !auth))
      return finish(fail('AUTH_REQUIRED', '계정을 다시 연결해 주세요.', 401));
    phase = 'budget';
    const budget = env.BUDGET.get(env.BUDGET.idFromName('global'));
    const reserveBudget = async () => {
      phase = 'budget';
      const allowance = await budget.fetch('https://budget/check', { method: 'POST', body: '{}' });
      if (!allowance.ok) throw allowance;
      phase = 'upstream';
    };
    await reserveBudget();
    const requestUpstream = async (url, options) => {
      let response;
      try { response = await fetcher(url, options); }
      catch (error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError')
          throw fail('UPSTREAM_TIMEOUT', 'solved.ac 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.', 504);
        throw fail('UPSTREAM_NETWORK', 'Worker에서 solved.ac로 연결하지 못했습니다. 서버 연결 상태를 확인해야 합니다.', 502);
      }
      if (response.status >= 300 && response.status < 400)
        throw fail('UPSTREAM_REDIRECT', 'solved.ac API 주소가 이동되었습니다. API 경로 확인이 필요합니다.', 502);
      return response;
    };
    const upstream = async (url, method = 'GET', data, authorization) => {
      const res = await requestUpstream('https://solved.ac/api/v4' + url, {
        method, headers: { 'x-client-id': env.CLIENT_ID, 'x-client-secret': env.CLIENT_SECRET,
          ...(authorization ? { Authorization: authorization } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) },
        ...(data ? { body: JSON.stringify(data) } : {}), redirect: 'manual', signal: AbortSignal.timeout(10000)
      });
      if (res.status === 429) {
        const seconds = retrySeconds(res.headers.get('Retry-After'));
        await budget.fetch('https://budget/block', { method: 'POST', body: JSON.stringify({ blockSeconds: seconds }) });
        throw fail('RATE_LIMITED', 'solved.ac 요청 한도에 도달했습니다.', 429, { 'Retry-After': String(seconds) });
      }
      let result;
      try { result = await res.json(); }
      catch { throw fail('UPSTREAM', 'solved.ac 응답을 읽지 못했습니다.', 502); }
      if (!res.ok) {
        const code = result.error?.code || result.error;
        if (code === 'SIGN_IN_REQUIRED') throw fail(code, '검색 조건을 줄여 주세요. 검색은 100자, 8개 항까지 지원합니다.', 400);
        if (code === 'invalid_client') throw fail('SERVICE_AUTH', '서비스 인증 설정을 확인해야 합니다.', 503);
        if (code === 'invalid_grant') throw fail(code, '계정을 다시 연결해 주세요.', 401);
        if (res.status === 401 || res.status === 403) throw fail('AUTH_REQUIRED', '계정을 다시 연결해 주세요.', 401);
        if (res.status === 404) throw fail('NO_MATCH', '조건에 맞는 문제가 없습니다. 티어나 태그 범위를 넓혀 주세요.', 404);
        throw fail('UPSTREAM', 'solved.ac 요청에 실패했습니다.', 502);
      }
      return result;
    };
    if (path.startsWith('/oauth/')) {
      // RFC 7009 revocation can return an empty body.
      if (path === '/oauth/revoke') {
        const res = await requestUpstream('https://solved.ac/api/v4/oauth/revoke', { method: 'POST',
          headers: { 'x-client-id': env.CLIENT_ID, 'x-client-secret': env.CLIENT_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload), redirect: 'manual', signal: AbortSignal.timeout(10000) });
        if (res.status === 429) {
          const seconds = retrySeconds(res.headers.get('Retry-After'));
          await budget.fetch('https://budget/block', { method: 'POST', body: JSON.stringify({ blockSeconds: seconds }) });
          return finish(fail('RATE_LIMITED', '잠시 후 연결 해제를 다시 시도해 주세요.', 429, { 'Retry-After': String(seconds) }));
        }
        return finish(res.ok ? json({}) : fail('REVOKE_FAILED', '연결 해제에 실패했습니다. 다시 시도해 주세요.', 502));
      }
      const tokens = await upstream('/oauth/token', 'POST', payload);
      return finish(json({ access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_in: tokens.expires_in }));
    }
    let user = null;
    if (auth) user = await upstream('/me', 'GET', null, auth);
    if (path === '/me') return finish(json({ handle: user.handle }));
    const q = buildQuery(body, user?.handle || '');
    // Search currently has no user scope: use an explicit handle, not $me.
    // Keep all filters; retry only successful results without a BOJ mapping.
    // Each additional search reserves its own quota and respects the global cooldown.
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await reserveBudget();
      const p = await upstream('/search/random-problem?q=' + encodeURIComponent(q));
      const number = bojProblemId(p);
      if (number) return finish(json({ problemId: p.problemId, subId: p.subId, level: p.level,
        judgeIds: [{ ojId: 'boj', problemId: number }] }));
    }
    return finish(fail('NO_BOJ_MATCH', '이번 검색에서 백준에 연결된 문제를 찾지 못했습니다. 다시 추천하거나 조건을 바꿔 주세요.', 404));
  } catch (error) {
    if (error instanceof Response) return finish(error);
    if (error instanceof SyntaxError) return finish(fail('INPUT', '요청 형식이 올바르지 않습니다.'));
    if (phase === 'budget') return finish(fail('BUDGET_UNAVAILABLE', 'Worker 호출 제한 저장소에 접근하지 못했습니다. Durable Object 연결과 무료 한도를 확인해 주세요.', 503));
    if (phase === 'input') return finish(fail('INPUT', '요청을 확인해 주세요.'));
    return finish(fail('INTERNAL', 'Worker 처리 중 오류가 발생했습니다.', 500));
  }
}
export default { fetch(request, env) { return handle(request, env); } };

