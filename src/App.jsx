import { useState, useMemo, useEffect } from 'react';
import { generateEmail } from './utils/generator';
import { fetchContent, clearContentCache, fetchNotes, addNote, logEmailGenerated, getGoogleSheetUrl, fetchMonitorData, fetchMonitorHistory, fetchContacts } from './utils/contentService';
import { calculateScore } from './utils/emailScorer';
import { gemeenteData, getAllGemeenteNames } from './data/gemeenteData';
import { overigeData, getAllOverigeNames } from './data/overigeData';
import DsoMap from './components/DsoMap';

function App() {
  const [baseStory, setBaseStory] = useState("Vanuit AbelTalent en onze partner Tafelberg Advies werken we dagelijks samen met gemeenten aan de Omgevingswet — van regelanalyse en vragenbomen tot capaciteitsvraagstukken. We kennen de uitdagingen, en helpen daar graag bij.");
  const [selectedGemeente, setSelectedGemeente] = useState('');
  const [figures, setFigures] = useState({ kpi1: '', kpi2: '', kpi3: '', kpi4: '' });
  const [options, setOptions] = useState({
    toon: 'professioneel',
    doel: 'eerste-contact',
    afzender: '',
    voegWhitepaperToe: false
  });
  const [selectedContact, setSelectedContact] = useState(null);
  const [generatedEmails, setGeneratedEmails] = useState({ email1: '', email2: '', email3: '' });
  const [activeTab, setActiveTab] = useState('email1');
  const [smartContext, setSmartContext] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [showBaseStory, setShowBaseStory] = useState(false);
  const [sheetContent, setSheetContent] = useState(null);
  const [monitorData, setMonitorData] = useState(null);
  const [monitorHistory, setMonitorHistory] = useState({});
  const [contentStatus, setContentStatus] = useState('loading');
  const [syncing, setSyncing] = useState(false);
  const [notes, setNotes] = useState([]);
  const [contacts, setContacts] = useState([]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/trigger-sync', { method: 'POST' });
      if (res.ok) {
        alert('✅ Sync gestart! Dit duurt ongeveer 1-2 minuten. Ververs de pagina over een paar minuten om de nieuwe data te zien.');
      } else {
        const err = await res.json();
        alert('❌ Fout bij starten sync: ' + (err.error || 'Onbekende fout'));
      }
    } catch (e) {
      alert('❌ Netwerkfout bij starten sync');
    } finally {
      setSyncing(false);
    }
  };

  const [emailLog, setEmailLog] = useState([]);
  const [gemeenteStatus, setGemeenteStatus] = useState('');
  const [gemeenteFase, setGemeenteFase] = useState('');
  const [noteForm, setNoteForm] = useState({ type: 'Status Update', notitie: '' });
  const [noteSaving, setNoteSaving] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  const _gemeenteNames = useMemo(() => getAllGemeenteNames(), []);
  const gemeenteNames = useMemo(() => [..._gemeenteNames, ...getAllOverigeNames()], [_gemeenteNames]);

  const loadContent = async () => {
    setContentStatus('loading');
    try {
      const [content, monitor, history] = await Promise.all([
        fetchContent(),
        fetchMonitorData(),
        fetchMonitorHistory()
      ]);

      if (content) {
        setSheetContent(content);
        setMonitorData(monitor);
        setMonitorHistory(history);
        setContentStatus('loaded');
        if (content.algemeen && content.algemeen.standaard_verhaal) {
          setBaseStory(content.algemeen.standaard_verhaal);
        }
      } else {
        setContentStatus('error');
      }
    } catch {
      setContentStatus('error');
    }
  };

  const refreshContent = () => {
    clearContentCache();
    loadContent();
  };


  // Load content from Google Sheets on startup
  useEffect(() => {
    loadContent();
  }, []);

  // Smart Context Logic: Detect latest contact from notes
  useEffect(() => {
    if (notes && notes.length > 0) {
      const dateRegex = /(\d{2}-\d{2}-\d{4})/;
      // Filter for notes that look like user entries safely
      const relevantNotes = notes.filter(n => {
        if (!n || !n.notitie || typeof n.notitie !== 'string') return false;
        return dateRegex.test(n.notitie) || n.notitie.includes('[');
      });

      if (relevantNotes.length > 0) {
        const lastNote = relevantNotes[0];
        const dateMatch = lastNote.notitie.match(dateRegex);
        const year = dateMatch ? dateMatch[1].split('-')[2] : '';

        const authorMatch = lastNote.notitie.match(/\[([A-Z]+)/);
        const author = authorMatch ? authorMatch[1] : 'een collega';

        if (year) {
          setSmartContext(`Volgens onze notities hebben we in ${year} voor het laatst contact gehad (${author}).`);
        } else {
          setSmartContext(`Ik zag dat er eerder contact is geweest met ${author}.`);
        }
      } else {
        setSmartContext('');
      }
    } else {
      setSmartContext('');
    }
  }, [notes]);

  const filteredGemeenten = useMemo(() => {
    if (!searchQuery) return gemeenteNames;
    return gemeenteNames.filter(n =>
      n.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, gemeenteNames]);

  const selectedData = useMemo(() => {
    if (!selectedGemeente) return null;
    return gemeenteData.find(g => g.bestuursorgaan === selectedGemeente) || overigeData.find(o => o.bestuursorgaan === selectedGemeente);
  }, [selectedGemeente]);

  const scoreSummary = useMemo(() => {
    if (!selectedData) return null;
    const kpi2Val = figures.kpi2 === 'nee' ? 5 : figures.kpi2 === 'ja' ? 0 : (parseInt(figures.kpi2) || 0);
    const scores = [
      { label: 'Bruidsschat', value: parseInt(figures.kpi1) || 0 },
      { label: 'Regelanalist', value: kpi2Val },
      { label: 'OLO', value: parseInt(figures.kpi3) || 0 },
      { label: 'Omgevingsplan', value: parseInt(figures.kpi4) || 0 },
    ];
    const opportunities = scores.filter(s => s.value >= 4);
    const warnings = scores.filter(s => s.value >= 2 && s.value < 4);
    const good = scores.filter(s => s.value < 2);
    return { opportunities, warnings, good, total: parseInt(selectedData.totaleScore) || 0 };
  }, [selectedData, figures]);

  const handleSelectGemeente = async (name) => {
    setSelectedGemeente(name);
    setSearchQuery(name);
    setSelectedContact(null);
    setGeneratedEmails({ email1: '', email2: '', email3: '' });

    // If selected from map, switch to generator view
    if (activeView === 'kaart') {
      setActiveView('generator');
    }

    // Default data from local JSON
    const data = gemeenteData.find(g => g.bestuursorgaan === name) || overigeData.find(o => o.bestuursorgaan === name);
    let newFigures = { kpi1: '', kpi2: '', kpi3: '', kpi4: '', kpi5: '', kpi6: '' };

    if (data) {
      const regelScore = data.regelanalistScore;
      const regelJaNee = regelScore === '0' || regelScore === 0 ? 'ja' : 'nee';
      newFigures = {
        kpi1: data.dierlijkeMestScore || '',
        kpi2: regelJaNee,
        kpi3: data.scoreOLO || '',
        kpi4: data.omgevingsplanScore || '',
      };
    }

    // OVERRIDE with Monitor Data if available (Power BI data synced via Action)
    const cleanName = name.replace(/[’'‘]/g, "'").replace(/^gemeente\s+/i, '').replace(/^'s\s+/i, "'s-").replace(/\(\s*([A-Za-z]+)\.\s*\)/g, '($1)').trim().toLowerCase();
    if (monitorData && monitorData[cleanName]) {
      const m = monitorData[cleanName];
      console.log('Using Monitor Data for', name, m);
      if (m.kpi1) newFigures.kpi1 = m.kpi1;
      if (m.kpi2) newFigures.kpi2 = m.kpi2;
      if (m.kpi3) newFigures.kpi3 = m.kpi3;
      if (m.kpi4) newFigures.kpi4 = m.kpi4;
      if (m.kpi5) newFigures.kpi5 = m.kpi5;
      if (m.kpi6) newFigures.kpi6 = m.kpi6;

      // Override kpi4 with regelingType priority if available in monitor
      if (m.kpi4) newFigures.kpi4 = m.kpi4;
    } else if (cleanName) {
      console.warn('⚠️ No monitor data found for:', name, '(cleaned:', cleanName, ')');
    }

    setFigures(newFigures);

    // Load notes + email log for this gemeente
    const notesData = await fetchNotes(name);
    setNotes(notesData.notes);
    setEmailLog(notesData.emailLog);
    setGemeenteStatus(notesData.status);
    setGemeenteFase(notesData.fase);

    // Load contacts from Google Sheet (with fallback to hardcoded data)
    try {
      const sheetContacts = await fetchContacts();
      const key = name.toLowerCase().trim();
      if (sheetContacts[key] && sheetContacts[key].length > 0) {
        setContacts(sheetContacts[key]);
      } else {
        // Fallback to hardcoded contactpersonen
        setContacts(data?.contactpersonen || []);
      }
    } catch {
      setContacts(data?.contactpersonen || []);
    }
  };

  const handleAddNote = async () => {
    if (!selectedGemeente || !noteForm.notitie.trim()) return;
    setNoteSaving(true);
    await addNote(selectedGemeente, noteForm.type, noteForm.notitie, options.afzender || 'Team');
    setNoteForm({ type: 'Status Update', notitie: '' });
    setShowNoteForm(false);
    // Refresh notes after a short delay (Google Sheets needs time to process)
    setTimeout(async () => {
      const data = await fetchNotes(selectedGemeente);
      setNotes(data.notes);
      setEmailLog(data.emailLog);
      setNoteSaving(false);
    }, 2000);
  };

  const handleFigureChange = (e) => {
    setFigures({ ...figures, [e.target.name]: e.target.value });
  };

  const generate = () => {
    const enrichedName = selectedGemeente ? selectedGemeente.replace(/^gemeente\s+/i, '').trim().toLowerCase() : '';
    const enriched = monitorData && enrichedName ? monitorData[enrichedName] : null;
    const output = generateEmail(baseStory, figures, options, selectedData, selectedContact, sheetContent, smartContext, enriched);
    setGeneratedEmails(output);
    setActiveTab('email1');

    // Auto-log to Google Sheet (only 1st email)
    if (selectedGemeente && output.email1) {
      logEmailGenerated(
        selectedGemeente,
        selectedContact?.naam || '',
        selectedContact?.functie || '',
        options.doel,
        options.toon
      );
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedEmails[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const emailScore = useMemo(() => {
    return calculateScore('', generatedEmails[activeTab]);
  }, [generatedEmails, activeTab]);

  const [activeView, setActiveView] = useState('generator');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8 font-['Inter',sans-serif] text-slate-800">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
            DSO Email Generator
          </h1>
          <p className="text-slate-500 mt-2">AbelTalent & Tafelberg Advies — Gepersonaliseerde emails op basis van DSO-scores</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            {/* Main Navigation Tabs */}
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
              <button
                onClick={() => setActiveView('generator')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeView === 'generator' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                ✉️ Email Generator
              </button>
              <button
                onClick={() => setActiveView('monitor')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeView === 'monitor' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                📊 DSO Databank
              </button>
              <button
                onClick={() => setActiveView('matrix')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeView === 'matrix' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                📊 Volledige Matrix
              </button>
              <button
                onClick={() => setActiveView('kaart')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeView === 'kaart' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                🗺️ DSO Kaart
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mt-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${contentStatus === 'loaded' ? 'bg-green-100 text-green-700' :
              contentStatus === 'loading' ? 'bg-blue-100 text-blue-700' :
                'bg-orange-100 text-orange-700'
              }`}>
              {contentStatus === 'loaded' ? '✓ Google Sheet verbonden' :
                contentStatus === 'loading' ? '⏳ Content laden...' :

                  '⚠️ Fallback modus (offline)'}
            </span>
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`text-xs px-2 py-1 rounded border transition-colors ${syncing ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
              title="Start Power BI synchronisatie (via GitHub Actions)"
            >
              {syncing ? '⏳ Starten...' : '⚡ Sync Nu'}
            </button>
            <button onClick={refreshContent} className="text-xs text-blue-500 hover:text-blue-700 underline" title="Ververs content vanuit Google Sheet">
              🔄 Ververs
            </button>
            <a href={getGoogleSheetUrl()} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-700 underline flex items-center gap-1" title="Open Google Sheet">
              📊 Open Sheet
            </a>
          </div>
        </div>

        {/* DSO Databank View (Clean Data Presentation) */}
        <div className={activeView === 'monitor' ? 'block' : 'hidden'}>
          <div className="bg-white/80 backdrop-blur-sm p-6 lg:p-10 rounded-2xl shadow-xl border border-white/60 mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="text-3xl">📊</span> Power BI Databank
            </h2>
            <p className="text-slate-500 mb-8 text-sm">
              Zoek een gemeente om direct de actuele openbare data uit het DSO en Power BI in te zien, zoals het actuele beleid (Omgevingsplan/Voorbeschermingsregels), de gekoppelde behandeldienst en de toepasbare regels.
            </p>

            <div className="relative mb-8 z-50">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSelectedGemeente(''); }}
                placeholder="Zoek een gemeente..."
                className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm md:text-base shadow-sm"
              />
              {searchQuery && !selectedGemeente && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-80 overflow-auto">
                  {filteredGemeenten.map((name) => (
                    <button
                      key={name}
                      onClick={() => handleSelectGemeente(name)}
                      className="w-full text-left px-5 py-3 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedGemeente && monitorData && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <h3 className="text-xl font-semibold text-slate-800 flex items-center justify-between border-b pb-4">
                  <span>Gemeente {selectedGemeente.replace(/^gemeente\s+/i, '')}</span>
                  <span className="text-sm font-normal text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{gemeenteStatus || 'Geen status'}</span>
                </h3>

                {(() => {
                  const cleanSelected = selectedGemeente.replace(/[’'‘]/g, "'").replace(/^gemeente\s+/i, '').replace(/^'s\s+/i, "'s-").replace(/\(\s*([A-Za-z]+)\.\s*\)/g, '($1)').trim().toLowerCase();
                  const m = monitorData[cleanSelected];
                  if (!m) return (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-4xl block mb-3">📭</span>
                      <h4 className="font-semibold text-slate-700">Geen actuele data gevonden</h4>
                      <p className="text-sm text-slate-500 mt-1">Deze gemeente staat mogelijk niet in de meest recente Power BI export.</p>
                    </div>
                  );

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Regeling & Beleid */}
                      <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100">
                        <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1 block">Regeling & Beleid</span>
                        <div className="text-lg font-medium text-slate-800">{m.regelingType || 'Niet bekend'}</div>
                        <div className="text-sm text-slate-500 mt-2">Actuele status van het Omgevingsplan volgens het DSO.</div>
                      </div>

                      {/* Toepasbare Regels */}
                      <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100">
                        <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1 block">Toepasbare Regels</span>
                        <div className="text-lg font-medium text-slate-800">{m.aantalRegels ? `${m.aantalRegels} vragenbomen` : '0 regels'}</div>
                        {m.trSoftware && <div className="text-sm text-slate-500 mt-2">Software: <strong>{m.trSoftware}</strong></div>}
                        {m.laatsteWijziging && <div className="text-xs text-slate-400 mt-1">Laatste wijziging: {(() => {
                          const ts = Number(m.laatsteWijziging);
                          if (ts > 1000000000000) {
                            return new Date(ts).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
                          }
                          return m.laatsteWijziging;
                        })()}</div>}
                      </div>

                      {/* Behandeldienst */}
                      <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-100 md:col-span-2">
                        <span className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1 block">Uitvoering & Behandeling</span>
                        <div className="text-lg font-medium text-slate-800">{m.behandeldienst || 'Geen gekoppelde omgevingsdienst'}</div>
                        <div className="text-sm text-slate-500 mt-2">Deze behandeldienst is in het DSO ingesteld voor het afhandelen van vergunningsaanvragen.</div>
                      </div>

                      {/* KPI Overzicht */}
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 md:col-span-2 mt-4">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">KPI Scores</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="bg-white p-3 rounded-lg border border-slate-100">
                            <div className="text-xs text-slate-500">KPI1: Dierlijke Mest</div>
                            <div className="text-xl font-bold text-slate-800 mt-1">{figures.kpi1 || '-'}</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-100">
                            <div className="text-xs text-slate-500">KPI2: Regelanalist</div>
                            <div className="text-xl font-bold text-slate-800 mt-1">{figures.kpi2 || '-'}</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-100">
                            <div className="text-xs text-slate-500">KPI3: Omgevingsloket</div>
                            <div className="text-xl font-bold text-slate-800 mt-1">{figures.kpi3 || '-'}</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-100">
                            <div className="text-xs text-slate-500">KPI4: Omgevingsplan</div>
                            <div className="text-xl font-bold text-slate-800 mt-1">{figures.kpi4 || '-'}</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-100">
                            <div className="text-xs text-slate-500">KPI5: Ontwerpen</div>
                            <div className="text-xl font-bold text-slate-800 mt-1">{figures.kpi5 || '-'}</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-100">
                            <div className="text-xs text-slate-500">KPI6: BOPA's</div>
                            <div className="text-xl font-bold text-slate-800 mt-1">{figures.kpi6 || '-'}</div>
                          </div>
                        </div>
                        {gemeenteFase && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <span className="text-xs text-slate-500">Interne Fase: </span>
                            <span className="text-sm font-medium text-slate-700">{gemeenteFase}</span>
                          </div>
                        )}
                      </div>

                      {/* Sync Info */}
                      {m.lastUpdate && (
                        <div className="md:col-span-2 text-right">
                          <span className="text-xs text-slate-400">🔄 Laatste sync: {m.lastUpdate}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* DSO Volledige Matrix View (Original Power BI Embed) */}
        <div className={activeView === 'matrix' ? 'block' : 'hidden'}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden" style={{ height: '80vh' }}>
            <iframe
              title="DSO Kruismatrix"
              width="100%"
              height="100%"
              src="https://app.fabric.microsoft.com/view?r=eyJrIjoiMzg1ZTYwMTYtOTA4Yy00ZDMyLWFlYzMtODJiZjYyZTk3MjZjIiwidCI6IjUxYzI5NmZjLTQzNTMtNGIxMi1iYjM4LTJmMzlmODQ3MzFkYSIsImMiOjl9"
              frameBorder="0"
              allowFullScreen={true}
            ></iframe>
          </div>
        </div>

        {/* DSO Kaart View */}
        <div className={activeView === 'kaart' ? 'block' : 'hidden'}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative" style={{ height: '80vh' }}>
            {activeView === 'kaart' && (
              <DsoMap
                monitorData={monitorData}
                historyData={monitorHistory}
                gemeenteData={gemeenteData}
                selectedGemeente={selectedGemeente}
                onSelectGemeente={handleSelectGemeente}
              />
            )}
          </div>
        </div>

        {/* Email Generator View */}
        <div className={`grid grid-cols-1 lg:grid-cols-5 gap-6 ${activeView === 'generator' ? 'block' : 'hidden'}`}>

          <div className="lg:col-span-3 space-y-6">

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/60 relative z-50">
              <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">1</span>
                Selecteer Gemeente
              </h2>
              <div className="relative z-50">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedGemeente(''); }}
                  placeholder="Zoek gemeente..."
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                />
                {searchQuery && !selectedGemeente && (
                  <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-60 overflow-auto">
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

              {/* Smart Context Input */}
              {selectedGemeente && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    💡 Smart Context (Auto-detect)
                  </label>
                  <textarea
                    value={smartContext}
                    onChange={(e) => setSmartContext(e.target.value)}
                    placeholder="Hier verschijnt automatisch context uit de historie..."
                    className="w-full p-2.5 rounded-xl border border-blue-100 bg-blue-50/50 text-sm h-16 resize-none focus:ring-blue-500"
                  />
                </div>
              )}

              {scoreSummary && (
                <div className="mt-4 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${scoreSummary.total >= 15 ? 'bg-red-100 text-red-700' : scoreSummary.total >= 8 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      Score: {selectedData.totaleScore}/20 {scoreSummary.total >= 15 ? '(veel kansen)' : scoreSummary.total >= 8 ? '(enkele kansen)' : '(goed op weg)'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      {contacts.length || 0} contactpersonen
                    </span>
                  </div>
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

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/60">
              <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-sm font-bold">2</span>
                Kerncijfers
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Bruidsschat / Dierlijke Mest', name: 'kpi1', max: 5, hint: '5=niet aangepast, 0=aangepast' },
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
                      <div className={`absolute top-0 right-2 w-2.5 h-2.5 rounded-full ${parseInt(figures[field.name]) === 0 ? 'bg-green-400' : parseInt(figures[field.name]) <= 3 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                    )}
                  </div>
                ))}
                <div className="relative">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Regelanalist aanwezig?</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFigures({ ...figures, kpi2: 'ja' })}
                      className={`flex-1 p-2.5 rounded-xl border text-sm font-medium transition-all ${figures.kpi2 === 'ja'
                        ? 'bg-green-100 border-green-300 text-green-700 ring-1 ring-green-300'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                      ✅ Ja
                    </button>
                    <button
                      onClick={() => setFigures({ ...figures, kpi2: 'nee' })}
                      className={`flex-1 p-2.5 rounded-xl border text-sm font-medium transition-all ${figures.kpi2 === 'nee'
                        ? 'bg-red-100 border-red-300 text-red-700 ring-1 ring-red-300'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                      ❌ Nee
                    </button>
                  </div>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Is er een regelanalist actief?</span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/60">
              <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-sm font-bold">3</span>
                Email Instellingen
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Afzender</label>
                  <input type="text" value={options.afzender} onChange={(e) => setOptions({ ...options, afzender: e.target.value })} placeholder="Jouw naam..." className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Toon</label>
                  <select value={options.toon} onChange={(e) => setOptions({ ...options, toon: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all text-sm bg-white">
                    <option value="informeel">Informeel & toegankelijk</option>
                    <option value="professioneel">Professioneel & adviserend</option>
                    <option value="urgent">Urgent & zakelijk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Doel</label>
                  <select value={options.doel} onChange={(e) => setOptions({ ...options, doel: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all text-sm bg-white">
                    <option value="eerste-contact">Eerste contact / introductie</option>
                    <option value="follow-up">Follow-up na eerder contact</option>
                    <option value="quickscan">Quickscan aanbieden</option>
                    <option value="workshop">Workshop uitnodigen</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-100 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={options.voegWhitepaperToe || false}
                      onChange={(e) => setOptions({ ...options, voegWhitepaperToe: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">Voeg Whitepaper Link Toe</span>
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1 ml-6">Automatisch een link naar de whitepaper onderaan de e-mail plaatsen.</p>
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button onClick={() => setShowBaseStory(!showBaseStory)} className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <span>📝 Standaard Verhaal {showBaseStory ? 'verbergen' : 'aanpassen'}</span>
                  <span className="text-xs text-slate-400">{showBaseStory ? '▲' : '▼'}</span>
                </button>
                {showBaseStory && (
                  <div className="p-3">
                    <textarea className="w-full h-24 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all text-sm resize-none" value={baseStory} onChange={(e) => setBaseStory(e.target.value)} placeholder="Voer hier het basisverhaal in..." />
                  </div>
                )}
              </div>
            </div>

            <button onClick={generate} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all text-lg">
              ✉️ Genereer Email
            </button>
          </div>

          <div className="lg:col-span-2 space-y-6">

            {selectedData && contacts.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/60">
                <h2 className="text-lg font-bold text-slate-800 mb-1">👤 Aan wie is de email gericht?</h2>
                <p className="text-xs text-slate-400 mb-3">Optioneel — klik op een contact om de email te personaliseren</p>
                <div className="space-y-1.5 max-h-64 overflow-auto">
                  <button onClick={() => setSelectedContact(null)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg gap-2 text-left transition-all ${selectedContact === null ? 'bg-blue-50 border border-blue-200 ring-1 ring-blue-300' : 'bg-slate-50 hover:bg-slate-100'}`}>
                    <span className="text-sm font-medium text-slate-700">Algemeen (geen specifiek persoon)</span>
                    {selectedContact === null && <span className="text-xs text-blue-600">✓</span>}
                  </button>
                  {contacts.map((contact, i) => (
                    <button key={i} onClick={() => setSelectedContact(contact)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg gap-2 text-left transition-all ${selectedContact && selectedContact.naam === contact.naam ? 'bg-blue-50 border border-blue-200 ring-1 ring-blue-300' : 'bg-slate-50 hover:bg-slate-100'}`}>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">{contact.naam}</span>
                        {contact.functie && <span className="text-xs text-slate-400">{contact.functie}</span>}
                        {contact.email && <span className="text-xs text-blue-400">✉ {contact.email}</span>}
                      </div>
                      {selectedContact && selectedContact.naam === contact.naam && <span className="text-xs text-blue-600">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedGemeente && (
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/60">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">📝 Notities — {selectedGemeente}</h2>
                    {(gemeenteStatus || gemeenteFase) && (
                      <div className="flex gap-2 mt-1">
                        {gemeenteStatus && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">Status: {gemeenteStatus}</span>}
                        {gemeenteFase && <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">Fase: {gemeenteFase}</span>}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setShowNoteForm(!showNoteForm)} className="text-sm font-medium px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all">
                    {showNoteForm ? '✕ Annuleer' : '+ Notitie'}
                  </button>
                </div>

                {showNoteForm && (
                  <div className="bg-purple-50 rounded-xl p-4 mb-3 border border-purple-100 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                      <select value={noteForm.type} onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value })} className="w-full p-2 rounded-lg border border-slate-200 text-sm bg-white">
                        <option value="Status Update">Statusupdate</option>
                        <option value="Contact">Contact gehad</option>
                        <option value="HubSpot">HubSpot notitie</option>
                        <option value="Afspraak">Afspraak</option>
                        <option value="Intern">Interne notitie</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Notitie</label>
                      <textarea value={noteForm.notitie} onChange={(e) => setNoteForm({ ...noteForm, notitie: e.target.value })} placeholder="Schrijf een aantekening..." className="w-full h-20 p-2.5 rounded-lg border border-slate-200 text-sm resize-none" />
                    </div>
                    <button onClick={handleAddNote} disabled={noteSaving || !noteForm.notitie.trim()} className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${noteSaving ? 'bg-slate-200 text-slate-400' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
                      {noteSaving ? '⏳ Opslaan...' : '💾 Opslaan in Google Sheet'}
                    </button>
                  </div>
                )}

                <div className="space-y-2 max-h-48 overflow-auto">
                  {notes.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Nog geen notities voor deze gemeente</p>
                  ) : notes.map((note, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div className="flex justify-between items-start">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${note.type === 'HubSpot' || note.type === 'HubSpot Import' ? 'bg-orange-100 text-orange-700' :
                          note.type === 'Contact' ? 'bg-blue-100 text-blue-700' :
                            note.type === 'Afspraak' ? 'bg-green-100 text-green-700' :
                              'bg-slate-200 text-slate-600'
                          }`}>{note.type}</span>
                        <span className="text-[10px] text-slate-400">{note.datum} · {note.auteur}</span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1.5 whitespace-pre-line">{note.notitie}</p>
                    </div>
                  ))}
                </div>

                {emailLog.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <h3 className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">📨 Email Geschiedenis</h3>
                    <div className="space-y-1">
                      {emailLog.map((entry, i) => (
                        <p key={i} className="text-[11px] text-slate-500 bg-blue-50 px-2 py-1 rounded">{entry}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/60 flex flex-col" style={{ minHeight: '400px' }}>
              <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-4">
                  <h2 className="text-lg font-bold text-slate-800 shrink-0">✉️ Gegenereerde Email</h2>
                  <div className="flex gap-2 flex-wrap">
                    {['email1', 'email2', 'email3'].map((tab, i) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`text-xs px-3 py-1.5 rounded-full transition-all font-medium whitespace-nowrap ${activeTab === tab
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {i + 1}. {tab === 'email1' ? 'Opening' : tab === 'email2' ? 'Follow-up' : 'Waarde'}
                      </button>
                    ))}
                  </div>
                </div>
                {generatedEmails[activeTab] && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <a href="/Whitepaper_AbelTalent.pdf" download="Whitepaper_Praktische_Oplossingen_Omgevingswet_AbelTalent.pdf" className="text-xs font-medium px-3 py-2 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors flex items-center gap-1.5 whitespace-nowrap" title="Download Whitepaper als PDF">
                      <span>📄</span> Whitepaper
                    </a>
                    <button onClick={copyToClipboard} className={`text-xs font-medium px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${copied ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                      <span>{copied ? '✓' : '📋'}</span> {copied ? 'Gekopieerd' : 'Kopieer'}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-200 overflow-auto text-sm leading-relaxed whitespace-pre-wrap mb-4 font-mono">
                {generatedEmails[activeTab] || <span className="text-slate-400 italic">Selecteer een gemeente, vul de scores in en klik op "Genereer Campagne"...</span>}
              </div>

              {/* EMAIL HEALTH SCORE */}
              {generatedEmails[activeTab] && (
                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm transform transition-all animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Gezondheid</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-400">Score:</span>
                      <span className={`text-lg font-bold ${emailScore.score >= 80 ? 'text-green-600' : emailScore.score >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                        {emailScore.score}/100
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {emailScore.feedback.map((f, i) => (
                      <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium border ${f.type === 'warning' ? 'bg-red-50 text-red-700 border-red-100' :
                        f.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                        {f.type === 'warning' ? '⚠️' : f.type === 'success' ? '✅' : 'ℹ️'} {f.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div >
  );
}

export default App;