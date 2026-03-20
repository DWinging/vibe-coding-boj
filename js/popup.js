import { getTierName } from './utils.js';
import { saveSettings, loadSettings } from './storage.js';

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
const COOL_DOWN = 1500;
const CACHE_EXPIRE_TIME = 2 * 60 * 60 * 1000; // 2시간 만료 설정 (밀리초)

/**
 * [Security] 쿠키에서 solved.ac JWT 토큰을 찾아 사용자 ID(handle) 직접 추출
 */
async function getMyHandle() {
  return new Promise((resolve) => {
    if (!chrome.cookies) {
      console.warn("⚠️ 'cookies' 권한이 없습니다.");
      return resolve(null);
    }

    chrome.cookies.get({ url: "https://solved.ac", name: "solvedacToken" }, (cookie) => {
      if (!cookie || !cookie.value) return resolve(null);

      try {
        const base64Url = cookie.value.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        resolve(payload.handle);
      } catch (e) {
        console.error("❌ 토큰 해독 실패:", e);
        resolve(null);
      }
    });
  });
}

/**
 * 캐시 강제 초기화 (설정 변경 시 호출)
 */
async function clearCache() {
  await chrome.storage.local.remove(['cachedProblems', 'currentIndex', 'savedHandle', 'lastCacheTime']);
  console.log("🧹 모든 캐시와 시간 기록이 초기화되었습니다.");
}

function updateUI(e) {
  let minV = Number(UI.inputs.min.value);
  let maxV = Number(UI.inputs.max.value);
  const rateV = Number(UI.inputs.rate.value);

  if (minV > maxV) {
    if (e?.target?.id === 'minTier') { UI.inputs.max.value = minV; maxV = minV; }
    else { UI.inputs.min.value = maxV; minV = maxV; }
  }

  const tierRange = `${getTierName(minV)} - ${getTierName(maxV)}`;
  UI.display.tierText.innerText = tierRange;
  UI.display.rangeText.innerText = tierRange;
  UI.display.rateVal.innerText = rateV;
  const presetLabel = UI.inputs.preset.value ? `[${UI.inputs.preset.value}]` : '전체';
  UI.display.subSummary.innerText = `${presetLabel} | 정답률 ${rateV}%↑`;
}

async function init() {
  const settings = await loadSettings();
  UI.inputs.min.value = settings.min || 16;
  UI.inputs.max.value = settings.max || 18;
  UI.inputs.rate.value = settings.minRate || 0;
  
  const { customPresets, lastPreset } = await chrome.storage.sync.get(['customPresets', 'lastPreset']);
  const presets = customPresets || {};
  UI.inputs.preset.innerHTML = '<option value="">적용 안 함 (전체)</option>';
  Object.keys(presets).forEach(name => {
    const opt = new Option(name, name);
    UI.inputs.preset.add(opt);
  });
  UI.inputs.preset.value = (lastPreset && presets[lastPreset]) ? lastPreset : "";
  updateUI();
}

/**
 * 배열을 무작위로 섞어주는 유틸리티 함수 (Fisher-Yates)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 실제 API 호출 및 필터링 로직 (20페이지 수집 + 2000회 1차 방어 + 0회 리트라이)
 */
