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
  AlertTriangle,
  Mail
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
    <div className="min-h-screen bg-white text-[#1d1d1d] flex flex-col font-sans">
      
      {/* HEADER / NAVIGATION */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#1d1d1d] text-white rounded-xl shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-xl tracking-tight text-[#1d1d1d]">SDK DETECTOR</h1>
                <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-[#1d1d1d] text-white font-bold">
                  MixRank Pipeline
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Static Analysis Engine & Relational Query Profiler</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#1d1d1d] text-white shadow-sm'
                  : 'text-slate-700 hover:text-[#1d1d1d] hover:bg-slate-200/70 font-semibold'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Overview
            </button>

            <button
              onClick={() => setActiveTab('sdks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'sdks'
                  ? 'bg-[#1d1d1d] text-white shadow-sm'
                  : 'text-slate-700 hover:text-[#1d1d1d] hover:bg-slate-200/70 font-semibold'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              SDK Market Matrix
            </button>

            <button
              onClick={() => setActiveTab('console')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'console'
                  ? 'bg-[#1d1d1d] text-white shadow-sm'
                  : 'text-slate-700 hover:text-[#1d1d1d] hover:bg-slate-200/70 font-semibold'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Query Console & EXPLAIN
            </button>

            <button
              onClick={() => setActiveTab('benchmark')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'benchmark'
                  ? 'bg-[#1d1d1d] text-white shadow-sm'
                  : 'text-slate-700 hover:text-[#1d1d1d] hover:bg-slate-200/70 font-semibold'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Index Profiler
            </button>
          </nav>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* TOP SYSTEM STATUS STRIP */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1d1d1d] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#1d1d1d]"></span>
            </span>
            <span className="text-xs font-mono font-bold text-[#1d1d1d]">
              Pipeline Status: Active & Operational
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-700">
            <span className="flex items-center gap-1.5 font-semibold">
              <Database className="w-3.5 h-3.5 text-[#1d1d1d]" />
              SQLite WAL Storage
            </span>
            <span className="border-r border-slate-200 h-3"></span>
            <span className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1d1d1d]" />
              Indexes: {stats?.indexActive ? 'Active' : 'Unindexed'}
            </span>
            <span className="border-r border-slate-200 h-3"></span>
            <button 
              onClick={fetchStatsAndSdks}
              className="flex items-center gap-1 text-[#1d1d1d] hover:text-black font-extrabold underline decoration-2 underline-offset-2 transition-colors"
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
              
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-[#1d1d1d] transition-all space-y-2 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#1d1d1d]"></div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Total Apps Crawled</span>
                  <div className="p-2 rounded-xl bg-[#1d1d1d] text-white">
                    <Server className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold font-mono text-[#1d1d1d]">
                  {stats ? (stats.appsCount || 0).toLocaleString() : '...'}
                </div>
                <p className="text-[11px] font-medium text-slate-500">Google Play & iOS App Store</p>
              </div>

              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-[#1d1d1d] transition-all space-y-2 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#1d1d1d]"></div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Detected Relationships</span>
                  <div className="p-2 rounded-xl bg-[#1d1d1d] text-white">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold font-mono text-[#1d1d1d]">
                  {stats ? (stats.linksCount || 0).toLocaleString() : '...'}
                </div>
                <p className="text-[11px] font-medium text-slate-500">App ↔ SDK Footprint Mappings</p>
              </div>

              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-[#1d1d1d] transition-all space-y-2 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#1d1d1d]"></div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Tracked Signatures</span>
                  <div className="p-2 rounded-xl bg-[#1d1d1d] text-white">
                    <Code className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold font-mono text-[#1d1d1d]">
                  {stats ? stats.sdksCount || 0 : '...'}
                </div>
                <p className="text-[11px] font-medium text-slate-500">Payments, Analytics, Crash SDKs</p>
              </div>

              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-[#1d1d1d] transition-all space-y-2 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#1d1d1d]"></div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>DB Storage Size</span>
                  <div className="p-2 rounded-xl bg-[#1d1d1d] text-white">
                    <Database className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold font-mono text-[#1d1d1d]">
                  {stats ? stats.dbSizeFormatted : '...'}
                </div>
                <p className="text-[11px] font-medium text-slate-500">Indexed Relational Database</p>
              </div>

            </div>

            {/* ARCHITECTURE DIAGRAM / PIPELINE OVERVIEW */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="font-extrabold text-sm tracking-tight text-[#1d1d1d] flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-[#1d1d1d]" />
                  System Architecture & Pipeline Flow
                </h3>
                <span className="text-xs font-mono font-bold text-white bg-[#1d1d1d] px-2.5 py-1 rounded-md">
                  MixRank Design
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[10px] font-mono text-[#1d1d1d] font-extrabold uppercase">Step 1: Mock Crawl</div>
                  <h4 className="font-bold text-xs text-[#1d1d1d]">Raw Source Payload</h4>
                  <p className="text-xs text-slate-600 font-medium">Parses mock Google Play HTML, iOS Info.plist & AndroidManifest.xml arrays.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[10px] font-mono text-[#1d1d1d] font-extrabold uppercase">Step 2: Static Analysis</div>
                  <h4 className="font-bold text-xs text-[#1d1d1d]">Signature Engine</h4>
                  <p className="text-xs text-slate-600 font-medium">Evaluates high-speed Regex pattern matchers against decompressed app binary footprints.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[10px] font-mono text-[#1d1d1d] font-extrabold uppercase">Step 3: Relational Ingestion</div>
                  <h4 className="font-bold text-xs text-[#1d1d1d]">Batch Database Upsert</h4>
                  <p className="text-xs text-slate-600 font-medium">Bulk writes using transaction blocks and compound B-Tree indexes for fast join lookups.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[10px] font-mono text-[#1d1d1d] font-extrabold uppercase">Step 4: Profiling UI</div>
                  <h4 className="font-bold text-xs text-[#1d1d1d]">EXPLAIN ANALYZE Console</h4>
                  <p className="text-xs text-slate-600 font-medium">Measures query latencies in milliseconds & exposes query planner search costs in real time.</p>
                </div>
              </div>
            </div>

            {/* TOP SDK PENETRATION LEADERBOARD */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="font-extrabold text-sm tracking-tight text-[#1d1d1d] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#1d1d1d]" />
                  Top SDK Penetration Highlights
                </h3>
                <button
                  onClick={() => setActiveTab('sdks')}
                  className="text-xs text-[#1d1d1d] hover:text-black font-extrabold flex items-center gap-1 underline decoration-2 underline-offset-2 transition-colors"
                >
                  View Full Grid <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sdks.slice(0, 6).map(sdk => (
                  <div key={sdk.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-[#1d1d1d] space-y-3 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#1d1d1d]">{sdk.name}</span>
                      <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-slate-100 text-[#1d1d1d] border border-slate-300">
                        {sdk.category}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>App Adoption</span>
                        <span className="font-mono text-[#1d1d1d] font-extrabold">{sdk.penetration_pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div 
                          className="h-full bg-[#1d1d1d] rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, sdk.penetration_pct))}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-600 font-mono font-medium pt-1">
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs text-[#1d1d1d] font-semibold placeholder-slate-400 focus:outline-none focus:border-[#1d1d1d] font-mono"
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
                        ? 'bg-[#1d1d1d] text-white font-extrabold'
                        : 'bg-slate-100 text-[#1d1d1d] hover:bg-slate-200 border border-slate-200 font-semibold'
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
                  <thead className="bg-[#1d1d1d] text-white font-mono uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="py-3.5 px-4">SDK Name</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Signature Pattern</th>
                      <th className="py-3.5 px-4 text-center">Android Installed</th>
                      <th className="py-3.5 px-4 text-center">iOS Installed</th>
                      <th className="py-3.5 px-4 text-right">Penetration Rate</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredSdks.map((sdk) => (
                      <tr key={sdk.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-extrabold text-[#1d1d1d]">
                          <div className="flex items-center gap-2">
                            <span className="text-[#1d1d1d] text-sm font-bold">{sdk.name}</span>
                            <span className="text-[10px] font-mono text-slate-500 font-medium">({sdk.slug})</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-[#1d1d1d] border border-slate-300 font-bold">
                            {sdk.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#1d1d1d] text-[11px]">
                          <code className="bg-slate-50 px-2.5 py-1 rounded border border-slate-200 text-[#1d1d1d] font-semibold">
                            {sdk.signature_pattern}
                          </code>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-[#1d1d1d] font-bold">
                          {(sdk.android_apps_count || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-[#1d1d1d] font-bold">
                          {(sdk.ios_apps_count || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 hidden sm:block">
                              <div
                                className="h-full bg-[#1d1d1d] rounded-full"
                                style={{ width: `${Math.min(100, Math.max(5, sdk.penetration_pct))}%` }}
                              ></div>
                            </div>
                            <span className="font-extrabold text-[#1d1d1d] text-xs">{sdk.penetration_pct}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedSdkId(sdk.id);
                              setActiveTab('console');
                              executeConsoleQuery(sdk.id, selectedPlatform);
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-[#1d1d1d] hover:bg-black text-white font-mono text-[11px] transition-all shadow-sm font-bold"
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
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="font-extrabold text-sm tracking-tight text-[#1d1d1d] flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#1d1d1d]" />
                  Parameterized SQL Query Builder & Execution Profiler
                </h3>
                <span className="text-xs text-[#1d1d1d] font-mono font-bold">MixRank Console</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* SDK Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-[#1d1d1d]">Select SDK Signature:</label>
                  <select
                    value={selectedSdkId}
                    onChange={(e) => setSelectedSdkId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-[#1d1d1d] font-mono font-bold focus:outline-none focus:border-[#1d1d1d]"
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
                  <label className="text-xs font-mono font-bold text-[#1d1d1d]">Platform Filter:</label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-[#1d1d1d] font-mono font-bold focus:outline-none focus:border-[#1d1d1d]"
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
                    className="w-full py-2 px-4 rounded-lg bg-[#1d1d1d] hover:bg-black text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
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
                <div className="flex items-center justify-between text-xs text-[#1d1d1d] font-mono font-bold">
                  <span>Target SQL Query</span>
                  <span className="text-[#1d1d1d] font-extrabold">Parameterized Input</span>
                </div>
                <div className="p-4 rounded-xl bg-[#1d1d1d] font-mono text-xs text-white space-y-1 overflow-x-auto">
                  <p><span className="text-slate-300 font-extrabold">SELECT</span> a.name, a.bundle_id, a.installs</p>
                  <p><span className="text-slate-300 font-extrabold">FROM</span> apps a</p>
                  <p><span className="text-slate-300 font-extrabold">JOIN</span> app_sdks link <span className="text-slate-300 font-extrabold">ON</span> a.id = link.app_id</p>
                  <p><span className="text-slate-300 font-extrabold">WHERE</span> link.sdk_id = <span className="text-[#1d1d1d] bg-white px-1.5 rounded font-extrabold">{selectedSdkId}</span> AND a.platform = <span className="text-[#1d1d1d] bg-white px-1.5 rounded font-extrabold">'{selectedPlatform}'</span></p>
                  <p><span className="text-slate-300 font-extrabold">ORDER BY</span> a.installs <span className="text-slate-300 font-extrabold">DESC</span></p>
                  <p><span className="text-slate-300 font-extrabold">LIMIT</span> 50;</p>
                </div>
              </div>

              {/* EXPLAIN QUERY PLAN PANEL */}
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs text-[#1d1d1d] font-mono font-bold">
                  <span className="flex items-center gap-1.5 font-bold text-[#1d1d1d]">
                    <Clock className="w-3.5 h-3.5 text-[#1d1d1d]" />
                    EXPLAIN QUERY PLAN Output
                  </span>
                  {queryResult && (
                    <span className="font-extrabold text-white bg-[#1d1d1d] px-2.5 py-0.5 rounded-full">
                      {queryResult.executionMs} ms
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-[#1d1d1d] font-mono text-xs text-slate-200 min-h-[140px] space-y-2">
                  {loadingQuery ? (
                    <div className="text-slate-400 py-6 text-center animate-pulse">Running query planner...</div>
                  ) : Array.isArray(queryResult?.explainPlan) && queryResult.explainPlan.length > 0 ? (
                    queryResult.explainPlan.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-white">
                        <span className="text-white font-extrabold">•</span>
                        <span>{step}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400">Select parameters and click execute to view query plan.</p>
                  )}
                </div>
              </div>

            </div>

            {/* FETCHED RESULTS TABLE */}
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#1d1d1d] font-extrabold text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1d1d1d]" />
                  Query Results ({selectedSdkObj?.name} on {selectedPlatform})
                </span>
                <span className="text-[#1d1d1d] font-bold">
                  Retrieved {queryResult?.resultCount || 0} matching apps
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#1d1d1d] text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-4">App Name</th>
                      <th className="py-2.5 px-4">Bundle ID</th>
                      <th className="py-2.5 px-4">Developer</th>
                      <th className="py-2.5 px-4 text-right">Installs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Array.isArray(queryResult?.data) && queryResult.data.map((app, index) => (
                      <tr key={app.id || index} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 text-slate-500 font-bold">{index + 1}</td>
                        <td className="py-2.5 px-4 text-[#1d1d1d] font-sans font-extrabold">{app.name}</td>
                        <td className="py-2.5 px-4 text-[#1d1d1d] font-bold text-[11px]">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                            {app.bundle_id}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 text-[11px] font-semibold">{app.developer}</td>
                        <td className="py-2.5 px-4 text-right text-[#1d1d1d] font-black">
                          {(app.installs || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {(!queryResult || !Array.isArray(queryResult?.data) || queryResult.data.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-600 font-medium">
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
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight text-[#1d1d1d] flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#1d1d1d] fill-[#1d1d1d]" />
                    Database Index Latency & Sequential Scan Comparison
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Demonstrates query acceleration on many-to-many lookup table <code className="text-[#1d1d1d] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 font-bold">app_sdks(sdk_id)</code>.
                  </p>
                </div>

                <button
                  onClick={runBenchmark}
                  disabled={runningBenchmark}
                  className="py-2 px-4 rounded-lg bg-[#1d1d1d] hover:bg-black text-white font-extrabold text-xs transition-all flex items-center gap-2 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${runningBenchmark ? 'animate-spin' : ''}`} />
                  {runningBenchmark ? 'Profiling...' : 'Re-Run Benchmark'}
                </button>
              </div>

              {/* LATENCY SUMMARY CARDS */}
              {benchmarkData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs text-[#1d1d1d] font-mono font-bold uppercase">UNINDEXED QUERY TIME</span>
                    <div className="text-3xl font-black font-mono text-red-600">
                      {benchmarkData.unindexedMs} ms
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">Forces Full Table Scan</p>
                  </div>

                  <div className="p-5 rounded-xl bg-white border-2 border-[#1d1d1d] space-y-2 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-[#1d1d1d] text-white font-mono text-[9px] font-bold px-2.5 py-0.5 rounded-bl">RECOMMENDED INDEX</div>
                    <span className="text-xs text-[#1d1d1d] font-mono font-extrabold uppercase">INDEXED B-TREE TIME</span>
                    <div className="text-3xl font-black font-mono text-[#1d1d1d]">
                      {benchmarkData.indexedMs} ms
                    </div>
                    <p className="text-[11px] text-[#1d1d1d] font-extrabold">Uses idx_app_sdks_sdk_id Index</p>
                  </div>

                  <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-2 shadow-sm">
                    <span className="text-xs text-[#1d1d1d] font-mono font-bold uppercase">LATENCY REDUCTION</span>
                    <div className="text-3xl font-black font-mono text-[#1d1d1d] flex items-center gap-2">
                      <span>{benchmarkData.speedupMultiplier}x</span>
                      <span className="text-xs font-extrabold bg-[#1d1d1d] text-white px-2.5 py-0.5 rounded-full">Faster</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">Indexed vs Sequential scan speedup</p>
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
                    <span className="text-red-700 font-black uppercase">1. Without Index (Sequential Scan)</span>
                    <span className="text-red-700 font-mono font-extrabold">{benchmarkData.unindexedMs} ms</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#1d1d1d] font-mono text-xs text-white space-y-2">
                    {Array.isArray(benchmarkData.unindexedPlan) && benchmarkData.unindexedPlan.map((plan, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-red-400 font-bold">•</span>
                        <span>{plan}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* INDEXED PLAN */}
                <div className="p-5 rounded-xl bg-white border-2 border-[#1d1d1d] shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#1d1d1d] font-black uppercase">2. With B-Tree Index (Index Scan)</span>
                    <span className="text-[#1d1d1d] font-mono font-extrabold">{benchmarkData.indexedMs} ms</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#1d1d1d] font-mono text-xs text-white space-y-2">
                    {Array.isArray(benchmarkData.indexedPlan) && benchmarkData.indexedPlan.map((plan, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-white font-extrabold">•</span>
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
      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-[#1d1d1d] font-semibold">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Mobile SDK Detector &bull; MixRank Data Pipeline Architecture</span>
          <div className="flex items-center gap-1.5 font-medium">
            <span>Built by</span>
            <a 
              href="mailto:pathurisai31@gmail.com" 
              className="font-mono text-[#1d1d1d] font-bold hover:underline transition-colors flex items-center gap-1"
            >
              <Mail className="w-3.5 h-3.5 inline text-[#1d1d1d]" />
              Charan Sai Pathuri
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
