export function saveSettings(settings) {
  // settings 객체에는 min, max, minRate가 들어옵니다.
  return chrome.storage.sync.set(settings);
}

export async function loadSettings() {
  return chrome.storage.sync.get({
    min: 16,
    max: 18,
    minRate: 0
  });
}