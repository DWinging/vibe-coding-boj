# 🎲 BOJ Random Picker

> **"오늘 어떤 문제를 풀지 고민하는 시간조차 아깝다."** \> 백준 랜덤 문제 추천 크롬 확장 프로그램입니다.

🔗 **[Chrome 웹 스토어에서 바로 설치하기](https://chromewebstore.google.com/detail/ijfpnmabjoobcklmokacphodhmechhdk?utm_source=item-share-cb)**

---

💡 About Development Process
본 프로젝트는 개발자가 전체 아키텍처와 핵심 비즈니스 로직을 직접 설계하고, 구현 효율을 극대화하기 위해 AI를 보조적인 코드 생성 도구로 활용한 프로젝트입니다. AI는 단순 구현 단계에서만 제한적으로 사용되었으며, 확장 프로그램의 구조 결정, 품질 방어 기준, 문제 해결 전략 등은 모두 주도적으로 정의하고 해결했습니다.

-----

## 🎯 Project Purpose (목적)

  * **결정 장애 해결**: 백준의 수만 가지 문제 중 오늘 풀 문제를 고르는 피로도를 최소화합니다.
  * **문제 바로 열기**: 추천한 백준 문제를 새 탭에서 열어 바로 풀이를 시작할 수 있습니다.
  * **정밀한 타겟팅**: 단순 랜덤이 아닌, 사용자가 설정한 티어 범위 내에서만 엄선된 문제를 제공합니다.
  * **학습 효율 향상**: 문제 선택에 소요되는 시간을 줄여 실제 문제 풀이에 집중할 수 있도록 합니다.

-----

## 🛠 Tech Stack & Environment (개발 환경 및 기술)

  * **Editor**: Visual Studio Code (VS Code)
  * **Language**: JavaScript (ES6+ Modules), HTML5, CSS3
  * **Platform**: Chrome Extension (Manifest V3)
  * **API**: [solved.ac API v4 공식 문서](https://backstage.solved.ac/developer/docs)

-----

## 📂 Project Structure (파일 구조)

확장성과 유지보수를 위해 기능을 모듈별로 분리한 아키텍처를 채택하고 있습니다.

```text
vibe-coding-boj/
├── PRIVACY.md                  # 한국어·영어 개인정보처리방침
├── boj_random_picker/
│   ├── manifest.json           # 확장 프로그램 설정 및 권한
│   ├── popup.html              # 추천 팝업과 계정 연결 안내창
│   ├── options.html            # 알고리즘 프리셋 편집
│   ├── css/                    # 팝업·설정 화면 스타일
│   ├── js/                     # UI, OAuth, 설정 및 검색 조건 처리
│   ├── worker/                 # Cloudflare API 중계 및 호출 제한
│   ├── tests/                  # 자동 회귀 테스트
│   ├── scripts/                # Worker 주소 설정 및 패키징
│   ├── docs/LOG.md             # 개발 기록
│   └── README.md               # 설정·배포·스토어 제출 안내
├── alarm_bot/                  # 별도 자동 알림 봇
└── README.md
```

-----

## 🚀 Key Features (주요 기능)

1.  **티어 범위 설정**: Bronze부터 Ruby까지 슬라이더를 통해 원하는 난이도 구간을 설정할 수 있습니다.
2.  **백준 문제 바로 열기**: 추천 결과의 백준 문제 번호를 확인해 해당 문제 페이지를 새 탭에서 엽니다.
3.  **설정 자동 저장**: `chrome.storage.sync`를 활용하여 브라우저 재시작이나 계정 동기화 시에도 설정값이 유지됩니다.
4.  **미해결 문제 추천**: 확장에서 solved.ac 계정을 연결하면 이미 해결한 문제를 제외합니다. 계정을 연결하지 않아도 추천할 수 있습니다. 브라우저 재시작 후에는 다시 연결해야 합니다.
5.  **한국어·알고리즘 필터**: 한국어 문제만 추천하며, 최대 5개 알고리즘 태그를 프리셋으로 저장해 선택할 수 있습니다. 미해결 문제도 추천 간 중복될 수 있습니다.
  
-----

## 🧪 QA & Testing Strategy (테스트 및 품질 검증)

v3.0.0은 `boj_random_picker` 폴더에서 `npm test`로 자동 회귀 테스트를 실행합니다. 2026-11-20 기준 **29개 테스트가 통과**했습니다.

* **API·검색**: 한국어·티어·태그·미해결 조건, 401/404/429, 백준 연결 정보가 없는 결과의 제한된 재검색과 문제 링크 검증.
* **인증·보안**: OAuth PKCE, 순차 토큰 갱신, 연결 해제 재시도, 동의 전 인증 차단, 세션 저장과 이전 로컬 토큰 삭제, 비신뢰 메시지 거절, 캐시 및 오류 응답 검증.
* **UI·설정**: 난이도 경계값, 프리셋 저장·복원, 최대 5개 태그 제한, 연결 안내창 취소·동의 및 처리·오류 상태 검증.

자동 테스트는 모의 환경을 사용합니다. 실제 Chrome OAuth·브라우저 재시작·기기 간 Sync와 Cloudflare 운영 설정은 별도 확인이 필요합니다. [배포 및 제출 전 확인 항목](boj_random_picker/README.md#chrome-웹-스토어-제출-전-확인)을 참고하세요.

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
4. Chrome 116 이상에서 **'압축해제된 확장 프로그램을 로드합니다'** 버튼을 클릭하고 `boj_random_picker` 폴더를 선택합니다.
5. 계정 연결에는 등록된 확장 ID와 Worker 설정이 필요합니다. [개발·배포 안내](boj_random_picker/README.md)를 확인하세요.

개인정보 처리·보관·삭제 방법: [개인정보처리방침](PRIVACY.md).

---

## 🆙 Version History (업데이트 기록)

### v3.0.0 (2026-11-20) - 공식 API 전환 및 UI 개선

- **[API]** solved.ac 공식 v4 API 전환 및 Cloudflare Worker를 통한 요청 중계. 클라이언트 ID와 비밀키는 확장 프로그램에 포함하지 않고 서버 설정으로 관리.
- **[Account]** 로그인 쿠키 접근을 제거하고 OAuth PKCE 계정 연결 도입. 연결 후 사용자 ID 자동 인식, 토큰 갱신 및 연결 해제 지원. 토큰은 신뢰된 확장 컨텍스트의 `chrome.storage.session` 메모리에 보관하며, 브라우저 재시작 후 재연결 필요.
- **[Recommendation]** 한국어 문제만 추천하며, 계정 연결 시 이미 푼 문제 제외. 백준 연결 정보가 없는 결과는 같은 조건으로 최대 3회 검색 후 안내.
- **[Filter]** 난이도 범위 및 최대 5개 알고리즘 태그 프리셋 지원. 5개 선택 시 나머지 선택지를 잠그고, 카테고리별 전체 선택 제거.
- **[UI]** 첫 화면에서 난이도와 프리셋을 바로 선택하고 변경 사항 자동 저장. 설정 버튼으로 프리셋 편집 페이지 열기, 추천 결과를 백준 문제 페이지의 새 탭으로 연결.
- **[Privacy]** 계정 연결 안내창에서 Cloudflare 경유 처리와 개인정보처리방침을 안내하고 동의 후 인증 시작. 일반 검색 전송 안내는 접기·펼치기로 제공.
- **[Stability]** API의 429 응답과 Retry-After에 따른 대기, 서버 호출 예산 관리 및 재검색 횟수 제한 적용.
- **[Cleanup]** 기존 문제 목록 대량 수집·캐시와 추정 정답률·제출 수 필터 제거. 개인정보 처리 안내를 OAuth 및 서버 중계 방식에 맞춰 갱신.

---

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

### v1.0.0 (2026-03-17) - "BOJ Random Picker" 🎲
- **[Core]** Solved.ac API 연동 및 랜덤 문제 추출 엔진 구현
- **[Feature]** 티어 범위 설정 (Slider) 및 `chrome.storage` 연동
- **[Feature]** 현재 활성화된 탭에서 즉시 문제 이동 (`chrome.tabs.update`)
- **[UI/UX]** 다크 모드 테마 및 에메랄드 포인트 스타일링
- **[Refactor]** 확장성을 고려한 모듈형 폴더 구조 설계 (`js/`, `css/` 분리)

---


# 🤖 [Part 2] Daily Automated Alarm Bot (Mattermost)

> **"매일 아침 9시, 엄선된 알고리즘 문제가 배달됩니다."**
> 확장 프로그램의 철학을 확장하여, 팀원들과 함께 풀 알고리즘 문제를 비공개 메신저(Mattermost)로 자동 전송하는 무인 운영 시스템입니다.

## ⚙️ Bot Architecture & Tech Stack
- **Environment**: Node.js v20, GitHub Actions (Ubuntu-latest)
- **Integration**: Mattermost Incoming Webhook
- **Data Pipeline**: 
  - Solved.ac API를 통해 정답자 수 기준(실버 3000명, 골드 2000명, 플레 500명 이상)의 고품질 문제만 사전 추출
  - 추출된 데이터를 로컬에서 셔플하여 정적 JSON DB(실버, 골드 400문제, 플레 371문제) 구축

## ✨ Bot Key Features
* **완벽한 중복 방지 (Zero-Duplication)**: 서버단 API 호출 시 발생하는 랜덤 중복을 원천 차단하기 위해, 400일치의 검증된 문제를 미리 확보하여 순차 배포합니다.
* **서버리스 무인 자동화 (Serverless Automation)**: GitHub Actions의 `cron` 스케줄러를 활용하여 별도의 서버 유지보수 비용 없이 매일 지정된 시간에 동작합니다.
  
---
