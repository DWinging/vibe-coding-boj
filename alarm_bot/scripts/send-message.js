const fs = require('fs');
const path = require('path');

// 환경 변수에서 Webhook URL 가져오기
const WEBHOOK_URL = process.env.MATTERMOST_WEBHOOK_URL;

// 오늘 날짜에 맞는 인덱스 구하기 (0 ~ 399)
function getTodayIndex(totalCount) {
    // 봇 가동 시작일을 오늘(2026-04-07)로 기준점 세팅!
    const startDate = new Date("2026-04-07T00:00:00+09:00"); 
    const today = new Date();
    
    // 한국 시간(KST) 기준으로 날짜 차이 계산
    const diffInMs = today.setHours(0,0,0,0) - startDate.setHours(0,0,0,0);
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    return Math.abs(diffInDays) % totalCount;
}

async function sendMessage() {
    try {
        console.log("🚀 Mattermost 전송 봇 가동 준비 중...");

        // JSON 파일 읽어오기
        const readData = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, `../data/${name}`), 'utf8'));
        
        const silverList = readData('silver.json');
        const goldList = readData('gold.json');
        const platinumList = readData('platinum.json');

        // 추출한 데이터가 400개이므로 400 전달
        const idx = getTodayIndex(400);
        console.log(`- 오늘의 인덱스: ${idx}번 문제`);

        const s = silverList[idx];
        const g = goldList[idx];
        const p = platinumList[idx];

        // Mattermost 전송용 마크다운 페이로드 포맷
        const payload = {
            text: `### 🤖 [BOJ Random Picker] 오늘의 추천 알고리즘!\n\n` +
                  `* 🥈 **실버** : [${s.titleKo} (${s.problemId})](https://www.acmicpc.net/problem/${s.problemId})\n` +
                  `* 🥇 **골드** : [${g.titleKo} (${g.problemId})](https://www.acmicpc.net/problem/${g.problemId})\n` +
                  `* 💎 **플레** : [${p.titleKo} (${p.problemId})](https://www.acmicpc.net/problem/${p.problemId})\n\n` +
                  `> 오늘도 화이팅입니다! 🔥`
        };

        // Webhook으로 POST 요청 쏘기
        const res = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            console.log(`✅ [성공] Mattermost에 메시지가 꽂혔습니다! (응답: ${res.status})`);
        } else {
            console.error(`❌ [실패] 전송 에러: ${res.status}`);
        }

    } catch (err) {
        console.error("🚨 치명적 에러 발생:", err);
        process.exit(1);
    }
}

// URL 세팅 여부 검증
if (!WEBHOOK_URL) {
    console.error("🚨 MATTERMOST_WEBHOOK_URL 환경 변수가 설정되지 않았습니다!");
    console.error("테스트 전 터미널에 URL을 먼저 세팅해주세요.");
    process.exit(1);
}

// 실행
sendMessage();