/**
 * DSO Email Generator — Generates complete, personalized emails
 *
 * PHILOSOPHY: All email text is driven from Google Sheets ("Email Teksten" tab).
 * This file only contains the LOGIC to assemble emails from sheet data.
 * To change any email text, edit the Google Sheet — no code changes needed.
 *
 * Hardcoded strings only serve as fallbacks when sheet data is missing.
 *
 * COMPANIES:
 * - AbelTalent: Capacity solutions & talent for fysieke leefomgeving.
 * - Tafelberg Advies (partner): Expert in regelanalyse, omgevingsplan, toepasbare regels.
 */

/**
 * Generate a personalized email
 */

/**
 * Split single-line text into paragraphs at natural break points.
 * Sheet data may not have line breaks if entered without Ctrl+Enter.
 * This adds \n\n after every ~2 sentences to create readable paragraphs.
 */
function addParagraphBreaks(text) {
        if (!text || text.includes('\n')) return text;
        // Split on sentence endings (. followed by space and a capital letter)
  const sentences = text.split(/(?<=\.\s)(?=[A-Z])/);
        if (sentences.length <= 2) return text; // Short text, no need to break
  const paragraphs = [];
        for (let i = 0; i < sentences.length; i += 2) {
                  const chunk = sentences.slice(i, i + 2).join('');
                  paragraphs.push(chunk.trim());
        }
        return paragraphs.join('\n\n');
}

