import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';

const geoUrl = '/nl-gemeenten.topojson';

export default function DsoMap({ monitorData, gemeenteData, selectedGemeente, onSelectGemeente }) {
    const [tooltipContent, setTooltipContent] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [metric, setMetric] = useState('totaleScore'); // totaleScore, kpi1, kpi2, kpi3, kpi4, regels

    // Merge static gemeenteData with live monitorData for map lookup
    const mapData = useMemo(() => {
        const dataByCity = {};
        if (!gemeenteData) return dataByCity;

        gemeenteData.forEach(g => {
            const cleanName = g.bestuursorgaan.replace(/^gemeente\s+/i, '').trim();
            const lowerName = cleanName.toLowerCase();

            const m = monitorData && monitorData[lowerName] ? monitorData[lowerName] : {};

            const kpi1 = m.kpi1 || g.dierlijkeMestScore || 0;
            let kpi2 = m.kpi2 || '';
            if (!kpi2) {
                kpi2 = g.regelanalistScore === '0' || g.regelanalistScore === 0 ? 'ja' : 'nee';
            }
            const kpi3 = m.kpi3 || g.scoreOLO || 0;
            const kpi4 = m.kpi4 || g.omgevingsplanScore || 0;

            const kpi1V = Number(kpi1) || 0;
            const kpi2V = kpi2 === 'nee' ? 5 : (kpi2 === 'ja' ? 0 : (Number(kpi2) || 0));
            const kpi3V = Number(kpi3) || 0;
            const kpi4V = Number(kpi4) || 0;

            const totalScore = kpi1V + kpi2V + kpi3V + kpi4V;
            const aantalRegels = Number(m.aantalRegels) || 0;

            dataByCity[cleanName] = {
                name: cleanName,
                kpi1: kpi1V,
                kpi2: kpi2V,
                kpi3: kpi3V,
                kpi4: kpi4V,
                totaleScore: totalScore,
                aantalRegels,
                regelingType: m.regelingType || 'Onbekend',
                behandeldienst: m.behandeldienst || '',
                software: m.trSoftware || '',
                lastUpdate: m.lastUpdate || '',
                contactpersonen: g.contactpersonen || []
            };
        });
        return dataByCity;
    }, [monitorData, gemeenteData]);

    // Color scales based on metric
    // Lower score = better = green, Higher score = worse = red. Except for Regels where more is 'better' (or at least more active).
    const colorScale = useMemo(() => {
        if (metric === 'regels') {
            return scaleLinear().domain([0, 50, 200]).range(["#f1f5f9", "#93c5fd", "#1d4ed8"]); // slate-100 -> blue-300 -> blue-700
        }

        // Default score scale (0 = green, max = red)
        const maxVals = {
            totaleScore: 20,
            kpi1: 5, kpi2: 5, kpi3: 5, kpi4: 5
        };
        const max = maxVals[metric] || 5;

        return scaleLinear()
            .domain([0, max / 2, max])
            .range(["#22c55e", "#facc15", "#ef4444"]); // green-500 -> yellow-400 -> red-500
    }, [metric]);

    const handleMouseEnter = (geo, evt) => {
        const geoName = geo.properties.statnaam; // the TopoJSON uses 'statnaam' for gemeente name
        const data = mapData[geoName];
        setTooltipContent(data || { name: geoName, noData: true });
        setTooltipPos({ x: evt.clientX, y: evt.clientY });
    };

    const handleMouseMove = (evt) => {
        setTooltipPos({ x: evt.clientX, y: evt.clientY });
    };

    const handleMouseLeave = () => {
        setTooltipContent(null);
    };

    const handleClick = (geo) => {
        const geoName = geo.properties.statnaam;
        // Map TopoJSON name back to full 'gemeente ...' format required by the app
        const fullGemeenteName = `Gemeente ${geoName}`;
        onSelectGemeente(fullGemeenteName);
    };

    return (
        <div className="relative w-full h-full bg-slate-50 relative flex flex-col">
            {/* Metric Selector Toolbar */}
            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-slate-200 flex gap-2">
                <button onClick={() => setMetric('totaleScore')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${metric === 'totaleScore' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Risico Score (Compleet)</button>
                <button onClick={() => setMetric('kpi4')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${metric === 'kpi4' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Omgevingsplan (KPI4)</button>
                <button onClick={() => setMetric('regels')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${metric === 'regels' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Aantal TR</button>
            </div>

            <div className="flex-1 min-h-0 relative overflow-hidden">
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{ scale: 6500, center: [5.2913, 52.1326] }} // Center of NL
                    width={800}
                    height={600}
                    style={{ width: "100%", height: "100%" }}
                >
                    <ZoomableGroup zoom={1} minZoom={0.5} maxZoom={10}>
                        <Geographies geography={geoUrl}>
                            {({ geographies }) =>
                                geographies.map((geo) => {
                                    const geoName = geo.properties.statnaam;
                                    const data = mapData[geoName];

                                    // Handle missing data
                                    let color = "#e2e8f0"; // slate-200
                                    if (data) {
                                        const val = data[metric] !== undefined ? data[metric] : data.totaleScore;
                                        color = colorScale(val);
                                    }

                                    const cleanSelected = typeof selectedGemeente === 'string' ? selectedGemeente.replace(/^gemeente\s+/i, '').trim() : '';
                                    const isSelected = cleanSelected === geoName;

                                    return (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            onMouseEnter={(e) => handleMouseEnter(geo, e)}
                                            onMouseMove={handleMouseMove}
                                            onMouseLeave={handleMouseLeave}
                                            onClick={() => handleClick(geo)}
                                            style={{
                                                default: {
                                                    fill: color,
                                                    stroke: isSelected ? "#0f172a" : "#ffffff",
                                                    strokeWidth: isSelected ? 1.5 : 0.5,
                                                    outline: "none",
                                                },
                                                hover: {
                                                    fill: "#1e293b",
                                                    stroke: "#ffffff",
                                                    strokeWidth: 1,
                                                    outline: "none",
                                                    cursor: "pointer"
                                                },
                                                pressed: {
                                                    fill: "#0f172a",
                                                    outline: "none",
                                                },
                                            }}
                                        />
                                    );
                                })
                            }
                        </Geographies>
                    </ZoomableGroup>
                </ComposableMap>
            </div>

            {/* Tooltip */}
            {tooltipContent && (
                <div
                    className="fixed z-50 pointer-events-none bg-white p-4 rounded-xl shadow-2xl border border-slate-200 w-72 animate-in fade-in zoom-in duration-150"
                    style={{
                        left: `${tooltipPos.x + 15}px`,
                        top: `${tooltipPos.y + 15}px`,
                        // Prevent tooltip from overflowing bottom/right of viewport
                        transform: tooltipPos.y > window.innerHeight - 300 ? 'translateY(-100%)' : 'none',
                    }}
                >
                    <h4 className="font-bold text-lg text-slate-800 border-b pb-2 mb-2">{tooltipContent.name}</h4>

                    {tooltipContent.noData ? (
                        <p className="text-sm text-slate-500 italic">Geen data beschikbaar voor deze gemeente in het systeem.</p>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <div className="text-xs font-semibold uppercase text-indigo-500 tracking-wider">Regeling</div>
                                <div className="text-sm font-medium text-slate-700">{tooltipContent.regelingType}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                    <div className="text-[10px] text-slate-500">Risico Score</div>
                                    <div className="text-lg font-bold text-slate-800">{tooltipContent.totaleScore}</div>
                                </div>
                                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                    <div className="text-[10px] text-slate-500">Vragenbomen</div>
                                    <div className="text-lg font-bold text-slate-800">{tooltipContent.aantalRegels}</div>
                                </div>
                            </div>

                            {/* Contactpersonen Preview */}
                            {tooltipContent.contactpersonen && tooltipContent.contactpersonen.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-100">
                                    <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1">Bekende Contacten ({tooltipContent.contactpersonen.length})</div>
                                    <ul className="text-xs text-slate-600 line-clamp-2">
                                        {tooltipContent.contactpersonen.slice(0, 3).map((c, i) => (
                                            <li key={i}><span className="font-medium">{c.naam}</span> <span className="text-slate-400">({c.functie})</span></li>
                                        ))}
                                        {tooltipContent.contactpersonen.length > 3 && <li className="text-slate-400 italic">...en nog {tooltipContent.contactpersonen.length - 3} meer</li>}
                                    </ul>
                                </div>
                            )}

                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                <span>Klik om te selecteren in Email Generator</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
