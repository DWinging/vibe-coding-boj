/**
 * 사용자 기본 설정 저장 (로컬 -> 구글 계정 동기화로 업그레이드)
 */
export const saveSettings = async (settings) => {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ userSettings: settings }, () => {
      console.log("☁️ 설정이 구글 계정에 동기화되었습니다.", settings);
      resolve();
    });
  });
};

/**
 * 사용자 기본 설정 불러오기
 */
export const loadSettings = async () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get('userSettings', (data) => {
      // 저장된 값이 없으면 기본값(골드5 ~ 플레5, 정답률 0) 세팅
      resolve(data.userSettings || { min: 11, max: 16, minRate: 0 });
    });
  });
};