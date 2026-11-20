# BOJ Random Picker 개인정보 처리 안내

최종 수정: 2026-11-20 · v3.0.0 구현 기준

## 목적과 전송 경로
본 확장 프로그램의 단일 목적은 사용자가 지정한 난이도와 알고리즘 조건으로 한국어 백준 문제를 무작위 추천하고 해당 문제 페이지를 여는 것입니다.
검색 조건은 배포된 Cloudflare Worker를 거쳐 solved.ac로 전송됩니다. 팝업의 ‘개인정보 안내’를 펼치면 검색 조건의 전송 안내와 이 방침 링크를 확인할 수 있습니다.
계정을 연결한 경우 Worker가 solved.ac /me에서 ID를 확인하고 안 푼 문제 검색 조건에 사용합니다.
API 중계 서버는 https://boj-random-picker-api.choi-dongwook20.workers.dev 입니다.
데이터 처리는 확장 프로그램, Cloudflare(서버 호스팅), solved.ac(계정 인증·문제 검색), Google Chrome(설정 동기화) 사이에서 기능 제공에 필요한 범위로 이루어집니다.
문제를 열 때 백준 웹사이트에 접속하며, 해당 사이트의 통신 정보 처리는 그 사이트의 방침을 따릅니다.

## 계정 연결
‘계정 연결’을 누르면 나타나는 안내창에서 연결 목적, 인증정보·ID의 Cloudflare Worker 경유 처리와 이 방침을 안내하며, 사용자가 ‘동의하고 연결’을 누른 뒤 인증을 시작합니다. 안내창에서 취소하면 인증 절차를 시작하지 않습니다. 연결하지 않아도 문제를 추천받을 수 있습니다.
최초 연결 시 solved.ac OAuth 화면에서 profile 및 offline.access 권한에 동의합니다.
비밀번호는 확장 프로그램에서 입력받지 않으며 로그인 쿠키를 읽지 않습니다.
배포용 앱 비밀키는 Cloudflare Secret에 보관하며 확장 프로그램에 포함하지 않습니다.

## 저장과 보관
- 티어 범위·프리셋 이름·선택한 알고리즘·마지막 프리셋 선택: chrome.storage.sync를 통해 사용자 Chrome 계정으로 동기화합니다. 검색 시 Worker에 전송하는 설정은 티어 범위와 알고리즘 태그이며, 프리셋 이름은 전송하지 않습니다.
- 액세스·갱신 토큰과 만료 시간: chrome.storage.session의 메모리에 보관하며 디스크에 지속 저장하거나 동기화하지 않습니다. 접근은 확장의 신뢰된 컨텍스트로 제한합니다. 서비스 워커 재시작 중에는 유지되지만 브라우저 재시작, 확장 사용 중지·다시 로드·업데이트 시 삭제되어 다시 연결해야 합니다. 이전 버전의 chrome.storage.local 토큰이 있으면 최초 실행 시 현재 세션으로 한 번 옮기고 로컬 사본을 삭제합니다. 세션 저장이 실패해도 로컬 사본은 삭제합니다.
- 요청 대기 시간: 팝업을 다시 열어도 호출 제한을 준수하도록 로컬에 보관합니다.
- 계정 ID: 팝업 표시와 검색 조건 생성에 사용하며, 확장 프로그램에서는 실행 중 메모리로 처리합니다.
- Worker의 Durable Object: 앱 전체의 남은 호출 예산, 계산 기준 시각, 제한 종료 시각만 하나의 공유 레코드에 보관합니다. 개인별 기록은 없으며 토큰·ID·문제 목록은 영구 저장하지 않습니다. 공유 레코드는 요청 때 덮어쓰며 자동 삭제 기한은 없습니다. 운영자가 저장소를 삭제하면 제거됩니다.

