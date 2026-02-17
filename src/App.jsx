import { useState } from 'react';
import { generatePrompt, generateTemplate } from './utils/generator';

function App() {
  const [baseStory, setBaseStory] = useState("De DSO-lijst geeft inzicht in de voortgang van de implementatie.");
  const [figures, setFigures] = useState({ kpi1: '', kpi2: '', kpi3: '', kpi4: '' });
  const [options, setOptions] = useState({ omgevingsplan: false, escalatie: false });
  const [generatedOutput, setGeneratedOutput] = useState("");
  const [activeTab, setActiveTab] = useState('prompt'); // 'prompt' or 'template'

  const handleFigureChange = (e) => {
    setFigures({ ...figures, [e.target.name]: e.target.value });
  };

  const handleOptionChange = (e) => {
    setOptions({ ...options, [e.target.name]: e.target.checked });
  };

  const generate = (type) => {
    setActiveTab(type);
    if (type === 'prompt') {
      setGeneratedOutput(generatePrompt(baseStory, figures, options));
    } else {
      setGeneratedOutput(generateTemplate(baseStory, figures, options));
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedOutput);
    alert("Gekopieerd naar klembord!");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left Column: Inputs */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">
            DSO Email Generator
          </h1>

          {/* Base Story Section */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Standaard Verhaal</label>
            <textarea
              className="w-full h-32 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
              value={baseStory}
              onChange={(e) => setBaseStory(e.target.value)}
              placeholder="Voer hier het basisverhaal in..."
            />
          </div>

          {/* Figures Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Kerncijfers (uit Power BI)</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Aantal Taken', name: 'kpi1' },
                { label: 'OLO Score (%)', name: 'kpi2' },
                { label: 'Dagen Open', name: 'kpi3' },
                { label: 'Gebruikers', name: 'kpi4' }
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{field.label}</label>
                  <input
                    type="number"
                    name={field.name}
                    value={figures[field.name]}
                    onChange={handleFigureChange}
                    className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Options Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Context</h2>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="omgevingsplan" checked={options.omgevingsplan} onChange={handleOptionChange} className="rounded text-blue-600 focus:ring-blue-500" />
                <span className="text-sm">Omgevingsplan aanwezig</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="escalatie" checked={options.escalatie} onChange={handleOptionChange} className="rounded text-red-600 focus:ring-red-500" />
                <span className="text-sm">Escalatie niveau</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => generate('prompt')}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              Genereer Prompt (AI)
            </button>
            <button
              onClick={() => generate('template')}
              className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all"
            >
              Gebruik Template
            </button>
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">
              {activeTab === 'prompt' ? 'AI Prompt' : 'Concept Email'}
            </h2>
            {generatedOutput && (
              <button
                onClick={copyToClipboard}
                className="text-sm text-blue-600 font-medium hover:underline"
              >
                Kopieer tekst
              </button>
            )}
          </div>

          <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-200 overflow-auto font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {generatedOutput || <span className="text-slate-400 italic">Het resultaat verschijnt hier...</span>}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
