import { useState, useMemo, useEffect } from 'react';
import { generateEmail } from './utils/generator';
import { fetchContent, clearContentCache, fetchNotes, addNote, logEmailGenerated } from './utils/contentService';
import { calculateScore } from './utils/emailScorer';
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
  const [selectedContact, setSelectedContact] = useState(null);
  const [generatedEmails, setGeneratedEmails] = useState({ email1: '', email2: '', email3: '' });
  const [activeTab, setActiveTab] = useState('email1');
  const [smartContext, setSmartContext] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [showBaseStory, setShowBaseStory] = useState(false);
  const [sheetContent, setSheetContent] = useState(null);
  const [contentStatus, setContentStatus] = useState('loading');
  const [notes, setNotes] = useState([]);
  const [emailLog, setEmailLog] = useState([]);
  const [gemeenteStatus, setGemeenteStatus] = useState('');
  const [gemeenteFase, setGemeenteFase] = useState('');
  const [noteForm, setNoteForm] = useState({ type: 'Status Update', notitie: '' });
  const [noteSaving, setNoteSaving] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  const gemeenteNames = useMemo(() => getAllGemeenteNames(), []);

  const loadContent = async () => {
    setContentStatus('loading');
    try {
      const content = await fetchContent();
      if (content) {
        setSheetContent(content);
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
      // Filter for notes that look like user entries
      const relevantNotes = notes.filter(n => dateRegex.test(n.notitie) || n.notitie.includes('['));

      if (relevantNotes.length > 0) {
        const lastNote = relevantNotes[0];
        const dateMatch = lastNote.notitie.match(dateRegex);
        const year = dateMatch ? dateMatch[0].split('-')[2] : '';
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
    if (!searchQuery) return gemeenteNames.slice(0, 20);
    return gemeenteNames.filter(n =>
      n.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 20);
  }, [searchQuery, gemeenteNames]);

  const selectedData = useMemo(() => {
    if (!selectedGemeente) return null;
    return gemeenteData.find(g => g.bestuursorgaan === selectedGemeente);
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
    const data = gemeenteData.find(g => g.bestuursorgaan === name);
    if (data) {
      // Convert regelanalist score to ja/nee
      const regelScore = data.regelanalistScore;
      const regelJaNee = regelScore === '0' || regelScore === 0 ? 'ja' : 'nee';
      setFigures({
        kpi1: data.dierlijkeMestScore || '',
        kpi2: regelJaNee,
        kpi3: data.scoreOLO || '',
        kpi4: data.omgevingsplanScore || '',
      });
    }
    // Load notes + email log for this gemeente
    const notesData = await fetchNotes(name);
    setNotes(notesData.notes);
    setEmailLog(notesData.emailLog);
    setGemeenteStatus(notesData.status);
    setGemeenteFase(notesData.fase);
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
    const output = generateEmail(baseStory, figures, options, selectedData, selectedContact, sheetContent, smartContext);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8 font-['Inter',sans-serif] text-slate-800">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
            DSO Email Generator
          </h1>
          <p className="text-slate-500 mt-2">AbelTalent & Tafelberg Advies — Gepersonaliseerde emails op basis van DSO-scores</p>
          <div className="flex items-center justify-center gap-3 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${contentStatus === 'loaded' ? 'bg-green-100 text-green-700' :
              contentStatus === 'loading' ? 'bg-blue-100 text-blue-700' :
                'bg-orange-100 text-orange-700'
              }`}>
              {contentStatus === 'loaded' ? '✓ Google Sheet verbonden' :
                contentStatus === 'loading' ? '⏳ Content laden...' :
                  '⚠️ Fallback modus (offline)'}
            </span>
            <button onClick={refreshContent} className="text-xs text-blue-500 hover:text-blue-700 underline" title="Ververs content vanuit Google Sheet">
              🔄 Ververs
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          <div className="lg:col-span-3 space-y-6">

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
                      {selectedData.contactpersonen?.length || 0} contactpersonen
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

            {selectedData && selectedData.contactpersonen && selectedData.contactpersonen.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/60">
                <h2 className="text-lg font-bold text-slate-800 mb-1">👤 Aan wie is de email gericht?</h2>
                <p className="text-xs text-slate-400 mb-3">Optioneel — klik op een contact om de email te personaliseren</p>
                <div className="space-y-1.5 max-h-64 overflow-auto">
                  <button onClick={() => setSelectedContact(null)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg gap-2 text-left transition-all ${selectedContact === null ? 'bg-blue-50 border border-blue-200 ring-1 ring-blue-300' : 'bg-slate-50 hover:bg-slate-100'}`}>
                    <span className="text-sm font-medium text-slate-700">Algemeen (geen specifiek persoon)</span>
                    {selectedContact === null && <span className="text-xs text-blue-600">✓</span>}
                  </button>
                  {selectedData.contactpersonen.map((contact, i) => (
                    <button key={i} onClick={() => setSelectedContact(contact)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg gap-2 text-left transition-all ${selectedContact && selectedContact.naam === contact.naam ? 'bg-blue-50 border border-blue-200 ring-1 ring-blue-300' : 'bg-slate-50 hover:bg-slate-100'}`}>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">{contact.naam}</span>
                        {contact.functie && <span className="text-xs text-slate-400">{contact.functie}</span>}
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-800">✉️ Gegenereerde Email</h2>
                <div className="flex gap-2">
                  {['email1', 'email2', 'email3'].map((tab, i) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all font-medium ${activeTab === tab
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {i + 1}. {tab === 'email1' ? 'Opening' : tab === 'email2' ? 'Follow-up' : 'Waarde'}
                    </button>
                  ))}
                </div>
                {generatedEmails[activeTab] && (
                  <button onClick={copyToClipboard} className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${copied ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                    {copied ? '✓' : '📋'}
                  </button>
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
    </div>
  );
}

export default App;