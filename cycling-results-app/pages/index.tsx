import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { 
  Calculator, Upload, Download, Settings, Users, Trash2, Edit2, 
  X, Check, AlertCircle, Plus, RefreshCw, TrendingUp, BarChart3
} from 'lucide-react';

// Icon components för Lucide React
const IconProps = { size: 16, strokeWidth: 2 };

export default function Home() {
  const [activeTab, setActiveTab] = useState('results');
  const [series, setSeries] = useState<any[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [riders, setRiders] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [standings, setStandings] = useState<any>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewSeries, setShowNewSeries] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hämta serier vid start
  useEffect(() => {
    fetchSeries();
    fetchRiders();
  }, []);

  const fetchSeries = async () => {
    try {
      const res = await fetch('/api/series');
      const data = await res.json();
      setSeries(data);
    } catch (error) {
      console.error('Failed to fetch series:', error);
    }
  };

  const fetchRiders = async () => {
    try {
      const res = await fetch('/api/riders');
      const data = await res.json();
      setRiders(data);
    } catch (error) {
      console.error('Failed to fetch riders:', error);
    }
  };

  const fetchStandings = async (seriesId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/standings?seriesId=${seriesId}${selectedClass !== 'all' ? `&className=${selectedClass}` : ''}`);
      const data = await res.json();
      setStandings(data);
    } catch (error) {
      console.error('Failed to fetch standings:', error);
      showMessage('error', 'Kunde inte hämta serietabell');
    } finally {
      setLoading(false);
    }
  };

  const fetchDuplicates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/riders/duplicates?threshold=0.75');
      const data = await res.json();
      setDuplicates(data);
      setShowDuplicates(true);
    } catch (error) {
      console.error('Failed to fetch duplicates:', error);
      showMessage('error', 'Kunde inte hämta dubbletter');
    } finally {
      setLoading(false);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setLoading(true);
        const csvData = event.target?.result as string;
        
        // Visa dialog för att välja serie och event
        const seriesId = prompt('Ange serie-ID (kan hämtas från serie-listan):');
        const eventName = prompt('Ange eventnamn (t.ex. "Deltävling 1"):');
        const eventDate = prompt('Ange datum (YYYY-MM-DD) - valfritt:');

        if (!seriesId || !eventName) {
          showMessage('error', 'Serie och eventnamn krävs');
          return;
        }

        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            csvData,
            seriesId,
            eventName,
            eventDate
          })
        });

        const data = await res.json();
        
        if (res.ok) {
          showMessage('success', `Importerade ${data.resultsImported} resultat och skapade ${data.ridersCreated} nya deltagare`);
          fetchRiders();
        } else {
          showMessage('error', data.error || 'Import misslyckades');
        }
      } catch (error) {
        console.error('Import error:', error);
        showMessage('error', 'Kunde inte importera fil');
      } finally {
        setLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const mergeDuplicates = async (keepId: string, mergeIds: string[]) => {
    try {
      setLoading(true);
      const res = await fetch('/api/riders/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepId, mergeIds })
      });

      if (res.ok) {
        showMessage('success', 'Deltagare sammanslagen');
        fetchRiders();
        fetchDuplicates();
      } else {
        showMessage('error', 'Kunde inte slå samman deltagare');
      }
    } catch (error) {
      console.error('Merge error:', error);
      showMessage('error', 'Kunde inte slå samman deltagare');
    } finally {
      setLoading(false);
    }
  };

  const createSeries = async (formData: any) => {
    try {
      setLoading(true);
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        showMessage('success', 'Serie skapad');
        fetchSeries();
        setShowNewSeries(false);
      } else {
        const data = await res.json();
        showMessage('error', data.error || 'Kunde inte skapa serie');
      }
    } catch (error) {
      console.error('Create series error:', error);
      showMessage('error', 'Kunde inte skapa serie');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (type: string) => {
    try {
      let url = `/api/export?type=${type}`;
      if (type === 'standings' && selectedSeries !== 'all') {
        url += `&seriesId=${selectedSeries}`;
        if (selectedClass !== 'all') {
          url += `&className=${selectedClass}`;
        }
      }
      
      window.open(url, '_blank');
    } catch (error) {
      console.error('Export error:', error);
      showMessage('error', 'Kunde inte exportera data');
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  useEffect(() => {
    if (selectedSeries !== 'all') {
      fetchStandings(selectedSeries);
    }
  }, [selectedSeries, selectedClass]);

  const allClasses = Array.from(new Set(standings?.standings?.map((s: any) => s.className) || []));

  return (
    <>
      <Head>
        <title>Cykelevent Resultathantering</title>
        <meta name="description" content="Hantera och visualisera cykelresultat" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-indigo-700 text-white py-6 shadow-lg">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Calculator {...IconProps} size={32} />
              Cykelevent Resultathantering
            </h1>
            <p className="mt-2 text-indigo-200">Hantera serier, resultat och serietabeller</p>
          </div>
        </header>

        {/* Message Toast */}
        {message && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white max-w-md`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <Check {...IconProps} /> : <AlertCircle {...IconProps} />}
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className="ml-auto">
                <X {...IconProps} />
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Action Buttons */}
          <div className="mb-6 flex flex-wrap gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx"
              onChange={handleCSVImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Upload {...IconProps} />
              Importera CSV/Excel
            </button>
            <button
              onClick={() => setShowNewSeries(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus {...IconProps} />
              Ny Serie
            </button>
            <button
              onClick={() => exportData('newsletter')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Download {...IconProps} />
              Exportera Nyhetsbrevslista
            </button>
            <button
              onClick={() => exportData('riders')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Download {...IconProps} />
              Exportera Deltagare
            </button>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('standings')}
                  className={`px-6 py-3 font-semibold flex items-center gap-2 ${
                    activeTab === 'standings'
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <TrendingUp {...IconProps} />
                  Serietabeller
                </button>
                <button
                  onClick={() => setActiveTab('series')}
                  className={`px-6 py-3 font-semibold flex items-center gap-2 ${
                    activeTab === 'series'
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 {...IconProps} />
                  Serier
                </button>
                <button
                  onClick={() => setActiveTab('riders')}
                  className={`px-6 py-3 font-semibold flex items-center gap-2 ${
                    activeTab === 'riders'
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Users {...IconProps} />
                  Deltagare ({riders.length})
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Serietabeller Tab */}
              {activeTab === 'standings' && (
                <div>
                  <div className="mb-4 flex gap-4">
                    <select
                      value={selectedSeries}
                      onChange={(e) => setSelectedSeries(e.target.value)}
                      className="px-4 py-2 border rounded-lg"
                    >
                      <option value="all">Välj serie</option>
                      {series.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    
                    {selectedSeries !== 'all' && allClasses.length > 0 && (
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="px-4 py-2 border rounded-lg"
                      >
                        <option value="all">Alla klasser</option>
                        {allClasses.map((c: string) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    )}

                    {selectedSeries !== 'all' && (
                      <button
                        onClick={() => exportData('standings')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                      >
                        <Download {...IconProps} />
                        Exportera tabell
                      </button>
                    )}
                  </div>

                  {loading && (
                    <div className="text-center py-8">
                      <RefreshCw className="animate-spin inline-block" {...IconProps} size={32} />
                      <p className="mt-2 text-gray-600">Laddar...</p>
                    </div>
                  )}

                  {!loading && standings && selectedSeries !== 'all' && (
                    <div>
                      {/* Individuell tabell */}
                      <h3 className="text-xl font-bold mb-4">Individuell tabell</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead className="bg-indigo-600 text-white">
                            <tr>
                              <th className="p-2 text-left">Placering</th>
                              <th className="p-2 text-left">Namn</th>
                              <th className="p-2 text-left">Klubb</th>
                              <th className="p-2 text-left">Klass</th>
                              <th className="p-2 text-right">Event</th>
                              <th className="p-2 text-right">Totalt poäng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standings.standings.map((s: any, i: number) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="p-2 font-bold">{s.rank}</td>
                                <td className="p-2">{s.rider.firstName} {s.rider.lastName}</td>
                                <td className="p-2">{s.rider.club || '-'}</td>
                                <td className="p-2">{s.className}</td>
                                <td className="p-2 text-right">{s.eventCount}</td>
                                <td className="p-2 text-right font-bold text-indigo-600">{s.totalPoints}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Team tabell */}
                      {standings.teamStandings && standings.teamStandings.length > 0 && (
                        <div className="mt-8">
                          <h3 className="text-xl font-bold mb-4">Lagpoäng</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                              <thead className="bg-green-600 text-white">
                                <tr>
                                  <th className="p-2 text-left">Placering</th>
                                  <th className="p-2 text-left">Klubb</th>
                                  <th className="p-2 text-left">Klass</th>
                                  <th className="p-2 text-right">Antal åkare</th>
                                  <th className="p-2 text-right">Totalt poäng</th>
                                </tr>
                              </thead>
                              <tbody>
                                {standings.teamStandings.map((t: any, i: number) => (
                                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                                    <td className="p-2 font-bold">{t.rank}</td>
                                    <td className="p-2">{t.teamName}</td>
                                    <td className="p-2">{t.className}</td>
                                    <td className="p-2 text-right">{t.riderCount}</td>
                                    <td className="p-2 text-right font-bold text-green-600">{t.totalPoints}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!loading && selectedSeries === 'all' && (
                    <div className="text-center py-8 text-gray-500">
                      Välj en serie för att visa serietabell
                    </div>
                  )}
                </div>
              )}

              {/* Serier Tab */}
              {activeTab === 'series' && (
                <div>
                  <div className="grid gap-4">
                    {series.map(s => (
                      <div key={s.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-bold">{s.name}</h3>
                            <p className="text-sm text-gray-600">{s.description}</p>
                            <div className="mt-2 text-sm">
                              <span className="inline-block bg-indigo-100 text-indigo-800 px-2 py-1 rounded mr-2">
                                {s.pointSystemType}
                              </span>
                              {s.teamBased && (
                                <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded">
                                  Lagbaserad
                                </span>
                              )}
                            </div>
                            <p className="mt-2 text-sm text-gray-500">
                              {s._count.events} event · {s._count.standings} deltagare
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedSeries(s.id);
                                setActiveTab('standings');
                              }}
                              className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                            >
                              Visa tabell
                            </button>
                          </div>
                        </div>
                        
                        {s.events.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm font-semibold mb-2">Event:</p>
                            <div className="flex flex-wrap gap-2">
                              {s.events.map((e: any) => (
                                <span key={e.id} className="text-xs bg-white px-2 py-1 rounded border">
                                  {e.name}
                                  {e.date && ` (${new Date(e.date).toLocaleDateString('sv-SE')})`}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deltagare Tab */}
              {activeTab === 'riders' && (
                <div>
                  <button
                    onClick={fetchDuplicates}
                    disabled={loading}
                    className="mb-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <AlertCircle {...IconProps} />
                    Visa dubbletter ({duplicates.length})
                  </button>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-indigo-600 text-white">
                        <tr>
                          <th className="p-2 text-left">Namn</th>
                          <th className="p-2 text-left">Klubb</th>
                          <th className="p-2 text-left">UCI ID</th>
                          <th className="p-2 text-left">E-post</th>
                          <th className="p-2 text-left">Telefon</th>
                          <th className="p-2 text-right">Resultat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {riders.map((r, i) => (
                          <tr key={r.id} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                            <td className="p-2">{r.firstName} {r.lastName}</td>
                            <td className="p-2">{r.club || '-'}</td>
                            <td className="p-2 font-mono text-xs">
                              {r.uciId || '-'}
                              {r.uciId?.startsWith('TEMP') && (
                                <span className="ml-1 text-yellow-600">(Temp)</span>
                              )}
                            </td>
                            <td className="p-2">{r.email || '-'}</td>
                            <td className="p-2">{r.phone || '-'}</td>
                            <td className="p-2 text-right">{r.resultCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Ny Serie Modal */}
        {showNewSeries && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Skapa ny serie</h2>
                <button onClick={() => setShowNewSeries(false)}>
                  <X {...IconProps} />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createSeries({
                    name: formData.get('name'),
                    description: formData.get('description'),
                    pointSystemType: formData.get('pointSystemType'),
                    teamBased: formData.get('teamBased') === 'on'
                  });
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Namn *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="t.ex. Gravity Series Downhill 2025"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Beskrivning</label>
                    <textarea
                      name="description"
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={3}
                      placeholder="Beskrivning av serien..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Poängsystem *</label>
                    <select
                      name="pointSystemType"
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="ENDURO">Enduro</option>
                      <option value="DH_KVAL">DH Kval</option>
                      <option value="DH_RACE">DH Race</option>
                      <option value="OTHERS">Övriga</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="teamBased"
                      id="teamBased"
                      className="mr-2"
                    />
                    <label htmlFor="teamBased" className="text-sm">Lagbaserad poängräkning</label>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Skapa
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewSeries(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Avbryt
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Dubbletter Modal */}
        {showDuplicates && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Potentiella dubbletter ({duplicates.length})</h2>
                <button onClick={() => setShowDuplicates(false)}>
                  <X {...IconProps} />
                </button>
              </div>

              {duplicates.length === 0 ? (
                <p className="text-center py-8 text-gray-500">Inga dubbletter hittade</p>
              ) : (
                <div className="space-y-4">
                  {duplicates.map((group, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                      <div className="mb-2">
                        <span className="text-sm font-semibold text-purple-600">
                          Likhet: {(group.similarity * 100).toFixed(0)}%
                        </span>
                        <span className="ml-2 text-xs text-gray-600">
                          ({group.reasons.join(', ')})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {group.riders.map((rider: any) => (
                          <div key={rider.id} className="flex justify-between items-center p-2 bg-white rounded border">
                            <div>
                              <div className="font-medium">
                                {rider.firstName} {rider.lastName}
                              </div>
                              <div className="text-sm text-gray-600">
                                {rider.club || 'Ingen klubb'} · {rider.resultCount} resultat
                              </div>
                              {rider.uciId && (
                                <div className="text-xs text-gray-500 font-mono">
                                  UCI: {rider.uciId}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const others = group.riders.filter((r: any) => r.id !== rider.id).map((r: any) => r.id);
                                if (confirm(`Slå samman till ${rider.firstName} ${rider.lastName}?`)) {
                                  mergeDuplicates(rider.id, others);
                                }
                              }}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              Behåll denna
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
