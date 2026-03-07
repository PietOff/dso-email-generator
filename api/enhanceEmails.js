/**
 * Server-side API endpoint for GROQ email enhancement
 * This runs on the server where it has access to process.env.GROQ_API_KEY
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function enhanceSingleEmail(email, key, groqApiKey, tone) {
        if (!email) return email;

    const enhancementPrompt = `You are an expert email copywriter. Enhance the following email to make it more engaging and compelling while strictly preserving:
    - All names and specific references (recipient names, gemeente/municipality names)
    - All links, URLs, and contact information
    - All dynamic content and placeholders (like {gemeente}, {type}, etc)
    - The original tone (${tone})
    - All factual information and data points
    - The core message and call-to-action

    Make these improvements:
    - Improve clarity and readability
    - Make opening more compelling
    - Enhance engagement (stronger questions, better value propositions)
    - Improve flow between paragraphs
    - Strengthen the call-to-action while keeping the same ask
    - Fix any awkward phrasing
    ${tone === 'informal' ? '- Keep a friendly, conversational tone' : '- Keep a professional but warm tone'}

    Original Email:
    ${email}

    Return ONLY the enhanced email text, no explanations or meta-commentary.`;

    const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                                'Authorization': `Bearer ${groqApiKey}`,
                                'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                                model: GROQ_MODEL,
                                messages: [{ role: 'user', content: enhancementPrompt }],
                                temperature: 0.7,
                                max_tokens: 2000,
                }),
    });

    if (!response.ok) {
                const errBody = await response.text().catch(() => '');
                console.warn(`GROQ API error for ${key}: ${response.status}`, errBody);
                return email;
    }

    const data = await response.json();
        if (!data.choices?.[0]?.message?.content) {
                    console.warn(`Invalid GROQ response for ${key}`);
                    return email;
        }

    return data.choices[0].message.content.trim();
}

export default async function handler(req, res) {
        // Only allow POST requests
    if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
    }

    const { emails, context } = req.body;
        const groqApiKey = process.env.GROQ_API_KEY;

    // If no API key, return original emails
    if (!groqApiKey) {
                console.warn('GROQ_API_KEY not configured on server');
                return res.status(200).json(emails);
    }

    try {
                const { tone = 'professional' } = context || {};

            // Enhance all emails in parallel for speed
            const entries = Object.entries(emails);
                const enhanced = await Promise.all(
                                entries.map(([key, email]) =>
                                                    enhanceSingleEmail(email, key, groqApiKey, tone)
                                                                .catch(err => {
                                                                                            console.error(`Error enhancing ${key}:`, err);
                                                                                            return email;
                                                                })
                                                        )
                            );

            const enhancedEmails = Object.fromEntries(
                            entries.map(([key], i) => [key, enhanced[i]])
                        );

            return res.status(200).json(enhancedEmails);
    } catch (error) {
                console.error('Error in enhancement API:', error);
                return res.status(500).json({ error: 'Enhancement failed' });
    }
}
