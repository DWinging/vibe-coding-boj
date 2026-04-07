const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// targetCount: 확보하고 싶은 최소/최대 문제 수 (예: 400개)
async function fetchAndFilter(tierQuery, targetCount, fileName) {
    let allProblems = [];
    let page = 1;

    console.log(`[${fileName}] 중복 없는 데이터 ${targetCount}개 추출 시작...`);

    // 목표치에 도달할 때까지 무한 반복 (정렬 없이 ID순으로 긁음)
    while (allProblems.length < targetCount) {
        try {
            // API에 쿼리를 던질 때 이미 필터링 조건이 다 포함되어 있음
            const url = `https://solved.ac/api/v3/search/problem?query=${encodeURIComponent(tierQuery)}&page=${page}`;
            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Node.js)' } });

            if (!res.ok) {
                console.error(`Page ${page} 에러: ${res.status}`);
                break;
            }

            const data = await res.json();
            
            // 더 이상 백준에 조건에 맞는 문제가 없으면 탈출
            if (!data.items || data.items.length === 0) {
                console.log(`⚠️ ${fileName} 최대치 도달 (현재 ${allProblems.length}개). 더 이상 문제가 없습니다.`);
                break;
            }

            // 중복 방지 로직 (ID 기준)
            data.items.forEach(item => {
                if (!allProblems.find(p => p.problemId === item.problemId)) {
                    allProblems.push(item);
                }
            });

            console.log(`- 페이지 ${page} 탐색 완료 | 누적 확보: ${allProblems.length}개`);
            page++;
            await sleep(200); // 서버 차단 방지

        } catch (e) {
            console.error(`Error: ${e.message}`);
            break;
        }
    }

    // 정확히 목표치(400개)만큼만 자르기
    allProblems = allProblems.slice(0, targetCount);

    // 로컬에서 완벽하게 섞기 (Fisher-Yates Shuffle)
    for (let i = allProblems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allProblems[i], allProblems[j]] = [allProblems[j], allProblems[i]];
    }

    // JSON 파일로 저장
    fs.writeFileSync(path.join(dataDir, fileName), JSON.stringify(allProblems, null, 2));
    console.log(`✅ ${fileName} 저장 완료: 정확히 ${allProblems.length}개!\n`);
}

async function run() {
    // 360개 이상을 '무조건' 확보하기 위해 제출 수 컷을 현실적으로 조정함
    // 이 컷이면 무조건 400개 넘게 뽑힘
    await fetchAndFilter('tier:s1..s5 s#3000..', 400, 'silver.json');   // 실버: 3000명 이상
    await fetchAndFilter('tier:g1..g5 s#2000..', 400, 'gold.json');     // 골드: 1000명 이상
    await fetchAndFilter('tier:p1..p5 s#500..', 400, 'platinum.json');  // 플레: 200명 이상
}

run();