import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// 1. DATA DEFINITIONS
const functionTexts = [
    {
        functie_keyword: "regelanalist",
        tekst_professioneel: "Als regelanalist bent u direct betrokken bij het vertalen van juridische regels naar toepasbare regels voor het Omgevingsloket. Via ons ServiceTeam Regelanalisten ondersteunen wij regelanalisten bij gemeenten en omgevingsdiensten met een pool van ervaren specialisten. Met onze SIS8020 toolset kunnen regels tot 6x sneller worden verwerkt dan met handmatige methoden, wat resulteert in hogere kwaliteit en lagere werkdruk.",
        tekst_informeel: "Als regelanalist ben jij direct betrokken bij het vertalen van juridische regels naar toepasbare regels in het Omgevingsloket. We werken veel samen met regelanalisten via ons ServiceTeam Regelanalisten — een pool van ervaren specialisten die gemeenten en omgevingsdiensten ondersteunen. Met de SIS8020 toolset kunnen we regels tot 6x sneller verwerken dan met handmatige methoden. Dat betekent minder werkdruk en meer kwaliteit.",
        opmerkingen: ""
    },
    {
        functie_keyword: "projectleider",
        tekst_professioneel: "Als projectleider heeft u het overzicht over de Omgevingswet-implementatie en de samenhang tussen juridische, technische en organisatorische aspecten. Ons ServiceTeam Regelanalisten helpt de verbinding tussen juridische en technische afdelingen te leggen. Met een Quick Scan Toepasbare Regels brengen wij snel de quick wins en aandachtspunten in kaart.",
        tekst_informeel: "Als projectleider heb jij het overzicht over de DSO-implementatie en de samenhang tussen juridisch, technisch en organisatorisch. We merken dat veel gemeenten worstelen met het gat tussen het juridische omgevingsplan en de technische implementatie in het DSO — precies daar helpen we. Ons ServiceTeam Regelanalisten kan als flexibele schil fungeren, en met een Quick Scan Toepasbare Regels brengen we snel in kaart waar de quick wins zitten.",
        opmerkingen: ""
    },
    {
        functie_keyword: "beheer",
        tekst_professioneel: "Als functioneel beheerder speelt u een sleutelrol in het DSO-landschap. Wij ondersteunen het traject van \"basis op orde\" naar \"data op orde\" — de essentiële stap die veel gemeenten nu moeten zetten. Met SIS8020 faciliteren wij het gestructureerd verwerken van toepasbare regels, en onze regelanalisten kunnen direct in uw systeem meewerken.",
        tekst_informeel: "Als functioneel beheerder heb je een sleutelrol in het DSO-landschap. Het traject van \"basis op orde\" naar \"data op orde\" is waar veel gemeenten nu staan — en waar wij graag bij helpen. Met SIS8020 ondersteunen we het gestructureerd verwerken van toepasbare regels, en onze regelanalisten kunnen direct in het systeem meewerken zodat jij minder technische complexiteit op je bordje hebt.",
        opmerkingen: "Matches: functioneel beheer, applicatiebeheer"
    },
    {
        functie_keyword: "omgevingsplan",
        tekst_professioneel: "Gezien uw betrokkenheid bij het omgevingsplan deel ik graag onze bevindingen met u. De vertaalslag van het juridische omgevingsplan naar toepasbare regels in het Omgevingsloket is een essentiële stap. In samenwerking met Tafelberg Advies bieden wij expertise op precies dit snijvlak.",
        tekst_informeel: "Gezien jouw rol bij het omgevingsplan wil ik je graag meenemen in onze analyse. De vertaalslag van het omgevingsplan naar toepasbare regels in het Omgevingsloket is cruciaal — als die regels niet kloppen, merken burgers en bedrijven dat als eerste. Met Tafelberg Advies hebben we een partner die gespecialiseerd is in precies deze vertaalslag.",
        opmerkingen: "Matches: ruimtelijke, planoloog"
    },
    {
        functie_keyword: "geo",
        tekst_professioneel: "Als GEO/GIS-specialist bent u betrokken bij de ruimtelijke data die essentieel is voor het omgevingsplan en het DSO. De kwaliteit van werkingsgebieden, geometrieën en GIO's bepaalt direct de bruikbaarheid van toepasbare regels in het Omgevingsloket.",
        tekst_informeel: "Als GEO/GIS-specialist ben je betrokken bij de ruimtelijke data die ten grondslag ligt aan het omgevingsplan en het DSO. Juist die data moet \"op orde\" zijn — denk aan werkingsgebieden, geometrieën en GIO's. Een goede koppeling tussen ruimtelijke data en toepasbare regels is essentieel voor een werkend stelsel.",
        opmerkingen: "Matches: gis"
    },
    {
        functie_keyword: "vth",
        tekst_professioneel: "Vanuit uw rol in VTH (vergunningverlening, toezicht en handhaving) raakt de Omgevingswet-implementatie uw werkzaamheden direct. De kwaliteit van toepasbare regels in het Omgevingsloket bepaalt de effectiviteit van het vergunningproces. Wij zorgen dat deze regels correct en volledig zijn.",
        tekst_informeel: "Vanuit jouw rol in VTH (vergunningverlening, toezicht en handhaving) is de Omgevingswet direct van invloed op je dagelijkse werk. Of het nu gaat om vergunningchecks in het Omgevingsloket of de aansluiting op het DSO — de kwaliteit van toepasbare regels bepaalt hoe soepel het proces loopt. Wij zorgen dat die regels kloppen.",
        opmerkingen: "Matches: milieu, vergunning, toezicht"
    },
    {
        functie_keyword: "ict",
        tekst_professioneel: "Als verantwoordelijke voor informatiemanagement/ICT heeft u te maken met de technische integratie van het DSO in uw architectuur. Onze SIS8020 toolset is ontworpen voor naadloze integratie, en via ons ServiceTeam Regelanalisten hoeft u de specialistische kennis niet intern op te bouwen.",
        tekst_informeel: "Als informatiemanager/ICT heb je te maken met de technische kant van het DSO. Van koppelingen met het Omgevingsloket tot data-integratie — onze SIS8020 toolset is gebouwd om naadloos in jullie architectuur te passen. En met ons ServiceTeam hoef je niet alles zelf op te bouwen.",
        opmerkingen: "Matches: informatiemanager, architect"
    },
    {
        functie_keyword: "jurist",
        tekst_professioneel: "Als jurist bent u betrokken bij de juridische kwaliteit van het omgevingsplan. De vertaalslag van juridische tekst naar digitaal toepasbare regels vereist specialistische kennis. Onze regelanalisten zijn gespecialiseerd in dit snijvlak en werken nauw samen met de juridische afdeling.",
        tekst_informeel: "Als jurist ben je betrokken bij de juridische kwaliteit van het omgevingsplan en de vertaling naar digitale regels. Die vertaalslag — van juridische tekst naar toepasbare regels — is een vak apart. Onze regelanalisten zijn gespecialiseerd in precies dit snijvlak en werken nauw samen met juristen.",
        opmerkingen: "Matches: juridisch"
    },
    {
        functie_keyword: "directie",
        tekst_professioneel: "Op uw niveau is het relevant dat de Omgevingswet-implementatie meerdere afdelingen raakt. Wij bieden een geïntegreerde aanpak: van ons ServiceTeam Regelanalisten tot SIS8020 tooling tot strategisch advies van Tafelberg Advies. Eén aanspreekpunt voor uw gehele DSO-traject.",
        tekst_informeel: "Op jouw niveau is het belangrijk om te weten dat de Omgevingswet-implementatie impact heeft op meerdere afdelingen tegelijk. Wij bieden een totaaloplossing: van ServiceTeam tot tooling tot advies. Zo heb je één aanspreekpunt in plaats van meerdere leveranciers.",
        opmerkingen: "Matches: manager, hoofd"
    },
    {
        functie_keyword: "coordinator",
        tekst_professioneel: "Als coördinator verbindt u verschillende disciplines rond de Omgevingswet-implementatie. De verbinding tussen juridische, technische en organisatorische aspecten is vaak de grootste uitdaging. Met ons ServiceTeam Regelanalisten en een Quick Scan Toepasbare Regels maken wij die verbinding concreet.",
        tekst_informeel: "Als coördinator breng je verschillende disciplines samen rond de Omgevingswet. Onze ervaring leert dat de verbinding tussen juridisch, technisch en organisatorisch vaak de bottleneck is. Met ons ServiceTeam en de Quick Scan helpen we om die verbinding concreet te maken.",
        opmerkingen: ""
    }
];

