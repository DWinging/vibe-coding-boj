# BOJ Random Picker v3.0.0

solved.ac 공식 v4 API로 티어·알고리즘 조건에 맞는 문제 하나를 추천합니다.
추천한 문제는 https://www.acmicpc.net/problem/문제번호 주소에서 열립니다.
judgeIds의 백준(boj) 문제 번호로만 연결합니다. 백준 연결 정보가 없으면 같은 조건으로 최대 3회(첫 검색 포함)까지 검색합니다.
백준 연결 정보가 끝내 나오지 않으면 안내하며, solved.ac 번호를 백준 번호로 대신 사용하지 않습니다.
계정을 연결하면 /me에서 ID를 읽어 안 푼 문제 검색 조건을 추가합니다.
로그인하지 않은 사용자는 전체 문제에서 추천받습니다.
모든 추천 검색에 한국어 언어 조건(%ko)을 적용합니다. 결과가 없더라도 언어 조건을 해제하지 않습니다.

## 변경 사항

- OAuth PKCE 연결 후 현재 브라우저 세션에서 ID 자동 인식. profile 및 offline.access 권한 사용. 브라우저 재시작이나 확장 다시 로드·업데이트 후에는 다시 연결합니다.
- 계정 연결 시 안내창에서 목적·Cloudflare 경유 처리·개인정보처리방침을 확인하고 ‘동의하고 연결’을 누르면 인증을 시작합니다. 검색 전송 안내는 팝업의 ‘개인정보 안내’에서 펼쳐 볼 수 있습니다.
- 쿠키 접근, 20페이지 수집, 문제 목록 캐시, 추정 정답률·제출 수 필터 제거.
- v4는 averageTries를 반환하지 않습니다. 기존 1/averageTries는 실제 제출 정답률이 아니므로 UI를 제거했습니다.
- 태그 OR 조건 유지. 알고리즘은 로그인 여부와 관계없이 최대 5개까지 선택합니다. 5개 선택 시 미선택 항목을 잠그고, 하나를 해제하면 다시 선택할 수 있습니다. 100자 제한을 넘으면 조건을 임의로 버리지 않고 안내합니다.
- random-problem은 중복 추천될 수 있습니다. 중복을 피하려고 추가 호출하지 않습니다. 백준 연결 정보가 없는 결과에만 최대 2회 추가 검색하며 매번 호출 예산을 확인합니다.
- 429 Retry-After를 로컬에 저장해 팝업을 다시 열어도 대기합니다. 1027은 다음 UTC 자정까지 차단합니다.
- 연결 해제는 서버의 토큰 폐기 성공 응답 후 세션 토큰을 삭제합니다. 실패하면 세션 토큰을 유지하며, 연결 해제를 다시 눌러 재시도합니다.
- 갱신 토큰은 순차 처리하며, 응답 유실 시 같은 토큰을 재사용하지 않고 재연결합니다.

## 배포 준비

비밀키를 Git이나 확장 프로그램에 넣지 마세요.
Windows PowerShell에서는 아래 npm·npx 명령을 npm.cmd·npx.cmd로 실행할 수 있습니다.

1. solved.ac 개발자 콘솔에서 앱을 등록합니다.
2. Chrome 확장 프로그램 ID를 확인합니다. 웹 스토어 ID와 압축해제 개발 버전 ID는 다를 수 있습니다.
3. 반환 주소 https://EXTENSION_ID.chromiumapp.org/oauth 를 정확히 등록합니다.
4. worker/wrangler.jsonc의 EXTENSION_IDS에 허용할 확장 ID를 쉼표로 구분해 설정합니다.
   개발 버전과 스토어 버전 ID가 다르면 두 ID를 추가하고, solved.ac 앱에도 각 반환 주소를 등록합니다.
   로컬 개발에서는 worker/.dev.vars.example을 .dev.vars로 복사하고 CLIENT_ID와 CLIENT_SECRET을 입력합니다.
   .dev.vars와 그 환경별 변형 파일은 Git에서 제외됩니다. 실제 값을 예제 파일에 적지 마세요.
