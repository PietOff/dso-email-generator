const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxSBxwydzP5DZbpd4mI-LK3GPlMwVsTXpMOSnUWqtTXJdbFAMhnwOHubehOF_X67XE3/exec';
const payload = { type: 'Monitor Sync', gemeente: 'ZuidhornTest', kpi1: '1' };
async function test() {
  const res = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log(res.status, res.statusText);
  const text = await res.text();
  console.log(text.substring(0, 500));
}
test();
