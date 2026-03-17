export const VIBE_STORAGE_KEY = 'vibeSettings';

export function saveSettings(settings) {
  return chrome.storage.sync.set({ [VIBE_STORAGE_KEY]: settings });
}

export function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([VIBE_STORAGE_KEY], (data) => {
      resolve(data[VIBE_STORAGE_KEY] || { min: 16, max: 18 });
    });
  });
}