const scoreTexts = [
    { kpi: "bruidsschat", score: 0, type: "goed", tekst: "de bruidsschat-aanpassingen voor dierlijke mest correct zijn doorgevoerd", dienst: "", opmerkingen: "Score 0" },
    { kpi: "bruidsschat", score: 1, type: "goed", tekst: "de bruidsschat-aanpassingen voor dierlijke mest grotendeels zijn doorgevoerd", dienst: "", opmerkingen: "Score 1" },
    { kpi: "bruidsschat", score: 2, type: "fout", tekst: "Op het gebied van bruidsschat-aanpassingen voor dierlijke mest zijn er nog stappen te zetten. Een deel is doorgevoerd, maar de implementatie is nog niet volledig.", dienst: "wij de resterende bruidsschat-aanpassingen efficiënt kunnen doorvoeren", opmerkingen: "Score 2-3" },
    { kpi: "bruidsschat", score: 4, type: "fout", tekst: "Op basis van de beschikbare gegevens zien wij dat de verplichte bruidsschat-aanpassingen voor dierlijke mest nog niet of nauwelijks zijn doorgevoerd in het omgevingsplan. Dit zijn wettelijk verplichte aanpassingen die vóór 1 januari 2032 verwerkt moeten zijn in het omgevingsplan.", dienst: "wij deze bruidsschat-aanpassingen projectmatig kunnen doorvoeren, waarbij onze tooling het proces aanzienlijk versnelt", opmerkingen: "Score 4-5" },
    { kpi: "regelanalist", score: 0, type: "goed", tekst: "er een regelanalist actief is binnen de organisatie", dienst: "", opmerkingen: "Score 0 (ja)" },
    { kpi: "regelanalist", score: 5, type: "fout", tekst: "Wij zien dat er momenteel nog geen regelanalist actief is binnen de organisatie. Een regelanalist is essentieel voor het vertalen van het omgevingsplan naar toepasbare regels in het Omgevingsloket. Zonder regelanalist is het risico groot dat vergunningchecks niet correct werken voor burgers en bedrijven.", dienst: "wij via ons ServiceTeam Regelanalisten direct een ervaren regelanalist kunnen inzetten, als flexibele schil zonder vaste aanstelling", opmerkingen: "Score 5 (nee)" },
    { kpi: "olo", score: 0, type: "goed", tekst: "alle VNG-aanbevolen topactiviteiten beschikbaar zijn in het Omgevingsloket", dienst: "", opmerkingen: "Score 0" },
    { kpi: "olo", score: 5, type: "fout", tekst: "In het Omgevingsloket ontbreken nog meerdere VNG-aanbevolen topactiviteiten voor vergunningchecks. Burgers en bedrijven kunnen hierdoor niet digitaal controleren of zij een vergunning nodig hebben.", dienst: "wij samen met onze partner Tafelberg Advies de ontbrekende vergunningchecks kunnen opstellen en implementeren", opmerkingen: "Score 5" },
    { kpi: "olo", score: 2, type: "fout", tekst: "Er zijn al vergunningchecks beschikbaar in het Omgevingsloket, maar er ontbreken nog enkele VNG-aanbevolen topactiviteiten. Dit beperkt de digitale dienstverlening aan burgers.", dienst: "", opmerkingen: "Score 2-3" },
    { kpi: "olo", score: 1, type: "goed", tekst: "bijna alle topactiviteiten beschikbaar zijn in het Omgevingsloket", dienst: "", opmerkingen: "Score 1" },
    { kpi: "omgevingsplan", score: 0, type: "goed", tekst: "er een robuust omgevingsplan is gepubliceerd na de bruidsschat", dienst: "", opmerkingen: "Score 0" },
    { kpi: "omgevingsplan", score: 5, type: "fout", tekst: "Het omgevingsplan bevindt zich nog in een vroeg stadium na de bruidsschatconversie. De deadline voor een volledig omgevingsplan is 2032, en onze ervaring leert dat de vertaling naar toepasbare regels de meeste doorlooptijd vraagt.", dienst: "onze partner Tafelberg Advies kan ondersteunen bij het omgevingsplan, en wij zorgen voor de vertaling naar toepasbare regels", opmerkingen: "Score 5" },
    { kpi: "omgevingsplan", score: 2, type: "fout", tekst: "Het omgevingsplan is in ontwikkeling. Het is belangrijk om parallel aan de planantwikkeling al na te denken over de vertaling naar toepasbare regels, om vertraging te voorkomen.", dienst: "", opmerkingen: "Score 2-3" },
    { kpi: "omgevingsplan", score: 1, type: "goed", tekst: "het omgevingsplan goed op weg is na de bruidsschat", dienst: "", opmerkingen: "Score 1" }
];

