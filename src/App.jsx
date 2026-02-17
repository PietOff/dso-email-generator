import { useState, useMemo } from 'react';
import { generatePrompt, generateTemplate } from './utils/generator';
import { gemeenteData, getAllGemeenteNames } from './data/gemeenteData';

function App() {
  const [baseStory, setBaseStory] = useState("De DSO-lijst geeft inzicht in de voortgang van de implementatie van het Digitaal Stelsel Omgevingswet (DSO). We monitoren hierbij de scores op het gebied van dierlijke mest, regelanalist, OLO-activiteiten en het omgevingsplan.");
  const [selectedGemeente, setSelectedGemeente] = useState('');
  const [figures, setFigures] = useState({ kpi1: '', kpi2: '', kpi3: '', kpi4: '' });
  const [options, setOptions] = useState({ omgevingsplan: false, escalatie: false });
  const [generatedOutput, setGeneratedOutput] = useState("");
  const [activeTab, setActiveTab] = useState('prompt');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

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
      setOptions(prev => ({
        ...prev,
        omgevingsplan: data.omgevingsplanScore === '5',
      }));
    }
  };

  const handleFigureChange = (e) => {
    setFigures({ ...figures, [e.target.name]: e.target.value });
  };

  const handleOptionChange = (e) => {
    setOptions({ ...options, [e.target.name]: e.target.checked });
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
          <p className="text-slate-500 mt-2">Genereer gepersonaliseerde emails op basis van DSO-scores</p>
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

              {/* Selected info badge */}
              {selectedData && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${parseInt(selectedData.totaleScore) >= 18 ? 'bg-green-100 text-green-700' :
                    parseInt(selectedData.totaleScore) >= 13 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                    Totale Score: {selectedData.totaleScore}/20
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    {selectedData.contactpersonen?.length || 0} contactpersonen
                  </span>
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
                  { label: 'Dierlijke Mest Score', name: 'kpi1', max: 5 },
                  { label: 'Regelanalist Score', name: 'kpi2', max: 5 },
                  { label: 'Score OLO Activiteiten', name: 'kpi3', max: 5 },
                  { label: 'Omgevingsplan Score', name: 'kpi4', max: 5 }
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
                    {figures[field.name] !== '' && (
                      <div className={`absolute top-0 right-2 w-2.5 h-2.5 rounded-full ${parseInt(figures[field.name]) >= 5 ? 'bg-green-400' :
                        parseInt(figures[field.name]) >= 3 ? 'bg-yellow-400' :
                          'bg-red-400'
                        }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Base Story + Context */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/60">
              <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-sm font-bold">3</span>
                Standaard Verhaal & Context
              </h2>
              <textarea
                className="w-full h-28 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm mb-4 resize-none"
                value={baseStory}
                onChange={(e) => setBaseStory(e.target.value)}
                placeholder="Voer hier het basisverhaal in..."
              />
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="omgevingsplan" checked={options.omgevingsplan} onChange={handleOptionChange} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                  <span className="text-sm">Omgevingsplan aanwezig</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="escalatie" checked={options.escalatie} onChange={handleOptionChange} className="rounded text-red-600 focus:ring-red-500 w-4 h-4" />
                  <span className="text-sm">Escalatie niveau</span>
                </label>
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
                    className={`text-sm font-medium px-3 py-1 rounded-lg transition-all ${copied ? 'bg-green-100 text-green-700' : 'text-blue-600 hover:bg-blue-50'
                      }`}
                  >
                    {copied ? '✓ Gekopieerd!' : 'Kopieer'}
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
