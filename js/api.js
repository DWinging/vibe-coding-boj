/**
 * BOJ Random Picker - Core API Engine
 * Version: 2.1.0 (Submission Count Filter)
 */

export const CATEGORIZED_TAGS = {
  "자료 구조": [
    {key: "data_structures", name: "자료 구조"}, {key: "stack", name: "스택"}, {key: "queue", name: "큐"},
    {key: "deque", name: "덱"}, {key: "priority_queue", name: "우선순위 큐"}, {key: "disjoint_set", name: "분리 집합"},
    {key: "hash_set", name: "해시를 사용한 집합과 맵"}, {key: "tree_set", name: "트리를 사용한 집합과 맵"}, {key: "sparse_table", name: "희소 테이블"}
  ],
  "그래프 이론": [
    {key: "graphs", name: "그래프 이론"}, {key: "graph_traversal", name: "그래프 탐색"}, {key: "bfs", name: "너비 우선 탐색"},
    {key: "dfs", name: "깊이 우선 탐색"}, {key: "dijkstra", name: "데이크스트라"}, {key: "floyd_warshall", name: "플로이드-워셜"},
    {key: "bellman_ford", name: "벨만-포드"}, {key: "mst", name: "최소 신장 트리"}, {key: "topological_sorting", name: "위상 정렬"},
    {key: "scc", name: "강한 연결 요소"}, {key: "bipartite_matching", name: "이분 매칭"}, {key: "flow", name: "네트워크 유량"}, {key: "mcmf", name: "최소 비용 최대 유량"}
  ],
  "다이나믹 프로그래밍": [
    {key: "dp", name: "다이나믹 프로그래밍"}, {key: "dp_tree", name: "트리에서의 다이나믹 프로그래밍"},
    {key: "dp_bitfield", name: "비트마스킹을 이용한 다이나믹 프로그래밍"}, {key: "knapsack", name: "배낭 문제"}
  ],
  "수학": [
    {key: "math", name: "수학"}, {key: "number_theory", name: "정수론"}, {key: "combinatorics", name: "조합론"},
    {key: "geometry", name: "기하학"}, {key: "primality_test", name: "소수 판정"}, {key: "exponentiation_by_squaring", name: "분할 정복을 이용한 거듭제곱"}
  ],
  "문자열": [
    {key: "string", name: "문자열"}, {key: "kmp", name: "KMP"}, {key: "trie", name: "트라이"},
    {key: "suffix_array", name: "접미사 배열 및 LCP 배열"}, {key: "aho_corasick", name: "아호-코라식"}
  ],
  "구현": [
    {key: "implementation", name: "구현"}, {key: "simulation", name: "시뮬레이션"}, {key: "bruteforcing", name: "브루트포스 알고리즘"},
    {key: "backtracking", name: "백트래킹"}
  ],
  "트리": [
    {key: "trees", name: "트리"}, {key: "lca", name: "최소 공통 조상"}, {key: "segtree", name: "세그먼트 트리"},
    {key: "lazyprop", name: "느리게 갱신되는 세그먼트 트리"}, {key: "pst", name: "퍼시스턴트 세그먼트 트리"},
    {key: "hld", name: "Heavy-Light 분할"}, {key: "euler_tour_technique", name: "오일러 경로 테크닉"}, {key: "centroid", name: "센트로이드 분할"}
  ],
  "기타 핵심": [
    {key: "greedy", name: "그리디 알고리즘"}, {key: "binary_search", name: "이분 탐색"}, 
    {key: "two_pointer", name: "투 포인터"}, {key: "prefix_sum", name: "누적 합"},
    {key: "sweeping", name: "스위핑"}, {key: "divide_and_conquer", name: "분할 정복"}, 
    {key: "bitmask", name: "비트마스크"}, {key: "offline_queries", name: "오프라인 쿼리"}, 
    {key: "sorting", name: "정렬"}, {key: "parametric_search", name: "매개 변수 탐색"}
  ]
};

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

export async function fetchRandomProblem(minTier, maxTier, minRate = 0, presetTags = []) {
  // 1. 기본 쿼리 조립 (정답률/제출수 조건은 JS 필터링으로 뺌)
  const baseQueryParts = [`tier:${minTier}..${maxTier}`, `lang:ko`];
  
  if (presetTags.length > 0) {
    baseQueryParts.push(`(${presetTags.map(t => `tag:${t}`).join('|')})`);
  }

  let useUnsolvedFilter = true; 
  let attempts = 0;
  const MAX_SEARCH_BUNDLES = 5; // 필터링이 빡빡할 수 있으므로 최대 5번(250문제)까지 탐색 허용

  while (attempts < MAX_SEARCH_BUNDLES) {
    try {
      const query = [...baseQueryParts];
      if (useUnsolvedFilter) query.push(`!@$me`); // 안 푼 문제 필터
      
      const url = `https://solved.ac/api/v3/search/problem?query=${encodeURIComponent(query.join(' '))}&sort=random`;
      
      const response = await fetch(url, { credentials: 'include' });

      // 비로그인 401 폴백
      if (response.status === 401 && useUnsolvedFilter) {
        console.log("비로그인 감지. 전체 문제 검색으로 전환합니다.");
        useUnsolvedFilter = false;
        continue; 
      }

      // API 밴 429 방어
      if (response.status === 429) {
        console.warn("API 429 에러. 1.5초 대기 후 재시도...");
        await sleep(1500);
        attempts++;
        continue;
      }

      if (!response.ok) throw new Error(`API_ERR_${response.status}`);

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) return null;

      // ★ 2. 클라이언트 자체 필터링 (정답률 + 제출 수) ★
      for (const prob of data.items) {
        const tries = prob.averageTries || 1;
        const accepted = prob.acceptedUserCount || 0;
        
        // 제출 수 계산 (맞은 사람 수 * 평균 시도 횟수)
        const totalSubmissions = Math.floor(accepted * tries); 
        // 정답률 계산 (100 / 평균 시도 횟수)
        const successRate = 100 / tries;

        // 제출 수 2000 이상 AND 유저가 설정한 정답률 이상인 문제만 통과!
        if (totalSubmissions >= 2000 && successRate >= minRate) {
          console.log(`[스나이핑 성공] ID: ${prob.problemId}, 제출수: ${totalSubmissions}, 정답률: ${successRate.toFixed(1)}%`);
          return prob.problemId;
        }
      }

      attempts++;
      await sleep(500);
      
    } catch (err) {
      console.error("Fetch Error:", err);
      attempts++;
      await sleep(1000);
    }
  }
  
  return null;
}