async function fetchWithFallback(min, max, rate, tags) {
  let { savedHandle } = await chrome.storage.local.get('savedHandle');
  if (!savedHandle) {
    savedHandle = await getMyHandle();
    if (savedHandle) await chrome.storage.local.set({ savedHandle });
  }

  let baseQuery = `tier:${min}..${max}`;
  if (savedHandle) {
    baseQuery += ` -s@${savedHandle}`;
    console.log(`🔍 유저(${savedHandle})의 안 푼 문제 검색 중...`);
  } else {
    baseQuery += ` !solved`;
  }

  if (tags && tags.length > 0) {
    baseQuery += ` (${tags.map(t => `#${t}`).join('|')})`;
  }

  let allCandidates = [];
  // 🚨 그물망 4배 확대: 최대 20페이지(2000개) 긁어오기
  const MAX_PAGES = 20; 

  console.log("🎲 무작위 후보군 최대 2000개 싹쓸이 수집 시작...");

  for (let page = 1; page <= MAX_PAGES; page++) {
    if (page > 1) await new Promise(resolve => setTimeout(resolve, 200));

    const url = `https://solved.ac/api/v3/search/problem?query=${encodeURIComponent(baseQuery)}&sort=random&page=${page}`;

    try {
      const res = await fetch(url);
      if (res.status === 429) {
        console.warn("⚠️ Rate Limit! 지금까지 모은 것만 사용합니다.");
        break;
      }
      if (!res.ok) continue;

      const data = await res.json();
      if (data && data.items && data.items.length > 0) {
        allCandidates.push(...data.items);
        if (data.items.length < 100) break; // 마지막 페이지면 탈출
      } else {
        break;
      }
    } catch (e) { 
      console.error(`${page}페이지 수집 실패:`, e);
      break; 
    }
  }

  if (allCandidates.length === 0) return [];

  // 1. 유저 설정 정답률 필터링
  let filtered = allCandidates;
  if (rate > 0) {
    filtered = allCandidates.filter(p => {
      const successRate = p.averageTries ? (1 / p.averageTries) * 100 : 0;
      return successRate >= rate;
    });
  }

  // 🚨 2. [절대 방어선] 제출 수 2000 이상 필터링
  const getSubmissions = (p) => Math.round(p.acceptedUserCount * p.averageTries);
  let strictPool = filtered.filter(p => getSubmissions(p) >= 2000);

  console.log(`🛡️ 긁어온 ${filtered.length}개 후보 중 '제출 2000회 이상' 통과: ${strictPool.length}개`);

  // 🚨 3. [리트라이 로직] 2000회 이상이 한 개도 없으면 0회 이상으로 재검색
  if (strictPool.length === 0) {
    console.warn("⚠️ 조건(제출 2000회 이상) 만족 문제가 없어, 제출 수 0회 이상으로 기준을 대폭 낮춰 재검색합니다.");
    strictPool = filtered.filter(p => getSubmissions(p) >= 0);
    console.log(`♻️ 기준 하향(0회 이상) 후 통과: ${strictPool.length}개`);
  }

  // 4. 통과한 진짜배기들만 셔플해서 최대 100개 반환
  if (strictPool.length === 0) {
    console.warn("💀 뒤져봤지만 조건에 맞는 문제가 아예 없습니다.");
    return []; // UI에서 "조건에 맞는 안 푼 문제가 없습니다" 띄우도록 빈 배열 반환
  }

  return shuffleArray(strictPool).slice(0, 100);
}

/**
 * 메인 실행 버튼: 시간 기반 캐시 체크 포함
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

    let { cachedProblems, currentIndex, lastCacheTime } = await chrome.storage.local.get(['cachedProblems', 'currentIndex', 'lastCacheTime']);

    const isExpired = !lastCacheTime || (now - lastCacheTime > CACHE_EXPIRE_TIME);

    if (!cachedProblems || currentIndex >= cachedProblems.length || isExpired) {
      const handle = await getMyHandle();
      if (!handle) {
        const goLogin = confirm("로그인이 되어 있지 않아 '푼 문제'가 섞여 나올 수 있습니다.\n\nsolved.ac 로그인 페이지로 이동하시겠습니까?");
        if (goLogin) {
          chrome.tabs.create({ url: "https://solved.ac/login" });
          return;
        }
      }

      if (isExpired && cachedProblems) console.log("⏰ 캐시 만료(2시간 경과)로 새로 갱신합니다.");
      
      const newProblems = await fetchWithFallback(
        Number(UI.inputs.min.value),
        Number(UI.inputs.max.value),
        Number(UI.inputs.rate.value),
        tags
      );

      if (!newProblems || newProblems.length === 0) {
        if (newProblems !== null) alert("조건에 맞는 '안 푼 문제'가 없습니다. 태그나 티어 범위를 넓혀보세요.");
        return;
      }
      
      cachedProblems = newProblems;
      currentIndex = 0;
      lastCacheTime = now; 
    }

    const targetProblem = cachedProblems[currentIndex];
    
    await chrome.storage.local.set({ 
      cachedProblems, 
      currentIndex: currentIndex + 1,
      lastCacheTime 
    });

    if (targetProblem && targetProblem.problemId) {
      chrome.tabs.create({ url: `https://www.acmicpc.net/problem/${targetProblem.problemId}` });
    }
  } catch (err) {
    console.error(err);
  } finally {
    setTimeout(() => {
      isLocked = false;
      UI.btns.draw.disabled = false;
      UI.btns.draw.innerText = "VIBE CHECK";
    }, COOL_DOWN);
  }
};

/**
 * 기타 설정 관련 이벤트
 */
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
  await clearCache();
  updateUI();
  UI.settings.style.display = 'none';
  UI.main.style.display = 'flex';
};

UI.btns.editPreset.onclick = () => chrome.runtime.openOptionsPage();

[UI.inputs.min, UI.inputs.max, UI.inputs.rate].forEach(el => {
  el.oninput = (e) => updateUI(e);
});

UI.inputs.preset.onchange = async (e) => {
  updateUI(e);
  await chrome.storage.sync.set({ lastPreset: e.target.value });
  await clearCache();
};

init();