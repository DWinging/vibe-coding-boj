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
 * 실제 API 호출 및 필터링 로직 (500개 후보군 확보 버전)
 */
async function fetchWithFallback(min, max, rate, tags) {
  // 아이디 확인
  let { savedHandle } = await chrome.storage.local.get('savedHandle');
  if (!savedHandle) {
    savedHandle = await getMyHandle();
    if (savedHandle) await chrome.storage.local.set({ savedHandle });
  }

  // 기본 쿼리 생성
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
  const MAX_PAGES = 5; // 100개씩 5페이지 = 500개

  console.log("🎲 무작위 후보군 500개 수집 시작...");

  // 기존 thresholds를 제거하고 5페이지를 순회하며 후보군 수집
  for (let page = 1; page <= MAX_PAGES; page++) {
    // 공용 API 매너: 2페이지부터 0.2초씩 쉬어줌
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
        // 만약 가져온 데이터가 100개 미만이면 다음 페이지가 없다는 뜻
        if (data.items.length < 100) break;
      } else {
        break;
      }
    } catch (e) { 
      console.error(`${page}페이지 수집 실패:`, e);
      break; 
    }
  }

  if (allCandidates.length === 0) return [];

  // 1. 정답률 필터링
  let filtered = allCandidates;
  if (rate > 0) {
    filtered = allCandidates.filter(p => {
      const successRate = p.averageTries ? (1 / p.averageTries) * 100 : 0;
      return successRate >= rate;
    });
  }

  // 2. Fisher-Yates Shuffle (가져온 후보군을 완전히 무작위로 섞음)
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }

  // 3. 섞인 것 중 최종 100개만 반환
  console.log(`✅ 총 ${filtered.length}개의 후보 중 100개를 캐시합니다.`);
  return filtered.slice(0, 100);
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

    // 캐시 데이터 로드
    let { cachedProblems, currentIndex, lastCacheTime } = await chrome.storage.local.get(['cachedProblems', 'currentIndex', 'lastCacheTime']);

    // 🚨 [핵심] 시간 기반 만료 체크 (2시간)
    const isExpired = !lastCacheTime || (now - lastCacheTime > CACHE_EXPIRE_TIME);

    // 캐시가 없거나, 인덱스 초과했거나, 시간이 만료되었을 때 API 호출
    if (!cachedProblems || currentIndex >= cachedProblems.length || isExpired) {
      
      // 🚨 [신규 추가] 로그인 유도 체크 로직
      const handle = await getMyHandle();
      if (!handle) {
        const goLogin = confirm("로그인이 되어 있지 않아 '푼 문제'가 섞여 나올 수 있습니다.\n\nsolved.ac 로그인 페이지로 이동하시겠습니까?");
        if (goLogin) {
          chrome.tabs.create({ url: "https://solved.ac/login" });
          return; // 로그인하러 이동 시 로직 중단
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
        if (newProblems !== null) alert("조건에 맞는 '안 푼 문제'가 없습니다.");
        return;
      }
      
      cachedProblems = newProblems;
      currentIndex = 0;
      lastCacheTime = now; // 갱신 시간 기록
    }

    const targetProblem = cachedProblems[currentIndex];
    
    // 상태 저장
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
  // 설정이 바뀌면 캐시 초기화 (다음 클릭 시 즉시 갱신됨)
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