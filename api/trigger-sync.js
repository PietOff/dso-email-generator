export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { GITHUB_PAT } = process.env;

    if (!GITHUB_PAT) {
        return res.status(500).json({ error: 'Missing GitHub PAT configuration' });
    }

    try {
        const response = await fetch('https://api.github.com/repos/PietOff/dso-email-generator/dispatches', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GITHUB_PAT}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event_type: 'sync-powerbi'
            })
        });

        if (response.ok) {
            return res.status(200).json({ success: true, message: 'Sync workflow triggered successfully' });
        } else {
            const errorText = await response.text();
            return res.status(response.status).json({ error: 'GitHub API Error', details: errorText });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
