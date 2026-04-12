const fs = require('fs');
const path = require('path');

const WEBHOOK_URL = process.env.MATTERMOST_WEBHOOK_URL;

function getKstInfo() {
    // 기준일 세팅
    const startDate = new Date("2026-01-01T00:00:00+09:00");
    const today = new Date();
    
    // KST 보정
    const utc = today.getTime() + (today.getTimezoneOffset() * 60 * 1000);
    const kst = new Date(utc + (9 * 60 * 60 * 1000));

    // YYYY-MM-DD 형식 문자열 생성 (JSON 비교용)
    const year = kst.getFullYear();
    const month = String(kst.getMonth() + 1).padStart(2, '0');
    const date = String(kst.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${date}`;

    const day = kst.getDay();
    const diffInMs = kst.setHours(0,0,0,0) - startDate.setHours(0,0,0,0);
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const weekIdx = Math.floor(diffInDays / 7) % 55;

    return { day, dateString, diffInDays, weekIdx };
}

async function sendMessage() {
    try {
        console.log("🚀 Mattermost 전송 봇 가동 준비 중...");

        const readData = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, `../data/${name}`), 'utf8'));
        const { day, dateString, diffInDays, weekIdx } = getKstInfo();

        // 1. 휴일 체크 (JSON 객체에서 키 존재 여부 확인)
        const holidayData = readData('date/holidays.json'); 

        // holidayData가 { "2026-01-01": "신정", ... } 형태이므로
        // 해당 날짜(dateString)가 키로 존재하는지 확인합니다.
        const isHoliday = Object.prototype.hasOwnProperty.call(holidayData, dateString);

        // 주말(0:일, 6:토)이거나 JSON 키에 등록된 공휴일인 경우 종료
        if (day === 0 || day === 6 || isHoliday) {
            const holidayName = isHoliday ? holidayData[dateString] : "주말";
            console.log(`🚩 오늘은 쉼표가 필요한 날입니다. (${holidayName})`);
            return;
        }

        // 2. 메시지 및 문제 리스트 로드
        const quotesList = readData('message/quotes.json');
        const silverList = readData('problem/silver.json');
        const goldList = readData('problem/gold.json');
        const platinumList = readData('problem/platinum.json');

        const message = quotesList[day][weekIdx];
        const pIdx = diffInDays % 400;

        const s = silverList[pIdx];
        const g = goldList[pIdx];
        const p = platinumList[pIdx];

        // 3. Payload 구성
        const payload = {
            text: `### 🤖 [BOJ Random Picker] 오늘의 추천 알고리즘!\n\n` +
                  `* 🥈 **실버** : [${s.titleKo} (${s.problemId})](https://www.acmicpc.net/problem/${s.problemId})\n` +
                  `* 🥇 **골드** : [${g.titleKo} (${g.problemId})](https://www.acmicpc.net/problem/${g.problemId})\n` +
                  `* 💎 **플레** : [${p.titleKo} (${p.problemId})](https://www.acmicpc.net/problem/${p.problemId})\n\n` +
                  `> ${message}`
        };

        // 4. 전송
        const res = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            console.log(`✅ [성공] Mattermost 메시지 전송 완료!`);
        } else {
            console.error(`❌ [실패] HTTP 에러: ${res.status}`);
        }

    } catch (err) {
        console.error("🚨 치명적 에러 발생:", err);
        process.exit(1);
    }
}

if (!WEBHOOK_URL) {
    console.error("🚨 MATTERMOST_WEBHOOK_URL 환경 변수가 없습니다.");
    process.exit(1);
}

sendMessage();