/**
 * GROQ Email Enhancer
 * 
 * Automatically enhances all generated emails using GROQ API while preserving:
 * - Google Sheets data and personalization
 * - Recipient names and municipality information
 * - Tone (informal/professional)
 * - All placeholders and dynamic content
 * 
 * Falls back gracefully to original email if GROQ API is unavailable.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Enhances an email using GROQ API
 * @param {string} email - The generated email content
 * @param {Object} context - Context about the email (tone, recipient, gemeente, etc)
 * @returns {Promise<string>} - Enhanced email or original if enhancement fails
 */
export const enhanceEmailWithGroq = async (email, context = {}) => {
    const groqApiKey = process.env.GROQ_API_KEY;

    // If no API key, return original email
    if (!groqApiKey) {
          console.warn('GROQ_API_KEY not configured. Returning original email.');
          return email;
    }

    try {
          const { tone = 'professional', recipientName = '', gemeente = '', emailType = 'email1' } = context;

      // Build enhancement prompt that preserves all personalization
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
      - Add subtle sophistication to match professional tone

      ${tone === 'informal' ? '- Keep a friendly, conversational tone' : '- Keep a professional but warm tone'}

      Email Type: ${emailType}
      ${recipientName ? `Recipient: ${recipientName}` : ''}
      ${gemeente ? `Municipality: ${gemeente}` : ''}

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
                        model: 'mixtral-8x7b-32768',
                        messages: [
                          {
                                        role: 'user',
                                        content: enhancementPrompt,
                          },
                                  ],
                        temperature: 0.7,
                        max_tokens: 2000,
              }),
      });

      if (!response.ok) {
              console.warn(`GROQ API error: ${response.status} ${response.statusText}. Returning original email.`);
              return email;
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
              console.warn('Invalid GROQ response. Returning original email.');
              return email;
      }

      const enhancedEmail = data.choices[0].message.content.trim();

      // Safety check: ensure key elements are preserved
      if (!validateEnhancedEmail(email, enhancedEmail)) {
              console.warn('Enhanced email validation failed. Returning original email.');
              return email;
      }

      return enhancedEmail;
    } catch (error) {
          console.error('Error enhancing email with GROQ:', error);
          // Return original email if anything goes wrong
      return email;
    }
};

/**
 * Validates that the enhanced email preserves critical information
 * @param {string} originalEmail - Original email
 * @param {string} enhancedEmail - Enhanced email
 * @returns {boolean} - True if validation passes
 */
function validateEnhancedEmail(originalEmail, enhancedEmail) {
    // Check that enhanced email is not empty and has reasonable length
  if (!enhancedEmail || enhancedEmail.trim().length < originalEmail.length * 0.5) {
        return false;
  }

  // Check that critical placeholders are preserved
  const placeholders = ['{gemeente}', '{type}', '{software}', '{behandeldienst}', '{ontwerpen}', '{bopas}'];
    for (const placeholder of placeholders) {
          if (originalEmail.includes(placeholder) && !enhancedEmail.includes(placeholder)) {
                  console.warn(`Placeholder ${placeholder} was lost during enhancement`);
                  return false;
          }
    }

  return true;
}

/**
 * Batch enhance multiple emails
 * @param {Object} emailsObject - Object with email1, email2, email3
 * @param {Object} context - Context for enhancement
 * @returns {Promise<Object>} - Enhanced emails object
 */
export const enhanceAllEmails = async (emailsObject, context = {}) => {
    try {
          const enhanced = {};

      // Enhance each email type
      if (emailsObject.email1) {
              enhanced.email1 = await enhanceEmailWithGroq(emailsObject.email1, { ...context, emailType: 'email1' });
      }

      if (emailsObject.email2) {
              enhanced.email2 = await enhanceEmailWithGroq(emailsObject.email2, { ...context, emailType: 'email2' });
      }

      if (emailsObject.email3) {
              enhanced.email3 = await enhanceEmailWithGroq(emailsObject.email3, { ...context, emailType: 'email3' });
      }

      return enhanced;
    } catch (error) {
          console.error('Error in batch enhancement:', error);
          // Return original emails if batch enhancement fails
      return emailsObject;
    }
};
