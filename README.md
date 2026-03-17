# 🎲 BOJ Random Picker

> **"오늘 어떤 문제를 풀지 고민하는 시간조차 아깝다."** \> 백준 랜덤 문제 추천 크롬 확장 프로그램입니다.

-----

## 🎯 Project Purpose (목적)

  * **결정 장애 해결**: 백준의 수만 가지 문제 중 오늘 풀 문제를 고르는 피로도를 최소화합니다.
  * **몰입형 환경**: 현재 탭에서 즉시 문제를 교체하여 가챠의 짜릿함과 몰입감을 유지합니다.
  * **정밀한 타겟팅**: 단순 랜덤이 아닌, 사용자가 설정한 티어 범위 내에서만 엄선된 문제를 제공합니다.

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

## 🔧 Installation (설치 방법)
1.  본 레포지토리를 클론하거나 압축 파일을 다운로드합니다.
2.  크롬 브라우저에서 `chrome://extensions/`에 접속합니다.
3.  우측 상단의 \*\*'개발자 모드'\*\*를 활성화합니다.
4.  **'압축해제된 확장 프로그램을 로드합니다'** 버튼을 클릭하고 프로젝트 폴더를 선택합니다.
5.  팝업에서 **⚙️ 버튼**을 눌러 티어를 설정하고 **VIBE CHECK**를 누르세요\!
-----

## 🆙 Version History (업데이트 기록)

### v1.0.0 (2026-03-17) - "The Birth of Gacha" 🎲
- **[Core]** Solved.ac API 연동 및 랜덤 문제 추출 엔진 구현
- **[Feature]** 티어 범위 설정 (Slider) 및 `chrome.storage` 연동
- **[Feature]** 현재 활성화된 탭에서 즉시 문제 이동 (`chrome.tabs.update`)
- **[UI/UX]** 다크 모드 테마 및 에메랄드 포인트 스타일링
- **[Refactor]** 확장성을 고려한 모듈형 폴더 구조 설계 (`js/`, `css/` 분리)