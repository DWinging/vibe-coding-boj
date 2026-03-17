import { getTierName } from './utils.js';
import { fetchRandomProblem } from './api.js';
import { saveSettings, loadSettings } from './storage.js';

const mainView = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');
const tierText = document.getElementById('tierText');
const minTierInput = document.getElementById('minTier');
const maxTierInput = document.getElementById('maxTier');
const drawBtn = document.getElementById('drawBtn');

// UI 초기화
async function init() {
  const settings = await loadSettings();
  minTierInput.value = settings.min;
  maxTierInput.value = settings.max;
  updateText(settings.min, settings.max);
}

function updateText(min, max) {
  document.getElementById('minVal').innerText = min;
  document.getElementById('maxVal').innerText = max;
  tierText.innerText = `${getTierName(min)} - ${getTierName(max)}`;
}

// 이벤트 리스너
document.getElementById('settingsBtn').onclick = () => {
  mainView.style.display = 'none';
  settingsView.style.display = 'flex';
};

document.getElementById('backBtn').onclick = async () => {
  const min = parseInt(minTierInput.value);
  const max = parseInt(maxTierInput.value);
  await saveSettings({ min, max });
  updateText(min, max);
  settingsView.style.display = 'none';
  mainView.style.display = 'flex';
};

minTierInput.oninput = (e) => updateText(e.target.value, maxTierInput.value);
maxTierInput.oninput = (e) => updateText(minTierInput.value, e.target.value);

drawBtn.onclick = async () => {
  drawBtn.innerText = "Finding...";
  drawBtn.disabled = true;

  try {
    const problemId = await fetchRandomProblem(minTierInput.value, maxTierInput.value);
    if (problemId) {
      chrome.tabs.update({ url: `https://www.acmicpc.net/problem/${problemId}` });
      window.close();
    } else {
      alert("문제를 찾을 수 없습니다.");
    }
  } catch (err) {
    alert(err.message);
  } finally {
    drawBtn.innerText = "VIBE CHECK";
    drawBtn.disabled = false;
  }
};

init();