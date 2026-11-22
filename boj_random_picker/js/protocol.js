export const MAX_ALGORITHM_TAGS = 5;
export const TAG_LIMIT_MESSAGE = '알고리즘은 최대 5개 까지 선택 가능합니다.';
export const SOLVED_USER_THRESHOLDS = Object.freeze([2000, 1000, 500, 0]);
export function buildQuery({ min, max, tags = [] }, handle = '', minSolved = SOLVED_USER_THRESHOLDS[0]) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max > 30 || min > max) throw new Error('티어 범위를 확인해 주세요.');
  if (!Array.isArray(tags) || tags.some(t => typeof t !== 'string' || !/^[a-z0-9_]+$/.test(t))) throw new Error('유효하지 않은 태그입니다.');
  if (handle && !/^[a-zA-Z0-9_]+$/.test(handle)) throw new Error('사용자 ID 형식을 확인해 주세요.');
  if (!SOLVED_USER_THRESHOLDS.includes(minSolved)) throw new Error('푼 사람 수 기준을 확인해 주세요.');
  const unique = [...new Set(tags)];
  if (unique.length > MAX_ALGORITHM_TAGS || 1 + (minSolved > 0 ? 1 : 0) + (handle ? 1 : 0) + unique.length > 8) throw new Error(TAG_LIMIT_MESSAGE);
  const q = '*' + min + '..' + max + (minSolved > 0 ? ' s#' + minSolved + '..' : '') + (handle ? ' -@' + handle : '') +
    (unique.length ? ' (' + unique.map(t => '#' + t).join('|') + ')' : '');
  if (q.length > 100) throw new Error('검색 조건이 100자를 넘습니다. 태그 수를 줄여 주세요.');
  return q;
}
export function retrySeconds(value, now = Date.now()) {
  const n = value && /^\d+(\.\d+)?$/.test(value) ? Number(value) : (Date.parse(value) - now) / 1000;
  return Number.isFinite(n) ? Math.max(1, Math.ceil(n)) : 60;
}
export function bojProblemId(p) {
  if (!Array.isArray(p?.judgeIds)) return null;
  for (const judge of p.judgeIds) {
    if (judge?.ojId !== 'boj') continue;
    const number = String(judge.problemId);
    if (/^[1-9]\d*$/.test(number) && Number.isSafeInteger(Number(number))) return number;
  }
  return null;
}
export function problemDestination(p) {
  const number = bojProblemId(p);
  if (!number) throw new Error('이 문제에는 백준 연결 정보가 없습니다.');
  return 'https://www.acmicpc.net/problem/' + number;
}