토큰 교환·갱신·폐기 및 연결된 계정 확인을 위해 인증 코드·토큰이 Worker와 solved.ac로 전송됩니다.
이 통신은 HTTPS를 사용하며 인증 코드·갱신 또는 폐기할 토큰은 요청 본문으로, 계정 확인용 액세스 토큰은 Authorization 헤더로 전달합니다. 계정 ID는 solved.ac에서 Worker를 거쳐 팝업에 전달되며, 연결 상태의 추천 시 Worker가 solved.ac 검색 요청 URL의 안 푼 문제 조건(-@ID)에 포함합니다. 검색 요청에는 사용자 액세스 토큰을 포함하지 않습니다.
Worker는 요청 본문·ID·토큰을 애플리케이션 로그에 기록하지 않습니다.
배포 설정은 Workers Logs, 호출 로그와 Traces를 비활성화하도록 지정합니다. 이는 Cloudflare 자체의 보안·운영 기록까지 없다는 뜻은 아닙니다. Cloudflare와 solved.ac는 서비스 제공 과정에서 IP 등 통신 정보를 처리할 수 있으며 보관 기간과 처리는 각 서비스의 개인정보 처리방침이 적용됩니다.
설정은 사용자가 변경하거나 해당 저장소를 삭제할 때까지 보관합니다. 토큰 만료를 주기적으로 감시하지는 않습니다. 다음 계정 확인(팝업 열기 포함) 또는 추천 요청 때 만료되었거나 만료까지 60초 이하인 액세스 토큰을 처리합니다. 갱신 토큰이 없으면 세션 토큰을 삭제합니다. 호출 제한 대기 중에는 기존 토큰을 유지하고 갱신 요청을 보내지 않습니다.
갱신 요청 직전에 기존 세션 토큰을 삭제하고, 성공하면 새 액세스·갱신 토큰과 만료 시간을 저장합니다. 갱신 실패(통신 실패·호출 제한 응답 포함) 시 이미 삭제한 토큰은 복원하지 않고 재연결을 안내합니다. 한 번 사용한 갱신 토큰을 불확실한 결과로 재사용하지 않기 위한 처리입니다. 계정 확인·추천에서 인증 만료 또는 무효 응답을 받으면 세션 토큰을 삭제합니다. 갱신 요청이 없으면 만료된 토큰도 세션이 종료되거나 연결을 해제할 때까지 메모리에 남을 수 있습니다.
이 확장 프로그램에는 광고·분석 SDK가 없으며, 방문 기록·다른 탭의 내용·결제 정보를 수집하는 기능이 없습니다.

## 데이터 사용 제한 (Limited Use)
BOJ Random Picker의 사용자 데이터 사용은 Chrome 웹 스토어 사용자 데이터 정책과 Limited Use 요구사항을 준수합니다.
사용자 데이터는 위에서 설명한 문제 추천과 계정 연결 기능을 제공하는 데만 사용합니다.
사용자 데이터를 판매하거나 광고·신용 평가에 사용하지 않으며, 기능 제공에 필요한 위 서비스 외에 임의의 제3자에게 제공하지 않습니다.
운영자는 사용자 데이터를 상시 열람하지 않습니다. 사용자의 명시적 동의를 받은 지원, 보안 문제 대응 또는 법률상 의무가 필요한 경우에만 해당 목적에 필요한 범위로 처리합니다.

## 연결 해제
확장의 연결 해제 버튼은 solved.ac 토큰 폐기 요청에 성공 응답을 받으면 기기 내 토큰을 삭제합니다.
실패하면 재시도를 위해 세션 토큰을 유지하고 오류를 표시합니다. 자동 재시도는 하지 않으며 사용자가 연결 해제를 다시 눌러 재시도합니다. 토큰을 갱신하지 않고 보관 중인 갱신 토큰(없으면 액세스 토큰)을 폐기 요청에 사용합니다.
solved.ac의 연결된 앱 설정에서도 권한을 철회할 수 있습니다.
브라우저 세션 종료나 확장 삭제로 기기 내 토큰이 제거되어도 solved.ac의 서버 권한이 자동 철회되는 것은 아니며, 서버 권한 철회는 별도로 수행해야 합니다. 설정을 삭제하려면 프리셋을 삭제하거나 Chrome의 해당 확장 저장소·동기화 데이터 관리 기능을 이용할 수 있습니다.

## 권한과 문의
storage는 설정 동기화·세션 토큰·로컬 대기 상태 저장, identity는 OAuth 인증 창과 반환 처리에 사용합니다.
배포된 Worker 호스트 권한으로 서버에 요청합니다.
문의: https://github.com/DWinging/vibe-coding-boj/issues
처리 내역·저장·삭제 방법에 대한 문의도 위 경로로 받습니다. Worker에는 개인별 데이터베이스가 없으며, 기기의 데이터 삭제와 solved.ac 권한 철회는 위 절차로 수행합니다.
공개 Issue에는 비밀번호·인증 코드·액세스 토큰·갱신 토큰을 작성하지 마세요.

# Privacy notice (English)

