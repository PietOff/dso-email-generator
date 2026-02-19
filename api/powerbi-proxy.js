/**
 * Vercel Serverless Proxy for Power BI Public Report API
 * 
 * The Power BI internal API doesn't set CORS headers for external origins.
 * This proxy forwards requests from our app to the Power BI API.
 */
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const PBI_API = 'https://wabi-west-europe-f-primary-api.analysis.windows.net/public/reports/querydata?synchronous=true';
        const RESOURCE_KEY = '385e6016-908c-4d32-aec3-82bf62e9726c';

        const response = await fetch(PBI_API, {
            method: 'POST',
            headers: {
                'X-PowerBI-ResourceKey': RESOURCE_KEY,
                'Content-Type': 'application/json;charset=UTF-8'
            },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            const text = await response.text();
            return res.status(response.status).json({ error: text });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
