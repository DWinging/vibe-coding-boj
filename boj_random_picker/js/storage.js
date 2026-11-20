export async function saveSettings({ min, max }) {
  await chrome.storage.sync.set({ userSettings: { min, max } });
}
export async function loadSettings() {
  const { userSettings = {} } = await chrome.storage.sync.get('userSettings');
  const min = Number.isInteger(userSettings.min) ? Math.max(1, Math.min(30, userSettings.min)) : 11;
  const max = Number.isInteger(userSettings.max) ? Math.max(min, Math.min(30, userSettings.max)) : Math.max(min, 16);
  await saveSettings({ min, max }); // Removes the retired minRate field.
  return { min, max };
}
