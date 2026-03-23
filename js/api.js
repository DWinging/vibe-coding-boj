/**
 * BOJ Random Picker - Data Models & Constants
 * Version: 2.1.12 (Architecture Refactored)
 * Description: solved.ac API 쿼리에 사용될 핵심 알고리즘 태그(Tag) 데이터베이스입니다.
 * 기존의 레거시(Legacy) API 호출 로직은 폐기 및 popup.js로 통합되었으며, 
 * 현재 이 파일은 프리셋 UI 렌더링을 위한 '순수 데이터 저장소' 역할만 수행합니다. (관심사 분리)
 */

/**
 * @constant CATEGORIZED_TAGS
 * @description 옵션 페이지(options.html)에 렌더링될 8대 카테고리별 알고리즘 태그 매핑 테이블.
 * * [Data Structure]
 * - category (Key) : UI에 표시될 대분류 카테고리명 (예: "자료 구조")
 * - Array (Value)  : 해당 카테고리에 속한 세부 태그 객체들의 배열
 * ㄴ key  : solved.ac 실제 API 검색 쿼리에 들어가는 영문 태그 ID (예: tag:data_structures)
 * ㄴ name : 사용자 화면(체크박스 옆)에 노출될 한글 태그명
 * * 💡 유지보수 팁: 
 * 나중에 새로운 알고리즘(예: "모스 알고리즘")을 추가하고 싶다면, 
 * HTML이나 JS의 렌더링 로직을 건드릴 필요 없이 오직 이 객체(CATEGORIZED_TAGS)에 데이터만 한 줄 추가하면 
 * 옵션 창 UI에 자동으로 렌더링 및 동기화됩니다.
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