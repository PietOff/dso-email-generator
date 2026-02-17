/**
 * Score meanings (HIGHER = MORE OPPORTUNITY / LESS PROGRESS):
 * 
 * Regelanalist Score:
 *   5 = Geen regelanalist (opportunity!)
 *   0 = Wel een regelanalist (good)
 * 
 * Score OLO activiteiten:
 *   5 = 0 activiteiten gedaan (opportunity!)
 *   3 = 5 of minder activiteiten gedaan
 *   0 = Alle activiteiten gedaan (good)
 * 
 * Dierlijke Mest Score (bruidsschat aanpassingen):
 *   5 = Niet doorgevoerd - wettelijk niet compliant (big opportunity!)
 *   0 = Doorgevoerd (good)
 * 
 * Omgevingsplan Score:
 *   5 = Geen omgevingsplan na bruidsschat (opportunity!)
 *   3 = Deel van omgevingsplan
 *   0 = Robuust deel van omgevingsplan (good)
 * 
 * Totale score: hoger = meer kansen voor diensten
 */

/**
 * Generates a prompt for ChatGPT based on the user's input.
 */
export function generatePrompt(baseStory, figures, options, selectedData) {
    const { kpi1, kpi2, kpi3, kpi4 } = figures;
    const context = Object.entries(options)
        .filter(([_, val]) => val)
        .map(([key]) => key === 'omgevingsplan' ? 'Omgevingsplan is aanwezig' : 'Escalatie niveau')
        .join(", ");

    const gemeenteNaam = selectedData ? selectedData.bestuursorgaan : '[Gemeente]';
    const totaalScore = selectedData ? selectedData.totaleScore : 'N/B';

    // Build contact list with functions
    let contactInfo = 'Geen contactpersonen bekend';
    if (selectedData && selectedData.contactpersonen && selectedData.contactpersonen.length > 0) {
        contactInfo = selectedData.contactpersonen
            .map(c => c.functie ? c.naam + ' (' + c.functie + ')' : c.naam)
            .join('\n- ');
        contactInfo = '- ' + contactInfo;
    }

    // Identify key roles
    let keyRoles = '';
    if (selectedData && selectedData.contactpersonen && selectedData.contactpersonen.length > 0) {
        const regelanalisten = selectedData.contactpersonen.filter(c =>
            c.functie && c.functie.toLowerCase().includes('regelanalist')
        );
        const funcBeheerders = selectedData.contactpersonen.filter(c =>
            c.functie && (c.functie.toLowerCase().includes('functioneel beheer') || c.functie.toLowerCase().includes('applicatiebeheer'))
        );
        const projectleiders = selectedData.contactpersonen.filter(c =>
            c.functie && (c.functie.toLowerCase().includes('projectleider') || c.functie.toLowerCase().includes('programmamanager'))
        );
        const roMedewerkers = selectedData.contactpersonen.filter(c =>
            c.functie && (c.functie.toLowerCase().includes('ruimtelijke') || c.functie.toLowerCase().includes('omgevingsplan'))
        );

        const roleParts = [];
        if (regelanalisten.length > 0) roleParts.push('Regelanalisten: ' + regelanalisten.map(c => c.naam).join(', '));
        if (funcBeheerders.length > 0) roleParts.push('Functioneel Beheerders: ' + funcBeheerders.map(c => c.naam).join(', '));
        if (projectleiders.length > 0) roleParts.push('Projectleiders/Programmamanagers: ' + projectleiders.map(c => c.naam).join(', '));
        if (roMedewerkers.length > 0) roleParts.push('RO/Omgevingsplan medewerkers: ' + roMedewerkers.map(c => c.naam).join(', '));

        if (roleParts.length > 0) {
            keyRoles = '\n\nBelangrijke rollen binnen deze organisatie:\n- ' + roleParts.join('\n- ');
        }
    }

    // Build score interpretation for AI
    const scoreInterpretation = [];

    if (kpi1 === '5' || kpi1 === 5) {
        scoreInterpretation.push('De verplichte bruidsschat-aanpassingen voor dierlijke mest zijn NIET doorgevoerd. Dit betekent dat ze wettelijk niet compliant zijn. Dit is een sterke haak voor onze diensten — wij kunnen deze verbeteringen doorvoeren.');
    } else if (kpi1 === '0' || kpi1 === 0) {
        scoreInterpretation.push('De bruidsschat-aanpassingen voor dierlijke mest zijn doorgevoerd. Goed gedaan.');
    }

    if (kpi2 === '5' || kpi2 === 5) {
        scoreInterpretation.push('Er is GEEN regelanalist aanwezig bij deze gemeente. Dit is een kans — wij kunnen ondersteuning bieden op het gebied van regelanalyse.');
    } else if (kpi2 === '0' || kpi2 === 0) {
        scoreInterpretation.push('Er is een regelanalist aanwezig. Goed geregeld.');
    }

    if (kpi3 !== '' && kpi3 !== null) {
        if (kpi3 === '5' || kpi3 === 5) {
            scoreInterpretation.push('Er zijn 0 VNG-aanbevolen OLO-activiteiten gedaan. Wij kunnen deze activiteiten voor hen uitvoeren.');
        } else if (kpi3 === '3' || kpi3 === 3) {
            scoreInterpretation.push('Er zijn 5 of minder VNG-aanbevolen OLO-activiteiten gedaan. Er is nog werk te doen.');
        } else if (kpi3 === '0' || kpi3 === 0) {
            scoreInterpretation.push('Alle VNG-aanbevolen OLO-activiteiten zijn gedaan. Uitstekend.');
        }
    }

    if (kpi4 !== '' && kpi4 !== null) {
        if (kpi4 === '5' || kpi4 === 5) {
            scoreInterpretation.push('Er is nog GEEN omgevingsplan na de bruidsschat gepubliceerd. Ze zijn dus nog niet ver met het omgevingsplan.');
        } else if (kpi4 === '3' || kpi4 === 3) {
            scoreInterpretation.push('Er is een deel van het omgevingsplan gepubliceerd. Er is voortgang, maar nog niet compleet.');
        } else if (kpi4 === '0' || kpi4 === 0) {
            scoreInterpretation.push('Er is een robuust omgevingsplan gepubliceerd. Goed werk.');
        }
    }

    return `Je bent een ervaren communicatieadviseur die emails schrijft namens een adviesbureau dat gemeenten helpt met de Omgevingswet.
Hier is een standaard verhaal over de DSO-lijst:
"${baseStory}"

De mail is gericht aan: ${gemeenteNaam}
Totale score: ${totaalScore}/20 (HOGER = meer aandachtspunten / kansen voor onze diensten)

Scores voor ${gemeenteNaam} (LET OP: hoog = niet gedaan/kans, laag = goed geregeld):
- Dierlijke Mest Score: ${kpi1 || 'N/B'}/5 (5 = bruidsschat niet aangepast, 0 = wel aangepast)
- Regelanalist Score: ${kpi2 || 'N/B'}/5 (5 = geen regelanalist, 0 = wel regelanalist)
- Score OLO Activiteiten: ${kpi3 || 'N/B'}/5 (5 = niets gedaan, 3 = deels, 0 = alles gedaan)
- Omgevingsplan Score: ${kpi4 || 'N/B'}/5 (5 = geen plan, 3 = deels, 0 = robuust plan)

Interpretatie van de scores:
${scoreInterpretation.join('\n')}

Extra context: ${context || 'Geen'}.

Contactpersonen bij ${gemeenteNaam}:
${contactInfo}${keyRoles}

Opdracht:
Schrijf een gepersonaliseerde email gericht aan ${gemeenteNaam}.
- Bij hoge scores (5): benoem diplomatisch dat er nog kansen liggen en bied onze hulp aan. Wees niet veroordelend, maar servicegericht.
- Bij de bruidsschat/dierlijke mest: als score 5 is, benadruk dat dit wettelijk verplicht is en dat wij dit snel kunnen regelen.
- Bij OLO-activiteiten: als score hoog is, benoem dat wij deze activiteiten voor hen kunnen doen.
- Bij lage scores (0): complimenteer kort.
- Richt je tot de juiste contactpersonen op basis van hun functie.
- Zorg voor een professionele, behulpzame toon — wij willen hen helpen, niet beschuldigen.
- Eindig met een concrete call-to-action (bijv. een afspraak plannen).`;
}

