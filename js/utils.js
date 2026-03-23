/**
 * BOJ Random Picker - Utility Functions
 * Description: 앱 전반에서 공통으로 사용되는 순수 함수(Pure Functions) 모음입니다.
 */

/**
 * solved.ac 티어 레벨(정수)을 직관적인 문자열 포맷으로 변환
 * - 변환 규칙: 1~5(Bronze), 6~10(Silver), 11~15(Gold), 16~20(Platinum) ...
 * - 레벨 역산: 각 구간의 시작 숫자가 5단계(V)에 해당하고, 끝 숫자가 1단계(I)에 해당함.
 * * @param {number} t - solved.ac 티어 레벨 정수값 (0 ~ 30)
 * @returns {string} - 변환된 숏폼 티어 문자열 (예: 'G5', 'P3')
 */
export function getTierName(t) {
  const letters = ['', 'B', 'S', 'G', 'P', 'D', 'R'];
  if (t == 0) return 'Unrated';
  
  const group = letters[Math.floor((t - 1) / 5) + 1];
  const level = 5 - ((t - 1) % 5);
  return `${group}${level}`;
}