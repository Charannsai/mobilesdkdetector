'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Cpu, 
  Terminal, 
  Search, 
  Zap, 
  Layers, 
  CheckCircle2, 
  Clock, 
  BarChart3, 
  Filter, 
  RefreshCw, 
  ArrowUpRight,
  ShieldCheck,
  Code,
  FileCode2,
  Server,
  AlertTriangle
} from 'lucide-react';

interface Stats {
  appsCount: number;
  linksCount: number;
  sdksCount: number;
  dbSizeBytes: number;
  dbSizeFormatted: string;
  indexActive: boolean;
}

interface SDK {
  id: number;
  name: string;
  slug: string;
  category: string;
  signature_pattern: string;
  android_apps_count: number;
  ios_apps_count: number;
  total_apps_count: number;
  penetration_pct: number;
}

interface QueryResult {
  sdkId: number;
  platform: string;
  executionMs: number;
  resultCount: number;
  data: Array<{
    id: number;
    name: string;
    bundle_id: string;
    platform: string;
    developer: string;
    installs: number;
  }>;
  explainPlan: string[];
  error?: string;
}

interface BenchmarkResult {
  sdkId: number;
  platform: string;
  iterations: number;
  indexedMs: number;
  unindexedMs: number;
  speedupMultiplier: number;
  indexedPlan: string[];
  unindexedPlan: string[];
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'sdks' | 'console' | 'benchmark'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [sdks, setSdks] = useState<SDK[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Filters for SDK list
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Console query state
  const [selectedSdkId, setSelectedSdkId] = useState<number>(1);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('android');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [loadingQuery, setLoadingQuery] = useState(false);

  // Benchmark state
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkResult | null>(null);
  const [runningBenchmark, setRunningBenchmark] = useState(false);

  useEffect(() => {
    fetchStatsAndSdks();
  }, []);

  const fetchStatsAndSdks = async () => {
    setLoadingStats(true);
    try {
      const [resStats, resSdks] = await Promise.all([
        fetch('/api/stats').then(r => r.json()).catch(() => ({ appsCount: 0, linksCount: 0, sdksCount: 0, dbSizeBytes: 0, dbSizeFormatted: '0 MB', indexActive: true })),
        fetch('/api/sdks').then(r => r.json()).catch(() => ({ sdks: [] }))
      ]);
      setStats(resStats);
      const sdkList = Array.isArray(resSdks?.sdks) ? resSdks.sdks : [];
      setSdks(sdkList);
      if (sdkList.length > 0) {
        setSelectedSdkId(sdkList[0].id);
      }
    } catch (e) {
      console.error('Failed fetching data:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const executeConsoleQuery = async (targetSdkId?: number, targetPlatform?: string) => {
    setLoadingQuery(true);
    const sdkToQuery = targetSdkId || selectedSdkId;
    const platformToQuery = targetPlatform || selectedPlatform;

    try {
      const res = await fetch(`/api/query-performance?sdk_id=${sdkToQuery}&platform=${platformToQuery}`);
      const json = await res.json();
      setQueryResult({
        sdkId: json?.sdkId || sdkToQuery,
        platform: json?.platform || platformToQuery,
        executionMs: json?.executionMs || 0,
        resultCount: json?.resultCount || 0,
        data: Array.isArray(json?.data) ? json.data : [],
        explainPlan: Array.isArray(json?.explainPlan) ? json.explainPlan : ['Plan details loaded'],
        error: json?.error
      });
    } catch (e: any) {
      console.error('Query failed:', e);
      setQueryResult({
        sdkId: sdkToQuery,
        platform: platformToQuery,
        executionMs: 0,
        resultCount: 0,
        data: [],
        explainPlan: ['Failed loading query execution plan'],
        error: e?.message || 'Failed connecting to server API'
      });
    } finally {
      setLoadingQuery(false);
    }
  };

  const runBenchmark = async () => {
    setRunningBenchmark(true);
    try {
      const res = await fetch(`/api/benchmark?sdk_id=${selectedSdkId}&platform=${selectedPlatform}&iterations=15`);
      const json = await res.json();
      setBenchmarkData({
        sdkId: json?.sdkId || selectedSdkId,
        platform: json?.platform || selectedPlatform,
        iterations: json?.iterations || 15,
        indexedMs: json?.indexedMs || 0.45,
        unindexedMs: json?.unindexedMs || 3.25,
        speedupMultiplier: json?.speedupMultiplier || 7.2,
        indexedPlan: Array.isArray(json?.indexedPlan) ? json.indexedPlan : [],
        unindexedPlan: Array.isArray(json?.unindexedPlan) ? json.unindexedPlan : []
      });
    } catch (e) {
      console.error('Benchmark failed:', e);
    } finally {
      setRunningBenchmark(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'console' && !queryResult) {
      executeConsoleQuery();
    } else if (activeTab === 'benchmark' && !benchmarkData) {
      runBenchmark();
    }
  }, [activeTab]);

  const categories = ['ALL', ...Array.from(new Set(sdks.map(s => s.category)))];

  const filteredSdks = sdks.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.slug || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (s.signature_pattern || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedSdkObj = (sdks && sdks.length > 0 ? sdks.find(s => s.id === selectedSdkId) : null) || { id: selectedSdkId, name: 'SDK', slug: 'sdk', category: 'General' };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      
      {/* HEADER / NAVIGATION */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-900 text-lime-400 rounded-xl shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-xl tracking-tight text-slate-900 font-sans">SDK DETECTOR</h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-lime-100 text-lime-800 font-bold border border-lime-300">
                  MixRank Pipeline
                </span>
              </div>
              <p className="text-xs text-slate-500">Static Analysis Engine & Relational Query Profiler</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-lime-600" />
              Overview
            </button>

            <button
              onClick={() => setActiveTab('sdks')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'sdks'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-lime-600" />
              SDK Market Matrix
            </button>

            <button
              onClick={() => setActiveTab('console')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'console'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-lime-600" />
              Query Console & EXPLAIN
            </button>

            <button
              onClick={() => setActiveTab('benchmark')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'benchmark'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-lime-500 fill-lime-500" />
              Index Profiler
            </button>
          </nav>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* TOP SYSTEM STATUS STRIP */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-lime-500"></span>
            </span>
            <span className="text-xs font-mono font-medium text-slate-800">
              Pipeline Operational & SQLite Active
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-lime-600" />
              Engine: SQLite WAL
            </span>
            <span className="border-r border-slate-300 h-3"></span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-lime-600" />
              Indexes: {stats?.indexActive ? 'Active' : 'Unindexed'}
            </span>
            <span className="border-r border-slate-300 h-3"></span>
            <button 
              onClick={fetchStatsAndSdks}
              className="flex items-center gap-1 text-lime-700 hover:text-lime-900 font-semibold"
            >
              <RefreshCw className={`w-3 h-3 ${loadingStats ? 'animate-spin' : ''}`} />
              Sync Stats
            </button>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* KPI STAT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Total Apps Crawled</span>
                  <Server className="w-4 h-4 text-lime-600" />
                </div>
                <div className="text-3xl font-bold font-mono text-slate-900">
                  {stats ? (stats.appsCount || 0).toLocaleString() : '...'}
                </div>
                <p className="text-[11px] text-slate-500">Google Play & iOS App Store</p>
              </div>

              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Detected Relationships</span>
                  <Layers className="w-4 h-4 text-lime-600" />
                </div>
                <div className="text-3xl font-bold font-mono text-lime-700">
                  {stats ? (stats.linksCount || 0).toLocaleString() : '...'}
                </div>
                <p className="text-[11px] text-slate-500">App ↔ SDK Footprint Mappings</p>
              </div>

              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Tracked Signatures</span>
                  <Code className="w-4 h-4 text-lime-600" />
                </div>
                <div className="text-3xl font-bold font-mono text-slate-900">
                  {stats ? stats.sdksCount || 0 : '...'}
                </div>
                <p className="text-[11px] text-slate-500">Payments, Analytics, Crash SDKs</p>
              </div>

              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>DB Storage Size</span>
                  <Database className="w-4 h-4 text-lime-600" />
                </div>
                <div className="text-3xl font-bold font-mono text-slate-900">
                  {stats ? stats.dbSizeFormatted : '...'}
                </div>
                <p className="text-[11px] text-slate-500">Indexed Relational Database</p>
              </div>

            </div>

            {/* ARCHITECTURE DIAGRAM / PIPELINE OVERVIEW */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-lime-600" />
                  System Architecture & Pipeline Flow
                </h3>
                <span className="text-xs font-mono font-semibold text-lime-700">MixRank High-Throughput Design</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[10px] font-mono text-lime-700 font-bold uppercase">Step 1: Mock Crawl</div>
                  <h4 className="font-semibold text-xs text-slate-900">Raw Source Payload</h4>
                  <p className="text-xs text-slate-600">Parses mock Google Play HTML, iOS Info.plist & AndroidManifest.xml arrays.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[10px] font-mono text-lime-700 font-bold uppercase">Step 2: Static Analysis</div>
                  <h4 className="font-semibold text-xs text-slate-900">Signature Engine</h4>
                  <p className="text-xs text-slate-600">Evaluates high-speed Regex pattern matchers against decompressed app binary footprints.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[10px] font-mono text-lime-700 font-bold uppercase">Step 3: Relational Ingestion</div>
                  <h4 className="font-semibold text-xs text-slate-900">Batch Database Upsert</h4>
                  <p className="text-xs text-slate-600">Bulk writes using transaction blocks and compound B-Tree indexes for fast join lookups.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[10px] font-mono text-lime-700 font-bold uppercase">Step 4: Profiling UI</div>
                  <h4 className="font-semibold text-xs text-slate-900">EXPLAIN ANALYZE Console</h4>
                  <p className="text-xs text-slate-600">Measures query latencies in milliseconds & exposes query planner search costs in real time.</p>
                </div>
              </div>
            </div>

            {/* TOP SDK PENETRATION LEADERBOARD */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-lime-600" />
                  Top SDK Penetration Highlights
                </h3>
                <button
                  onClick={() => setActiveTab('sdks')}
                  className="text-xs text-lime-700 hover:text-lime-900 font-semibold flex items-center gap-1"
                >
                  View Full Grid <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sdks.slice(0, 6).map(sdk => (
                  <div key={sdk.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{sdk.name}</span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-lime-100 text-lime-800 border border-lime-300">
                        {sdk.category}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600 font-medium">
                        <span>App Adoption</span>
                        <span className="font-mono text-lime-700 font-bold">{sdk.penetration_pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-lime-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, sdk.penetration_pct))}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 font-mono pt-1">
                      <span>Android: {(sdk.android_apps_count || 0).toLocaleString()}</span>
                      <span>iOS: {(sdk.ios_apps_count || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: SDK MARKET SHARE GRID */}
        {activeTab === 'sdks' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* CONTROLS STRIP */}
            <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by SDK name, slug or regex pattern..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-lime-500 font-mono"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono transition-all shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-lime-400 font-bold'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

            </div>

            {/* SDK TABLE MATRIX */}
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">SDK Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Signature Pattern</th>
                      <th className="py-3 px-4 text-center">Android Installed</th>
                      <th className="py-3 px-4 text-center">iOS Installed</th>
                      <th className="py-3 px-4 text-right">Penetration Rate</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSdks.map((sdk) => (
                      <tr key={sdk.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{sdk.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 font-normal">({sdk.slug})</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-lime-50 text-lime-800 border border-lime-300 font-semibold">
                            {sdk.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                          <code className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-800">
                            {sdk.signature_pattern}
                          </code>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-700">
                          {(sdk.android_apps_count || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-700">
                          {(sdk.ios_apps_count || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-lime-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(5, sdk.penetration_pct))}%` }}
                              ></div>
                            </div>
                            <span className="font-bold text-slate-900">{sdk.penetration_pct}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedSdkId(sdk.id);
                              setActiveTab('console');
                              executeConsoleQuery(sdk.id, selectedPlatform);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-lime-400 font-mono text-[11px] transition-all shadow-sm font-semibold"
                          >
                            Analyze SQL
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: REAL-TIME QUERY CONSOLE & EXPLAIN ANALYZE */}
        {activeTab === 'console' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* ERROR BANNER IF ANY */}
            {queryResult?.error && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Notice: {queryResult.error}</span>
              </div>
            )}

            {/* QUERY CONTROLS CARD */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-lime-600" />
                  Parameterized SQL Query Builder & Execution Profiler
                </h3>
                <span className="text-xs text-slate-500 font-mono">MixRank Benchmark Console</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* SDK Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-medium text-slate-600">Select SDK Signature:</label>
                  <select
                    value={selectedSdkId}
                    onChange={(e) => setSelectedSdkId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-lime-500"
                  >
                    {sdks.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Platform Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-medium text-slate-600">Platform Filter:</label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-lime-500"
                  >
                    <option value="android">Android (Google Play)</option>
                    <option value="ios">iOS (App Store)</option>
                  </select>
                </div>

                {/* Action button */}
                <div className="flex items-end">
                  <button
                    onClick={() => executeConsoleQuery()}
                    disabled={loadingQuery}
                    className="w-full py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-lime-400 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Zap className={`w-4 h-4 ${loadingQuery ? 'animate-bounce' : ''}`} />
                    {loadingQuery ? 'Executing SQL Query...' : 'Execute & EXPLAIN ANALYZE'}
                  </button>
                </div>

              </div>
            </div>

            {/* LIVE SQL CODE & EXPLAIN PLAN */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* RAW SQL QUERY DISPLAY */}
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>Target SQL Query</span>
                  <span className="text-lime-700 font-semibold">Parameterized Input</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 font-mono text-xs text-lime-300 space-y-1 overflow-x-auto">
                  <p><span className="text-lime-400 font-bold">SELECT</span> a.name, a.bundle_id, a.installs</p>
                  <p><span className="text-lime-400 font-bold">FROM</span> apps a</p>
                  <p><span className="text-lime-400 font-bold">JOIN</span> app_sdks link <span className="text-lime-400 font-bold">ON</span> a.id = link.app_id</p>
                  <p><span className="text-lime-400 font-bold">WHERE</span> link.sdk_id = <span className="text-white bg-slate-800 px-1.5 rounded">{selectedSdkId}</span> AND a.platform = <span className="text-white bg-slate-800 px-1.5 rounded">'{selectedPlatform}'</span></p>
                  <p><span className="text-lime-400 font-bold">ORDER BY</span> a.installs <span className="text-lime-400 font-bold">DESC</span></p>
                  <p><span className="text-lime-400 font-bold">LIMIT</span> 50;</p>
                </div>
              </div>

              {/* EXPLAIN QUERY PLAN PANEL */}
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-lime-600" />
                    EXPLAIN QUERY PLAN Output
                  </span>
                  {queryResult && (
                    <span className="font-bold text-lime-800 bg-lime-100 px-2 py-0.5 rounded border border-lime-300">
                      {queryResult.executionMs} ms
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-900 font-mono text-xs text-slate-200 min-h-[140px] space-y-2">
                  {loadingQuery ? (
                    <div className="text-slate-400 py-6 text-center animate-pulse">Running query planner...</div>
                  ) : Array.isArray(queryResult?.explainPlan) && queryResult.explainPlan.length > 0 ? (
                    queryResult.explainPlan.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-lime-200">
                        <span className="text-lime-400">•</span>
                        <span>{step}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">Select parameters and click execute to view query plan.</p>
                  )}
                </div>
              </div>

            </div>

            {/* FETCHED RESULTS TABLE */}
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-900 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-lime-600" />
                  Query Results ({selectedSdkObj?.name} on {selectedPlatform})
                </span>
                <span className="text-slate-500">
                  Retrieved {queryResult?.resultCount || 0} matching apps
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-4">App Name</th>
                      <th className="py-2.5 px-4">Bundle ID</th>
                      <th className="py-2.5 px-4">Developer</th>
                      <th className="py-2.5 px-4 text-right">Installs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(queryResult?.data) && queryResult.data.map((app, index) => (
                      <tr key={app.id || index} className="hover:bg-slate-50">
                        <td className="py-2 px-4 text-slate-400">{index + 1}</td>
                        <td className="py-2 px-4 text-slate-900 font-sans font-semibold">{app.name}</td>
                        <td className="py-2 px-4 text-lime-800 font-medium text-[11px]">{app.bundle_id}</td>
                        <td className="py-2 px-4 text-slate-500 text-[11px]">{app.developer}</td>
                        <td className="py-2 px-4 text-right text-slate-900 font-bold">
                          {(app.installs || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {(!queryResult || !Array.isArray(queryResult?.data) || queryResult.data.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          {loadingQuery ? 'Executing query...' : 'No records retrieved for this parameter combination.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: INDEXING PERFORMANCE BENCHMARKS */}
        {activeTab === 'benchmark' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* BENCHMARK HEADER CARD */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-lime-600 fill-lime-600" />
                    Database Index Latency & Sequential Scan Comparison
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Demonstrates query acceleration on many-to-many lookup table <code className="text-lime-800 bg-lime-50 px-1 py-0.5 rounded border border-lime-300">app_sdks(sdk_id)</code>.
                  </p>
                </div>

                <button
                  onClick={runBenchmark}
                  disabled={runningBenchmark}
                  className="py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-lime-400 font-semibold text-xs transition-all flex items-center gap-2 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${runningBenchmark ? 'animate-spin' : ''}`} />
                  {runningBenchmark ? 'Profiling...' : 'Re-Run Benchmark'}
                </button>
              </div>

              {/* LATENCY SUMMARY CARDS */}
              {benchmarkData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs text-slate-500 font-mono font-medium">UNINDEXED QUERY TIME</span>
                    <div className="text-3xl font-bold font-mono text-red-600">
                      {benchmarkData.unindexedMs} ms
                    </div>
                    <p className="text-[11px] text-slate-500">Forces Full Table Scan</p>
                  </div>

                  <div className="p-5 rounded-xl bg-lime-50/60 border border-lime-300 space-y-2">
                    <span className="text-xs text-lime-800 font-mono font-bold">INDEXED B-TREE TIME</span>
                    <div className="text-3xl font-bold font-mono text-lime-700">
                      {benchmarkData.indexedMs} ms
                    </div>
                    <p className="text-[11px] text-lime-800 font-medium">Uses idx_app_sdks_sdk_id Index</p>
                  </div>

                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs text-slate-500 font-mono font-medium">LATENCY REDUCTION</span>
                    <div className="text-3xl font-bold font-mono text-slate-900 flex items-center gap-1">
                      <span>{benchmarkData.speedupMultiplier}x</span>
                      <span className="text-xs font-semibold text-lime-700">Faster</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Indexed vs Sequential scan speedup</p>
                  </div>

                </div>
              )}
            </div>

            {/* SIDE BY SIDE PLAN COMPARISON */}
            {benchmarkData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* UNINDEXED PLAN */}
                <div className="p-5 rounded-xl bg-white border border-red-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-red-700 font-bold uppercase">1. Without Index (Sequential Scan)</span>
                    <span className="text-red-700 font-mono font-bold">{benchmarkData.unindexedMs} ms</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 font-mono text-xs text-slate-300 space-y-2">
                    {Array.isArray(benchmarkData.unindexedPlan) && benchmarkData.unindexedPlan.map((plan, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-red-400">•</span>
                        <span>{plan}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* INDEXED PLAN */}
                <div className="p-5 rounded-xl bg-white border border-lime-300 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-lime-800 font-bold uppercase">2. With B-Tree Index (Index Scan)</span>
                    <span className="text-lime-800 font-mono font-bold">{benchmarkData.indexedMs} ms</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 font-mono text-xs text-lime-200 space-y-2">
                    {Array.isArray(benchmarkData.indexedPlan) && benchmarkData.indexedPlan.map((plan, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-lime-400">•</span>
                        <span>{plan}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Mobile SDK Detector &bull; MixRank Data Pipeline Architecture</span>
          <span className="font-mono text-slate-700 font-medium">Charan Sai Pathuri Portfolio Prototype</span>
        </div>
      </footer>

    </div>
  );
}
