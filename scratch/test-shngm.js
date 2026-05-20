async function run() {
    try {
        const res = await fetch('https://api.shngm.io/v1/manga/list?type=project&page=1&page_size=1');
        const data = await res.json();
        console.log(JSON.stringify(data.data[0], null, 2));
    } catch (e) {
        console.error(e);
    }
}
run();
