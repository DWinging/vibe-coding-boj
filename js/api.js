export async function fetchRandomProblem(min, max) {
  // -solved_by:me 는 로그인 상태여야 정상 작동합니다.
  const query = encodeURIComponent(`tier:${min}..${max} -solved_by:me`);
  const url = `https://solved.ac/api/v3/search/problem?query=${query}&sort=random`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('API 호출 실패 (로그인 상태 확인)');
  
  const data = await response.json();
  return data.items && data.items.length > 0 ? data.items[0].problemId : null;
}