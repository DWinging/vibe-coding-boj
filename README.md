# 🎲 BOJ Random Picker

> **"오늘 어떤 문제를 풀지 고민하는 시간조차 아깝다."** \> 백준 랜덤 문제 추천 크롬 확장 프로그램입니다.

🔗 **[Chrome 웹 스토어에서 바로 설치하기](https://chromewebstore.google.com/detail/ijfpnmabjoobcklmokacphodhmechhdk?utm_source=item-share-cb)**

---

💡 About Development Process
본 프로젝트는 개발자가 전체 아키텍처와 핵심 비즈니스 로직을 직접 설계하고, 구현 효율을 극대화하기 위해 AI를 보조적인 코드 생성 도구로 활용한 프로젝트입니다. AI는 단순 구현 단계에서만 제한적으로 사용되었으며, 확장 프로그램의 구조 결정, 품질 방어 기준, 문제 해결 전략 등은 모두 주도적으로 정의하고 해결했습니다.

-----

## 🎯 Project Purpose (목적)

  * **결정 장애 해결**: 백준의 수만 가지 문제 중 오늘 풀 문제를 고르는 피로도를 최소화합니다.
  * **몰입형 환경**: 현재 탭에서 즉시 문제를 교체하여 가챠의 짜릿함과 몰입감을 유지합니다.
  * **정밀한 타겟팅**: 단순 랜덤이 아닌, 사용자가 설정한 티어 범위 내에서만 엄선된 문제를 제공합니다.
  * **학습 효율 향상**: 문제 선택에 소요되는 시간을 줄여 실제 문제 풀이에 집중할 수 있도록 합니다.

-----

## 🛠 Tech Stack & Environment (개발 환경 및 기술)

  * **Editor**: Visual Studio Code (VS Code)
  * **Language**: JavaScript (ES6+ Modules), HTML5, CSS3
  * **Platform**: Chrome Extension (Manifest V3)
  * **API**: [Solved.ac API v3](https://www.google.com/search?q=https://solved.ac/api/v3/help)

-----

## 📂 Project Structure (파일 구조)

확장성과 유지보수를 위해 기능을 모듈별로 분리한 아키텍처를 채택하고 있습니다.

```text
vibe-coding-boj/
├── manifest.json       # 확장 프로그램 설정 및 권한(Host Permissions)
├── popup.html          # 확장 프로그램 팝업 UI 구조
├── css/
│   └── popup.css       # 다크 모드 및 에메랄드 포인트 테마 스타일
├── js/
│   ├── popup.js        # UI 이벤트 제어 및 메인 컨트롤러
│   ├── api.js          # Solved.ac API 통신 및 쿼리 빌더
│   ├── storage.js      # 사용자 설정(chrome.storage) 관리
│   └── utils.js        # 티어 명칭 변환 등 유틸리티 함수
├── LOG.MD              # 개발 기록 및 트러블슈팅 로그
└── README.md           # 프로젝트 개요 및 가이드
```

-----

## 🚀 Key Features (주요 기능)

1.  **티어 범위 설정**: Bronze부터 Ruby까지 슬라이더를 통해 원하는 난이도 구간을 설정할 수 있습니다.
2.  **현재 탭 업데이트**: 새 창을 띄우지 않고 현재 활성화된 탭의 주소를 바로 변경하여 흐름을 끊지 않습니다.
3.  **설정 자동 저장**: `chrome.storage.sync`를 활용하여 브라우저 재시작이나 계정 동기화 시에도 설정값이 유지됩니다.
4.  **중복 방지**: 기본적으로 내가 이미 해결한 문제는 제외하고 추천합니다. (Solved.ac 로그인 시)
-----

## 🧪 QA & Testing Strategy (테스트 및 품질 검증)

본 프로젝트는 단순 기능 구현에 그치지 않고, **QA(Quality Assurance) 관점에서의 엄격한 시나리오 테스트**를 거쳐 프로덕트의 안정성을 확보했습니다. 발생 가능한 다양한 엣지 케이스(Edge Case)를 직접 검출하고 방어 로직을 구축했습니다.

* **API 예외 및 엣지 케이스 테스트 (Edge Case Testing)**
    * **결과값 고갈 (Empty Response):** 좁은 티어 구간과 비주류 태그 조합 시 API 결과가 '0건'일 때 발생하는 무한 로딩 및 빈 화면 이슈 식별 ➔ **Fallback (스마트 리트라이) 로직 검증 완료**
* **환경 및 통합 테스트 (Environment & Integration Testing)**
    * **클라우드 동기화 (Sync):** `chrome.storage.sync` 도입 시 데스크톱과 노트북 양방향에서 프리셋 데이터가 충돌 없이 갱신되는지 통합 테스트 수행
    * **권한 보안 (Security):** Manifest V3 환경에서 스토어 정책 위반 요소를 자체 검열하여 `activeTab` 등 불필요한 권한 제거 후 정상 동작 여부 회귀 테스트(Regression Test) 진행
* **경계값 및 UI/UX 테스트 (Boundary & Usability Testing)**
    * **슬라이더 경계값:** 브론즈 5(최솟값)와 루비 1(최댓값) 설정 시 값 역전 현상 및 쿼리 파라미터 매핑 오류가 없는지 경계값 분석(BVA) 적용
    * **상태 유지:** 팝업 창을 닫았다 열었을 때, 체크된 프리셋과 슬라이더 위치가 DOM에 정확히 리렌더링(Re-rendering) 되는지 상태 유지 테스트 완료

---

## 🔧 Installation (설치 방법)

### 방법 1. Chrome 웹 스토어 정식 설치 (권장)
1. [BOJ Random Picker 스토어 페이지](https://chromewebstore.google.com/detail/ijfpnmabjoobcklmokacphodhmechhdk?utm_source=item-share-cb)에 접속합니다.
2. **'Chrome에 추가'** 버튼을 클릭하여 설치합니다.
3. 우측 상단 퍼즐 모양(확장 프로그램) 아이콘을 눌러 📌(고정) 버튼을 활성화하면 더 편하게 사용할 수 있습니다.

### 방법 2. 로컬 개발자 모드 설치
1. 본 레포지토리를 클론하거나 압축 파일을 다운로드합니다.
2. 크롬 브라우저에서 `chrome://extensions/`에 접속합니다.
3. 우측 상단의 **'개발자 모드'**를 활성화합니다.
4. **'압축해제된 확장 프로그램을 로드합니다'** 버튼을 클릭하고 프로젝트 폴더를 선택합니다.

---

## 🆙 Version History (업데이트 기록)

### v2.1.12 (2026-03-23) - "Cloud Sync & Core Optimization" ☁️
- **[Feature]** 프리셋 및 사용자 설정 구글 계정 동기화 (`chrome.storage.sync` 도입): 집과 회사, 데스크톱과 노트북 어디서든 완벽한 세팅 연동
- **[Security]** 최소 권한 원칙(Least Privilege) 엄격 준수: 스토어 정책에 맞춰 불필요한 `activeTab` 권한 완전 제거 및 보안성 강화
- **[Refactor]** 레거시(Legacy) 코드 제거 및 아키텍처 다이어트: `api.js`를 순수 데이터 모델로 분리하여 유지보수성 및 성능 극대화
  
---
### v2.1.11 (2026-03-20) - "Quality Defense Update" 🛡️
- **[Quality]** 후보군 수집 범위 대폭 확장 (5페이지 ➔ 최대 20페이지, **2000개 스캐닝**)
- **[Quality]** 절대 방어 필터 적용: 수집된 2000개 문제 중 **제출 수 2000회 이상**의 우량주만 타협 없이 1차 추출
- **[Fallback]** 스마트 리트라이 로직 추가: 2000회 이상 문제가 고갈되었을 경우, 매칭 실패(빈 화면) 방지를 위해 기준을 자동 하향(제출 0회 이상)하여 즉시 재검색 보장
  
---

### v2.1.0 (2026-03-18) - "BOJ Random Picker" 🎲

## ✨ 주요 기능
- **티어 범위 설정**: 브론즈부터 루비까지 원하는 난이도 지정.
- **알고리즘 프리셋**: 자주 푸는 알고리즘 태그를 카테고리별로 관리 및 저장.
- **실시간 검색**: 수많은 알고리즘 태그 중 필요한 것만 빠르게 필터링.
- **🔥 지뢰 방지 필터 (Quality Control)**:
  - **제출 수 2000회 이상**의 검증된 문제만 엄선.
  - 사용자가 설정한 **최소 정답률** 조건 반영.
- **미해결 문제 우선**: 로그인 상태라면 내가 아직 풀지 않은 문제부터 매칭.

---

### v1.0.0 (2026-03-17) - "TBOJ Random Picker" 🎲
- **[Core]** Solved.ac API 연동 및 랜덤 문제 추출 엔진 구현
- **[Feature]** 티어 범위 설정 (Slider) 및 `chrome.storage` 연동
- **[Feature]** 현재 활성화된 탭에서 즉시 문제 이동 (`chrome.tabs.update`)
- **[UI/UX]** 다크 모드 테마 및 에메랄드 포인트 스타일링
- **[Refactor]** 확장성을 고려한 모듈형 폴더 구조 설계 (`js/`, `css/` 분리)

---