const ctaTexts = [
    {
        doel: "quickscan",
        tekst_professioneel: "Wij bieden u graag een kosteloze Quick Scan Toepasbare Regels aan. In deze analyse brengen wij de huidige stand van zaken in kaart en identificeren wij concrete verbeterpunten. Heeft u hier interesse in?",
        tekst_informeel: "We bieden een gratis Quick Scan Toepasbare Regels aan — een korte analyse met concrete aanbevelingen voor jullie gemeente. Daarin kijken we naar de huidige stand van zaken en waar de quick wins zitten. Lijkt je dat wat?",
        opmerkingen: ""
    },
    {
        doel: "workshop",
        tekst_professioneel: "Binnenkort organiseren wij een praktische workshop over toepasbare regels en de Omgevingswet-implementatie. Zal ik u de details toesturen?",
        tekst_informeel: "We organiseren binnenkort een praktische workshop over toepasbare regels en het Omgevingsloket, specifiek gericht op gemeenten. Zal ik je de details sturen?",
        opmerkingen: ""
    },
    {
        doel: "follow-up",
        tekst_professioneel: "Graag plan ik een vervolggesprek waarin wij de resultaten van een eventuele Quick Scan kunnen bespreken. Heeft u komende weken beschikbaarheid?",
        tekst_informeel: "Zullen we een vervolggesprek plannen? Ik kan dan meteen de Quick Scan meenemen als concreet startpunt. Heb je komende week beschikbaarheid?",
        opmerkingen: ""
    },
    {
        doel: "kennismaking",
        tekst_professioneel: "Ik kom graag langs voor een kennismakingsgesprek om de mogelijkheden voor uw gemeente te bespreken. Wat past u het beste?",
        tekst_informeel: "Zullen we een keer bellen of koffiedrinken? Ik wissel graag van gedachten over hoe we jullie kunnen ondersteunen. Ik hoor het graag.",
        opmerkingen: "Default CTA"
    }
];