export const generateEmail = async (baseStory, figures, options, selectedData, selectedContact, content, smartContext = '', monitorEnriched = null) => {
        if (!selectedData) return { email1: '', email2: '', email3: '' };

        const { algemeen = {}, scoreTeksten = {}, functieTeksten = {}, ctas = {}, emailTeksten = {} } = content || {};
        const isInformeel = options.toon === 'informeel';
        const isUrgent = options.toon === 'urgent';
        const gemeenteNaam = selectedData.bestuursorgaan || 'uw gemeente';

        // --- Sheet text helper: get text by key, with fallback ---
        const txt = (key, fallback = '') => {
                  const entry = emailTeksten[key];
                  if (!entry) return fallback;
                  const raw = isInformeel ? (entry.informeel || entry.professioneel) : entry.professioneel;
                  // Replace placeholders: {gemeente}, {type}, {software}, {behandeldienst}, {ontwerpen}, {bopas}
                  return raw
                    .replace(/\{gemeente\}/g, gemeenteNaam)
                    .replace(/\{type\}/g, monitorEnriched?.regelingType || '')
                    .replace(/\{software\}/g, monitorEnriched?.trSoftware ? ` via ${monitorEnriched.trSoftware}` : '')
                    .replace(/\{behandeldienst\}/g, monitorEnriched?.behandeldienst || '')
                    .replace(/\{ontwerpen\}/g, monitorEnriched?.kpi5 || '0')
                    .replace(/\{bopas\}/g, monitorEnriched?.kpi6 || '0');
        };

        // --- Greeting ---
        const getGreeting = () => {
                  if (selectedContact) {
                              const firstName = selectedContact.naam.split(' ')[0];
                              return isInformeel ? `Hoi ${firstName},` : `Beste ${selectedContact.naam},`;
                  }
                  return isInformeel ? "Hallo," : "Beste collega,";
        };

        // --- Opening (from sheet, per doel + toon) ---
        const getOpening = () => {
                  // Smart Context always takes priority (user-written context)
                  if (smartContext) return smartContext;
                  if (options.doel === 'follow-up') {
                              return txt('opening_follow_up', isInformeel
                                                 ? 'Fijn dat we eerder even contact hadden. Ik wilde graag even aanhaken.'
                                                 : 'Naar aanleiding van ons eerdere contact wil ik graag even bij u aansluiten.');
                  }
                  if (isUrgent) {
                              return txt('opening_urgent', 'De Omgevingswet is inmiddels een feit. Vandaar dat ik even contact opneem.');
                  }
                  return txt('opening_eerste_contact', isInformeel
                                   ? 'We werken veel met gemeenten die volop bezig zijn met de Omgevingswet. Even een kort berichtje.'
                                   : 'Als organisatie die dagelijks gemeenten ondersteunt bij de Omgevingswet neem ik graag contact met u op.');
        };

        // --- Situational Context (data-informed, text from sheet) ---
        const getSituationContext = () => {
                  if (!monitorEnriched) return '';
                  const parts = [];
                  const type = monitorEnriched.regelingType;
                  const countStr = monitorEnriched.aantalRegels;
                  const count = countStr ? parseInt(countStr) : 0;
                  const behandeldienst = monitorEnriched.behandeldienst;

                  // --- Situation observation per regelingType ---
                  let situatie = '';
                  if (type === 'Omgevingsplan') {
                              situatie = txt('situatie_omgevingsplan');
                  } else if (type === 'Omgevingsvisie') {
                              situatie = txt('situatie_omgevingsvisie');
                  } else if (type === 'Voorbeschermingsregels' || type === 'Voorbereidingsbesluit' || type) {
                              situatie = txt('situatie_voorbescherming');
                  }

                  // --- Toepasbare regels nuance ---
                  if (count > 0 && situatie) {
                              if (count < 20) {
                                            situatie += ' ' + txt('tr_weinig');
                              } else {
                                            situatie += ' ' + txt('tr_veel');
                              }
                  } else if (count > 0) {
                              // Only TR data, no omgevingsplan data
                    situatie = count < 20 ? txt('tr_alleen_weinig') : txt('tr_alleen_veel');
                  }
                  if (situatie) parts.push(situatie);

                  // --- Service bridge ---
                  let bridge = txt('service_bridge');
                  if (behandeldienst) {
                              const bdExtra = txt('service_bridge_behandeldienst');
                              if (bdExtra) bridge += '\n\n' + bdExtra;
                  }

                  // --- Lead Indicators (Designs / BOPA's) ---
                  const ontwerpen = parseInt(monitorEnriched.kpi5) || 0;
                  const bopas = parseInt(monitorEnriched.kpi6) || 0;
                  if (ontwerpen > 0 || bopas > 0) {
                              let leadText = '';
                              if (ontwerpen > 0 && bopas > 0) leadText = txt('situatie_lead_beide');
                              else if (ontwerpen > 0) leadText = txt('situatie_lead_ontwerpen');
                              else leadText = txt('situatie_lead_bopa');
                              if (leadText) parts.push(leadText);
                  }

                  parts.push(bridge);
                  return parts.join('\n\n');
        };

        // --- KPI Context (subtle, from sheet Score Teksten) ---
        const getKPIContext = () => {
                  const paragraphs = [];
                  const goedePunten = [];
                  const aandachtspunten = [];
                  const diensten = [];

                  const findScoreText = (kpi, val) => {
                              if (!scoreTeksten[kpi]) return null;
                              if (scoreTeksten[kpi][val]) return scoreTeksten[kpi][val];
                              return null;
                  };

                  const processKPI = (kpi, val) => {
                              const numericVal = kpi === 'regelanalist'
                                ? (val === 'ja' ? 0 : val === 'nee' ? 5 : parseInt(val) || 0)
                                            : parseInt(val);
                              if (isNaN(numericVal)) return;
                              const scoreData = findScoreText(kpi, numericVal);
                              if (scoreData) {
                                            if (scoreData.type === 'goed') goedePunten.push(scoreData.tekst);
                                            else if (scoreData.type === 'fout' || scoreData.type === 'aandacht') {
                                                            aandachtspunten.push(scoreData.tekst);
                                                            if (scoreData.dienst) diensten.push(scoreData.dienst);
                                            }
                              }
                  };

                  if (figures.kpi1) processKPI('bruidsschat', figures.kpi1);
                  if (figures.kpi2) processKPI('regelanalist', figures.kpi2);
                  if (figures.kpi3) processKPI('olo', figures.kpi3);
                  if (figures.kpi4 && (!monitorEnriched || !monitorEnriched.regelingType)) processKPI('omgevingsplan', figures.kpi4);

                  // Positive observations
                  if (goedePunten.length > 0) {
                              const prefix = txt('kpi_goed_prefix', isInformeel ? 'Overigens, mooi dat ' : 'Het valt positief op dat ');
                              if (goedePunten.length === 1) {
                                            paragraphs.push(`${prefix}${goedePunten[0]}.`);
                              } else {
                                            const last = goedePunten.pop();
                                            paragraphs.push(`${prefix}${goedePunten.join(', ')} en ${last}.`);
                              }
                  }
                  aandachtspunten.forEach(p => paragraphs.push(p));

                  // Service offers
                  if (diensten.length > 0) {
                              const prefix = txt('kpi_dienst_prefix', isInformeel ? 'Als dat helpt: ' : 'Ter ondersteuning: ');
                              const uniqueDiensten = [...new Set(diensten)];
                              if (uniqueDiensten.length === 1) {
                                            paragraphs.push(`${prefix}${uniqueDiensten[0]}.`);
                              } else {
                                            const last = uniqueDiensten.pop();
                                            paragraphs.push(`${prefix}${uniqueDiensten.join('. Daarnaast kan ')}. Ook kan ${last}.`);
                              }
                  }

                  return paragraphs.join('\n\n');
        };

        // --- Role Logic (from sheet Functie Teksten) ---
        const getRoleBlock = () => {
                  if (!selectedContact || !selectedContact.functie) return "";
                  const userRoleLower = selectedContact.functie.toLowerCase();
                  const match = Object.keys(functieTeksten).find(keyword =>
                              userRoleLower.includes(keyword.toLowerCase())
                                                                     );
                  if (match) {
                              const roleData = functieTeksten[match];
                              return isInformeel ? roleData.informeel : roleData.professioneel;
                  }
                  return "";
        };

        // --- CTA (from sheet CTAs) ---
        const getCTA = () => {
                  // Try exact match first, then fallback aliases (sheet may use 'kennismaking' instead of 'eerste-contact')
                  const aliases = { 'eerste-contact': 'kennismaking', 'kennismaking': 'eerste-contact' };
                  const ctaData = ctas[options.doel] || ctas[aliases[options.doel]] || null;
                  if (ctaData) {
                              const text = isInformeel ? ctaData.informeel : ctaData.professioneel;
                              return text || (isInformeel ? "Zullen we bellen?" : "Graag kom ik met u in contact.");
                  }
                  return isInformeel
                    ? "Zou je het leuk vinden om eens vrijblijvend te sparren? Ik hoor het graag."
                              : "Heeft u interesse om eens vrijblijvend van gedachten te wisselen? Ik hoor het graag.";
        };

        // --- Signature ---
        const getSignature = () => {
                  const groet = isInformeel ? 'Groet' : 'Met vriendelijke groet';
                  const bedrijfNaam = algemeen.bedrijf_naam || 'AbelTalent';
                  const bedrijfAdres = algemeen.bedrijf_adres || 'Kosterijland 70, 3981 AJ Bunnik';
                  const bedrijfTelefoon = algemeen.bedrijf_telefoon || '+31 30 225 5660';
                  const bedrijfWebsite = algemeen.bedrijf_website || 'www.abeltalent.nl';
                  const partnerNaam = algemeen.partner_naam || 'Tafelberg Advies';
                  const partnerWebsite = algemeen.partner_website || 'www.tafelbergadvies.nl';
                  let sig = `${groet},\n${options.afzender || 'Team'}\n${bedrijfNaam}\n${bedrijfAdres}\n${bedrijfTelefoon}\n${bedrijfWebsite}\n\nIn samenwerking met ${partnerNaam}\n${partnerWebsite}`;
                  if (options.voegWhitepaperToe) {
                              const wpUrl = (content && content.algemeen && content.algemeen.whitepaper_url) || 'https://bit.ly/whitepaper-omgevingswet-abeltalent';
                              sig += `\n\nBijlage: Whitepaper Praktische Oplossingen Omgevingswet\n${wpUrl}`;
                  }
                  return sig;
        };

        // === Email 1: First Contact ===
        const generateEmail1 = () => {
                  const greeting = getGreeting();
                  const opening = getOpening();
                  let contextParagraph = "";
                  if (opening) {
                              const fallback = txt('fallback_base_story', "We helpen gemeenten met de stappen rondom de Omgevingswet.");
                              contextParagraph = baseStory ? `${opening}\n\n${baseStory}` : `${opening}\n\n${fallback}`;
                  } else {
                              contextParagraph = baseStory || txt('fallback_base_story');
                  }
                  const situationBlock = getSituationContext();
                  const kpiBlock = getKPIContext();
                  const roleBlock = getRoleBlock();
                  const cta = getCTA();
                  const signature = getSignature();
                  const extraInfo = algemeen.extra_alinea || '';
                  return [greeting, contextParagraph, situationBlock, kpiBlock, roleBlock, extraInfo, cta, signature]
                    .filter(p => p && p.trim() !== "")
                    .join('\n\n');
        };

        // === Email 2: Nudge (full body from sheet) ===
        const generateEmail2 = () => {
                  const greeting = getGreeting();
                  let body = txt('email2_body', isInformeel
                                       ? `Even een kort opvolgberichtje. Ik snap dat het druk is.\n\nToch denk ik dat we ${gemeenteNaam} echt iets kunnen bieden. Heb je deze week een kwartiertje?`
                                       : `Graag volg ik even op. Ik begrijp dat de agenda's vol zijn.\n\nDesondanks denk ik dat wij ${gemeenteNaam} concreet kunnen ondersteunen.\n\nZou u deze week gelegenheid hebben voor een kort gesprek?`);
                  // If sheet text has no paragraph breaks, add them at sentence boundaries
                  if (!body.includes('\n')) {
                              body = addParagraphBreaks(body);
                  }
                  const signature = getSignature();
                  return `${greeting}\n\n${body}\n\n${signature}`;
        };

        // === Email 3: Close (full body from sheet) ===
        const generateEmail3 = () => {
                  const greeting = getGreeting();
                  let body = txt('email3_body', isInformeel
                                       ? `Ik laat het hierbij voor nu. Mocht je later alsnog willen sparren, dan staan we altijd open. Succes!`
                                       : `Ik zal u voor nu niet verder benaderen. Mocht u in de toekomst ondersteuning wensen, dan vernemen wij dat graag.`);
                  if (!body.includes('\n')) {
                              body = addParagraphBreaks(body);
                  }
                  const signature = getSignature();
                  return `${greeting}\n\n${body}\n\n${signature}`;
        };

        const emailsBeforeEnhancement = {
                  email1: generateEmail1(),
                  email2: generateEmail2(),
                  email3: generateEmail3()
        };

        // Automatically enhance all emails with GROQ via server-side API
        const enhancementContext = {
                  tone: isInformeel ? 'informal' : 'professional',
                  recipientName: selectedContact?.naam || '',
                  gemeente: gemeenteNaam,
                                contactFunctie: selectedContact?.functie || '',
                                figures: figures,
                                sheetContent: {
                                                                emailTeksten: emailTeksten,
                                                                scoreTeksten: scoreTeksten,
                                                                functieTeksten: functieTeksten,
                                                                ctas: ctas,
                                                                baseStory: baseStory,
                                                                algemeen: algemeen,
                                }
        };

        try {
                  const response = await fetch('/api/enhanceEmails', {
                              method: 'POST',
                              headers: {
                                            'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                            emails: emailsBeforeEnhancement,
                                            context: enhancementContext,
                              }),
                  });

          if (!response.ok) {
                      console.error('Enhancement API error:', response.status);
                      return emailsBeforeEnhancement;
          }

          const enhancedEmails = await response.json();
                  return enhancedEmails;
        } catch (error) {
                  console.error('Error calling enhancement API:', error);
                  // Fallback to original emails if enhancement fails
          return emailsBeforeEnhancement;
        }
};