/**
 * Generates a simple template-based email (Plan B).
 */
export function generateTemplate(baseStory, figures, options, selectedData) {
    const { kpi1, kpi2, kpi3, kpi4 } = figures;
    const gemeenteNaam = selectedData ? selectedData.bestuursorgaan : '[Gemeente]';
    const totaalScore = selectedData ? parseInt(selectedData.totaleScore) : 0;

    // Find key contact
    let aanspreekpunt = '';
    if (selectedData && selectedData.contactpersonen && selectedData.contactpersonen.length > 0) {
        const lead = selectedData.contactpersonen.find(c =>
            c.functie && (c.functie.toLowerCase().includes('projectleider') ||
                c.functie.toLowerCase().includes('programmamanager') ||
                c.functie.toLowerCase().includes('coordinator'))
        );
        if (lead) {
            aanspreekpunt = lead.naam;
        } else {
            aanspreekpunt = selectedData.contactpersonen[0].naam;
        }
    }

    const aanhef = aanspreekpunt ? 'Beste ' + aanspreekpunt : 'Beste contactpersoon van ' + gemeenteNaam;

    // Build score paragraphs (INVERTED: 5 = not done = opportunity, 0 = done = good)
    const scoreParts = [];

    // Dierlijke Mest / Bruidsschat
    if (kpi1 === '0' || kpi1 === 0) {
        scoreParts.push("✅ Bruidsschat (dierlijke mest): De verplichte aanpassingen zijn doorgevoerd. Goed geregeld!");
    } else if (kpi1 === '5' || kpi1 === 5) {
        scoreParts.push("🔴 Bruidsschat (dierlijke mest): De verplichte aanpassingen zijn nog niet doorgevoerd. Dit is wettelijk verplicht. Wij kunnen deze verbeteringen snel voor u doorvoeren.");
    } else if (kpi1 !== '' && kpi1 !== null) {
        scoreParts.push("⚠️ Bruidsschat (dierlijke mest): Score " + kpi1 + "/5. Er liggen nog kansen voor verbetering.");
    }

    // Regelanalist
    if (kpi2 === '0' || kpi2 === 0) {
        scoreParts.push("✅ Regelanalist: Er is een regelanalist aanwezig. Goed geregeld!");
    } else if (kpi2 === '5' || kpi2 === 5) {
        scoreParts.push("🔴 Regelanalist: Er is nog geen regelanalist actief. Wij kunnen ondersteuning bieden op het gebied van regelanalyse en toepasbare regels.");
    } else if (kpi2 !== '' && kpi2 !== null) {
        scoreParts.push("⚠️ Regelanalist: Score " + kpi2 + "/5. Er is nog ruimte voor verbetering.");
    }

    // OLO Activiteiten
    if (kpi3 === '0' || kpi3 === 0) {
        scoreParts.push("✅ OLO-activiteiten: Alle VNG-aanbevolen activiteiten zijn uitgevoerd. Uitstekend!");
    } else if (kpi3 === '5' || kpi3 === 5) {
        scoreParts.push("🔴 OLO-activiteiten: Er zijn nog geen activiteiten uitgevoerd. Wij kunnen deze VNG-aanbevolen activiteiten voor u verzorgen.");
    } else if (kpi3 === '3' || kpi3 === 3) {
        scoreParts.push("⚠️ OLO-activiteiten: Een deel is gedaan, maar er liggen nog kansen. Wij kunnen de resterende activiteiten voor u uitvoeren.");
    } else if (kpi3 !== '' && kpi3 !== null) {
        scoreParts.push("⚠️ OLO-activiteiten: Score " + kpi3 + "/5.");
    }

    // Omgevingsplan
    if (kpi4 === '0' || kpi4 === 0) {
        scoreParts.push("✅ Omgevingsplan: Er is een robuust omgevingsplan gepubliceerd. Complimenten!");
    } else if (kpi4 === '5' || kpi4 === 5) {
        let opContact = '';
        if (selectedData && selectedData.contactpersonen) {
            const op = selectedData.contactpersonen.find(c =>
                c.functie && (c.functie.toLowerCase().includes('omgevingsplan') ||
                    c.functie.toLowerCase().includes('ruimtelijke ordening'))
            );
            if (op) opContact = ' (' + op.naam + ')';
        }
        scoreParts.push("🔴 Omgevingsplan: Er is nog geen omgevingsplan na de bruidsschat gepubliceerd." + opContact + " Wij kunnen hierbij ondersteunen.");
    } else if (kpi4 === '3' || kpi4 === 3) {
        scoreParts.push("⚠️ Omgevingsplan: Een deel is gepubliceerd, maar nog niet compleet. Wij helpen graag bij de verdere ontwikkeling.");
    } else if (kpi4 !== '' && kpi4 !== null) {
        scoreParts.push("⚠️ Omgevingsplan: Score " + kpi4 + "/5.");
    }

    // Overall sentiment (INVERTED: high total = more opportunities)
    let sentiment = "";
    if (totaalScore <= 5) {
        sentiment = "Over het geheel genomen is uw organisatie goed op weg met de Omgevingswet. Complimenten!";
    } else if (totaalScore <= 13) {
        sentiment = "Er zijn enkele aandachtspunten waar wij u graag bij helpen.";
    } else {
        sentiment = "Er liggen nog diverse kansen om de implementatie van de Omgevingswet te verbeteren. Wij denken graag met u mee en kunnen direct ondersteuning bieden.";
    }

    return `${aanhef},

${baseStory}

Specifiek voor ${gemeenteNaam} zien we het volgende (totaalscore: ${totaalScore || 'N/B'}/20):

${scoreParts.join('\n\n')}

${sentiment}

${options.escalatie ? '⚠️ Let op: dit betreft een escalatiesituatie. Wij verzoeken u spoedig contact met ons op te nemen.\n' : ''}Wij helpen u graag verder. Zullen we een afspraak plannen om de mogelijkheden te bespreken?

Met vriendelijke groet,
[Naam]`;
}
