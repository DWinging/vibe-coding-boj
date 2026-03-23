# Privacy Policy for BOJ Random Picker

**Last Updated: March 23, 2026**

*(English version below / 한국어 버전은 아래에 있습니다)*

---

## [English Version]

### 1. Single Purpose
The sole purpose of this extension is to **"randomly recommend and navigate users to programming problems on Baekjoon Online Judge (BOJ) based on user-defined settings (tier, algorithm tags)."**

### 2. Data Collection & Usage
- **No Personal Identifiable Information (PII):** We do NOT collect, transmit, or store any personal data (e.g., name, email, passwords) to external servers.
- **Local Data Processing:** The extension reads the `solved.ac` handle (ID) via cookies strictly to filter out already solved problems. This process happens entirely locally within the user's browser.
- **Secure Storage:** User preferences (tier range, filters, presets) are safely synced across devices using `chrome.storage.sync`. A list of fetched problems is temporarily cached locally (`chrome.storage.local`) to reduce API server load. Developers have zero access to this data.

### 3. Permissions Justification
We request the absolute minimum permissions required for the core functionality:
- **`storage`**: Used to save user preferences, sync algorithm presets across the user's Google account, and temporarily cache problem lists to prevent API rate limits.
- **`cookies`**: Used to identify the user's `solved.ac` handle to exclude already solved problems from the random recommendation results. This is essential for the core "Unsolved Filter" feature.
- **Host Permissions (`https://solved.ac/*`)**: Required to securely fetch real-time problem lists, difficulty data, and algorithm tags from the `solved.ac` API.

### 4. No Remote Code
This extension strictly complies with the Chrome Web Store Manifest V3 security policies. We do not host, fetch, or execute any remote code (e.g., `eval()`). All logic is safely contained within the extension package.

### 5. Contact
For any questions regarding this privacy policy, please contact us via the Issue tab in this GitHub repository.

---

## [한국어 버전]

### 1. 확장프로그램의 단일 목적 (Single Purpose)
본 확장프로그램은 **"사용자 설정(티어, 알고리즘 태그)에 기반하여 백준 온라인 저지(BOJ)의 문제를 무작위로 추천하고 해당 문제 페이지로 이동시켜 주는 기능"**을 제공하는 것을 유일한 목적으로 합니다.

### 2. 데이터 수집 및 처리 방침
- **개인 식별 정보(PII) 통제:** 본 프로그램은 사용자의 이름, 이메일, 비밀번호 등 어떠한 개인 식별 정보도 외부 서버로 전송하거나 수집하지 않습니다.
- **로컬 기반 데이터 처리:** '안 푼 문제' 필터링 기능을 위해 사용자 브라우저의 쿠키를 통해 `solved.ac` 핸들(ID)을 확인합니다. 이 과정은 전적으로 사용자의 기기 내부(Local)에서만 처리되며 외부로 유출되지 않습니다.
- **저장소(Storage)의 안전한 사용:** 사용자의 설정(티어 범위, 정답률 필터, 프리셋 등)은 구글 계정 동기화(`chrome.storage.sync`)를 통해 안전하게 유지되며, API 과부하 방지를 위해 100개의 문제 목록은 로컬 기기(`chrome.storage.local`)에만 임시 캐싱됩니다. 개발자는 이 데이터에 일절 접근할 수 없습니다.

### 3. 권한(Permissions) 사용 근거
- **`storage`**: 사용자가 설정한 선호 티어 범위, 프리셋 목록을 브라우저에 저장하고 계정 간 동기화합니다. 또한, API 서버 부하를 줄이기 위해 추출한 문제 목록을 임시 캐싱합니다.
- **`cookies`**: `solved.ac` 사이트의 로그인 쿠키를 참조하여 사용자의 핸들(ID)을 확인합니다. 이를 통해 '안 푼 문제'만 추천하는 핵심 기능을 제공하기 위해 필수적인 권한입니다.
- **Host Permissions (`https://solved.ac/*`)**: 실시간 문제 목록 및 알고리즘 태그 정보를 `solved.ac` API로부터 안전하게 가져오기 위해 필수적으로 요구되는 통신 권한입니다.

### 4. 원격 코드 미사용 (No Remote Code)
본 확장프로그램은 Google Chrome Web Store의 Manifest V3 보안 정책을 엄격하게 준수합니다. 외부 원격 코드를 동적으로 불러오거나 실행하지 않으며, 모든 로직은 패키지 내부에 포함되어 동작합니다.