5. Cloudflare Workers Free 계정에서 Wrangler로 로그인하고 worker 디렉터리에서
   npx wrangler secret put CLIENT_ID 및 npx wrangler secret put CLIENT_SECRET을 각각 실행해 값을 등록합니다.
   .dev.vars는 로컬 개발용이며 배포 서버에 자동으로 등록되지 않습니다.
6. npx wrangler deploy 로 배포합니다. SQLite Durable Object에는 전역 예산과 대기 시간만 저장합니다.
7. 확장 프로그램 디렉터리에서 node scripts/configure.mjs https://WORKER.SUBDOMAIN.workers.dev 를 실행합니다.
   js/config.js와 manifest.json의 서버 주소 및 호스트 권한이 설정됩니다.
8. Chrome 116 이상에서 확장을 다시 로드하고 연결 안내창, 계정 연결, 자동 갱신, 연결 해제를 확인합니다. 브라우저를 완전히 종료한 뒤 다시 실행하면 미연결 상태가 되는지도 확인합니다.
9. 배포용 파일은 npm run package로 만듭니다. 생성된 dist/extension-시각 폴더 내용만 압축해 업로드합니다.
   프로젝트 폴더 전체를 업로드하지 마세요. 패키징 명령은 Worker 코드·설정·비밀키 파일을 제외합니다.

js/config.js의 WORKER_URL과 manifest.json의 host_permissions는 동일한 HTTPS Worker 주소를 가리켜야 합니다. Worker 주소를 변경하면 위 configure 명령으로 함께 갱신합니다.
Worker의 NOT_CONFIGURED 오류는 Cloudflare에 CLIENT_ID/CLIENT_SECRET 또는 확장 ID 설정이 빠진 경우입니다.
.dev.vars 값이 채워져 있어도 실제 배포에서는 Cloudflare Secret에 두 값을 등록해야 합니다.
identity 권한은 OAuth 창을 열고 storage 권한은 설정 동기화, 세션 토큰과 로컬 대기 상태 저장에 사용합니다.
토큰은 chrome.storage.session 메모리에 TRUSTED_CONTEXTS 접근 제한을 적용해 보관하며, 디스크에 지속 저장하거나 sync에 넣지 않습니다. 서비스 워커 재시작에는 유지되지만 브라우저 재시작 및 확장 사용 중지·다시 로드·업데이트 시 삭제됩니다.
이전 버전의 local 토큰은 현재 세션으로 한 번 이전한 뒤 로컬 사본을 삭제합니다. 세션 저장이 실패해도 로컬 사본은 삭제합니다.
만료까지 60초 이하인 토큰은 다음 계정 확인 또는 추천 요청 때 갱신합니다. 갱신 직전에 이전 토큰을 삭제하며, 실패하면 복원하지 않고 재연결을 안내합니다. 로컬 호출 제한으로 요청을 보내기 전 차단된 경우에는 기존 토큰을 유지합니다.
로그인 창은 안내창에서 ‘동의하고 연결’을 누른 뒤에만 엽니다. 사이트 계정 전환은 확장의 연결을 바꾸지 않습니다.
다른 계정을 사용하려면 연결 해제 후 다시 연결합니다.
브라우저 세션 종료나 확장 삭제로 토큰이 없어져도 solved.ac의 앱 권한은 자동 철회되지 않습니다. 권한 철회는 연결 해제 또는 solved.ac의 연결된 앱 설정에서 수행합니다.

## 서버와 한도

고정된 OAuth, /me, random-problem 경로만 호출하며 임의 URL 프록시나 원문 DB 제공 기능은 없습니다.
Origin 검사와 입력 검증을 수행하지만 Origin은 외부 프로그램에서 위조할 수 있으므로 인증 수단으로 간주하지 않습니다.
서버 호출은 하나의 Durable Object에서 60단위 예산, 초당 2단위 회복, 요청당 4단위로 제한합니다.
추천 요청의 첫 검색 전에 4단위를 예약하고, 백준 연결 정보가 없어 추가 검색할 때마다 4단위를 다시 예약합니다. 첫 검색을 포함해 최대 3회 검색합니다.
실제 앱의 배율·한도가 더 낮으면 이 제한도 조정해야 합니다.
Cloudflare Workers와 Durable Objects 각각의 무료 요청·저장소 한도가 적용됩니다.
무료 한도 초과 시 서비스가 중단될 수 있습니다. 유료 플랜 전환은 별도 운영 결정입니다.
Worker 코드는 요청 본문·토큰·ID를 애플리케이션 로그에 남기지 않습니다. Wrangler 설정은 Workers Logs·Invocation Logs·Traces를 비활성화합니다.
이 설정은 재배포 후 반영 여부를 확인해야 합니다. 별도 Logpush·Tail Worker·OpenTelemetry 내보내기와 Cloudflare 자체 보안·운영 기록의 보관·접근 설정은 운영 환경에서 따로 점검합니다.
연결된 사용자의 ID는 solved.ac 검색 URL의 -@ID 조건에 포함되므로 외부 요청 추적을 켜면 ID가 기록될 수 있습니다.

