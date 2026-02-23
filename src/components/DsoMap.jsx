import React, { useState, useMemo, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { geoCentroid, geoBounds } from 'd3-geo';
import { provincieData } from '../data/provincieData';

const geoUrl = '/nl-gemeenten.topojson';

// Constants for Map Projection
const MAP_CENTER_NL = [5.2913, 52.1326];
const BASE_ZOOM = 1;

export default function DsoMap({ monitorData, gemeenteData, selectedGemeente, onSelectGemeente }) {
    const [tooltipContent, setTooltipContent] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [metric, setMetric] = useState('totaleScore');

    // Zoom and Pan State
    const [position, setPosition] = useState({ coordinates: MAP_CENTER_NL, zoom: BASE_ZOOM });

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProvince, setSelectedProvince] = useState('');

    // 1. Map Data Preparation
    const mapData = useMemo(() => {
        const dataByCity = {};
        if (!gemeenteData) return dataByCity;

        gemeenteData.forEach(g => {
            const cleanName = g.bestuursorgaan.replace(/^gemeente\s+/i, '').trim();
            const lowerName = cleanName.toLowerCase();
            const m = monitorData && monitorData[lowerName] ? monitorData[lowerName] : {};

            const kpi1 = m.kpi1 || g.dierlijkeMestScore || 0;
            let kpi2 = m.kpi2 || '';
            if (!kpi2) kpi2 = g.regelanalistScore === '0' || g.regelanalistScore === 0 ? 'ja' : 'nee';
            const kpi3 = m.kpi3 || g.scoreOLO || 0;
            const kpi4 = m.kpi4 || g.omgevingsplanScore || 0;

            const kpi1V = Number(kpi1) || 0;
            const kpi2V = kpi2 === 'nee' ? 5 : (kpi2 === 'ja' ? 0 : (Number(kpi2) || 0));
            const kpi3V = Number(kpi3) || 0;
            const kpi4V = Number(kpi4) || 0;

            dataByCity[cleanName] = {
                name: cleanName,
                originalName: g.bestuursorgaan,
                kpi1: kpi1V, kpi2: kpi2V, kpi3: kpi3V, kpi4: kpi4V,
                totaleScore: kpi1V + kpi2V + kpi3V + kpi4V,
                aantalRegels: Number(m.aantalRegels) || 0,
                regelingType: m.regelingType || 'Onbekend',
                behandeldienst: m.behandeldienst || '',
                software: m.trSoftware || '',
                contactpersonen: g.contactpersonen || []
            };
        });
        return dataByCity;
    }, [monitorData, gemeenteData]);

    // 2. Color Scales
    const colorScale = useMemo(() => {
        if (metric === 'regels') {
            return scaleLinear().domain([0, 50, 200]).range(["#f1f5f9", "#93c5fd", "#1d4ed8"]);
        }
        const maxVals = { totaleScore: 20, kpi1: 5, kpi2: 5, kpi3: 5, kpi4: 5 };
        return scaleLinear().domain([0, maxVals[metric] || 5 / 2, maxVals[metric] || 5]).range(["#22c55e", "#facc15", "#ef4444"]);
    }, [metric]);

    // 3. Search and Filter Helpers
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setSelectedProvince(''); // clear province filter if typing manually
    };

    const currentSearchTerm = searchQuery.toLowerCase();

    // Create a fast lookup for which province a gemeente belongs to
    const reverseProvincieMap = useMemo(() => {
        const map = {};
        Object.entries(provincieData).forEach(([prov, gemeenten]) => {
            gemeenten.forEach(g => map[g.toLowerCase()] = prov);
        });
        return map;
    }, []);

    // 4. Handle Zoom to Geometry Feature (GeoJSON)
    const handleZoomToFeature = (geo) => {
        // Calculate bounding box and centroid
        const centroid = geoCentroid(geo);
        const bounds = geoBounds(geo);

        // Calculate width/height of the bounding box to determine zoom level
        const dx = bounds[1][0] - bounds[0][0];
        const dy = bounds[1][1] - bounds[0][1];

        // Magic numbers that work well for the generic NL projection width (800x600)
        let calculatedZoom = 0.9 / Math.max(dx / 8, dy / 6);

        // Clamp zoom
        if (calculatedZoom < 1) calculatedZoom = 1;
        if (calculatedZoom > 8) calculatedZoom = 8;

        setPosition({ coordinates: centroid, zoom: calculatedZoom });
    };

    // 5. If `selectedGemeente` changes externally, reset map view if it gets cleared
    useEffect(() => {
        if (!selectedGemeente) {
            setSearchQuery('');
        } else {
            const clean = selectedGemeente.replace(/^gemeente\s+/i, '').trim();
            setSearchQuery(clean);
            if (reverseProvincieMap[clean.toLowerCase()]) {
                setSelectedProvince(reverseProvincieMap[clean.toLowerCase()]);
            }
        }
    }, [selectedGemeente, reverseProvincieMap]);

    return (
        <div className="relative w-full h-full bg-slate-50 relative flex flex-col">

            {/* Search and Filters Toolbar */}
            <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap gap-2 pointer-events-none">

                {/* Left Side: Filter and Zoom Controls */}
                <div className="bg-white/95 backdrop-blur-md p-2 rounded-xl shadow-lg border border-slate-200 flex flex-wrap items-center gap-2 pointer-events-auto">
                    {/* Province Dropdown */}
                    <select
                        value={selectedProvince}
                        onChange={(e) => {
                            setSelectedProvince(e.target.value);
                            setSearchQuery('');
                            // Note: We don't auto-zoom here. We let the visual CSS filter show the province and the user can manually zoom or click.
                            if (!e.target.value) {
                                setPosition({ coordinates: MAP_CENTER_NL, zoom: BASE_ZOOM });
                            }
                        }}
                        className="text-sm bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                    >
                        <option value="">Alle Provincies</option>
                        {Object.keys(provincieData).sort().map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>

                    {/* Gemeente Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Zoek gemeente..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="text-sm bg-slate-50 border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(''); setPosition({ coordinates: MAP_CENTER_NL, zoom: BASE_ZOOM }); onSelectGemeente(''); }}
                                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    {/* Reset Zoom Button */}
                    <button
                        onClick={() => {
                            setPosition({ coordinates: MAP_CENTER_NL, zoom: BASE_ZOOM });
                            setSelectedProvince('');
                            setSearchQuery('');
                            onSelectGemeente('');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        Reset Kaart
                    </button>
                </div>

                <div className="flex-1"></div>

                {/* Right Side: KPI Metric Selector */}
                <div className="bg-white/95 backdrop-blur-md p-2 rounded-xl shadow-lg border border-slate-200 flex gap-2 pointer-events-auto">
                    <button onClick={() => setMetric('totaleScore')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${metric === 'totaleScore' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Risico Score</button>
                    <button onClick={() => setMetric('kpi4')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${metric === 'kpi4' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Omgevingsplan</button>
                    <button onClick={() => setMetric('regels')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${metric === 'regels' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Aantal TR</button>
                </div>
            </div>

            <div className="flex-1 min-h-0 relative overflow-hidden mt-12 md:mt-0">
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{ scale: 6500, center: MAP_CENTER_NL }}
                    width={800}
                    height={600}
                    style={{ width: "100%", height: "100%" }}
                >
                    <ZoomableGroup
                        zoom={position.zoom}
                        center={position.coordinates}
                        onMoveEnd={(pos) => setPosition(pos)}
                        minZoom={0.5}
                        maxZoom={15}
                    >
                        <Geographies geography={geoUrl}>
                            {({ geographies }) => {
                                // If a precise match is typed in search, we want to auto-zoom to it once.
                                // We use a local variable to detect if we found an exact match during render
                                let exactMatchGeo = null;

                                const mappedGeos = geographies.map((geo) => {
                                    const geoName = geo.properties.statnaam;
                                    const data = mapData[geoName];

                                    // Visibility logic (Opacity) based on search/filter
                                    let isVisible = true;
                                    const lowGeoName = geoName.toLowerCase();

                                    // Exact match detection for auto-zoom
                                    if (currentSearchTerm && lowGeoName === currentSearchTerm) {
                                        exactMatchGeo = geo;
                                    }

                                    if (selectedProvince) {
                                        const provGemeenten = provincieData[selectedProvince] || [];
                                        if (!provGemeenten.map(p => p.toLowerCase()).includes(lowGeoName)) {
                                            isVisible = false;
                                        }
                                    } else if (currentSearchTerm) {
                                        if (!lowGeoName.includes(currentSearchTerm)) {
                                            isVisible = false;
                                        }
                                    }

                                    let color = "#cbd5e1"; // slate-300 default
                                    if (data && isVisible) {
                                        const val = data[metric] !== undefined ? data[metric] : data.totaleScore;
                                        color = colorScale(val);
                                    }

                                    const geoGemeenteName = data && data.originalName ? data.originalName : `Gemeente ${geoName}`;
                                    const isSelected = selectedGemeente === geoGemeenteName;

                                    return (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            onMouseEnter={(evt) => {
                                                const tooltipData = mapData[geoName];
                                                setTooltipContent(tooltipData || { name: geoName, noData: true });
                                                setTooltipPos({ x: evt.clientX, y: evt.clientY });
                                            }}
                                            onMouseMove={(evt) => setTooltipPos({ x: evt.clientX, y: evt.clientY })}
                                            onMouseLeave={() => setTooltipContent(null)}
                                            onClick={() => {
                                                onSelectGemeente(geoGemeenteName);
                                                handleZoomToFeature(geo);
                                            }}
                                            style={{
                                                default: {
                                                    fill: color,
                                                    stroke: isSelected ? "#0f172a" : "#ffffff",
                                                    strokeWidth: isSelected ? 1.5 : (isVisible ? 0.5 : 0.1),
                                                    outline: "none",
                                                    opacity: isVisible ? 1 : 0.2,
                                                    transition: "all 250ms"
                                                },
                                                hover: {
                                                    fill: isVisible ? "#1e293b" : color,
                                                    stroke: "#ffffff",
                                                    strokeWidth: 1,
                                                    outline: "none",
                                                    cursor: isVisible ? "pointer" : "default"
                                                },
                                                pressed: { fill: "#0f172a", outline: "none" },
                                            }}
                                        />
                                    );
                                });

                                return mappedGeos;
                            }}
                        </Geographies>
                    </ZoomableGroup>
                </ComposableMap>
            </div>

            {/* Legend and Info Box */}
            <div className="absolute bottom-6 left-6 z-10 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-200 pointer-events-auto w-64 max-h-[40vh] overflow-y-auto">
                <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-2 flex items-center gap-2">
                    <span>📍</span> Legenda & Uitleg
                </h3>
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    De kleur weerspiegelt de status per gemeente op basis van de gekozen weergave (rechtsboven).
                    <br /><br />
                    <strong>Tip:</strong> Klik op een gemeente op de kaart om de bijbehorende contactgegevens en scores in te laden in de <span className="font-semibold">Email Generator</span> tab.
                </p>

                {metric === 'regels' ? (
                    <div className="space-y-1">
                        <div className="text-xs font-semibold text-slate-700 mb-1">Aantal Toepasbare Regels</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500"><span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-200"></span> 0 TR (Grijswit)</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500"><span className="w-3 h-3 rounded-full bg-blue-300"></span> ~50 TR (Lichtblauw)</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500"><span className="w-3 h-3 rounded-full bg-blue-700"></span> 200+ TR (Donkerblauw)</div>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <div className="text-xs font-semibold text-slate-700 mb-1">
                            {metric === 'totaleScore' ? 'Totale Risico Score (0-20)' : 'Specifieke KPI Score (0-5)'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500"><span className="w-3 h-3 rounded-full bg-green-500"></span> Goed / Laag Risico</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500"><span className="w-3 h-3 rounded-full bg-yellow-400"></span> Matig / Aandacht vereist</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500"><span className="w-3 h-3 rounded-full bg-red-500"></span> Slecht / Hoog Risico</div>
                    </div>
                )}
            </div>

            {/* Tooltip */}
            {tooltipContent && (
                <div
                    className="fixed z-50 pointer-events-none bg-white p-4 rounded-xl shadow-2xl border border-slate-200 w-72 animate-in fade-in zoom-in duration-150"
                    style={{
                        left: `${tooltipPos.x + 15}px`,
                        top: `${tooltipPos.y + 15}px`,
                        transform: tooltipPos.y > window.innerHeight - 300 ? 'translateY(-100%)' : 'none',
                    }}
                >
                    <h4 className="font-bold text-lg text-slate-800 border-b pb-2 mb-2">{tooltipContent.name}</h4>

                    {tooltipContent.noData ? (
                        <p className="text-sm text-slate-500 italic">Geen data beschikbaar.</p>
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
                                    <div className="text-[10px] text-slate-500">Toepasbare Regels</div>
                                    <div className="text-lg font-bold text-slate-800">{tooltipContent.aantalRegels}</div>
                                </div>
                            </div>

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
                            <div className="text-[10px] text-slate-400 mt-1">Klik om te selecteren in Email Generator</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
