import { useState, useEffect } from 'react';
import Head from 'next/head';
import { TrendingUp, Trophy, Users, Calendar } from 'lucide-react';

export default function Public() {
  const [series, setSeries] = useState<any[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [standings, setStandings] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    try {
      const res = await fetch('/api/series');
      const data = await res.json();
      const activeSeries = data.filter((s: any) => s.active);
      setSeries(activeSeries);
      if (activeSeries.length > 0) {
        setSelectedSeries(activeSeries[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch series:', error);
    }
  };

  const fetchStandings = async (seriesId: string, className: string = 'all') => {
    try {
      setLoading(true);
      const res = await fetch(`/api/standings?seriesId=${seriesId}${className !== 'all' ? `&className=${className}` : ''}`);
      const data = await res.json();
      setStandings(data);
    } catch (error) {
      console.error('Failed to fetch standings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSeries) {
      fetchStandings(selectedSeries, selectedClass);
    }
  }, [selectedSeries, selectedClass]);

  const allClasses = Array.from(new Set(standings?.standings?.map((s: any) => s.className) || []));
  const currentSeries = series.find(s => s.id === selectedSeries);

  return (
    <>
      <Head>
        <title>Serietabeller - Cykelevent</title>
        <meta name="description" content="Visa serietabeller och resultat" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-4xl font-bold text-indigo-700 flex items-center gap-3">
              <Trophy size={36} />
              Serietabeller
            </h1>
            <p className="mt-2 text-gray-600">Följ resultaten i realtid</p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Serie selector */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Välj serie
                </label>
                <select
                  value={selectedSeries}
                  onChange={(e) => setSelectedSeries(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-lg"
                >
                  {series.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {allClasses.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Välj klass
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-lg"
                  >
                    <option value="all">Alla klasser</option>
                    {allClasses.map((c: string) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {currentSeries && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={16} />
                  <span>
                    {currentSeries._count.events} event genomförda
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Laddar resultat...</p>
            </div>
          )}

          {/* Standings */}
          {!loading && standings && (
            <div className="space-y-8">
              {/* Individual standings */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <TrendingUp size={24} />
                    Individuell ställning
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                          Placering
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                          Namn
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                          Klubb
                        </th>
                        {selectedClass === 'all' && (
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                            Klass
                          </th>
                        )}
                        <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                          Event
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                          Poäng
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {standings.standings.map((s: any, i: number) => (
                        <tr 
                          key={i} 
                          className={`hover:bg-gray-50 transition-colors ${
                            i < 3 ? 'bg-yellow-50' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-2xl font-bold ${
                                s.rank === 1 ? 'text-yellow-500' :
                                s.rank === 2 ? 'text-gray-400' :
                                s.rank === 3 ? 'text-amber-600' :
                                'text-gray-700'
                              }`}>
                                {s.rank}
                              </span>
                              {s.rank === 1 && <Trophy className="text-yellow-500" size={20} />}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">
                              {s.rider.firstName} {s.rider.lastName}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {s.rider.club || '-'}
                          </td>
                          {selectedClass === 'all' && (
                            <td className="px-6 py-4">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                {s.className}
                              </span>
                            </td>
                          )}
                          <td className="px-6 py-4 text-right text-gray-600">
                            {s.eventCount}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-xl font-bold text-indigo-600">
                              {s.totalPoints}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Team standings */}
              {standings.teamStandings && standings.teamStandings.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Users size={24} />
                      Lagställning
                    </h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                            Placering
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                            Klubb
                          </th>
                          {selectedClass === 'all' && (
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                              Klass
                            </th>
                          )}
                          <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                            Åkare
                          </th>
                          <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                            Poäng
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {standings.teamStandings.map((t: any, i: number) => (
                          <tr 
                            key={i} 
                            className={`hover:bg-gray-50 transition-colors ${
                              i < 3 ? 'bg-green-50' : ''
                            }`}
                          >
                            <td className="px-6 py-4">
                              <span className={`text-2xl font-bold ${
                                t.rank === 1 ? 'text-yellow-500' :
                                t.rank === 2 ? 'text-gray-400' :
                                t.rank === 3 ? 'text-amber-600' :
                                'text-gray-700'
                              }`}>
                                {t.rank}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-gray-900">
                                {t.teamName}
                              </div>
                            </td>
                            {selectedClass === 'all' && (
                              <td className="px-6 py-4">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  {t.className}
                                </span>
                              </td>
                            )}
                            <td className="px-6 py-4 text-right text-gray-600">
                              {t.riderCount}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-xl font-bold text-green-600">
                                {t.totalPoints}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-16 bg-gray-800 text-white py-8">
          <div className="container mx-auto px-4 text-center">
            <p>© 2025 Cykelevent Resultathantering</p>
            <p className="mt-2 text-sm text-gray-400">
              Resultat uppdateras efter varje tävling
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
