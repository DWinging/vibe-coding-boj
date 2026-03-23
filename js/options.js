/**
 * BOJ Random Picker - Preset Management UI
 * Description: 확장프로그램 옵션 페이지(options.html)의 동적 UI 렌더링 및 프리셋 관리 로직.
 * 사용자 정의 알고리즘 태그 조합을 생성, 수정, 삭제하고 chrome.storage.sync를 통해
 * 구글 계정에 안전하게 동기화합니다.
 */

import { CATEGORIZED_TAGS } from './api.js';

// 메모리 상에서 구글 계정 동기화 데이터(customPresets)를 캐싱하는 로컬 상태 객체
let presets = {};

/**
 * 앱 초기화 (Initialization)
 * 1. 동기화 스토리지에서 기존 프리셋 데이터를 비동기로 패치.
 * 2. 태그 목록 및 프리셋 목록 UI의 최초 렌더링 트리거.
 */
async function init() {
  try {
    const data = await chrome.storage.sync.get(['customPresets']);
    presets = data.customPresets || {}; // 데이터가 없을 경우 빈 객체로 안전하게 초기화(Fallback)
    renderCategorizedTags();
    renderPresetList();
  } catch (e) {
    console.error("초기화 오류:", e);
  }
}

/**
 * 알고리즘 태그 UI 동적 렌더링 및 체크박스 상태 동기화
 * - api.js의 CATEGORIZED_TAGS 데이터를 순회하며 HTML 문자열을 조립(템플릿 리터럴)하여 삽입.
 * - '전체 선택' 체크박스와 '개별 태그' 체크박스 간의 양방향 상태 연동을 처리.
 */
function renderCategorizedTags() {
  const container = document.getElementById('algoContainer');
  let html = "";

  // 1. 카테고리별 그리드 레이아웃 조립
  for (const [category, tags] of Object.entries(CATEGORIZED_TAGS)) {
    html += `
      <div class="category-section">
        <div class="category-header">
          <h3 class="category-title">${category}</h3>
          <label class="select-all-label">
            <input type="checkbox" class="select-all-cb"> 전체 선택
          </label>
        </div>
        <div class="tags-grid">
          ${tags.map(tag => `
            <label class="tag-card" title="${tag.key}">
              <input type="checkbox" class="tag-cb" value="${tag.key}">
              <span>${tag.name}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }
  container.innerHTML = html;

  // 2. DOM 삽입 후 체크박스 이벤트 바인딩 (동기화 로직)
  document.querySelectorAll('.category-section').forEach(section => {
    const allCb = section.querySelector('.select-all-cb');
    const tagCbs = Array.from(section.querySelectorAll('.tag-cb'));

    // [전체 선택 -> 개별 태그] 액션
    allCb.onclick = () => {
      tagCbs.forEach(cb => {
        // 검색 필터링으로 인해 숨겨진(display: none) 태그는 상태 변경에서 제외 (UX 보호)
        if (cb.closest('.tag-card').style.display !== 'none') {
          cb.checked = allCb.checked;
        }
      });
    };

    // [개별 태그 -> 전체 선택] 액션: 하위 요소가 모두 선택되었는지 검사하여 상위 체크박스 토글
    tagCbs.forEach(cb => {
      cb.onchange = () => {
        const visibleCbs = tagCbs.filter(c => c.closest('.tag-card').style.display !== 'none');
        const checkedVisible = visibleCbs.filter(c => c.checked);
        // 화면에 보이는 모든 태그가 체크되었을 때만 '전체 선택' 활성화
        allCb.checked = (visibleCbs.length > 0 && visibleCbs.length === checkedVisible.length);
      };
    });
  });
}

/**
 * 실시간 태그 검색 (Live Filtering)
 * - 사용자의 입력 이벤트마다 DOM을 순회하며 검색어와 일치하지 않는 요소의 display 속성을 토글.
 * - 카테고리 내의 모든 태그가 숨겨지면 해당 카테고리 섹션 전체를 숨김 처리하여 깔끔한 UI 유지.
 */
document.getElementById('searchInput').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  document.querySelectorAll('.category-section').forEach(section => {
    let hasVisible = false;
    section.querySelectorAll('.tag-card').forEach(card => {
      // 태그의 한글명(innerText) 또는 영문 키값(title)으로 양방향 검색 지원
      const match = card.innerText.toLowerCase().includes(q) || card.title.toLowerCase().includes(q);
      card.style.display = match ? 'flex' : 'none';
      if (match) hasVisible = true;
    });
    
    // 일치하는 태그가 없는 카테고리는 섹션 통째로 숨김
    section.style.display = hasVisible ? 'block' : 'none';
    
    // 검색 결과가 변동됨에 따라 '전체 선택' 체크박스 상태 재평가
    const allCb = section.querySelector('.select-all-cb');
    const visibleCbs = Array.from(section.querySelectorAll('.tag-cb')).filter(c => c.closest('.tag-card').style.display !== 'none');
    allCb.checked = (visibleCbs.length > 0 && visibleCbs.filter(c => c.checked).length === visibleCbs.length);
  });
});

