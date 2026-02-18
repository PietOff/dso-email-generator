/**
 * DSO Email Generator — Generates complete, personalized emails
 * 
 * COMPANIES:
 * - AbelTalent: Capacity solutions & talent development for physical living environment.
 *   Based in Bunnik. Provides young professionals (traineeship), SIS8020 toolset.
 * - Tafelberg Advies (partner): Expert in regelanalyse, toepasbare regels, STTR, omgevingsplan.
 * 
 * WHITEPAPER KEY CONCEPTS:
 * - ServiceTeam Regelanalisten: joint team (AbelTalent + Tafelberg)
 * - Quick Scan Toepasbare Regels, Expert op Afroep, Regelanalist as a Service
 * - Basis op Orde → Data op Orde trajectory
 * - SIS8020: "wasstraat" for MBA data, 6x faster, developed with GlobeScope
 */

export function generateEmail(baseStory, figures, options, selectedData, selectedContact) {
    const { kpi1, kpi2, kpi3, kpi4 } = figures;
    const gemeenteNaam = selectedData ? selectedData.bestuursorgaan : '[Gemeente]';
    const afzender = options.afzender || '[Naam]';
    const isInformeel = options.toon === 'informeel';
    const isUrgent = options.toon === 'urgent';

    // --- Greeting ---
    let aanhef;
    if (selectedContact) {
        const voornaam = selectedContact.naam.split(' ')[0];
        aanhef = isInformeel ? 'Hoi ' + voornaam : 'Beste ' + selectedContact.naam;
    } else {
        if (selectedData && selectedData.contactpersonen && selectedData.contactpersonen.length > 0) {
            const lead = selectedData.contactpersonen.find(c =>
                c.functie && (c.functie.toLowerCase().includes('projectleider') ||
                    c.functie.toLowerCase().includes('programmamanager') ||
                    c.functie.toLowerCase().includes('coordinator'))
            );
            if (lead) {
                aanhef = isInformeel ? 'Hoi ' + lead.naam.split(' ')[0] : 'Beste ' + lead.naam;
            } else {
                const first = selectedData.contactpersonen[0];
                aanhef = isInformeel ? 'Hoi ' + first.naam.split(' ')[0] : 'Beste ' + first.naam;
            }
        } else {
            aanhef = isInformeel ? 'Hallo' : 'Geachte heer/mevrouw';
        }
    }

    const paragraphs = [];

    // --- Opening ---
    if (options.doel === 'follow-up') {
        paragraphs.push('Naar aanleiding van ons eerdere contact neem ik graag opnieuw contact met u op. ' + baseStory);
    } else {
        paragraphs.push(baseStory + (isInformeel
            ? '\n\nIk neem contact met je op omdat we specifiek naar de situatie van ' + gemeenteNaam + ' hebben gekeken.'
            : '\n\nGraag deel ik onze bevindingen specifiek voor ' + gemeenteNaam + ' met u.'));
    }

    // --- Function-specific personal touch ---
    if (selectedContact && selectedContact.functie) {
        const functie = selectedContact.functie.toLowerCase();
        if (functie.includes('regelanalist')) {
            paragraphs.push(isInformeel
                ? 'Als regelanalist ben jij direct betrokken bij de toepasbare regels in het Omgevingsloket. We werken veel samen met regelanalisten via ons ServiceTeam Regelanalisten — een samenwerking tussen AbelTalent en Tafelberg Advies.'
                : 'Als regelanalist bent u direct betrokken bij de toepasbare regels voor het Omgevingsloket. Via ons ServiceTeam Regelanalisten — een samenwerking tussen AbelTalent en Tafelberg Advies — ondersteunen wij regelanalisten bij gemeenten en omgevingsdiensten.');
        } else if (functie.includes('projectleider') || functie.includes('programmamanager')) {
            paragraphs.push(isInformeel
                ? 'Als ' + selectedContact.functie + ' heb jij het overzicht over de DSO-implementatie. We merken dat veel gemeenten worstelen met het gat tussen juridisch en technisch — precies daar helpen we.'
                : 'Als ' + selectedContact.functie + ' heeft u het overzicht over de Omgevingswet-implementatie. Wij zien bij veel gemeenten een kloof tussen juridische en technische afdelingen. Ons ServiceTeam helpt die verbinding te leggen.');
        } else if (functie.includes('functioneel beheer') || functie.includes('applicatiebeheer')) {
            paragraphs.push(isInformeel
                ? 'Als functioneel beheerder heb je een sleutelrol in het DSO. Van "basis op orde" naar "data op orde" — dat is het traject waar we graag bij helpen.'
                : 'Als functioneel beheerder speelt u een sleutelrol bij het Digitaal Stelsel Omgevingswet. Wij ondersteunen het traject van "basis op orde" naar "data op orde": duurzame, consistente informatie met heldere processen.');
        } else if (functie.includes('omgevingsplan') || functie.includes('ruimtelijke') || functie.includes('planoloog')) {
            paragraphs.push(isInformeel
                ? 'Gezien jouw rol bij het omgevingsplan wil ik je graag meenemen in onze analyse.'
                : 'Gezien uw betrokkenheid bij het omgevingsplan deel ik graag onze bevindingen met u. De transitie naar één integraal omgevingsplan is een omvangrijke opgave. Ons team heeft hier ruime ervaring mee.');
        } else if (functie.includes('geo') || functie.includes('gis')) {
            paragraphs.push(isInformeel
                ? 'Als GEO/GIS-specialist ben je betrokken bij de ruimtelijke data. Juist die data moet "op orde" zijn voor een werkend stelsel.'
                : 'Als GEO/GIS-specialist bent u betrokken bij de ruimtelijke data die essentieel is voor het omgevingsplan en het DSO. Het op orde brengen van deze data is cruciaal voor een werkend stelsel.');
        } else if (functie.includes('milieu') || functie.includes('vergunning')) {
            paragraphs.push(isInformeel
                ? 'Vanuit jouw rol in milieu en vergunningverlening is de Omgevingswet direct van invloed op je werk. Met onze SIS8020-tool helpen we bij MBA-data opschoning, 6x sneller dan handmatig.'
                : 'Vanuit uw rol in milieu en vergunningverlening raakt de Omgevingswet-implementatie uw werkzaamheden direct. Met onze SIS8020-tool ondersteunen wij het opschonen van MBA-data.');
        }
    }

    // --- Score-based content ---
    const goedePunten = [];
    const aandachtspunten = [];
    const diensten = [];

    if (kpi1 === '0' || kpi1 === 0) {
        goedePunten.push('de bruidsschat-aanpassingen voor dierlijke mest correct zijn doorgevoerd');
    } else if (kpi1 === '5' || kpi1 === 5) {
        aandachtspunten.push('Uit onze analyse blijkt dat de verplichte bruidsschat-aanpassingen voor dierlijke mest nog niet zijn doorgevoerd. Het gaat onder andere om de zorgplicht voor mestopslag, afstandseisen voor geur en de vergunningplicht voor grotere opslagen. Dit zijn wettelijk verplichte aanpassingen die vóór 1 januari 2032 verwerkt moeten zijn.');
        diensten.push('AbelTalent kan de bruidsschat-aanpassingen projectmatig doorvoeren. Met onze getrainde professionals en de SIS8020-tool werken we tot zes keer sneller dan traditionele methoden');
    } else if (kpi1 !== '' && kpi1 !== null && parseInt(kpi1) > 0) {
        aandachtspunten.push('Op het gebied van de bruidsschat-aanpassingen voor dierlijke mest zien we dat er nog verbeterpunten zijn.');
        diensten.push('AbelTalent kan helpen bij het afronden van de bruidsschat-aanpassingen, inclusief data-opschoning met SIS8020');
    }

    if (kpi2 === '0' || kpi2 === 0) {
        goedePunten.push('er een regelanalist actief is die de toepasbare regels beheert');
    } else if (kpi2 === '5' || kpi2 === 5) {
        aandachtspunten.push('Daarnaast valt op dat er nog geen regelanalist actief is. Een regelanalist is essentieel voor het vertalen van juridische regels naar toepasbare regels — de vragenbomen in het Omgevingsloket. Zonder deze rol kunnen inwoners geen online vergunningcheck doen.');
        diensten.push('via ons ServiceTeam Regelanalisten kunnen we direct ervaren regelanalisten inzetten, van junior tot senior niveau, ook op afroepbasis. We bieden ook een praktijkgerichte opleiding aan');
    } else if (kpi2 !== '' && kpi2 !== null && parseInt(kpi2) > 0) {
        aandachtspunten.push('Op het vlak van regelanalyse en toepasbare regels zien we dat er nog stappen te zetten zijn.');
        diensten.push('ons ServiceTeam kan ondersteuning bieden bij het verbeteren van de toepasbare regels');
    }

    if (kpi3 === '0' || kpi3 === 0) {
        goedePunten.push('alle VNG-aanbevolen topactiviteiten beschikbaar zijn in het Omgevingsloket');
    } else if (kpi3 === '5' || kpi3 === 5) {
        aandachtspunten.push('Wat verder opvalt is dat er nog geen vergunningchecks beschikbaar zijn voor de VNG-aanbevolen topactiviteiten. Zonder deze checks moeten burgers telefonisch of per mail contact opnemen.');
        diensten.push('AbelTalent en Tafelberg Advies kunnen gezamenlijk de vergunningchecks, formulieren en maatregelen opstellen en publiceren');
    } else if (kpi3 === '3' || kpi3 === 3) {
        aandachtspunten.push('In het Omgevingsloket zijn een aantal vergunningchecks beschikbaar, maar er ontbreken nog VNG-aanbevolen topactiviteiten.');
        diensten.push('wij de resterende vergunningchecks en formulieren kunnen verzorgen');
    } else if (kpi3 !== '' && kpi3 !== null && parseInt(kpi3) > 0) {
        aandachtspunten.push('Op het gebied van vergunningchecks is er nog ruimte voor verbetering.');
    }

    if (kpi4 === '0' || kpi4 === 0) {
        goedePunten.push('er een robuust omgevingsplan is gepubliceerd');
    } else if (kpi4 === '5' || kpi4 === 5) {
        aandachtspunten.push('Tot slot zien we dat er nog geen omgevingsplan is gepubliceerd na de bruidsschat. De transitie naar één integraal omgevingsplan moet vóór 1 januari 2032 afgerond zijn.');
        diensten.push('Tafelberg Advies kan ondersteunen bij het ontwikkelen van een actueel omgevingsplan, inclusief vertaling naar toepasbare regels conform STOP/TPOD');
    } else if (kpi4 === '3' || kpi4 === 3) {
        aandachtspunten.push('Het omgevingsplan is deels gepubliceerd maar nog niet compleet. Met de deadline van 2032 is het raadzaam vaart te maken.');
        diensten.push('Tafelberg Advies kan helpen bij de verdere ontwikkeling');
    } else if (kpi4 !== '' && kpi4 !== null && parseInt(kpi4) > 0) {
        aandachtspunten.push('Het omgevingsplan is nog in ontwikkeling.');
    }

    // --- Good news ---
    if (goedePunten.length > 0) {
        if (goedePunten.length === 1) {
            paragraphs.push((isInformeel ? 'Positief is dat ' : 'Het is goed om te zien dat ') + goedePunten[0] + '.');
        } else {
            const laatste = goedePunten.pop();
            paragraphs.push((isInformeel ? 'Positief is dat ' : 'Het is goed om te zien dat ') + goedePunten.join(', ') + ' en ' + laatste + '. Complimenten daarvoor.');
        }
    }

    aandachtspunten.forEach(punt => paragraphs.push(punt));

    // --- Services ---
    if (diensten.length > 0) {
        let dienstenParagraaf = isUrgent
            ? 'Gezien de tijdsdruk willen wij u erop wijzen dat '
            : isInformeel
                ? 'Mocht je hier hulp bij kunnen gebruiken: '
                : 'Wij kunnen u hierbij concreet ondersteunen. ';

        if (diensten.length === 1) {
            dienstenParagraaf += diensten[0] + '.';
        } else if (diensten.length === 2) {
            dienstenParagraaf += diensten[0] + '. Daarnaast kan ' + diensten[1] + '.';
        } else {
            const laatsteDienst = diensten.pop();
            dienstenParagraaf += diensten.join('. Daarnaast kan ') + '. Tot slot kan ' + laatsteDienst + '.';
        }
        paragraphs.push(dienstenParagraaf);
    }

    // --- CTA ---
    let cta = '';
    if (options.doel === 'quickscan') {
        cta = isInformeel
            ? 'We bieden een gratis Quick Scan Toepasbare Regels aan — een korte analyse van jullie DSO-gereedheid met concrete aanbevelingen. Lijkt je dat wat?'
            : 'Wij bieden u graag een kosteloze Quick Scan Toepasbare Regels aan: een beknopte analyse van uw DSO-gereedheid, inclusief concrete aanbevelingen. Heeft u hier interesse in?';
    } else if (options.doel === 'workshop') {
        cta = isInformeel
            ? 'We organiseren binnenkort een praktijkgerichte workshop over de Omgevingswet. Leuk als je erbij bent! Zal ik je de details sturen?'
            : 'Binnenkort organiseren wij een praktijkgerichte workshop over de implementatie van de Omgevingswet. Zal ik u de details toesturen?';
    } else if (options.doel === 'follow-up') {
        cta = isInformeel
            ? 'Ik zou graag een vervolggesprek plannen. Heb je komende week beschikbaarheid?'
            : 'Graag zou ik een vervolggesprek plannen om bovenstaande bevindingen nader te bespreken. Heeft u komende weken beschikbaarheid?';
    } else {
        cta = isInformeel
            ? 'Zullen we een keer (kort) bellen of koffiedrinken om de mogelijkheden te bespreken? Ik hoor het graag.'
            : 'Ik kom graag een keer langs of plan een kort kennismakingsgesprek in om de mogelijkheden te bespreken. Wat past u het beste?';
    }
    paragraphs.push(cta);

    const groet = isInformeel ? 'Groet' : 'Met vriendelijke groet';

    return `${aanhef},

${paragraphs.join('\n\n')}

${groet},
${afzender}
AbelTalent
Kosterijland 70, 3981 AJ Bunnik
+31 30 225 5660
www.abeltalent.nl

In samenwerking met Tafelberg Advies
www.tafelbergadvies.nl`;
}