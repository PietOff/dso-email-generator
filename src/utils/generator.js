/**
 * DSO Email Generator — Score Interpretation & Domain Knowledge
 * 
 * SCORING (HIGHER = MORE OPPORTUNITY / LESS PROGRESS):
 * 
 * Regelanalist Score:
 *   5 = Geen regelanalist aanwezig → kans: ondersteuning bij toepasbare regels, STTR, vragenbomen
 *   0 = Wel een regelanalist → goed geregeld
 * 
 * Score OLO activiteiten (VNG topactiviteiten):
 *   5 = 0 activiteiten gedaan → kans: wij kunnen vergunningchecks, aanvraagformulieren en maatregelen op maat opstellen
 *   3 = 5 of minder activiteiten gedaan → deels, maar nog werk te doen
 *   0 = Alle activiteiten gedaan → goed geregeld
 *   Context: VNG topactiviteiten zijn de meest aangevraagde activiteiten (bouw, gebruik, milieu, sloop, etc.)
 *            Het gaat om vergunningchecks, aanvragen en maatregelen op maat in het Omgevingsloket
 * 
 * Score Dierlijke mest (bruidsschat aanpassingen):
 *   5 = Verplichte aanpassingen NIET doorgevoerd → wettelijk niet compliant! Sterke haak.
 *       Betreft: zorgplicht (art. 22.44), afstandseisen geur (art. 22.114, 22.117), 
 *       vergunningplicht (art. 22.267), opslag vaste mest (par. 22.3.23)
 *   0 = Doorgevoerd → wettelijk in orde
 *   Context: Bruidsschat = ~600 rijksregels gedecentraliseerd naar gemeenten per 1-1-2024
 *            Deadline verwerking: 1 januari 2032
 * 
 * Score omgevingsplan:
 *   5 = Geen omgevingsplan na bruidsschat → niet ver met ontwikkeling
 *   3 = Deel van omgevingsplan gepubliceerd
 *   0 = Robuust deel van omgevingsplan → goed op weg
 *   Context: Elke gemeente heeft tijdelijk omgevingsplan (bestaande bestemmingsplannen + bruidsschat)
 *            Moet vóór 2032 omgezet naar één integraal omgevingsplan voor heel het grondgebied
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

    // Build detailed score interpretation
    const scoreInterpretation = [];

    if (kpi1 === '5' || kpi1 === 5) {
        scoreInterpretation.push('BRUIDSSCHAT / DIERLIJKE MEST (score 5 = NIET doorgevoerd): De verplichte aanpassingen in de bruidsschat zijn niet doorgevoerd. Dit betreft onder andere de zorgplicht mestopslag (art. 22.44), afstandseisen geur (art. 22.114 en 22.117), vergunningplicht grotere mestopslagen (art. 22.267), en regels opslag vaste mest (par. 22.3.23). Dit is WETTELIJK VERPLICHT — de gemeente is momenteel niet compliant. Dit is een sterke haak voor onze diensten: wij kunnen al deze verbeteringen in de bruidsschat doorvoeren.');
    } else if (kpi1 === '0' || kpi1 === 0) {
        scoreInterpretation.push('BRUIDSSCHAT / DIERLIJKE MEST (score 0 = wél doorgevoerd): De verplichte bruidsschat-aanpassingen zijn correct doorgevoerd. Complimenten.');
    }

    if (kpi2 === '5' || kpi2 === 5) {
        scoreInterpretation.push('REGELANALIST (score 5 = GEEN regelanalist): Er is geen regelanalist actief bij deze gemeente. Een regelanalist vertaalt juridische regels naar toepasbare regels (vragenbomen) voor het Omgevingsloket via de STTR-standaard. Zonder regelanalist kan de gemeente geen vergunningchecks, aanvraagformulieren of maatregelen op maat aanbieden in het DSO. Wij kunnen deze rol (deels) vervullen.');
    } else if (kpi2 === '0' || kpi2 === 0) {
        scoreInterpretation.push('REGELANALIST (score 0 = wél aanwezig): Er is een regelanalist actief. Goed geregeld.');
    }

    if (kpi3 !== '' && kpi3 !== null) {
        if (kpi3 === '5' || kpi3 === 5) {
            scoreInterpretation.push('OLO ACTIVITEITEN (score 5 = 0 activiteiten gedaan): Er zijn GEEN VNG-aanbevolen topactiviteiten uitgevoerd. Dit zijn de activiteiten waarvoor het meest vergunningen worden aangevraagd — denk aan bouw, gebruik, milieu, sloop en rijksmonumenten. Zonder deze activiteiten in het Omgevingsloket moeten burgers en bedrijven telefonisch of per mail contact opnemen, wat de dienstverlening verslechtert. Wij kunnen vergunningchecks, aanvraagformulieren en maatregelen op maat voor al deze topactiviteiten opstellen.');
        } else if (kpi3 === '3' || kpi3 === 3) {
            scoreInterpretation.push('OLO ACTIVITEITEN (score 3 = 5 of minder gedaan): Een deel van de VNG-aanbevolen topactiviteiten is uitgevoerd, maar er is nog werk te doen. Wij kunnen de resterende vergunningchecks en formulieren verzorgen.');
        } else if (kpi3 === '0' || kpi3 === 0) {
            scoreInterpretation.push('OLO ACTIVITEITEN (score 0 = alles gedaan): Alle VNG-aanbevolen topactiviteiten zijn uitgevoerd. Uitstekend.');
        }
    }

    if (kpi4 !== '' && kpi4 !== null) {
        if (kpi4 === '5' || kpi4 === 5) {
            scoreInterpretation.push('OMGEVINGSPLAN (score 5 = GEEN plan na bruidsschat): Er is nog geen omgevingsplan na de bruidsschat gepubliceerd. De gemeente werkt dus nog met het tijdelijke omgevingsplan (oude bestemmingsplannen + bruidsschat). Ze hebben tot 1 januari 2032 om één integraal omgevingsplan voor het hele grondgebied op te stellen. Op "Regels op de kaart" zal je alleen hoofdstuk 1 en 22 zien. Wij kunnen ondersteunen bij het opstellen en publiceren van het omgevingsplan.');
        } else if (kpi4 === '3' || kpi4 === 3) {
            scoreInterpretation.push('OMGEVINGSPLAN (score 3 = deels gepubliceerd): Een deel van het omgevingsplan is gepubliceerd. Er is voortgang, maar het plan is nog niet compleet. Wij kunnen helpen bij verdere ontwikkeling richting een robuust omgevingsplan vóór de deadline van 2032.');
        } else if (kpi4 === '0' || kpi4 === 0) {
            scoreInterpretation.push('OMGEVINGSPLAN (score 0 = robuust plan): Er is een robuust omgevingsplan gepubliceerd. Goed werk, de gemeente loopt voorop.');
        }
    }

    return `Je bent een ervaren communicatieadviseur die emails schrijft namens een adviesbureau dat gemeenten helpt met de implementatie van de Omgevingswet en het DSO (Digitaal Stelsel Omgevingswet).

ACHTERGROND:
De Omgevingswet is op 1 januari 2024 in werking getreden. Gemeenten hebben tot 1 januari 2032 om hun tijdelijke omgevingsplan (bestaande bestemmingsplannen + de bruidsschat van ~600 rijksregels) om te zetten naar één integraal omgevingsplan. De bruidsschat bevat gedecentraliseerde rijksregels over o.a. geluid, geur, trillingen, bodem en mestopslag. Gemeenten moeten ook toepasbare regels (vragenbomen) opstellen voor het Omgevingsloket, zodat burgers en bedrijven online vergunningchecks kunnen doen.

Hier is een standaard verhaal over de DSO-lijst:
"${baseStory}"

De mail is gericht aan: ${gemeenteNaam}
Totale score: ${totaalScore}/20 (HOGER = meer aandachtspunten / meer kansen voor onze diensten)

Gedetailleerde scores en interpretatie voor ${gemeenteNaam}:
${scoreInterpretation.join('\n\n')}

Extra context: ${context || 'Geen'}.

Contactpersonen bij ${gemeenteNaam}:
${contactInfo}${keyRoles}

OPDRACHT:
Schrijf een gepersonaliseerde, professionele email gericht aan ${gemeenteNaam}.
- Richt je tot de juiste contactpersoon op basis van hun functie (bijv. projectleider omgevingsplan, regelanalist, functioneel beheerder).
- Bij hoge scores: benoem diplomatisch dat er kansen liggen en bied concreet onze hulp aan. Noem specifiek wát wij kunnen doen.
- Bij de bruidsschat/dierlijke mest score 5: benadruk dat dit WETTELIJK VERPLICHT is en dat wij dit snel kunnen regelen. Noem de specifieke artikelen als dat passend is.
- Bij OLO-activiteiten score 5: leg uit dat dit impact heeft op de dienstverlening aan burgers en bedrijven, en dat wij de vergunningchecks en formulieren kunnen opstellen.
- Bij omgevingsplan score 5: verwijs naar de deadline van 2032 en bied ondersteuning.
- Bij lage scores (0): complimenteer kort en oprecht.
- Zorg voor een professionele maar toegankelijke, behulpzame toon — wij zijn een partner, geen controleur.
- Eindig met een concrete call-to-action (bijv. een kennismakingsgesprek of workshop plannen).
- Houd de email beknopt maar impactvol (max 300 woorden).`;
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
    let aanspreekFunctie = '';
    if (selectedData && selectedData.contactpersonen && selectedData.contactpersonen.length > 0) {
        const lead = selectedData.contactpersonen.find(c =>
            c.functie && (c.functie.toLowerCase().includes('projectleider') ||
                c.functie.toLowerCase().includes('programmamanager') ||
                c.functie.toLowerCase().includes('coordinator'))
        );
        if (lead) {
            aanspreekpunt = lead.naam;
            aanspreekFunctie = lead.functie;
        } else {
            aanspreekpunt = selectedData.contactpersonen[0].naam;
            aanspreekFunctie = selectedData.contactpersonen[0].functie || '';
        }
    }

    const aanhef = aanspreekpunt ? 'Beste ' + aanspreekpunt : 'Beste contactpersoon van ' + gemeenteNaam;

    // Build score paragraphs with rich context
    const scoreParts = [];

    // Dierlijke Mest / Bruidsschat
    if (kpi1 === '0' || kpi1 === 0) {
        scoreParts.push("✅ **Bruidsschat (dierlijke mest):** De verplichte aanpassingen (o.a. zorgplicht mestopslag, afstandseisen geur, vergunningplicht) zijn doorgevoerd. Goed geregeld!");
    } else if (kpi1 === '5' || kpi1 === 5) {
        scoreParts.push("🔴 **Bruidsschat (dierlijke mest):** De verplichte aanpassingen in de bruidsschat zijn nog niet doorgevoerd. Dit betreft onder andere de zorgplicht mestopslag (art. 22.44), afstandseisen voor geur (art. 22.114 en 22.117) en de vergunningplicht voor grotere mestopslagen (art. 22.267). Dit is wettelijk verplicht en moet vóór 1 januari 2032 verwerkt zijn in uw omgevingsplan. Wij kunnen deze verbeteringen snel en zorgvuldig voor u doorvoeren.");
    } else if (kpi1 !== '' && kpi1 !== null) {
        scoreParts.push("⚠️ **Bruidsschat (dierlijke mest):** Score " + kpi1 + "/5. Er liggen nog kansen voor verbetering bij de verwerking van de bruidsschat-aanpassingen.");
    }

    // Regelanalist
    if (kpi2 === '0' || kpi2 === 0) {
        // Find the regelanalist name
        let raNaam = '';
        if (selectedData && selectedData.contactpersonen) {
            const ra = selectedData.contactpersonen.find(c =>
                c.functie && c.functie.toLowerCase().includes('regelanalist')
            );
            if (ra) raNaam = ' (' + ra.naam + ')';
        }
        scoreParts.push("✅ **Regelanalist:** Er is een regelanalist actief" + raNaam + " die toepasbare regels (vragenbomen) opstelt voor het Omgevingsloket. Goed geregeld!");
    } else if (kpi2 === '5' || kpi2 === 5) {
        scoreParts.push("🔴 **Regelanalist:** Er is nog geen regelanalist actief. Een regelanalist vertaalt juridische regels naar toepasbare regels voor het Omgevingsloket — zonder deze rol kunnen burgers en bedrijven geen vergunningchecks online uitvoeren. Wij kunnen ondersteuning bieden in de vorm van regelanalyse, het opstellen van toepasbare regels conform de STTR-standaard, en het inrichten van vragenbomen.");
    } else if (kpi2 !== '' && kpi2 !== null) {
        scoreParts.push("⚠️ **Regelanalist:** Score " + kpi2 + "/5. Er is nog ruimte voor verbetering op het gebied van toepasbare regels.");
    }

    // OLO Activiteiten
    if (kpi3 === '0' || kpi3 === 0) {
        scoreParts.push("✅ **OLO-activiteiten (VNG topactiviteiten):** Alle aanbevolen vergunningchecks en formulieren zijn beschikbaar in het Omgevingsloket. Uitstekend voor de dienstverlening aan uw inwoners!");
    } else if (kpi3 === '5' || kpi3 === 5) {
        scoreParts.push("🔴 **OLO-activiteiten (VNG topactiviteiten):** Er zijn nog geen activiteiten beschikbaar in het Omgevingsloket. Dit betekent dat burgers en bedrijven geen online vergunningcheck kunnen doen voor veelvoorkomende activiteiten zoals bouwen, slopen of milieuactiviteiten. Wij kunnen de vergunningchecks, aanvraagformulieren en maatregelen op maat voor alle topactiviteiten voor u opstellen en publiceren.");
    } else if (kpi3 === '3' || kpi3 === 3) {
        scoreParts.push("⚠️ **OLO-activiteiten (VNG topactiviteiten):** Een deel is gedaan (5 of minder), maar er zijn nog activiteiten die ontbreken in het Omgevingsloket. Wij kunnen de resterende vergunningchecks en formulieren voor u verzorgen.");
    } else if (kpi3 !== '' && kpi3 !== null) {
        scoreParts.push("⚠️ **OLO-activiteiten:** Score " + kpi3 + "/5.");
    }

    // Omgevingsplan
    if (kpi4 === '0' || kpi4 === 0) {
        scoreParts.push("✅ **Omgevingsplan:** Er is een robuust omgevingsplan gepubliceerd. Uw gemeente loopt voorop in de transitie naar een integraal omgevingsplan. Complimenten!");
    } else if (kpi4 === '5' || kpi4 === 5) {
        let opContact = '';
        if (selectedData && selectedData.contactpersonen) {
            const op = selectedData.contactpersonen.find(c =>
                c.functie && (c.functie.toLowerCase().includes('omgevingsplan') ||
                    c.functie.toLowerCase().includes('ruimtelijke ordening') ||
                    c.functie.toLowerCase().includes('planoloog'))
            );
            if (op) opContact = ' Wellicht kan ' + op.naam + ' (' + op.functie + ') hier een rol in spelen.';
        }
        scoreParts.push("🔴 **Omgevingsplan:** Er is nog geen omgevingsplan na de bruidsschat gepubliceerd. Op \"Regels op de kaart\" zijn alleen hoofdstuk 1 en 22 zichtbaar. Uw gemeente werkt nog met het tijdelijke omgevingsplan en heeft tot 1 januari 2032 om dit om te zetten naar een integraal plan." + opContact + " Wij kunnen ondersteunen bij het opstellen, annoteren en publiceren van uw omgevingsplan.");
    } else if (kpi4 === '3' || kpi4 === 3) {
        scoreParts.push("⚠️ **Omgevingsplan:** Een deel is gepubliceerd, maar het plan is nog niet compleet. De deadline van 1 januari 2032 nadert — wij helpen graag bij de verdere ontwikkeling naar een robuust, integraal omgevingsplan.");
    } else if (kpi4 !== '' && kpi4 !== null) {
        scoreParts.push("⚠️ **Omgevingsplan:** Score " + kpi4 + "/5.");
    }

    // Overall sentiment
    let sentiment = "";
    if (totaalScore <= 5) {
        sentiment = "Over het geheel genomen is uw organisatie goed op weg met de implementatie van de Omgevingswet en het DSO. Complimenten aan het hele team!";
    } else if (totaalScore <= 13) {
        sentiment = "Er zijn enkele aandachtspunten waar wij u graag bij ondersteunen. Met gerichte actie kunt u snel stappen zetten.";
    } else {
        sentiment = "Er liggen diverse kansen om de implementatie van de Omgevingswet te verbeteren. Dit is niet ongewoon — veel gemeenten worstelen nog met de transitie. Wij denken graag met u mee en kunnen direct ondersteuning bieden op alle genoemde punten.";
    }

    return `${aanhef},

${baseStory}

Specifiek voor ${gemeenteNaam} zien we het volgende (totaalscore: ${totaalScore || 'N/B'}/20):

${scoreParts.join('\n\n')}

${sentiment}

${options.escalatie ? '⚠️ Let op: dit betreft een escalatiesituatie. Wij verzoeken u spoedig contact met ons op te nemen.\n\n' : ''}Wij helpen u graag verder. Zullen we een kennismakingsgesprek of een korte workshop plannen om de mogelijkheden te bespreken?

Met vriendelijke groet,
[Naam]`;
}
