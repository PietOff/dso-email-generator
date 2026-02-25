// DSO Email Generator — Google Apps Script
// Plak dit script in de Script Editor van een nieuwe Google Sheet
// en run de functie setupSheet()

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename("DSO Email Generator — Content");
  
  // === SHEET 1: Algemeen ===
  var sheet1 = ss.getSheets()[0];
  sheet1.setName("Algemeen");
  sheet1.clear();
  var algemeenData = [
    ["Veld", "Waarde", "Opmerkingen"],
    ["standaard_verhaal", "Vanuit AbelTalent en onze partner Tafelberg Advies werken we dagelijks samen met gemeenten aan de Omgevingswet — van regelanalyse en vragenbomen tot capaciteitsvraagstukken. We kennen de uitdagingen, en helpen daar graag bij.", "Basis intro tekst voor elke email"],
    ["bedrijf_naam", "abelTalent", ""],
    ["bedrijf_adres", "Kosterijland 70, 3981 AJ Bunnik", ""],
    ["bedrijf_telefoon", "+31 30 225 5660", ""],
    ["bedrijf_website", "www.abeltalent.nl", ""],
    ["partner_naam", "Tafelberg Advies", ""],
    ["partner_website", "www.tafelbergadvies.nl", ""],
    ["bedrijf_omschrijving", "abelTalent biedt capaciteitsoplossingen en talentontwikkeling voor de fysieke leefomgeving. Gevestigd in Bunnik. Levert young professionals (traineeship), SIS8020-toolset en projectmatige ondersteuning.", "Voor intern gebruik"],
    ["partner_omschrijving", "Tafelberg Advies is expert in regelanalyse, toepasbare regels, STTR, en omgevingsplanontwikkeling. Levert regelanalisten (junior-senior + afroep), training/e-learning, regelbeheer en interbestuurlijke afstemming.", "Voor intern gebruik"],
    ["serviceteam_beschrijving", "Het ServiceTeam Regelanalisten is een samenwerking tussen abelTalent en Tafelberg Advies. We helpen overheidsorganisaties grip te krijgen op de gehele Omgevingswet-keten — van juridische visie tot technische implementatie.", "Uit whitepaper"],
    ["sis8020_beschrijving", "SIS8020 is een gespecialiseerde tool — een 'wasstraat' voor MBA-data — ontwikkeld met GlobeScope. Reinigt en valideert data over milieubelastende activiteiten, 6x sneller dan handmatig.", "Uit whitepaper"],
    ["basis_op_orde", "Basis op Orde: directe opschoning en transitie — bruidsschat import, STOP/TPOD publicatie, launchgereedheid.", "Whitepaper concept"],
    ["data_op_orde", "Data op Orde: duurzame, consistente en herbruikbare informatie met heldere rollen en processen voor lange termijn datakwaliteit.", "Whitepaper concept"],
    ["whitepaper_url", "https://bit.ly/whitepaper-omgevingswet-abeltalent", "Neutral link naar de whitepaper (bijv. Bitly of Google Drive)"]
  ];
  sheet1.getRange(1, 1, algemeenData.length, 3).setValues(algemeenData);
  sheet1.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#4285f4").setFontColor("white");
  sheet1.setColumnWidth(1, 200);
  sheet1.setColumnWidth(2, 500);
  sheet1.setColumnWidth(3, 250);
  
  // === SHEET 2: Score Teksten ===
  var sheet2 = ss.insertSheet("Score Teksten");
  var scoreData = [
    ["kpi", "score", "type", "tekst_professioneel", "tekst_informeel", "dienst", "opmerkingen"],
    ["bruidsschat", "0", "goed", "de bruidsschat-aanpassingen voor dierlijke mest correct zijn doorgevoerd", "(zelfde)", "", "Score 0 = goed"],
    ["bruidsschat", "5", "aandacht", "Uit onze analyse blijkt dat de verplichte bruidsschat-aanpassingen voor dierlijke mest nog niet zijn doorgevoerd. Het gaat onder andere om de zorgplicht voor mestopslag, afstandseisen voor geur en de vergunningplicht voor grotere opslagen. Dit zijn wettelijk verplichte aanpassingen die vóór 1 januari 2032 verwerkt moeten zijn.", "(zelfde)", "abelTalent kan de bruidsschat-aanpassingen projectmatig doorvoeren. Met onze getrainde professionals en de SIS8020-tool werken we tot 6x sneller dan traditionele methoden.", "Score 5 = niet doorgevoerd"],
    ["bruidsschat", "1-4", "aandacht", "Op het gebied van de bruidsschat-aanpassingen voor dierlijke mest zien we dat er nog verbeterpunten zijn. Niet alle verplichte aanpassingen zijn volledig doorgevoerd.", "(zelfde)", "abelTalent kan helpen bij het afronden van de bruidsschat-aanpassingen, inclusief data-opschoning met SIS8020.", "Tussenscores"],
    ["regelanalist", "0", "goed", "er een regelanalist actief is die de toepasbare regels beheert", "(zelfde)", "", "Score 0 = goed"],
    ["regelanalist", "5", "aandacht", "Daarnaast valt op dat er nog geen regelanalist actief is. Een regelanalist is essentieel voor het vertalen van juridische regels naar toepasbare regels — de vragenbomen in het Omgevingsloket. Zonder deze rol kunnen inwoners geen online vergunningcheck doen.", "(zelfde)", "Via ons ServiceTeam Regelanalisten kunnen we direct ervaren regelanalisten inzetten (junior-senior, ook op afroep). We bieden ook een praktijkgerichte opleiding aan.", "Score 5 = geen regelanalist"],
    ["regelanalist", "1-4", "aandacht", "Op het vlak van regelanalyse en toepasbare regels zien we dat er nog stappen te zetten zijn.", "(zelfde)", "Ons ServiceTeam kan ondersteuning bieden bij het verbeteren van de toepasbare regels.", "Tussenscores"],
    ["olo", "0", "goed", "alle VNG-aanbevolen topactiviteiten beschikbaar zijn in het Omgevingsloket", "(zelfde)", "", "Score 0 = goed"],
    ["olo", "5", "aandacht", "Wat verder opvalt is dat er nog geen vergunningchecks beschikbaar zijn voor de VNG-aanbevolen topactiviteiten. Zonder deze checks moeten burgers telefonisch of per mail contact opnemen.", "(zelfde)", "abelTalent en Tafelberg Advies kunnen gezamenlijk de vergunningchecks, formulieren en maatregelen opstellen en publiceren.", "Score 5 = 0 activiteiten"],
    ["olo", "3", "aandacht", "In het Omgevingsloket zijn een aantal vergunningchecks beschikbaar, maar er ontbreken nog VNG-aanbevolen topactiviteiten.", "(zelfde)", "Wij kunnen de resterende vergunningchecks en formulieren verzorgen.", "Score 3"],
    ["olo", "1-2", "aandacht", "Op het gebied van vergunningchecks is er nog ruimte voor verbetering.", "(zelfde)", "", "Lage tussenscores"],
    ["omgevingsplan", "0", "goed", "er een robuust omgevingsplan is gepubliceerd", "(zelfde)", "", "Score 0 = goed"],
    ["omgevingsplan", "5", "aandacht", "Tot slot zien we dat er nog geen omgevingsplan is gepubliceerd na de bruidsschat. De transitie naar één integraal omgevingsplan moet vóór 1 januari 2032 afgerond zijn.", "(zelfde)", "Tafelberg Advies kan ondersteunen bij het ontwikkelen van een actueel omgevingsplan, inclusief vertaling naar toepasbare regels conform STOP/TPOD.", "Score 5 = geen plan"],
    ["omgevingsplan", "3", "aandacht", "Het omgevingsplan is deels gepubliceerd maar nog niet compleet. Met de deadline van 2032 is het raadzaam vaart te maken.", "(zelfde)", "Tafelberg Advies kan helpen bij de verdere ontwikkeling.", "Score 3"],
    ["omgevingsplan", "1-2", "aandacht", "Het omgevingsplan is nog in ontwikkeling.", "(zelfde)", "", "Lage tussenscores"]
  ];
  sheet2.getRange(1, 1, scoreData.length, 7).setValues(scoreData);
  sheet2.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#34a853").setFontColor("white");
  sheet2.setColumnWidth(1, 120);
  sheet2.setColumnWidth(2, 60);
  sheet2.setColumnWidth(3, 80);
  sheet2.setColumnWidth(4, 400);
  sheet2.setColumnWidth(5, 120);
  sheet2.setColumnWidth(6, 350);
  sheet2.setColumnWidth(7, 150);
  
  // === SHEET 3: Functie Teksten ===
  var sheet3 = ss.insertSheet("Functie Teksten");
  var functieData = [
    ["functie_keyword", "tekst_professioneel", "tekst_informeel", "opmerkingen"],
    ["regelanalist", "Als regelanalist bent u direct betrokken bij de toepasbare regels voor het Omgevingsloket. Via ons ServiceTeam Regelanalisten ondersteunen wij regelanalisten bij gemeenten en omgevingsdiensten.", "Als regelanalist ben jij direct betrokken bij de toepasbare regels in het Omgevingsloket. We werken veel samen met regelanalisten via ons ServiceTeam.", ""],
    ["projectleider", "Als projectleider heeft u het overzicht over de Omgevingswet-implementatie. Wij zien bij veel gemeenten een kloof tussen juridische en technische afdelingen. Ons ServiceTeam helpt die verbinding te leggen.", "Als projectleider heb jij het overzicht over de DSO-implementatie. We merken dat veel gemeenten worstelen met het gat tussen juridisch en technisch — precies daar helpen we.", "Ook voor programmamanager"],
    ["functioneel beheer", "Als functioneel beheerder speelt u een sleutelrol bij het DSO. Wij ondersteunen het traject van 'basis op orde' naar 'data op orde': duurzame, consistente informatie met heldere processen.", "Als functioneel beheerder heb je een sleutelrol in het DSO. Van 'basis op orde' naar 'data op orde' — dat is het traject waar we graag bij helpen.", "Ook voor applicatiebeheer"],
    ["omgevingsplan", "Gezien uw betrokkenheid bij het omgevingsplan deel ik graag onze bevindingen met u. De transitie naar één integraal omgevingsplan is een omvangrijke opgave. Ons team heeft hier ruime ervaring mee.", "Gezien jouw rol bij het omgevingsplan wil ik je graag meenemen in onze analyse. De vertaling naar een integraal plan is een flinke klus, maar het hoeft niet vanaf nul.", "Ook voor planoloog, ruimtelijke"],
    ["geo", "Als GEO/GIS-specialist bent u betrokken bij de ruimtelijke data die essentieel is voor het omgevingsplan en het DSO. Het op orde brengen van deze data is cruciaal voor een werkend stelsel.", "Als GEO/GIS-specialist ben je betrokken bij de ruimtelijke data. Juist die data moet 'op orde' zijn voor een werkend stelsel.", "Ook voor gis"],
    ["milieu", "Vanuit uw rol in milieu en vergunningverlening raakt de Omgevingswet-implementatie uw werkzaamheden direct. Met onze SIS8020-tool ondersteunen wij het opschonen van MBA-data.", "Vanuit jouw rol in milieu en vergunningverlening is de Omgevingswet direct van invloed op je werk. Met onze SIS8020-tool helpen we bij MBA-data opschoning, 6x sneller dan handmatig.", "Ook voor vergunning"]
  ];
  sheet3.getRange(1, 1, functieData.length, 4).setValues(functieData);
  sheet3.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#fbbc04").setFontColor("black");
  sheet3.setColumnWidth(1, 150);
  sheet3.setColumnWidth(2, 400);
  sheet3.setColumnWidth(3, 400);
  sheet3.setColumnWidth(4, 200);
  
  // === SHEET 4: CTAs ===
  var sheet4 = ss.insertSheet("CTAs");
  var ctaData = [
    ["doel", "tekst_professioneel", "tekst_informeel", "opmerkingen"],
    ["eerste-contact", "Heeft u interesse om eens vrijblijvend van gedachten te wisselen? Ik hoor het graag.", "Zou je het leuk vinden om eens vrijblijvend te sparren? Ik hoor het graag.", "Default CTA"],
    ["follow-up", "Graag zou ik een vervolggesprek plannen om bovenstaande nader te bespreken. Heeft u komende weken beschikbaarheid?", "Zullen we binnenkort even bellen om dit door te spreken? Ik hoor het graag.", "Na eerder contact"],
    ["quickscan", "Wij bieden u graag een kosteloze Quick Scan Toepasbare Regels aan: een beknopte analyse met concrete aanbevelingen. Heeft u hier interesse in?", "We bieden een gratis Quick Scan Toepasbare Regels aan — een korte analyse met concrete aanbevelingen. Lijkt je dat wat?", "Gratis quickscan"],
    ["workshop", "Binnenkort organiseren wij een praktijkgerichte workshop over de Omgevingswet. Zal ik u de details toesturen?", "We organiseren binnenkort een praktijkgerichte workshop over de Omgevingswet. Leuk als je erbij bent! Zal ik je de details sturen?", "Workshop uitnodiging"]
  ];
  sheet4.getRange(1, 1, ctaData.length, 4).setValues(ctaData);
  sheet4.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#ea4335").setFontColor("white");
  sheet4.setColumnWidth(1, 140);
  sheet4.setColumnWidth(2, 400);
  sheet4.setColumnWidth(3, 400);
  sheet4.setColumnWidth(4, 200);
  
  // === SHEET 5: Email Teksten === (NEW — all email template text, editable from here)
  var sheet5 = ss.insertSheet("Email Teksten");
  var emailData = [
    ['key', 'tekst_professioneel', 'tekst_informeel', 'opmerkingen'],
    // --- Openings ---
    ['opening', 'Beste {{contact_voornaam}},', 'Hoi {{contact_voornaam}},', ''],
    ['afsluiting', 'Met vriendelijke groet,', 'Groeten,', ''],
    ["opening_eerste_contact", "Als organisatie die dagelijks gemeenten ondersteunt bij de Omgevingswet neem ik graag even contact met u op.", "We werken veel met gemeenten die op dit moment volop bezig zijn met de Omgevingswet, en dan kwam ik jullie tegen. Even een kort berichtje.", "Eerste contact opening"],
    ["opening_follow_up", "Naar aanleiding van ons eerdere contact wil ik graag even bij u aansluiten.", "Fijn dat we eerder even contact hadden. Ik wilde graag even aanhaken.", "Follow-up opening"],
    ["opening_urgent", "De Omgevingswet is inmiddels een feit en ik merk dat veel gemeenten nu tegen dezelfde uitdagingen aanlopen. Vandaar dat ik even contact opneem.", "De Omgevingswet is inmiddels een feit en veel gemeenten lopen tegen dezelfde dingen aan. Vandaar dat ik even een berichtje stuur.", "Urgente toon opening"],
    
    // --- Situatie observaties (per regelingType) ---
    ["situatie_omgevingsplan", "Het valt op dat {gemeente} al een definitief Omgevingsplan heeft gepubliceerd — een belangrijke mijlpaal die nog niet voor alle gemeenten bereikt is.", "Mooi om te zien dat jullie al een definitief Omgevingsplan hebben. Dat is een flinke mijlpaal waar veel gemeenten nog naartoe werken.", "Positief: heeft al omgevingsplan"],
    ["situatie_omgevingsvisie", "{gemeente} heeft al stappen gezet met de Omgevingsvisie. De transitie naar een volledig Omgevingsplan is vaak een intensief traject waar veel gemeenten tegenaan lopen.", "Jullie werken op dit moment met de Omgevingsvisie, en de volgende stap — het daadwerkelijke Omgevingsplan — is voor veel gemeenten een behoorlijke klus.", "Heeft omgevingsvisie, mist omgevingsplan"],
    ["situatie_voorbescherming", "{gemeente} werkt op dit moment met {type}. Dit is een fase die we bij veel gemeenten herkennen. De transitie naar het Omgevingsplan vraagt de komende tijd flink wat capaciteit.", "Jullie werken op dit moment met {type}, wat begrijpelijk is — veel gemeenten zitten in dezelfde fase. De stap naar een volledig Omgevingsplan is dan ook een flinke.", "Voorbeschermingsregels / Voorbereidingsbesluit"],
    
    // --- Toepasbare regels observaties ---
    ["tr_weinig", "Daarnaast zien we dat het digitale Omgevingsloket nog relatief beperkt is ingericht qua vragenbomen. Dat is een uitdaging die bij veel gemeenten speelt.", "Daarnaast merken we dat het Omgevingsloket qua vragenbomen nog vrij beperkt is ingericht — iets waar veel gemeenten mee worstelen.", "< 20 toepasbare regels"],
    ["tr_veel", "Er is al een stevig pakket aan vragenbomen ingericht{software}, maar het beheer en de doorontwikkeling hiervan vraagt doorgaans om continue aandacht.", "Jullie hebben al een aardig pakket aan vragenbomen staan{software}, maar het bijhouden en uitbreiden daarvan is natuurlijk een doorlopend verhaal.", "> 20 toepasbare regels. {software} wordt vervangen door ' via [naam]' als bekend"],
    ["tr_alleen_weinig", "De inrichting van het digitale Omgevingsloket — en het vertalen van regelgeving naar vragenbomen — is een uitdaging die bij veel gemeenten speelt.", "We merken dat veel gemeenten nog zoekende zijn in de inrichting van het digitale Omgevingsloket. Het opzetten van goede vragenbomen is simpelweg een vak apart.", "< 20 TR, geen regelingType bekend"],
    ["tr_alleen_veel", "{gemeente} heeft al een solide basis qua vragenbomen ingericht{software}. Uit onze ervaring weten we dat het beheer en de doorontwikkeling daarvan een doorlopend traject is.", "Jullie hebben al een stevige basis staan qua vragenbomen{software}. Maar we weten uit ervaring: het bijhouden en verbeteren is een doorlopend verhaal.", "> 20 TR, geen regelingType bekend"],
    
    // --- Service bridge ---
    ["service_bridge", "Op dit terrein ondersteunen wij gemeenten dagelijks. Denk aan de inzet van een ervaren Regelanalist voor het vertalen van beleid naar vragenbomen, of strategische begeleiding bij de verdere inrichting van het Omgevingsplan.", "Dat is precies waar wij gemeenten mee helpen. Of het nu gaat om een ervaren Regelanalist die jullie regels vertaalt naar vragenbomen, of strategisch advies bij het inrichten van het Omgevingsplan — we spreken elke dag dezelfde taal.", "Overgang naar diensten"],
    ["service_bridge_behandeldienst", "Gezien de samenwerking met {behandeldienst} kunnen wij ook de afstemming in de keten faciliteren.", "Overigens werken jullie samen met {behandeldienst}, toch? We hebben daar goede ervaringen mee, wat de samenwerking extra soepel maakt.", "Toevoeging als behandeldienst bekend is"],
    
    // --- KPI context prefixes ---
    ["kpi_goed_prefix", "Het valt positief op dat ", "Overigens, mooi dat ", "Prefix voor goede KPI punten"],
    ["kpi_dienst_prefix", "Ter ondersteuning: ", "Als dat helpt: ", "Prefix voor dienstaanbod"],
    
    // --- Email 2: Nudge ---
    ["email2_body", "Graag volg ik even op naar aanleiding van mijn vorige bericht. Ik begrijp dat de agenda's vol zijn — dat herkennen wij bij veel gemeenten.\n\nDesondanks denk ik dat wij {gemeente} concreet kunnen ondersteunen bij de lopende trajecten rondom de Omgevingswet.\n\nZou u deze week gelegenheid hebben voor een kort gesprek? Ik licht graag toe wat we voor u kunnen betekenen.", "Even een kort opvolgberichtje. Ik snap dat het druk is — dat horen we van veel gemeenten op dit moment.\n\nToch denk ik dat we {gemeente} echt iets kunnen bieden dat tijd en moeite bespaart. Zeker nu er voor veel gemeenten nog flink wat werk te verzetten is rondom de Omgevingswet.\n\nHeb je toevallig deze week een kwartiertje? Ik vertel je graag in het kort wat we voor jullie kunnen betekenen.", "Volledige email 2 body. {gemeente} wordt vervangen"],
    
    // --- Email 3: Close ---
    ["email3_body", "Ik begrijp dat het moment wellicht niet past. Ik zal u voor nu niet verder benaderen.\n\nWel deel ik graag nog een praktische gids die we voor gemeenten hebben samengesteld over het efficiënt inrichten van toepasbare regels. Mogelijk is dit van waarde voor u of uw collega's.\n\n👉 [Link naar de gids]\n\nMocht u in de toekomst behoefte hebben aan ondersteuning, dan vernemen wij dat uiteraard graag.\n\nVeel succes met het vervolg.", "Ik wil je niet onnodig blijven mailen, dus ik laat het hierbij voor nu.\n\nWel wilde ik nog even meegeven: we hebben onlangs een praktische gids gemaakt voor gemeenten over het efficiënt inrichten van toepasbare regels. Misschien handig voor jullie of je collega's.\n\n👉 [Link naar de gids]\n\nMocht je later alsnog willen sparren, dan staan we altijd open. Succes met alles!", "Volledige email 3 body"],
    
    // --- Fallback base story ---
    ["fallback_base_story", "We helpen gemeenten met de stappen rondom de Omgevingswet — van regelanalyse tot het inrichten van het Omgevingsloket.", "We helpen gemeenten met de stappen rondom de Omgevingswet — van regelanalyse tot het inrichten van het Omgevingsloket.", "Gebruikt als geen baseStory is ingevuld"]
  ];
  sheet5.getRange(1, 1, emailData.length, 4).setValues(emailData);
  sheet5.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#9c27b0").setFontColor("white");
  sheet5.setColumnWidth(1, 220);
  sheet5.setColumnWidth(2, 500);
  sheet5.setColumnWidth(3, 500);
  sheet5.setColumnWidth(4, 250);
  
  SpreadsheetApp.flush();
  Logger.log("✅ Sheet setup complete! Alle 5 tabbladen zijn aangemaakt en gevuld.");
  SpreadsheetApp.getUi().alert("✅ Setup voltooid!\n\nAlle 5 tabbladen zijn aangemaakt:\n- Algemeen\n- Score Teksten\n- Functie Teksten\n- CTAs\n- Email Teksten\n\nVergeet niet om de sheet te publiceren via Bestand > Delen > Publiceren op het web");
}
