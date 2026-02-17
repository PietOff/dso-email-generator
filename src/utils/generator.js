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
    const toon = options.toon || 'professioneel';
    const doel = options.doel || 'eerste-contact';
    const afzender = options.afzender || '[Naam]';

    const toonMap = {
        'informeel': 'Informeel en toegankelijk — schrijf alsof je een collega aanspreekt',
        'professioneel': 'Professioneel en adviserend — zakelijk maar warm',
        'urgent': 'Urgent en zakelijk — benadruk de tijdsdruk en noodzaak'
    };
    const doelMap = {
        'eerste-contact': 'Dit is een EERSTE CONTACT. Stel jezelf/abelTalent kort voor en wek interesse.',
        'follow-up': 'Dit is een FOLLOW-UP na eerder contact. Verwijs kort naar het eerdere gesprek en kom met concrete voorstellen.',
        'quickscan': 'Bied een GRATIS QUICKSCAN aan als call-to-action. Leg uit wat de quickscan inhoudt (korte analyse van hun DSO-gereedheid).',
        'workshop': 'Nodig uit voor een WORKSHOP over de Omgevingswet-implementatie als call-to-action.'
    };

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

TOON: ${toonMap[toon]}
DOEL: ${doelMap[doel]}
AFZENDER: ${afzender} (gebruik deze naam in de afsluiting)

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
- BELANGRIJK: Noem GEEN specifieke scores of cijfers in de email. De scores zijn intern. Verwijs naar de inhoud, niet naar nummers.
- Schrijf als een vloeiende, persoonlijke email — geen opsommingstekens, geen emoji's, geen rapportstructuur.
- Toon: ${toonMap[toon]}
- ${doelMap[doel]}
- Onderteken met: ${afzender}, abelTalent
- Max 300 woorden.`;
}

/**
 * Generates a complete, ready-to-send email based on scores.
 */
export function generateTemplate(baseStory, figures, options, selectedData) {
    const { kpi1, kpi2, kpi3, kpi4 } = figures;
    const gemeenteNaam = selectedData ? selectedData.bestuursorgaan : '[Gemeente]';
    const afzender = options.afzender || '[Naam]';
    const isInformeel = options.toon === 'informeel';
    const isUrgent = options.toon === 'urgent';

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

    const aanhef = isInformeel
        ? (aanspreekpunt ? 'Hoi ' + aanspreekpunt : 'Hallo')
        : (aanspreekpunt ? 'Beste ' + aanspreekpunt : 'Geachte heer/mevrouw');

    // --- Build natural flowing paragraphs ---
    const paragraphs = [];

    // Opening: base story + intro
    if (options.doel === 'follow-up') {
        paragraphs.push('Naar aanleiding van ons eerdere contact neem ik graag opnieuw contact met u op. ' + baseStory);
    } else {
        paragraphs.push(baseStory + (isInformeel
            ? '\n\nIk neem contact met je op omdat we specifiek naar de situatie van ' + gemeenteNaam + ' hebben gekeken.'
            : '\n\nGraag deel ik onze bevindingen specifiek voor ' + gemeenteNaam + ' met u.'));
    }

    // --- Score-based paragraphs as natural prose ---

    // Collect what's good and what needs attention
    const goedePunten = [];
    const aandachtspunten = [];
    const diensten = [];

    // Bruidsschat
    if (kpi1 === '0' || kpi1 === 0) {
        goedePunten.push('de bruidsschat-aanpassingen voor dierlijke mest correct zijn doorgevoerd');
    } else if (kpi1 === '5' || kpi1 === 5) {
        aandachtspunten.push('Uit onze analyse blijkt dat de verplichte bruidsschat-aanpassingen voor dierlijke mest nog niet zijn doorgevoerd bij ' + gemeenteNaam + '. Het gaat hierbij onder andere om de zorgplicht voor mestopslag, afstandseisen voor geur en de vergunningplicht voor grotere opslagen. Dit zijn wettelijk verplichte aanpassingen die vóór 1 januari 2032 verwerkt moeten zijn in het omgevingsplan.');
        diensten.push('abelTalent kan de bruidsschat-aanpassingen projectmatig en efficiënt voor u doorvoeren met onze getrainde professionals');
    } else if (kpi1 !== '' && kpi1 !== null && parseInt(kpi1) > 0) {
        aandachtspunten.push('Op het gebied van de bruidsschat-aanpassingen voor dierlijke mest zien we dat er nog verbeterpunten zijn. Niet alle verplichte aanpassingen zijn volledig doorgevoerd.');
        diensten.push('abelTalent kan helpen bij het afronden van de openstaande bruidsschat-aanpassingen');
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
        goedePunten.push('er een regelanalist actief is' + raNaam + ' die de toepasbare regels beheert');
    } else if (kpi2 === '5' || kpi2 === 5) {
        aandachtspunten.push('Daarnaast valt op dat er bij ' + gemeenteNaam + ' nog geen regelanalist actief is. Een regelanalist is essentieel voor het vertalen van juridische regels naar toepasbare regels — de vragenbomen die burgers en bedrijven gebruiken in het Omgevingsloket. Zonder deze rol kunnen inwoners geen online vergunningcheck doen.');
        diensten.push('onze partner Tafelberg Advies ervaren regelanalisten kan leveren, van junior tot senior niveau, ook op afroepbasis. Daarnaast biedt Tafelberg een praktijkgerichte opleiding als u intern capaciteit wilt opbouwen');
    } else if (kpi2 !== '' && kpi2 !== null && parseInt(kpi2) > 0) {
        aandachtspunten.push('Op het vlak van regelanalyse en toepasbare regels zien we dat er nog stappen te zetten zijn om het Omgevingsloket optimaal in te richten voor inwoners.');
        diensten.push('Tafelberg Advies kan ondersteuning bieden bij het verbeteren van de toepasbare regels');
    }

    // OLO Activiteiten
    if (kpi3 === '0' || kpi3 === 0) {
        goedePunten.push('alle VNG-aanbevolen topactiviteiten beschikbaar zijn in het Omgevingsloket');
    } else if (kpi3 === '5' || kpi3 === 5) {
        aandachtspunten.push('Wat verder opvalt is dat er nog geen vergunningchecks beschikbaar zijn in het Omgevingsloket voor de door de VNG aanbevolen topactiviteiten. Dit zijn veelvoorkomende activiteiten zoals bouwen, slopen en milieuactiviteiten. Hierdoor moeten burgers en bedrijven nu telefonisch of per mail contact opnemen, wat de dienstverlening belemmert.');
        diensten.push('abelTalent en Tafelberg Advies kunnen gezamenlijk de vergunningchecks, aanvraagformulieren en maatregelen op maat voor deze topactiviteiten opstellen');
    } else if (kpi3 === '3' || kpi3 === 3) {
        aandachtspunten.push('In het Omgevingsloket zijn een aantal vergunningchecks beschikbaar, maar er ontbreken nog diverse VNG-aanbevolen topactiviteiten.');
        diensten.push('wij de resterende vergunningchecks en formulieren voor u kunnen verzorgen');
    } else if (kpi3 !== '' && kpi3 !== null && parseInt(kpi3) > 0) {
        aandachtspunten.push('Op het gebied van OLO-activiteiten in het Omgevingsloket is er nog ruimte voor verbetering.');
    }

    // Omgevingsplan
    if (kpi4 === '0' || kpi4 === 0) {
        goedePunten.push('er een robuust omgevingsplan is gepubliceerd');
    } else if (kpi4 === '5' || kpi4 === 5) {
        aandachtspunten.push('Tot slot zien we dat ' + gemeenteNaam + ' nog geen omgevingsplan heeft gepubliceerd na de bruidsschat. Op "Regels op de kaart" zijn momenteel alleen hoofdstuk 1 en 22 zichtbaar. Gemeenten hebben tot 1 januari 2032 om het tijdelijke omgevingsplan om te zetten naar één integraal plan voor het hele grondgebied.');
        diensten.push('Tafelberg Advies kan ondersteunen bij het ontwikkelen van een actueel en werkbaar omgevingsplan, afgestemd op de specifieke situatie van uw gemeente');
    } else if (kpi4 === '3' || kpi4 === 3) {
        aandachtspunten.push('Het omgevingsplan is deels gepubliceerd, maar nog niet compleet. Met de deadline van 2032 in het vooruitzicht is het raadzaam om hier vaart achter te zetten.');
        diensten.push('Tafelberg Advies kan helpen bij de verdere ontwikkeling richting een integraal omgevingsplan');
    } else if (kpi4 !== '' && kpi4 !== null && parseInt(kpi4) > 0) {
        aandachtspunten.push('Het omgevingsplan is nog in ontwikkeling.');
    }

    // --- Compose the good news paragraph ---
    if (goedePunten.length > 0) {
        if (goedePunten.length === 1) {
            paragraphs.push((isInformeel ? 'Positief is dat ' : 'Het is goed om te zien dat ') + goedePunten[0] + '.');
        } else {
            const laatste = goedePunten.pop();
            paragraphs.push((isInformeel ? 'Positief is dat ' : 'Het is goed om te zien dat ') + goedePunten.join(', ') + ' en ' + laatste + '. Complimenten daarvoor.');
        }
    }

    // --- Add attention points as flowing paragraphs ---
    aandachtspunten.forEach(punt => {
        paragraphs.push(punt);
    });

    // --- Diensten aanbod paragraph ---
    if (diensten.length > 0) {
        let dienstenParagraaf = '';
        if (isUrgent) {
            dienstenParagraaf = 'Gezien de tijdsdruk willen wij u erop wijzen dat ';
        } else if (isInformeel) {
            dienstenParagraaf = 'Mocht je hier hulp bij kunnen gebruiken: ';
        } else {
            dienstenParagraaf = 'Concreet kunnen wij u op de volgende manieren ondersteunen: ';
        }

        if (diensten.length === 1) {
            dienstenParagraaf += diensten[0] + '.';
        } else {
            const laatsteDienst = diensten.pop();
            dienstenParagraaf += diensten.join('. Daarnaast kan ') + '. Tot slot kan ' + laatsteDienst + '.';
        }
        paragraphs.push(dienstenParagraaf);
    }

    // --- Call to action based on goal ---
    let cta = '';
    if (options.doel === 'quickscan') {
        cta = isInformeel
            ? 'We bieden een gratis quickscan aan — een korte analyse van jullie DSO-gereedheid met concrete aanbevelingen. Lijkt je dat wat? Dan plan ik graag een moment in.'
            : 'Wij bieden u graag een kosteloze quickscan aan: een beknopte analyse van uw DSO-gereedheid, inclusief concrete aanbevelingen. Heeft u hier interesse in? Dan plan ik graag een moment met u in.';
    } else if (options.doel === 'workshop') {
        cta = isInformeel
            ? 'We organiseren binnenkort een praktijkgerichte workshop over de Omgevingswet-implementatie. Leuk als je erbij bent! Zal ik je de details sturen?'
            : 'Binnenkort organiseren wij een praktijkgerichte workshop over de implementatie van de Omgevingswet. Ik nodig u hiervoor graag uit. Zal ik u de details toesturen?';
    } else if (options.doel === 'follow-up') {
        cta = isInformeel
            ? 'Ik zou graag een vervolggesprek plannen om bovenstaande punten concreet te bespreken. Heb je komende week beschikbaarheid?'
            : 'Graag zou ik een vervolggesprek plannen om bovenstaande bevindingen nader te bespreken. Heeft u komende weken beschikbaarheid voor een kort overleg?';
    } else {
        cta = isInformeel
            ? 'Zullen we een keer (kort) bellen of koffiedrinken om de mogelijkheden te bespreken? Ik hoor het graag.'
            : 'Ik kom graag een keer langs of plan een kort kennismakingsgesprek in om de mogelijkheden te bespreken. Wat past u het beste?';
    }
    paragraphs.push(cta);

    // --- Compose final email ---
    const groet = isInformeel ? 'Groet' : 'Met vriendelijke groet';

    return `${aanhef},

${paragraphs.join('\n\n')}

${groet},
${afzender}
abelTalent
Kosterijland 70, 3981 AJ Bunnik
+31 30 225 5660
www.abeltalent.nl

In samenwerking met Tafelberg Advies
www.tafelbergadvies.nl`;
}
