const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxpHyv27KGUZh72k-wx0qbwVSPdnIE55okwChZedWM5pfyYI0SCOZ_XJ7d_A_A5FnY/exec';
const payload = {
    type: 'Monitor Sync',
    gemeente: 'Initialisatie_Geschiedenis_Tab',
    kpi1: '', kpi2: '', kpi3: '', kpi4: '', regelingType: '', behandeldienst: '',
    aantalRegels: '', laatsteWijziging: '', trSoftware: '',
};

fetch(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
})
    .then(res => res.text())
    .then(t => console.log('Result:', t))
    .catch(err => console.error(err));