const generalTexts = [
    { Veld: "bedrijf_naam", Waarde: "AbelTalent" },
    { Veld: "bedrijf_adres", Waarde: "Kosterijland 70, 3981 AJ Bunnik" },
    { Veld: "bedrijf_telefoon", Waarde: "+31 30 225 5660" },
    { Veld: "bedrijf_website", Waarde: "www.abeltalent.nl" },
    { Veld: "partner_naam", Waarde: "Tafelberg Advies" },
    { Veld: "partner_website", Waarde: "www.tafelbergadvies.nl" }
];

// 2. CREATE WORKBOOK
const wb = XLSX.utils.book_new();

// 3. CREATE SHEETS
const wsFunctie = XLSX.utils.json_to_sheet(functionTexts);
const wsScore = XLSX.utils.json_to_sheet(scoreTexts);
const wsCTA = XLSX.utils.json_to_sheet(ctaTexts);
const wsAlgemeen = XLSX.utils.json_to_sheet(generalTexts);

// 4. APPEND SHEETS
XLSX.utils.book_append_sheet(wb, wsAlgemeen, "Algemeen");
XLSX.utils.book_append_sheet(wb, wsScore, "Score Teksten");
XLSX.utils.book_append_sheet(wb, wsFunctie, "Functie Teksten");
XLSX.utils.book_append_sheet(wb, wsCTA, "CTAs");

// 5. WRITE FILE
const outputPath = path.resolve('content_export.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`Successfully created: ${outputPath}`);
