## 📅 날짜: 2026-03-17
## 🚀 프로젝트: Vibe Coding (BOJ Random Gacha Extension)
## 🛠️ 개발 단계: v1.0 Core 엔진 완성 및 모듈화 리팩토링

---

### ✅ 오늘 진행 상황 (What I Did)
* **Core 로직 구현**: `solved.ac` API를 연동하여 특정 티어 범위 내 문제를 무작위로 추출하는 엔진 개발.
* **사용자 경험(UX) 최적화**: 
    * 새 창이 아닌 **현재 탭**에서 URL이 즉시 변경되도록 `chrome.tabs.update` 적용.
    * 팝업 실행 시 이전 설정값(티어 범위)을 그대로 유지하도록 `chrome.storage.sync` 연동.
* **프로젝트 리팩토링 (관심사 분리)**:
    * `popup.js`에 몰려있던 코드를 `api.js`, `storage.js`, `utils.js`로 분리하여 유지보수성 향상.
    * 모듈형 시스템(`type="module"`) 도입.
* **UI/UX 스타일링**: 
    * 다크 모드 기반의 에메랄드 포인트 테마 적용.
    * 슬라이더(range input) 커스텀 및 반응형 텍스트 업데이트 구현.

---

### 🚨 트러블슈팅 (Troubleshooting)

#### 1. Manifest 파일 로드 실패 (Manifest Load Error)
- **문제**: 확장 프로그램 등록 시 "manifest를 로드할 수 없습니다" 에러 발생.
- **원인**: `manifest.json`에 선언된 아이콘이나 HTML 파일이 실제 경로에 존재하지 않아 발생.
- **해결**: 미구현된 파일 선언을 제거하고 파일명을 소문자로 통일하여 경로 일치시킴.

#### 2. API 호출 차단 (Failed to fetch)
- **문제**: 팝업에서 외부 API(`solved.ac`) 요청 시 브라우저가 보안상 이유로 차단.
- **원인**: Manifest V3의 강화된 보안 정책으로, 외부 도메인 통신을 위해서는 명시적인 권한 승인이 필요함.
- **해결**: `manifest.json` 내 `host_permissions` 항목에 `*://*.solved.ac/*`를 추가하여 해결.

#### 3. API 요청 403 Forbidden / 400 Bad Request
- **문제**: 특정 쿼리(`-solved_by:me`) 사용 시 결과가 오지 않거나 에러 발생.
- **원인**: `me` 키워드는 Solved.ac 로그인 세션이 있어야만 동작함.
- **해결**: 개발 단계에서는 해당 쿼리를 제외하고 테스트 진행. 추후 배포 버전에서는 사용자에게 로그인 유도 혹은 사용자 ID 기반 쿼리(`-solved_by:{handle}`)로 대체하기로 결정.

#### 4. Git Push 충돌 (Non-fast-forward)
- **문제**: 원격 저장소의 `README.md`와 로컬의 커밋 히스토리가 달라 푸시 거부.
- **해결**: `--allow-unrelated-histories` 옵션으로 병합하거나, 초기 세팅이므로 `--force` 푸시를 사용하여 동기화.

---