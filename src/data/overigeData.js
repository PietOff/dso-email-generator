export const provincies = [
    "Provincie Drenthe",
    "Provincie Flevoland",
    "Provincie Fryslân",
    "Provincie Gelderland",
    "Provincie Groningen",
    "Provincie Limburg",
    "Provincie Noord-Brabant",
    "Provincie Noord-Holland",
    "Provincie Overijssel",
    "Provincie Utrecht",
    "Provincie Zeeland",
    "Provincie Zuid-Holland"
];

export const waterschappen = [
    "Waterschap Noorderzijlvest",
    "Wetterskip Fryslân",
    "Waterschap Hunze en Aa's",
    "Waterschap Drents Overijsselse Delta",
    "Waterschap Vechtstromen",
    "Waterschap Vallei en Veluwe",
    "Waterschap Rijn en IJssel",
    "Hoogheemraadschap Hollands Noorderkwartier",
    "Hoogheemraadschap van Rijnland",
    "Hoogheemraadschap Amstel, Gooi en Vecht",
    "Hoogheemraadschap De Stichtse Rijnlanden",
    "Hoogheemraadschap van Delfland",
    "Hoogheemraadschap van Schieland en de Krimpenerwaard",
    "Waterschap Rivierenland",
    "Waterschap Hollandse Delta",
    "Waterschap Scheldestromen",
    "Waterschap Brabantse Delta",
    "Waterschap De Dommel",
    "Waterschap Aa en Maas",
    "Waterschap Limburg",
    "Waterschap Zuiderzeeland"
];

export const omgevingsdiensten = [
    "Omgevingsdienst Groningen",
    "Omgevingsdienst Fryslân",
    "Fryske Utfieringstsjinst Miljeu en Omjouwing",
    "RUD Drenthe",
    "Omgevingsdienst IJsselland",
    "Omgevingsdienst Twente",
    "Omgevingsdienst Flevoland & Gooi en Vechtstreek",
    "Omgevingsdienst Noord-Holland Noord",
    "Omgevingsdienst IJmond",
    "Omgevingsdienst Zuid-Kennemerland",
    "Omgevingsdienst Noordzeekanaalgebied",
    "Omgevingsdienst Regio Amsterdam",
    "RUD Utrecht",
    "Omgevingsdienst Midden-Nederland",
    "Omgevingsdienst regio Arnhem",
    "Omgevingsdienst de Vallei",
    "Omgevingsdienst Rivierenland",
    "Omgevingsdienst Achterhoek",
    "Omgevingsdienst Haaglanden",
    "Omgevingsdienst Midden-Holland",
    "Omgevingsdienst Zuid-Holland Zuid",
    "DCMR Milieudienst Rijnmond",
    "RUD Zeeland",
    "Omgevingsdienst Midden- en West-Brabant",
    "Omgevingsdienst Zuidoost-Brabant",
    "Omgevingsdienst Brabant Noord",
    "RUD Zuid-Limburg",
    "Omgevingsdienst Midden-Limburg",
    "Omgevingsdienst Zuidoost-Brabant"
];

// Combine all non-gemeente entities into a structured format
export const overigeData = [
    ...provincies.map(name => ({ bestuursorgaan: name, type: 'Provincie', totScore: 0 })),
    ...waterschappen.map(name => ({ bestuursorgaan: name, type: 'Waterschap', totScore: 0 })),
    ...omgevingsdiensten.map(name => ({ bestuursorgaan: name, type: 'Omgevingsdienst', totScore: 0 }))
];

export function getAllOverigeNames() {
    return overigeData.map(e => e.bestuursorgaan);
}