This extension sends search filters through its Cloudflare Worker to solved.ac.
Expand “Privacy information” in the popup to view the search-filter transmission notice and a link to this policy.
Its single purpose is to recommend Korean-language BOJ problems matching the user's difficulty and algorithm choices and open the selected problem.
The relay endpoint is https://boj-random-picker-api.choi-dongwook20.workers.dev.
After OAuth consent (profile and offline.access), the Worker reads your handle through /me to exclude solved problems.
Clicking “Connect account” opens a dialog explaining the purpose, processing of credentials and your handle through Cloudflare Worker, and linking to this policy. Authentication begins only after you click “Agree and connect.” Cancelling the dialog does not start authentication. Recommendations also work without connecting an account.
The extension does not read passwords or website cookies.

Difficulty ranges, preset names and tags, and the last selected preset sync through Chrome storage.sync. Searches send difficulty and tag filters to the Worker, not preset names.
Access and rotating refresh tokens and their expiry remain in memory in chrome.storage.session, restricted to trusted extension contexts, without persistent disk storage or synchronization. They survive extension service worker restarts, but are cleared when the browser restarts or the extension is disabled, reloaded or updated; reconnection is then required. On first execution, any legacy chrome.storage.local credentials are moved once into the current session and the local copy is removed. The local copy is removed even if session storage fails.
Authorization codes and tokens pass through the Worker for exchange, refresh, revocation and account lookup. The production app client secret is stored as a Cloudflare Secret and is not included in the extension.
These transfers use HTTPS. Authorization codes and tokens for refresh or revocation travel in request bodies; access tokens for account lookup travel in the Authorization header. Your handle returns from solved.ac through the Worker to the popup. For connected recommendations, the Worker includes the handle in the outgoing solved.ac search URL as the unsolved-problem condition (-@ID), without including your access token in that search request.
The Worker does not persist handles, tokens or problem datasets, and does not log these values.
Its Durable Object stores one shared record containing the remaining quota, calculation timestamp and cooldown expiry. It contains no per-user records, is overwritten on requests, and has no automatic deletion deadline; the operator can delete the storage.
Deployment configuration disables Workers Logs, invocation logs and Traces. This does not mean Cloudflare has no security or operational records. Cloudflare and solved.ac may process network metadata, including IP addresses, under their own policies and retention periods.
Google Chrome processes preference synchronization, and opening a recommendation connects to the BOJ website under its own policy.
Preferences remain until changed or their storage is cleared. Token expiry is not monitored by a timer. The next account check (including opening the popup) or recommendation processes access tokens that have expired or have 60 seconds or less remaining. Tokens without a refresh token are removed. A local request cooldown preserves existing tokens and prevents a refresh request.
Immediately before a refresh request, existing session credentials are removed. Success stores the new access/refresh tokens and expiry. Failure, including a network error or a rate-limit response, does not restore removed credentials and requires reconnection, avoiding reuse of a rotating token after an uncertain outcome. Authentication-expired or invalid responses during account checks or recommendations also remove session credentials. Without another request, expired credentials may remain in memory until the session ends or you disconnect.
The handle is processed in memory for account display and filtering. The extension includes no advertising or analytics SDK and does not collect browsing history, other tabs' contents, or payment information.

BOJ Random Picker's use of user data complies with the Chrome Web Store User Data Policy, including the Limited Use requirements.
Data is used only to provide the disclosed account and recommendation features, not sold or used for advertising or credit decisions.
Transfers are limited to the services needed to provide those features. The operator does not routinely inspect user data; access is limited to explicitly authorized support, necessary security response or legal obligations.

Disconnect sends a token revocation request to solved.ac and deletes session credentials only after a successful response; failures preserve them and show an error. There is no automatic retry: click Disconnect again to retry. Revocation uses the stored refresh token, or the access token if none exists, without refreshing it first.
You can also revoke access in solved.ac settings. Ending a browser session or uninstalling clears device credentials but does not itself revoke server access. Delete presets or use Chrome's extension storage and synchronized-data controls to remove preferences.
The storage permission supports preference synchronization, session credentials and local cooldown state; identity opens and completes OAuth authentication. The Worker host permission permits requests to the relay.
Support: https://github.com/DWinging/vibe-coding-boj/issues
You can use this contact for questions about processing, retention and deletion. The Worker has no per-user database; device data and solved.ac authorization can be removed using the procedures above.
Do not include passwords, authorization codes or access/refresh tokens in public issues.
