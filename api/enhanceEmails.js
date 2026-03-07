/**
 * Server-side API endpoint for GROQ email enhancement
 * This runs on the server where it has access to process.env.GROQ_API_KEY
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function enhanceSingleEmail(email, key, groqApiKey, tone, gemeente) {
            if (!email) return email;

    const isInformeel = tone === 'informal';

    // Dutch pronoun guidance — critical to get right
    const pronounGuidance = isInformeel
                ? 'Use informal Dutch throughout: "je", "jij", "jouw", "jullie". Never use "u" or "uw".'
                    : 'Use formal Dutch throughout: "u", "uw". Never use "je", "jij", "jouw".';

    const enhancementPrompt = `You are an expert Dutch email copywriter for AbelTalent, a company that helps municipalities with the Omgevingswet.

    CRITICAL RULES — follow these exactly:
    1. ${pronounGuidance}
    2. The municipality name is "${gemeente}". Use this exact name where relevant. NEVER write {gemeente}, {type}, {software}, or any other {placeholder} — always use the real value or leave it out entirely.
    3. Do NOT invent contact details, links, or data that are not in the original email.
    4. Keep all real names, email addresses, phone numbers, and URLs exactly as they appear.
    5. Keep the signature block exactly as-is.
    6. Return ONLY the improved email text. No explanations, no meta-commentary.

    What to improve:
    - Make the opening more compelling and personal
    - Improve clarity and flow between paragraphs
    - Strengthen the call-to-action (keep the same ask, just sharper)
    - Fix any awkward phrasing
    - ${isInformeel ? 'Keep a friendly, direct, conversational tone.' : 'Keep a professional, warm, and confident tone.'}

    Original email:
    ${email}`;

    const response = await fetch(GROQ_API_URL, {
                    method: 'POST',
                    headers: {
                                        'Authorization': `Bearer ${groqApiKey}`,
                                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                                        model: GROQ_MODEL,
                                        messages: [{ role: 'user', content: enhancementPrompt }],
                                        temperature: 0.5,
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

    let enhanced = data.choices[0].message.content.trim();

    // Safety net: replace any remaining {placeholder} patterns with gemeente name or remove them
    enhanced = enhanced.replace(/\{gemeente\}/gi, gemeente);
            enhanced = enhanced.replace(/\{[a-z_]+\}/gi, '');

    return enhanced;
}

export default async function handler(req, res) {
            if (req.method !== 'POST') {
                            return res.status(405).json({ error: 'Method not allowed' });
            }

    const { emails, context } = req.body;
            const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
                    console.warn('GROQ_API_KEY not configured on server');
                    return res.status(200).json(emails);
    }

    try {
                    const { tone = 'professional', gemeente = '' } = context || {};

                // Enhance all emails in parallel for speed
                const entries = Object.entries(emails);
                    const enhanced = await Promise.all(
                                        entries.map(([key, email]) =>
                                                                enhanceSingleEmail(email, key, groqApiKey, tone, gemeente)
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
