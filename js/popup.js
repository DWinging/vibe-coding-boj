import { getTierName } from './utils.js';
import { fetchRandomProblem } from './api.js';
import { saveSettings, loadSettings } from './storage.js';

/**
 * 전역 상태 및 요소 관리
 */
const UI = {
  main: document.getElementById('mainView'),
  settings: document.getElementById('settingsView'),
  inputs: {
    min: document.getElementById('minTier'),
    max: document.getElementById('maxTier'),
    rate: document.getElementById('minRate'),
    preset: document.getElementById('presetSelect')
  },
  display: {
    tierText: document.getElementById('tierText'),
    rangeText: document.getElementById('rangeText'),
    rateVal: document.getElementById('rateVal'),
    subSummary: document.getElementById('subSummary')
  },
  btns: {
    draw: document.getElementById('drawBtn'),
    editPreset: document.getElementById('editPresetBtn'),
    settings: document.getElementById('settingsBtn'),
    back: document.getElementById('backBtn')
  }
};

let isLocked = false;
let lastRequestTime = 0;
const COOL_DOWN = 1500; // 1.5초 쿨타임

/**
 * UI 업데이트 로직 (데이터 변경 시 호출)
 */
function updateUI(e) {
  let minV = Number(UI.inputs.min.value);
  let maxV = Number(UI.inputs.max.value);
  const rateV = Number(UI.inputs.rate.value);

  // 최소값이 최대값보다 클 경우 보정
  if (minV > maxV) {
    if (e?.target?.id === 'minTier') {
      UI.inputs.max.value = minV;
      maxV = minV;
    } else {
      UI.inputs.min.value = maxV;
      minV = maxV;
    }
  }

  const tierRange = `${getTierName(minV)} - ${getTierName(maxV)}`;
  UI.display.tierText.innerText = tierRange;
  UI.display.rangeText.innerText = tierRange;
  UI.display.rateVal.innerText = rateV;
  
  const presetLabel = UI.inputs.preset.value ? `[${UI.inputs.preset.value}]` : '전체';
  UI.display.subSummary.innerText = `${presetLabel} | 정답률 ${rateV}%↑`;
}

/**
 * 초기화 로직 (저장된 설정 로드)
 */
async function init() {
  const settings = await loadSettings();
  UI.inputs.min.value = settings.min || 16;
  UI.inputs.max.value = settings.max || 18;
  UI.inputs.rate.value = settings.minRate || 0;
  
  // 프리셋 목록 및 마지막 선택값 로드
  const { customPresets, lastPreset } = await chrome.storage.sync.get(['customPresets', 'lastPreset']);
  const presets = customPresets || {};
  
  // 프리셋 옵션 동적 생성
  UI.inputs.preset.innerHTML = '<option value="">적용 안 함 (전체)</option>';
  Object.keys(presets).forEach(name => {
    const opt = new Option(name, name);
    UI.inputs.preset.add(opt);
  });
  
  // 마지막 사용 프리셋 유효성 검사 후 세팅
  UI.inputs.preset.value = (lastPreset && presets[lastPreset]) ? lastPreset : "";
  
  updateUI();
}

/**
 * 이벤트 바인딩
 */

// 설정 페이지 열기/닫기
UI.btns.settings.onclick = () => {
  UI.main.style.display = 'none';
  UI.settings.style.display = 'flex';
};

UI.btns.back.onclick = async () => {
  await saveSettings({
    min: Number(UI.inputs.min.value),
    max: Number(UI.inputs.max.value),
    minRate: Number(UI.inputs.rate.value)
  });
  
  await chrome.storage.sync.set({ lastPreset: UI.inputs.preset.value });
  
  updateUI();
  UI.settings.style.display = 'none';
  UI.main.style.display = 'flex';
};

// 프리셋 관리 페이지(Options) 열기
UI.btns.editPreset.onclick = () => chrome.runtime.openOptionsPage();

// 입력값 변경 시 UI 갱신
[UI.inputs.min, UI.inputs.max, UI.inputs.rate].forEach(el => {
  el.oninput = (e) => updateUI(e);
});

// 프리셋 변경 시 즉시 저장
UI.inputs.preset.onchange = async (e) => {
  updateUI(e);
  await chrome.storage.sync.set({ lastPreset: e.target.value });
};

/**
 * 메인 실행 버튼 (뽑기)
 */
UI.btns.draw.onclick = async () => {
  const now = Date.now();
  if (isLocked || (now - lastRequestTime < COOL_DOWN)) return;

  isLocked = true;
  UI.btns.draw.disabled = true;
  UI.btns.draw.innerText = "SNIPING...";
  lastRequestTime = now;

  try {
    const { customPresets } = await chrome.storage.sync.get(['customPresets']);
    const tags = UI.inputs.preset.value ? (customPresets[UI.inputs.preset.value] || []) : [];

    const problemId = await fetchRandomProblem(
      Number(UI.inputs.min.value), 
      Number(UI.inputs.max.value), 
      Number(UI.inputs.rate.value), 
      tags
    );

    if (problemId) {
      chrome.tabs.create({ url: `https://www.acmicpc.net/problem/${problemId}` });
    } else {
      alert("해당 조건에 맞는 문제가 없습니다.");
    }
  } catch (err) {
    console.error(err);
    alert("요청 실패. Solved.ac 서버 상태를 확인해주세요.");
  } finally {
    // 쿨타임 후 버튼 복구
    setTimeout(() => {
      isLocked = false;
      UI.btns.draw.disabled = false;
      UI.btns.draw.innerText = "VIBE CHECK";
    }, COOL_DOWN);
  }
};

// 앱 시작
init();