## 검증

```sh
npm test
```

2026-11-20 기준 자동 테스트 29개가 통과했습니다. 모의 환경에서 쿼리 제한, OAuth PKCE·입력 검증, 순차 갱신, 연결 해제 실패 후 재시도, 동의 전 인증 차단, 토큰 이전·삭제, 서비스 워커 재시작과 세션 초기화, 비신뢰 메시지 거절, 401/404/429, 전역 예산, 민감정보 오류 응답 차단, 캐시 금지, 결과 링크, 설정 저장 및 UI 동작을 검사합니다.
실제 Chrome의 화면·OAuth 반환·토큰 회전·브라우저 재시작과 Cloudflare 운영 설정은 이번 자동 검증에 포함되지 않았습니다.
실배포 전 실제 ID 검색식(-@ID), 태그 검색, 백준 문제 링크, Chrome OAuth 반환과 토큰 회전을 확인해야 합니다.
호스팅 URL·자격 증명·실제 앱 연결 없이는 통합 검증을 완료할 수 없습니다.

## Chrome 웹 스토어 제출 전 확인

- [ ] Worker 변경을 재배포하고 Logs·Invocation Logs·Traces 비활성화 및 별도 로그 내보내기 설정을 확인합니다.
- [ ] 실제 Chrome에서 안내창 열기·취소·동의, OAuth 연결·갱신·해제, 서비스 워커 재시작 후 연결 유지, 브라우저 재시작 후 미연결 상태를 확인합니다.
- [ ] 비로그인 추천, 연결 후 미해결 문제 제외, 한국어·티어·프리셋 조건과 설정 복원을 확인합니다.
- [ ] [개인정보처리방침](../PRIVACY.md)의 수정본을 공개 URL에 반영하고 로그인 없이 열리는지 확인합니다. 공개 주소: https://github.com/DWinging/vibe-coding-boj/blob/main/PRIVACY.md
- [ ] 대시보드에서 개인 식별 정보(계정 ID)와 인증 정보(인증 코드·토큰)를 신고합니다. 위치 정보 항목은 Cloudflare의 IP 로그 보관·사용 범위를 확인한 뒤 확정합니다. 원격 실행 코드는 사용하지 않으며, Limited Use 확인 항목은 실제 운영 방식과 일치해야 합니다.
- [ ] 최신 npm run package 결과의 내용만 ZIP으로 제출하고 스토어 설명·스크린샷도 최종 UI와 맞춥니다.

권한 사용 근거:

| 권한 | 제출 문구 |
|---|---|
| storage | 사용자의 난이도 범위와 알고리즘 프리셋을 Chrome Sync로 저장·복원합니다. OAuth 토큰은 브라우저 세션 메모리에, API 호출 제한 대기 상태는 기기 로컬 저장소에 보관합니다. |
| identity | chrome.identity.launchWebAuthFlow로 solved.ac OAuth 인증과 반환 처리를 수행합니다. 연결된 계정을 확인해 이미 해결한 문제를 추천에서 제외합니다. |
| Worker 호스트 | 지정된 Cloudflare Worker에 인증·계정 확인·문제 검색 요청을 전송하기 위해 사용합니다. |

공식 제출 안내: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
사용자 데이터 정책: https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
Limited Use: https://developer.chrome.com/docs/webstore/program-policies/limited-use

명세: 사용자가 제공한 api-1.json (2026-11-20).
공식 문서: https://backstage.solved.ac/developer/docs
개발자 약관: https://solved.ac/developer-terms

