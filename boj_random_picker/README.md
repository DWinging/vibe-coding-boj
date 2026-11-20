# BOJ Random Picker v3.0.0

solved.ac 공식 v4 API로 티어·알고리즘 조건에 맞는 문제 하나를 추천합니다.
추천한 문제는 https://www.acmicpc.net/problem/문제번호 주소에서 열립니다.
judgeIds의 백준(boj) 문제 번호로만 연결합니다. 백준 연결 정보가 없으면 같은 조건으로 최대 3회(첫 검색 포함)까지 검색합니다.
백준 연결 정보가 끝내 나오지 않으면 안내하며, solved.ac 번호를 백준 번호로 대신 사용하지 않습니다.
계정을 연결하면 /me에서 ID를 읽어 안 푼 문제 검색 조건을 추가합니다.
로그인하지 않은 사용자는 전체 문제에서 추천받습니다.
모든 추천 검색에 한국어 언어 조건(%ko)을 적용합니다. 결과가 없더라도 언어 조건을 해제하지 않습니다.

## 변경 사항

- 최초 1회 OAuth PKCE 연결 후 ID 자동 인식. profile 및 offline.access 권한 사용.
- 쿠키 접근, 20페이지 수집, 문제 목록 캐시, 추정 정답률·제출 수 필터 제거.
- v4는 averageTries를 반환하지 않습니다. 기존 1/averageTries는 실제 제출 정답률이 아니므로 UI를 제거했습니다.
- 태그 OR 조건 유지. 알고리즘은 로그인 여부와 관계없이 최대 5개까지 선택합니다. 5개 선택 시 미선택 항목을 잠그고, 하나를 해제하면 다시 선택할 수 있습니다. 100자 제한을 넘으면 조건을 임의로 버리지 않고 안내합니다.
- random-problem은 중복 추천될 수 있습니다. 중복을 피하려고 추가 호출하지 않습니다. 백준 연결 정보가 없는 결과에만 최대 2회 추가 검색하며 매번 호출 예산을 확인합니다.
- 429 Retry-After를 로컬에 저장해 팝업을 다시 열어도 대기합니다. 1027은 다음 UTC 자정까지 차단합니다.
- 연결 해제는 서버 토큰 폐기 성공 후 로컬 토큰을 삭제합니다. 실패하면 재시도할 수 있도록 유지합니다.
- 갱신 토큰은 순차 처리하며, 응답 유실 시 같은 토큰을 재사용하지 않고 재연결합니다.

## 배포 준비

비밀키를 Git이나 확장 프로그램에 넣지 마세요.

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
8. Chrome에서 확장을 다시 로드하고 계정 연결, 자동 갱신, 연결 해제를 확인합니다.
9. 배포용 파일은 npm run package로 만듭니다. 생성된 dist/extension-시각 폴더 내용만 압축해 업로드합니다.
   프로젝트 폴더 전체를 업로드하지 마세요. 패키징 명령은 Worker 코드·설정·비밀키 파일을 제외합니다.

초기 WORKER_URL과 host_permissions는 비어 있어 배포 설정 전에는 API를 호출할 수 없습니다.
Worker의 NOT_CONFIGURED 오류는 Cloudflare에 CLIENT_ID/CLIENT_SECRET 또는 확장 ID 설정이 빠진 경우입니다.
.dev.vars 값이 채워져 있어도 실제 배포에서는 Cloudflare Secret에 두 값을 등록해야 합니다.
identity 권한은 OAuth 창을 열고 storage 권한은 설정과 기기별 토큰을 저장합니다.
토큰은 chrome.storage.local의 TRUSTED_CONTEXTS에만 저장하며 sync에 넣지 않습니다.
로그인 창은 사용자 클릭으로만 엽니다. 사이트 계정 전환은 확장의 연결을 바꾸지 않습니다.
다른 계정을 사용하려면 연결 해제 후 다시 연결합니다.

## 서버와 한도

고정된 OAuth, /me, random-problem 경로만 호출하며 임의 URL 프록시나 원문 DB 제공 기능은 없습니다.
Origin 검사와 입력 검증을 수행하지만 Origin은 외부 프로그램에서 위조할 수 있으므로 인증 수단으로 간주하지 않습니다.
서버 호출은 하나의 Durable Object에서 60단위 예산, 초당 2단위 회복, 요청당 4단위로 제한합니다.
최대 /me 1회 + 검색 1회 비용을 반영하며 solved.ac 기본 600단위보다 낮은 자체 제한입니다.
실제 앱의 배율·한도가 더 낮으면 이 제한도 조정해야 합니다.
Cloudflare Workers와 Durable Objects 각각의 무료 요청·저장소 한도가 적용됩니다.
무료 한도 초과 시 서비스가 중단될 수 있습니다. 유료 플랜 전환은 별도 운영 결정입니다.
요청 본문·토큰·ID는 로그로 남기지 않으며 Worker observability는 기본 비활성화했습니다.

## 검증

node --test tests/*.test.js

모의 응답으로 쿼리 제한, OAuth 입력, 401/404/429, 전역 예산 및 결과 링크 생성을 검사합니다.
실배포 전 실제 ID 검색식(-@ID), 태그 검색, 백준 문제 링크, Chrome OAuth 반환과 토큰 회전을 확인해야 합니다.
호스팅 URL·자격 증명·실제 앱 연결 없이는 통합 검증을 완료할 수 없습니다.

명세: 사용자가 제공한 api-1.json (2026-11-20).
공식 문서: https://backstage.solved.ac/developer/docs
개발자 약관: https://solved.ac/developer-terms

