import { useState, useMemo } from 'react';
import { generatePrompt, generateTemplate } from './utils/generator';
import { gemeenteData, getAllGemeenteNames } from './data/gemeenteData';

function App() {
  const [baseStory, setBaseStory] = useState("De DSO-lijst geeft inzicht in de voortgang van de implementatie van het Digitaal Stelsel Omgevingswet (DSO). We monitoren hierbij de scores op het gebied van dierlijke mest, regelanalist, OLO-activiteiten en het omgevingsplan.");
  const [selectedGemeente, setSelectedGemeente] = useState('');
  const [figures, setFigures] = useState({ kpi1: '', kpi2: '', kpi3: '', kpi4: '' });
  const [options, setOptions] = useState({
    toon: 'professioneel',
    doel: 'eerste-contact',
    afzender: '',
  });
  const [generatedOutput, setGeneratedOutput] = useState("");
  const [activeTab, setActiveTab] = useState('prompt');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [showBaseStory, setShowBaseStory] = useState(false);

  const gemeenteNames = useMemo(() => getAllGemeenteNames(), []);

  const filteredGemeenten = useMemo(() => {
    if (!searchQuery) return gemeenteNames.slice(0, 20);
    return gemeenteNames.filter(n =>
      n.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 20);
  }, [searchQuery, gemeenteNames]);

  const selectedData = useMemo(() => {
    if (!selectedGemeente) return null;
    return gemeenteData.find(g => g.bestuursorgaan === selectedGemeente);
  }, [selectedGemeente]);

  // Compute score summary
  const scoreSummary = useMemo(() => {
    if (!selectedData) return null;
    const scores = [
      { label: 'Bruidsschat', value: parseInt(figures.kpi1) || 0 },
      { label: 'Regelanalist', value: parseInt(figures.kpi2) || 0 },
      { label: 'OLO', value: parseInt(figures.kpi3) || 0 },
      { label: 'Omgevingsplan', value: parseInt(figures.kpi4) || 0 },
    ];
    const opportunities = scores.filter(s => s.value >= 4);
    const warnings = scores.filter(s => s.value >= 2 && s.value < 4);
    const good = scores.filter(s => s.value < 2);
    return { opportunities, warnings, good, total: parseInt(selectedData.totaleScore) || 0 };
  }, [selectedData, figures]);

  const handleSelectGemeente = (name) => {
    setSelectedGemeente(name);
    setSearchQuery(name);
    const data = gemeenteData.find(g => g.bestuursorgaan === name);
    if (data) {
      setFigures({
        kpi1: data.dierlijkeMestScore || '',
        kpi2: data.regelanalistScore || '',
        kpi3: data.scoreOLO || '',
        kpi4: data.omgevingsplanScore || '',
      });
    }
  };

  const handleFigureChange = (e) => {
    setFigures({ ...figures, [e.target.name]: e.target.value });
  };

  const generate = (type) => {
    setActiveTab(type);
    if (type === 'prompt') {
      setGeneratedOutput(generatePrompt(baseStory, figures, options, selectedData));
    } else {
      setGeneratedOutput(generateTemplate(baseStory, figures, options, selectedData));
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8 font-['Inter',sans-serif] text-slate-800">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
            DSO Email Generator
          </h1>
          <p className="text-slate-500 mt-2">abelTalent & Tafelberg Advies — Gepersonaliseerde emails op basis van DSO-scores</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left Column: Inputs (3 cols) */}
          <div className="lg:col-span-3 space-y-6">

            {/* Gemeente Selector */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/60">
              <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">1</span>
                Selecteer Gemeente
              </h2>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedGemeente(''); }}
                  placeholder="Zoek gemeente..."
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                />
                {searchQuery && !selectedGemeente && (
                  <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-60 overflow-auto">
                    {filteredGemeenten.map((name) => (
                      <button
                        key={name}
                        onClick={() => handleSelectGemeente(name)}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Score Summary Panel */}
              {scoreSummary && (
                <div className="mt-4 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${scoreSummary.total >= 15 ? 'bg-red-100 text-red-700' :
                      scoreSummary.total >= 8 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                      Score: {selectedData.totaleScore}/20 {scoreSummary.total >= 15 ? '(veel kansen)' : scoreSummary.total >= 8 ? '(enkele kansen)' : '(goed op weg)'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      {selectedData.contactpersonen?.length || 0} contactpersonen
                    </span>
                  </div>

                  {/* Quick opportunities overview */}
                  {scoreSummary.opportunities.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-2.5 border border-red-100">
                      <span className="text-xs font-semibold text-red-700">🔴 Kansen: </span>
                      <span className="text-xs text-red-600">{scoreSummary.opportunities.map(s => s.label).join(', ')}</span>
                    </div>
                  )}
                  {scoreSummary.warnings.length > 0 && (
                    <div className="bg-yellow-50 rounded-lg p-2.5 border border-yellow-100">
                      <span className="text-xs font-semibold text-yellow-700">⚠️ Aandacht: </span>
                      <span className="text-xs text-yellow-600">{scoreSummary.warnings.map(s => s.label).join(', ')}</span>
                    </div>
                  )}
                  {scoreSummary.good.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-2.5 border border-green-100">
                      <span className="text-xs font-semibold text-green-700">✅ Goed: </span>
                      <span className="text-xs text-green-600">{scoreSummary.good.map(s => s.label).join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* KPI Section */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/60">
              <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-sm font-bold">2</span>
                Kerncijfers
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Bruidsschat / Dierlijke Mest', name: 'kpi1', max: 5, hint: '5=niet aangepast, 0=aangepast' },
                  { label: 'Regelanalist', name: 'kpi2', max: 5, hint: '5=geen regelanalist, 0=wel' },
                  { label: 'OLO Activiteiten', name: 'kpi3', max: 5, hint: '5=niets gedaan, 0=alles gedaan' },
                  { label: 'Omgevingsplan', name: 'kpi4', max: 5, hint: '5=geen plan, 0=robuust plan' }
                ].map((field) => (
                  <div key={field.name} className="relative">
                    <label className="block text-xs font-medium text-slate-500 mb-1">{field.label}</label>
                    <input
                      type="number"
                      name={field.name}
                      min="0"
                      max={field.max}
                      value={figures[field.name]}
                      onChange={handleFigureChange}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    />
                    <span className="block text-[10px] text-slate-400 mt-0.5">{field.hint}</span>
                    {figures[field.name] !== '' && (
                      <div className={`absolute top-0 right-2 w-2.5 h-2.5 rounded-full ${parseInt(figures[field.name]) === 0 ? 'bg-green-400' :
                        parseInt(figures[field.name]) <= 3 ? 'bg-yellow-400' :
                          'bg-red-400'
                        }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Email Settings */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/60">
              <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-sm font-bold">3</span>
                Email Instellingen
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {/* Sender Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Afzender</label>
                  <input
                    type="text"
                    value={options.afzender}
                    onChange={(e) => setOptions({ ...options, afzender: e.target.value })}
                    placeholder="Jouw naam..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  />
                </div>

                {/* Tone */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Toon</label>
                  <select
                    value={options.toon}
                    onChange={(e) => setOptions({ ...options, toon: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all text-sm bg-white"
                  >
                    <option value="informeel">Informeel & toegankelijk</option>
                    <option value="professioneel">Professioneel & adviserend</option>
                    <option value="urgent">Urgent & zakelijk</option>
                  </select>
                </div>

                {/* Goal */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Doel</label>
                  <select
                    value={options.doel}
                    onChange={(e) => setOptions({ ...options, doel: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all text-sm bg-white"
                  >
                    <option value="eerste-contact">Eerste contact / introductie</option>
                    <option value="follow-up">Follow-up na eerder contact</option>
                    <option value="quickscan">Quickscan aanbieden</option>
                    <option value="workshop">Workshop uitnodigen</option>
                  </select>
                </div>
              </div>

              {/* Collapsible base story */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowBaseStory(!showBaseStory)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span>📝 Standaard Verhaal {showBaseStory ? 'verbergen' : 'aanpassen'}</span>
                  <span className="text-xs text-slate-400">{showBaseStory ? '▲' : '▼'}</span>
                </button>
                {showBaseStory && (
                  <div className="p-3">
                    <textarea
                      className="w-full h-24 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all text-sm resize-none"
                      value={baseStory}
                      onChange={(e) => setBaseStory(e.target.value)}
                      placeholder="Voer hier het basisverhaal in..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => generate('prompt')}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                ✨ Genereer AI Prompt
              </button>
              <button
                onClick={() => generate('template')}
                className="flex-1 bg-white border-2 border-slate-200 text-slate-700 py-3.5 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all"
              >
                📋 Gebruik Template
              </button>
            </div>
          </div>

          {/* Right Column: Output + Contacts (2 cols) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Output */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/60 flex flex-col" style={{ minHeight: '400px' }}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-800">
                  {activeTab === 'prompt' ? '✨ AI Prompt' : '📋 Concept Email'}
                </h2>
                {generatedOutput && (
                  <button
                    onClick={copyToClipboard}
                    className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${copied ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                  >
                    {copied ? '✓ Gekopieerd!' : '📋 Kopieer'}
                  </button>
                )}
              </div>

              <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-200 overflow-auto text-sm leading-relaxed whitespace-pre-wrap">
                {generatedOutput || <span className="text-slate-400 italic">Het resultaat verschijnt hier na het klikken op een van de knoppen...</span>}
              </div>
            </div>

            {/* Contacts */}
            {selectedData && selectedData.contactpersonen && selectedData.contactpersonen.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/60">
                <h2 className="text-lg font-bold text-slate-800 mb-3">
                  👤 Contactpersonen ({selectedData.contactpersonen.length})
                </h2>
                <div className="space-y-1.5 max-h-64 overflow-auto">
                  {selectedData.contactpersonen.map((contact, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg gap-2">
                      <span className="text-sm font-medium text-slate-700">{contact.naam}</span>
                      {contact.functie && (
                        <span className="text-xs text-slate-400 text-right flex-shrink-0 max-w-[50%] truncate" title={contact.functie}>{contact.functie}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
