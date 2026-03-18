import { CATEGORIZED_TAGS } from './api.js';

let presets = {};

/**
 * [1] 초기화: 저장된 프리셋 불러오기 및 태그 렌더링
 */
async function init() {
  try {
    const data = await chrome.storage.sync.get(['customPresets']);
    presets = data.customPresets || {};
    renderCategorizedTags();
    renderPresetList();
  } catch (e) {
    console.error("초기화 오류:", e);
  }
}

/**
 * [2] 8대 카테고리별 태그 렌더링
 */
function renderCategorizedTags() {
  const container = document.getElementById('algoContainer');
  let html = "";

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

  // 체크박스 이벤트 바인딩 (전체 선택 동기화)
  document.querySelectorAll('.category-section').forEach(section => {
    const allCb = section.querySelector('.select-all-cb');
    const tagCbs = Array.from(section.querySelectorAll('.tag-cb'));

    allCb.onclick = () => {
      tagCbs.forEach(cb => {
        if (cb.closest('.tag-card').style.display !== 'none') {
          cb.checked = allCb.checked;
        }
      });
    };

    tagCbs.forEach(cb => {
      cb.onchange = () => {
        const visibleCbs = tagCbs.filter(c => c.closest('.tag-card').style.display !== 'none');
        const checkedVisible = visibleCbs.filter(c => c.checked);
        allCb.checked = (visibleCbs.length > 0 && visibleCbs.length === checkedVisible.length);
      };
    });
  });
}

/**
 * [3] 실시간 검색 기능
 */
document.getElementById('searchInput').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  document.querySelectorAll('.category-section').forEach(section => {
    let hasVisible = false;
    section.querySelectorAll('.tag-card').forEach(card => {
      const match = card.innerText.toLowerCase().includes(q) || card.title.toLowerCase().includes(q);
      card.style.display = match ? 'flex' : 'none';
      if (match) hasVisible = true;
    });
    
    section.style.display = hasVisible ? 'block' : 'none';
    
    const allCb = section.querySelector('.select-all-cb');
    const visibleCbs = Array.from(section.querySelectorAll('.tag-cb')).filter(c => c.closest('.tag-card').style.display !== 'none');
    allCb.checked = (visibleCbs.length > 0 && visibleCbs.filter(c => c.checked).length === visibleCbs.length);
  });
});

/**
 * [4] 키보드 입력 핸들러 (버그 수정 핵심)
 * 엔터키 전용으로 분리하여 다른 키 입력을 방해하지 않게 함
 */
document.getElementById('presetName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault(); 
    document.getElementById('savePresetBtn').click();
  }
});

/**
 * [5] 초기화 버튼 (폼 리셋)
 */
document.getElementById('resetBtn').onclick = () => {
  document.getElementById('presetName').value = "";
  document.getElementById('searchInput').value = "";
  document.querySelectorAll('.tag-cb, .select-all-cb').forEach(cb => cb.checked = false);
  document.getElementById('searchInput').dispatchEvent(new Event('input'));
};

/**
 * [6] 프리셋 저장 로직
 */
document.getElementById('savePresetBtn').onclick = async () => {
  const nameInput = document.getElementById('presetName');
  const name = nameInput.value.trim();
  const selected = Array.from(document.querySelectorAll('.tag-cb:checked')).map(cb => cb.value);

  if (!name || selected.length === 0) {
    return alert("프리셋 이름과 알고리즘을 선택해 주세요.");
  }

  if (presets[name] && !confirm(`'${name}' 프리셋을 이미 존재합니다. 덮어씌울까요?`)) {
    return;
  }

  presets[name] = selected;
  await chrome.storage.sync.set({ customPresets: presets });
  
  document.getElementById('resetBtn').click();
  renderPresetList();
};

/**
 * [7] 프리셋 목록 렌더링
 */
function renderPresetList() {
  const list = document.getElementById('presetList');
  const keys = Object.keys(presets);
  
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

  // 삭제 및 불러오기 이벤트 연결
  attachListEvents();
}

function attachListEvents() {
  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const target = e.currentTarget.dataset.name;
      if (confirm(`'${target}' 프리셋을 삭제하시겠습니까?`)) {
        delete presets[target];
        await chrome.storage.sync.set({ customPresets: presets });
        renderPresetList();
        document.getElementById('resetBtn').click();
      }
    };
  });

  document.querySelectorAll('.preset-load-trigger').forEach(chip => {
    chip.onclick = (e) => {
      const targetName = e.currentTarget.dataset.name;
      const targetTags = presets[targetName];

      document.getElementById('presetName').value = targetName;
      document.querySelectorAll('.tag-cb').forEach(cb => {
        cb.checked = targetTags.includes(cb.value);
      });

      document.querySelectorAll('.category-section').forEach(section => {
        const tagCbs = Array.from(section.querySelectorAll('.tag-cb'));
        section.querySelector('.select-all-cb').checked = (tagCbs.length > 0 && tagCbs.every(c => c.checked));
      });
    };
  });
}

init();