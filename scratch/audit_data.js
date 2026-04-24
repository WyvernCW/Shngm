
async function auditData() {
    const API_BASE = 'https://api.shngm.io/v1';
    
    console.log("--- AUDITING MANGA LIST DATA ---");
    const listRes = await fetch(`${API_BASE}/manga/list?type=project&page=1&page_size=1`);
    const listData = await listRes.json();
    console.log("List Item Shape:", JSON.stringify(listData.data[0], null, 2));

    const mangaId = listData.data[0].manga_id || listData.data[0].id;
    console.log("\n--- AUDITING MANGA DETAIL DATA (ID: " + mangaId + ") ---");
    const detailRes = await fetch(`${API_BASE}/manga/detail/${mangaId}`);
    const detailData = await detailRes.json();
    console.log("Detail Item Shape:", JSON.stringify(detailData.data, null, 2));
}

auditData();
