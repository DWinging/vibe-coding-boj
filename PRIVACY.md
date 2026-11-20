# BOJ Random Picker 개인정보 처리 안내

최종 수정: 2026-11-20 · v3 구현 기준

## 목적과 전송 경로
본 확장 프로그램의 단일 목적은 사용자가 지정한 난이도와 알고리즘 조건으로 한국어 백준 문제를 무작위 추천하고 해당 문제 페이지를 여는 것입니다.
티어·태그 조건으로 문제를 추천합니다. 검색 조건은 배포된 Cloudflare Worker를 거쳐 solved.ac로 전송됩니다.
계정을 연결한 경우 Worker가 solved.ac /me에서 ID를 확인하고 안 푼 문제 검색 조건에 사용합니다.
API 중계 서버는 https://boj-random-picker-api.choi-dongwook20.workers.dev 입니다.
데이터 처리는 확장 프로그램, Cloudflare(서버 호스팅), solved.ac(계정 인증·문제 검색), Google Chrome(설정 동기화) 사이에서 기능 제공에 필요한 범위로 이루어집니다.
문제를 열 때 백준 웹사이트에 접속하며, 해당 사이트의 통신 정보 처리는 그 사이트의 방침을 따릅니다.

## 계정 연결
최초 연결 시 solved.ac OAuth 화면에서 profile 및 offline.access 권한에 동의합니다.
비밀번호는 확장 프로그램에서 입력받지 않으며 로그인 쿠키를 읽지 않습니다.
앱 비밀키는 Cloudflare Secret에 보관하며 확장 프로그램에 포함하지 않습니다.

## 저장과 보관
- 티어 범위·프리셋 이름·선택한 알고리즘·마지막 프리셋 선택: chrome.storage.sync를 통해 사용자 Chrome 계정으로 동기화합니다. 검색 시 Worker에 전송하는 설정은 티어 범위와 알고리즘 태그이며, 프리셋 이름은 전송하지 않습니다.
- 액세스·갱신 토큰과 만료 시간: 기기의 chrome.storage.local에 보관하며 동기화하지 않습니다. 접근은 확장의 신뢰된 컨텍스트로 제한합니다.
- 요청 대기 시간: 팝업을 다시 열어도 호출 제한을 준수하도록 로컬에 보관합니다.
- 계정 ID: 팝업 표시와 검색 조건 생성에 사용하며, 확장 프로그램에서는 실행 중 메모리로 처리합니다.
- Worker의 Durable Object: 앱 전체 호출 예산과 대기 시각만 보관합니다. 토큰·ID·문제 목록은 영구 저장하지 않습니다.

토큰 교환·갱신·폐기 및 연결된 계정 확인을 위해 인증 코드·토큰이 Worker와 solved.ac로 전송됩니다.
Worker는 요청 본문·ID·토큰을 애플리케이션 로그에 기록하지 않습니다.
Cloudflare와 solved.ac는 서비스 제공 과정에서 IP 등 통신 정보를 처리할 수 있으며 각 서비스의 개인정보 처리방침이 적용됩니다.
설정은 사용자가 변경하거나 저장소를 삭제할 때까지 보관합니다. 로컬 액세스 토큰은 만료 시 갱신하거나 삭제하며, 갱신 토큰은 연결 유지에 사용하다 회전 시 새 값으로 대체합니다.
이 확장 프로그램에는 광고·분석 SDK가 없으며, 방문 기록·다른 탭의 내용·결제 정보를 수집하는 기능이 없습니다.

## 데이터 사용 제한 (Limited Use)
BOJ Random Picker의 사용자 데이터 사용은 Chrome 웹 스토어 사용자 데이터 정책과 Limited Use 요구사항을 준수합니다.
사용자 데이터는 위에서 설명한 문제 추천과 계정 연결 기능을 제공하는 데만 사용합니다.
사용자 데이터를 판매하거나 광고·신용 평가에 사용하지 않으며, 기능 제공에 필요한 위 서비스 외에 임의의 제3자에게 제공하지 않습니다.
운영자는 사용자 데이터를 상시 열람하지 않습니다. 사용자의 명시적 동의를 받은 지원, 보안 문제 대응 또는 법률상 의무가 필요한 경우에만 해당 목적에 필요한 범위로 처리합니다.

## 연결 해제
확장의 연결 해제 버튼은 solved.ac 토큰 폐기가 성공하면 기기 내 토큰을 삭제합니다.
실패하면 재시도를 위해 토큰을 유지하고 오류를 표시합니다.
solved.ac의 연결된 앱 설정에서도 권한을 철회할 수 있습니다.
확장 삭제로 로컬 데이터는 제거되지만, 서버 권한 철회는 별도로 수행해야 합니다.

## 권한과 문의
storage는 설정·토큰·대기 상태 저장, identity는 OAuth 인증 창과 반환 처리에 사용합니다.
배포된 Worker 호스트 권한으로 서버에 요청합니다.
문의: https://github.com/DWinging/vibe-coding-boj/issues
공개 Issue에는 비밀번호·인증 코드·액세스 토큰·갱신 토큰을 작성하지 마세요.

# Privacy notice (English)

This extension sends search filters through its Cloudflare Worker to solved.ac.
Its single purpose is to recommend Korean-language BOJ problems matching the user's difficulty and algorithm choices and open the selected problem.
The relay endpoint is https://boj-random-picker-api.choi-dongwook20.workers.dev.
After OAuth consent (profile and offline.access), the Worker reads your handle through /me to exclude solved problems.
The extension does not read passwords or website cookies.

Difficulty ranges, preset names and tags, and the last selected preset sync through Chrome storage.sync. Searches send difficulty and tag filters to the Worker, not preset names.
Access and rotating refresh tokens remain in trusted extension storage.local on each device, not in sync.
Authorization codes and tokens pass through the Worker for exchange, refresh, revocation and account lookup. The app client secret is stored only as a Cloudflare Secret.
The Worker does not persist handles, tokens or problem datasets, and does not log these values.
Its Durable Object stores only shared quota and cooldown state. Cloudflare and solved.ac may process network metadata under their own policies.
Google Chrome processes preference synchronization, and opening a recommendation connects to the BOJ website under its own policy.
Preferences remain until changed or cleared. Expired access tokens are refreshed or removed; rotating refresh tokens replace prior local values.
The handle is processed in memory for account display and filtering. The extension includes no advertising or analytics SDK and does not collect browsing history, other tabs' contents, or payment information.

BOJ Random Picker's use of user data complies with the Chrome Web Store User Data Policy, including the Limited Use requirements.
Data is used only to provide the disclosed account and recommendation features, not sold or used for advertising or credit decisions.
Transfers are limited to the services needed to provide those features. The operator does not routinely inspect user data; access is limited to explicitly authorized support, necessary security response or legal obligations.

Disconnect revokes the server tokens before deleting local credentials; failures preserve them for retry.
You can also revoke access in solved.ac settings. Uninstalling clears local data but does not itself revoke server access.
Support: https://github.com/DWinging/vibe-coding-boj/issues
Do not include passwords, authorization codes or access/refresh tokens in public issues.