/**
 * UX 최적화: 프리셋 이름 입력 필드 엔터키 제출 방어 및 버튼 클릭 위임
 * - Form submit 등 브라우저 기본 동작으로 인한 페이지 새로고침(버그) 방지
 */
document.getElementById('presetName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault(); 
    document.getElementById('savePresetBtn').click();
  }
});

/**
 * 폼 초기화 로직 (Reset)
 * - 텍스트 입력값 및 체크박스 상태를 모두 날리고, 강제로 input 이벤트를 발생시켜 검색 필터링 뷰도 원복.
 */
document.getElementById('resetBtn').onclick = () => {
  document.getElementById('presetName').value = "";
  document.getElementById('searchInput').value = "";
  document.querySelectorAll('.tag-cb, .select-all-cb').forEach(cb => cb.checked = false);
  document.getElementById('searchInput').dispatchEvent(new Event('input'));
};

/**
 * 프리셋 저장 및 동기화 (Create & Update)
 * - Validation(유효성 검사) -> 중복 확인(Confirm) -> 상태 업데이트 -> 클라우드 Sync 순서로 진행.
 */
document.getElementById('savePresetBtn').onclick = async () => {
  const nameInput = document.getElementById('presetName');
  const name = nameInput.value.trim();
  // 선택된 체크박스의 value(태그 영문 키값)만 추출하여 배열로 생성
  const selected = Array.from(document.querySelectorAll('.tag-cb:checked')).map(cb => cb.value);

  // Validation: 이름이 비었거나 선택된 태그가 없을 경우 방어
  if (!name || selected.length === 0) {
    return alert("프리셋 이름과 알고리즘을 선택해 주세요.");
  }

  // Duplicate Check: 덮어쓰기 방지 얼럿 (의도치 않은 삭제 방어)
  if (presets[name] && !confirm(`'${name}' 프리셋을 이미 존재합니다. 덮어씌울까요?`)) {
    return;
  }

  // 상태 갱신 및 Chrome Sync API 통신
  presets[name] = selected;
  await chrome.storage.sync.set({ customPresets: presets });
  
  // 저장 성공 시 UI 리셋 및 목록 재랜더링
  document.getElementById('resetBtn').click();
  renderPresetList();
};

/**
 * 저장된 프리셋 목록(칩 UI) 렌더링
 * - Object.keys()를 이용해 저장된 프리셋들을 순회하며 태그 개수와 함께 버튼 형태로 출력.
 */
function renderPresetList() {
  const list = document.getElementById('presetList');
  const keys = Object.keys(presets);
  
  // Empty State 처리
  if (keys.length === 0) {
    list.innerHTML = "<div style='color:#666; font-size:0.9rem; padding: 10px 0;'>저장된 프리셋이 없습니다.</div>";
    return;
  }

  list.innerHTML = keys.map(name => `
    <div class="preset-chip preset-load-trigger" data-name="${name}">
      <span>${name}</span>
      <span class="p-count">${presets[name].length}</span>
      <button class="del-btn" data-name="${name}">×</button>
    </div>
  `).join('');

  // DOM 갱신 후 새로 생성된 요소들에 이벤트 리스너 부착
  attachListEvents();
}

/**
 * 프리셋 리스트 하위 요소 이벤트 바인딩 (Delete & Load)
 * - 동적으로 생성되는 DOM 요소들이므로 렌더링(renderPresetList)이 끝난 직후 호출해야 함.
 */
function attachListEvents() {
  // 1. 프리셋 삭제 기능 (Delete)
  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation(); // 부모 요소인 프리셋 칩의 클릭 이벤트(Load)가 발생하지 않도록 이벤트 버블링 차단
      const target = e.currentTarget.dataset.name;
      
      if (confirm(`'${target}' 프리셋을 삭제하시겠습니까?`)) {
        delete presets[target]; // 로컬 상태 삭제
        await chrome.storage.sync.set({ customPresets: presets }); // 클라우드 동기화
        renderPresetList();
        document.getElementById('resetBtn').click(); // 편집 중이던 내용도 함께 초기화
      }
    };
  });

  // 2. 프리셋 불러오기 기능 (Load)
  document.querySelectorAll('.preset-load-trigger').forEach(chip => {
    chip.onclick = (e) => {
      const targetName = e.currentTarget.dataset.name;
      const targetTags = presets[targetName];

      // 입력창에 프리셋 이름 세팅
      document.getElementById('presetName').value = targetName;
      
      // 저장된 태그 목록(배열)과 대조하여 개별 체크박스 상태 강제 업데이트
      document.querySelectorAll('.tag-cb').forEach(cb => {
        cb.checked = targetTags.includes(cb.value);
      });

      // 개별 체크박스 변동에 맞춰 카테고리별 '전체 선택' 상태 재계산 (무결성 유지)
      document.querySelectorAll('.category-section').forEach(section => {
        const tagCbs = Array.from(section.querySelectorAll('.tag-cb'));
        section.querySelector('.select-all-cb').checked = (tagCbs.length > 0 && tagCbs.every(c => c.checked));
      });
    };
  });
}

// 스크립트 로드 시 최초 진입점
init();