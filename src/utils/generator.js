/**
 * DSO Email Generator — Score Interpretation & Domain Knowledge
 * 
 * COMPANIES:
 * - abelTalent: Capacity solutions & talent development for physical living environment.
 *   Based in Bunnik. Provides young professionals (traineeship), SIS8020 toolset, VIA software
 *   for MBA registration. Focuses on data, digitalization, and project-based support.
 * - Tafelberg Advies (partner): Expert in regelanalyse, toepasbare regels, STTR, omgevingsplan.
 *   Provides experienced regelanalisten (junior to senior + on-call), training/e-learning,
 *   regelbeheer, interbestuurlijke afstemming, and omgevingsplan development.
 * 
 * SCORING (HIGHER = MORE OPPORTUNITY / LESS PROGRESS):
 * 
 * Regelanalist Score:
 *   5 = Geen regelanalist → Tafelberg Advies kan regelanalisten leveren + abelTalent kan capaciteit bieden
 *   0 = Wel een regelanalist → goed geregeld
 * 
 * Score OLO activiteiten (VNG topactiviteiten):
 *   5 = 0 activiteiten gedaan → Tafelberg kan vergunningchecks, formulieren, maatregelen op maat opstellen
 *   3 = 5 of minder activiteiten gedaan
 *   0 = Alle activiteiten gedaan
 * 
 * Score Dierlijke mest (bruidsschat aanpassingen):
 *   5 = Niet doorgevoerd → wettelijk niet compliant! abelTalent kan bruidsschat-verbeteringen doorvoeren
 *   0 = Doorgevoerd
 * 
 * Score omgevingsplan:
 *   5 = Geen omgevingsplan na bruidsschat → Tafelberg kan ondersteunen bij omgevingsplan
 *   3 = Deel van omgevingsplan
 *   0 = Robuust deel van omgevingsplan
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
        const geoMedewerkers = selectedData.contactpersonen.filter(c =>
            c.functie && (c.functie.toLowerCase().includes('geo') || c.functie.toLowerCase().includes('gis'))
        );

        const roleParts = [];
        if (regelanalisten.length > 0) roleParts.push('Regelanalisten: ' + regelanalisten.map(c => c.naam).join(', '));
        if (funcBeheerders.length > 0) roleParts.push('Functioneel Beheerders: ' + funcBeheerders.map(c => c.naam).join(', '));
        if (projectleiders.length > 0) roleParts.push('Projectleiders/Programmamanagers: ' + projectleiders.map(c => c.naam).join(', '));
        if (roMedewerkers.length > 0) roleParts.push('RO/Omgevingsplan medewerkers: ' + roMedewerkers.map(c => c.naam).join(', '));
        if (geoMedewerkers.length > 0) roleParts.push('GEO/GIS medewerkers: ' + geoMedewerkers.map(c => c.naam).join(', '));

        if (roleParts.length > 0) {
            keyRoles = '\n\nBelangrijke rollen binnen deze organisatie:\n- ' + roleParts.join('\n- ');
        }
    }

    // Build detailed score interpretation
    const scoreInterpretation = [];

    if (kpi1 === '5' || kpi1 === 5) {
        scoreInterpretation.push('BRUIDSSCHAT / DIERLIJKE MEST (score 5 = NIET doorgevoerd): De verplichte aanpassingen in de bruidsschat zijn niet doorgevoerd. Dit betreft onder andere de zorgplicht mestopslag (art. 22.44), afstandseisen geur (art. 22.114 en 22.117), vergunningplicht grotere mestopslagen (art. 22.267), en regels opslag vaste mest (par. 22.3.23). Dit is WETTELIJK VERPLICHT. abelTalent kan deze verbeteringen projectmatig en met inzet van getrainde professionals snel doorvoeren.');
    } else if (kpi1 === '0' || kpi1 === 0) {
        scoreInterpretation.push('BRUIDSSCHAT / DIERLIJKE MEST (score 0 = wél doorgevoerd): Correct doorgevoerd. Complimenten.');
    }

    if (kpi2 === '5' || kpi2 === 5) {
        scoreInterpretation.push('REGELANALIST (score 5 = GEEN regelanalist): Er is geen regelanalist actief. Een regelanalist vertaalt juridische regels naar toepasbare regels (vragenbomen) voor het Omgevingsloket via de STTR-standaard. Tafelberg Advies (onze partner) kan ervaren regelanalisten leveren — van junior tot senior, ook op afroepbasis. Daarnaast biedt Tafelberg een praktijkgerichte opleiding voor regelanalisten (e-learning + praktijkdag).');
    } else if (kpi2 === '0' || kpi2 === 0) {
        scoreInterpretation.push('REGELANALIST (score 0 = wél aanwezig): Er is een regelanalist actief. Goed geregeld. Tafelberg Advies kan eventueel ondersteuning bieden bij regelbeheer of interbestuurlijke afstemming.');
    }

    if (kpi3 !== '' && kpi3 !== null) {
        if (kpi3 === '5' || kpi3 === 5) {
            scoreInterpretation.push('OLO ACTIVITEITEN (score 5 = 0 activiteiten gedaan): Er zijn GEEN VNG-aanbevolen topactiviteiten uitgevoerd. Dit zijn de activiteiten waarvoor het meest vergunningen worden aangevraagd — bouw, gebruik, milieu, sloop, rijksmonumenten. Zonder deze zijn vergunningchecks niet online beschikbaar voor burgers en bedrijven. abelTalent en Tafelberg Advies kunnen gezamenlijk de vergunningchecks, aanvraagformulieren en maatregelen op maat opstellen en publiceren in het Omgevingsloket.');
        } else if (kpi3 === '3' || kpi3 === 3) {
            scoreInterpretation.push('OLO ACTIVITEITEN (score 3 = 5 of minder gedaan): Een deel is gedaan, maar veel VNG-aanbevolen topactiviteiten ontbreken nog. Wij kunnen de resterende vergunningchecks en formulieren verzorgen.');
        } else if (kpi3 === '0' || kpi3 === 0) {
            scoreInterpretation.push('OLO ACTIVITEITEN (score 0 = alles gedaan): Alle topactiviteiten zijn uitgevoerd. Uitstekend.');
        }
    }

    if (kpi4 !== '' && kpi4 !== null) {
        if (kpi4 === '5' || kpi4 === 5) {
            scoreInterpretation.push('OMGEVINGSPLAN (score 5 = GEEN plan na bruidsschat): Er is nog geen omgevingsplan gepubliceerd na de bruidsschat. Op "Regels op de kaart" zijn alleen hoofdstuk 1 en 22 zichtbaar. De gemeente heeft tot 1 januari 2032. Tafelberg Advies kan ondersteunen bij het opstellen van een actueel, toepasbaar en werkbaar omgevingsplan, afgestemd op de specifieke situatie van de gemeente.');
        } else if (kpi4 === '3' || kpi4 === 3) {
            scoreInterpretation.push('OMGEVINGSPLAN (score 3 = deels gepubliceerd): Er is voortgang, maar het plan is nog niet compleet. Tafelberg Advies kan helpen bij verdere ontwikkeling richting een integraal omgevingsplan vóór 2032.');
        } else if (kpi4 === '0' || kpi4 === 0) {
            scoreInterpretation.push('OMGEVINGSPLAN (score 0 = robuust plan): Robuust omgevingsplan gepubliceerd. De gemeente loopt voorop.');
        }
    }

    return `Je bent een ervaren communicatieadviseur die emails schrijft namens abelTalent en haar partner Tafelberg Advies.

OVER ABELTALENT:
abelTalent is gevestigd in Bunnik en biedt capaciteitsoplossingen en talentontwikkeling in de fysieke leefomgeving. Ze zetten getrainde jonge professionals in via een tweejarig traineeship voor projectmatig werk bij o.a. gemeenten en omgevingsdiensten. abelTalent heeft de toolset SIS8020 ontwikkeld (i.s.m. GlobeScope) voor milieubelastende activiteiten, en de softwaretool VIA voor vertaling van inrichtingen naar MBA's. Ze helpen bij het op orde brengen van data, digitalisering en informatiegestuurd beleid.

OVER TAFELBERG ADVIES (partner):
Tafelberg Advies is expert in regelanalyse voor de Omgevingswet. Ze leveren ervaren regelanalisten (junior tot senior, ook op afroep), bieden een praktijkgerichte opleiding voor regelanalisten (e-learning + praktijkdag), ondersteunen bij regelbeheer en interbestuurlijke afstemming, en helpen bij het opstellen van omgevingsplannen. Ze hebben brede ervaring, juridische én technische expertise.

ACHTERGROND OMGEVINGSWET:
De Omgevingswet is op 1 januari 2024 in werking getreden. Gemeenten hebben tot 1 januari 2032 om hun tijdelijke omgevingsplan (bestaande bestemmingsplannen + de bruidsschat van ~600 rijksregels) om te zetten naar één integraal omgevingsplan. De bruidsschat bevat gedecentraliseerde rijksregels over o.a. geluid, geur, trillingen, bodem en mestopslag. Gemeenten moeten ook toepasbare regels (vragenbomen conform STTR-standaard) opstellen voor het Omgevingsloket.

Standaard verhaal:
"${baseStory}"

De mail is gericht aan: ${gemeenteNaam}
Totale score: ${totaalScore}/20 (HOGER = meer aandachtspunten / meer kansen)

Gedetailleerde scores en interpretatie voor ${gemeenteNaam}:
${scoreInterpretation.join('\n\n')}

Extra context: ${context || 'Geen'}.

Contactpersonen bij ${gemeenteNaam}:
${contactInfo}${keyRoles}

OPDRACHT:
Schrijf een gepersonaliseerde, professionele email namens abelTalent gericht aan ${gemeenteNaam}.
- Richt je tot de juiste contactpersoon op basis van hun functie.
- Bij hoge scores: benoem diplomatisch de kansen en bied concreet aan wat abelTalent en/of Tafelberg Advies kan doen.
- Wees specifiek over de dienst die past bij het probleem:
  • Bruidsschat niet doorgevoerd → abelTalent kan projectmatig de verbeteringen doorvoeren met getrainde professionals
  • Geen regelanalist → Tafelberg Advies kan regelanalisten leveren of een opleiding verzorgen
  • OLO niet gedaan → samen kunnen we vergunningchecks en formulieren opstellen
  • Geen omgevingsplan → Tafelberg Advies ondersteunt bij omgevingsplanontwikkeling
- Bij lage scores (0): complimenteer kort.
- Toon: professioneel, behulpzaam, partnerschap — niet veroordelend of verkoopachtig.
- Eindig met een concrete call-to-action (kennismakingsgesprek, quickscan, of workshop).
- Max 300 woorden.`;
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

    // Build score paragraphs with company-specific offerings
    const scoreParts = [];

    // Dierlijke Mest / Bruidsschat
    if (kpi1 === '0' || kpi1 === 0) {
        scoreParts.push("✅ **Bruidsschat (dierlijke mest):** De verplichte aanpassingen (zorgplicht, afstandseisen, vergunningplicht) zijn doorgevoerd. Goed geregeld!");
    } else if (kpi1 === '5' || kpi1 === 5) {
        scoreParts.push("🔴 **Bruidsschat (dierlijke mest):** De verplichte aanpassingen zijn nog niet doorgevoerd. Dit betreft o.a. de zorgplicht mestopslag (art. 22.44), afstandseisen geur (art. 22.114/22.117) en vergunningplicht (art. 22.267). Dit is wettelijk verplicht en moet vóór 2032 verwerkt zijn. abelTalent kan dit projectmatig en snel voor u oppakken met onze getrainde professionals.");
    } else if (kpi1 !== '' && kpi1 !== null) {
        scoreParts.push("⚠️ **Bruidsschat (dierlijke mest):** Score " + kpi1 + "/5. Er zijn nog verbeterpunten bij de verwerking van de bruidsschat.");
    }

    // Regelanalist
    if (kpi2 === '0' || kpi2 === 0) {
        let raNaam = '';
        if (selectedData && selectedData.contactpersonen) {
            const ra = selectedData.contactpersonen.find(c =>
                c.functie && c.functie.toLowerCase().includes('regelanalist')
            );
            if (ra) raNaam = ' (' + ra.naam + ')';
        }
        scoreParts.push("✅ **Regelanalist:** Er is een regelanalist actief" + raNaam + ". Goed geregeld! Mocht u behoefte hebben aan extra ondersteuning of interbestuurlijke afstemming, dan kan onze partner Tafelberg Advies hierbij helpen.");
    } else if (kpi2 === '5' || kpi2 === 5) {
        scoreParts.push("🔴 **Regelanalist:** Er is nog geen regelanalist actief. Hierdoor ontbreken toepasbare regels (vragenbomen) in het Omgevingsloket en kunnen burgers geen online vergunningcheck doen. Onze partner Tafelberg Advies kan ervaren regelanalisten inzetten — van junior tot senior, ook op afroepbasis. Daarnaast biedt Tafelberg een praktijkgerichte opleiding (e-learning + praktijkdag) als u intern capaciteit wilt opbouwen.");
    } else if (kpi2 !== '' && kpi2 !== null) {
        scoreParts.push("⚠️ **Regelanalist:** Score " + kpi2 + "/5. Er is ruimte voor verbetering op het gebied van toepasbare regels.");
    }

    // OLO Activiteiten
    if (kpi3 === '0' || kpi3 === 0) {
        scoreParts.push("✅ **OLO-activiteiten (VNG topactiviteiten):** Alle aanbevolen vergunningchecks en formulieren zijn beschikbaar. Uitstekend voor de dienstverlening!");
    } else if (kpi3 === '5' || kpi3 === 5) {
        scoreParts.push("🔴 **OLO-activiteiten (VNG topactiviteiten):** Er zijn nog geen activiteiten beschikbaar in het Omgevingsloket. Burgers en bedrijven kunnen daardoor geen online vergunningcheck doen voor veelvoorkomende activiteiten (bouwen, slopen, milieu). abelTalent en Tafelberg Advies kunnen gezamenlijk de vergunningchecks, aanvraagformulieren en maatregelen op maat voor u opstellen.");
    } else if (kpi3 === '3' || kpi3 === 3) {
        scoreParts.push("⚠️ **OLO-activiteiten:** Een deel is gedaan, maar er ontbreken nog activiteiten in het Omgevingsloket. Wij kunnen de resterende vergunningchecks en formulieren verzorgen.");
    } else if (kpi3 !== '' && kpi3 !== null) {
        scoreParts.push("⚠️ **OLO-activiteiten:** Score " + kpi3 + "/5.");
    }

    // Omgevingsplan
    if (kpi4 === '0' || kpi4 === 0) {
        scoreParts.push("✅ **Omgevingsplan:** Robuust omgevingsplan gepubliceerd. Uw gemeente loopt voorop! Complimenten.");
    } else if (kpi4 === '5' || kpi4 === 5) {
        let opContact = '';
        if (selectedData && selectedData.contactpersonen) {
            const op = selectedData.contactpersonen.find(c =>
                c.functie && (c.functie.toLowerCase().includes('omgevingsplan') ||
                    c.functie.toLowerCase().includes('ruimtelijke ordening') ||
                    c.functie.toLowerCase().includes('planoloog'))
            );
            if (op) opContact = ' (' + op.naam + ')';
        }
        scoreParts.push("🔴 **Omgevingsplan:** Er is nog geen omgevingsplan na de bruidsschat gepubliceerd — op \"Regels op de kaart\" zijn alleen hoofdstuk 1 en 22 zichtbaar." + opContact + " De deadline is 1 januari 2032. Onze partner Tafelberg Advies kan ondersteunen bij het opstellen van een actueel, toepasbaar en werkbaar omgevingsplan, afgestemd op uw specifieke situatie.");
    } else if (kpi4 === '3' || kpi4 === 3) {
        scoreParts.push("⚠️ **Omgevingsplan:** Deels gepubliceerd, maar nog niet compleet. Tafelberg Advies helpt graag bij de verdere ontwikkeling richting een integraal omgevingsplan.");
    } else if (kpi4 !== '' && kpi4 !== null) {
        scoreParts.push("⚠️ **Omgevingsplan:** Score " + kpi4 + "/5.");
    }

    // Overall sentiment
    let sentiment = "";
    if (totaalScore <= 5) {
        sentiment = "Over het geheel genomen is uw organisatie goed op weg met de Omgevingswet. Complimenten aan het hele team!";
    } else if (totaalScore <= 13) {
        sentiment = "Er zijn enkele aandachtspunten waar wij u graag bij ondersteunen. Met gerichte actie kunt u snel stappen zetten.";
    } else {
        sentiment = "Er liggen diverse kansen om de implementatie te verbeteren. Dit is niet ongewoon — veel gemeenten worstelen met de transitie. abelTalent en Tafelberg Advies denken graag met u mee.";
    }

    return `${aanhef},

${baseStory}

Specifiek voor ${gemeenteNaam} zien we het volgende (totaalscore: ${totaalScore || 'N/B'}/20):

${scoreParts.join('\n\n')}

${sentiment}

${options.escalatie ? '⚠️ Let op: dit betreft een escalatiesituatie. Wij verzoeken u spoedig contact met ons op te nemen.\n\n' : ''}Wij helpen u graag verder. Zullen we een kennismakingsgesprek plannen om de mogelijkheden te bespreken?

Met vriendelijke groet,
[Naam]
abelTalent
Kosterijland 70, 3981 AJ Bunnik
+31 30 225 5660
www.abeltalent.nl

In samenwerking met Tafelberg Advies
www.tafelbergadvies.nl`;
}
