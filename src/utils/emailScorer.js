/**
 * Email Scorer Utility
 * Analyzes email content and returns a score (0-100) and actionable feedback.
 */

export const calculateScore = (subject, body) => {
    let score = 100;
    const feedback = [];

    if (!body) return { score: 0, feedback: [] };

    // 1. Length Check (Mobile Optimized: < 150 words)
    const wordCount = body.split(/\s+/).length;
    if (wordCount > 200) {
        score -= 20;
        feedback.push({ type: 'warning', text: 'Te lang voor mobiel (>200 woorden). Probeer in te korten.' });
    } else if (wordCount > 150) {
        score -= 10;
        feedback.push({ type: 'info', text: 'Iets aan de lange kant. <150 woorden is optimaal.' });
    } else if (wordCount < 50) {
        score -= 10;
        feedback.push({ type: 'warning', text: 'Erg kort. Zorg dat je wel waarde toevoegt.' });
    } else {
        feedback.push({ type: 'success', text: 'Perfecte lengte voor snelle lezers!' });
    }

    // 2. Subject Line Check
    if (subject) {
        const subjectLength = subject.length;
        if (subjectLength > 60) {
            score -= 10;
            feedback.push({ type: 'warning', text: 'Onderwerp is te lang (>60 tekens), wordt afgekapt op mobiel.' });
        } else if (subjectLength < 10) {
            score -= 5;
            feedback.push({ type: 'info', text: 'Onderwerp is erg kort.' });
        } else {
            feedback.push({ type: 'success', text: 'Onderwerpregel is goed en leesbaar.' });
        }
    }

    // 3. Question Check (Engagement)
    if (body.includes('?')) {
        feedback.push({ type: 'success', text: 'Goed gebruik van vragen om interactie uit te lokken.' });
    } else {
        score -= 15;
        feedback.push({ type: 'warning', text: 'Je stelt geen vragen. Eindig met een duidelijke vraag.' });
    }

    // 4. Spam/Cliché Words Check
    const spamWords = ['gratis', 'dringend', 'uniek aanbod', '100%', 'garantie', 'vrijblijvend'];
    const foundSpam = spamWords.filter(word => body.toLowerCase().includes(word));
    if (foundSpam.length > 0) {
        score -= 5 * foundSpam.length;
        feedback.push({ type: 'warning', text: `Vermijd spam-gevoelige woorden: "${foundSpam.join(', ')}"` });
    }

    // 5. Structure (Paragraphs)
    const paragraphs = body.split('\n\n').length;
    if (wordCount > 100 && paragraphs < 3) {
        score -= 10;
        feedback.push({ type: 'warning', text: 'Gebruik meer witregels (alinea\'s) voor leesbaarheid.' });
    }

    return {
        score: Math.max(0, score),
        feedback
    };
};
