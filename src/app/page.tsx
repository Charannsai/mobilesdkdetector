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
  Server
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
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/sdks').then(r => r.json())
      ]);
      setStats(resStats);
      setSdks(resSdks.sdks || []);
      if (resSdks.sdks && resSdks.sdks.length > 0) {
        setSelectedSdkId(resSdks.sdks[0].id);
      }
    } catch (e) {
      console.error('Failed fetching data:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const executeConsoleQuery = async () => {
    setLoadingQuery(true);
    try {
      const res = await fetch(`/api/query-performance?sdk_id=${selectedSdkId}&platform=${selectedPlatform}`);
      const json = await res.json();
      setQueryResult(json);
    } catch (e) {
      console.error('Query failed:', e);
    } finally {
      setLoadingQuery(false);
    }
  };

  const runBenchmark = async () => {
    setRunningBenchmark(true);
    try {
      const res = await fetch(`/api/benchmark?sdk_id=${selectedSdkId}&platform=${selectedPlatform}&iterations=15`);
      const json = await res.json();
      setBenchmarkData(json);
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
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.signature_pattern.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedSdkObj = sdks.find(s => s.id === selectedSdkId) || sdks[0];

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col font-sans">
      
      {/* HEADER / NAVIGATION */}
      <header className="border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#18181b] border border-lime-400/40 rounded-lg text-lime-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-lg tracking-tight text-white">SDK DETECTOR</h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-lime-400/10 text-lime-400 border border-lime-400/30">
                  MixRank Pipeline
                </span>
              </div>
              <p className="text-xs text-[#a1a1aa]">Static Analysis Engine & Relational Query Profiler</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1 bg-[#121215] p-1 rounded-lg border border-[#27272a] overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#27272a] text-lime-300 shadow-sm border border-lime-400/20'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Overview
            </button>

            <button
              onClick={() => setActiveTab('sdks')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'sdks'
                  ? 'bg-[#27272a] text-lime-300 shadow-sm border border-lime-400/20'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              SDK Market Matrix
            </button>

            <button
              onClick={() => setActiveTab('console')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'console'
                  ? 'bg-[#27272a] text-lime-300 shadow-sm border border-lime-400/20'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Query Console & EXPLAIN
            </button>

            <button
              onClick={() => setActiveTab('benchmark')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'benchmark'
                  ? 'bg-[#27272a] text-lime-300 shadow-sm border border-lime-400/20'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-lime-400" />
              Index Profiler
            </button>
          </nav>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* TOP SYSTEM STATUS STRIP */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#121215] border border-[#27272a]">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-lime-400"></span>
            </span>
            <span className="text-xs font-mono text-[#e4e4e7]">
              Pipeline Ready & Ingestion Active
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#a1a1aa]">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-lime-400" />
              SQLite WAL Storage
            </span>
            <span className="border-r border-[#27272a] h-3"></span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
              Indexes: {stats?.indexActive ? 'Active' : 'Unindexed'}
            </span>
            <span className="border-r border-[#27272a] h-3"></span>
            <button 
              onClick={fetchStatsAndSdks}
              className="flex items-center gap-1 text-lime-400 hover:underline"
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
              
              <div className="p-5 rounded-xl bg-[#121215] border border-[#27272a] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#a1a1aa]">
                  <span>Total Apps Crawled</span>
                  <Server className="w-4 h-4 text-lime-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {stats ? stats.appsCount.toLocaleString() : '...'}
                </div>
                <p className="text-[11px] text-[#71717a]">Google Play & iOS App Store</p>
              </div>

              <div className="p-5 rounded-xl bg-[#121215] border border-[#27272a] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#a1a1aa]">
                  <span>Detected Relationships</span>
                  <Layers className="w-4 h-4 text-lime-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-lime-300">
                  {stats ? stats.linksCount.toLocaleString() : '...'}
                </div>
                <p className="text-[11px] text-[#71717a]">App ↔ SDK Footprint Mappings</p>
              </div>

              <div className="p-5 rounded-xl bg-[#121215] border border-[#27272a] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#a1a1aa]">
                  <span>Tracked Signatures</span>
                  <Code className="w-4 h-4 text-lime-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {stats ? stats.sdksCount : '...'}
                </div>
                <p className="text-[11px] text-[#71717a]">Payments, Analytics, Crash SDKs</p>
              </div>

              <div className="p-5 rounded-xl bg-[#121215] border border-[#27272a] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#a1a1aa]">
                  <span>DB Storage Size</span>
                  <Database className="w-4 h-4 text-lime-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {stats ? stats.dbSizeFormatted : '...'}
                </div>
                <p className="text-[11px] text-[#71717a]">Indexed Relational Database</p>
              </div>

            </div>

            {/* ARCHITECTURE DIAGRAM / PIPELINE OVERVIEW */}
            <div className="p-6 rounded-xl bg-[#121215] border border-[#27272a] space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-lime-400" />
                  System Architecture & Pipeline Flow
                </h3>
                <span className="text-xs text-lime-400 font-mono">MixRank High-Throughput Design</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-2">
                <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a] space-y-2">
                  <div className="text-[10px] font-mono text-lime-400 uppercase">Step 1: Mock Crawl</div>
                  <h4 className="font-semibold text-xs text-white">Raw Source Payload</h4>
                  <p className="text-xs text-[#a1a1aa]">Parses mock Google Play HTML, iOS Info.plist & AndroidManifest.xml arrays.</p>
                </div>

                <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a] space-y-2">
                  <div className="text-[10px] font-mono text-lime-400 uppercase">Step 2: Static Analysis</div>
                  <h4 className="font-semibold text-xs text-white">Signature Engine</h4>
                  <p className="text-xs text-[#a1a1aa]">Evaluates high-speed Regex pattern matchers against decompressed app binary footprints.</p>
                </div>

                <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a] space-y-2">
                  <div className="text-[10px] font-mono text-lime-400 uppercase">Step 3: Relational Ingestion</div>
                  <h4 className="font-semibold text-xs text-white">Batch Database Upsert</h4>
                  <p className="text-xs text-[#a1a1aa]">Bulk writes using transaction blocks and compound B-Tree indexes for fast join lookups.</p>
                </div>

                <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a] space-y-2">
                  <div className="text-[10px] font-mono text-lime-400 uppercase">Step 4: Profiling UI</div>
                  <h4 className="font-semibold text-xs text-white">EXPLAIN ANALYZE Console</h4>
                  <p className="text-xs text-[#a1a1aa]">Measures query latencies in milliseconds & exposes query planner search costs in real time.</p>
                </div>
              </div>
            </div>

            {/* TOP SDK PENETRATION LEADERBOARD */}
            <div className="p-6 rounded-xl bg-[#121215] border border-[#27272a] space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-lime-400" />
                  Top SDK Penetration Highlights
                </h3>
                <button
                  onClick={() => setActiveTab('sdks')}
                  className="text-xs text-lime-400 hover:underline flex items-center gap-1"
                >
                  View Full Grid <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sdks.slice(0, 6).map(sdk => (
                  <div key={sdk.id} className="p-4 rounded-lg bg-[#18181b] border border-[#27272a] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-white">{sdk.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-lime-400/10 text-lime-300 border border-lime-400/20">
                        {sdk.category}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-[#a1a1aa]">
                        <span>App Adoption</span>
                        <span className="font-mono text-lime-400 font-bold">{sdk.penetration_pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-lime-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, sdk.penetration_pct))}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex justify-between text-[11px] text-[#71717a] font-mono pt-1">
                      <span>Android: {sdk.android_apps_count.toLocaleString()}</span>
                      <span>iOS: {sdk.ios_apps_count.toLocaleString()}</span>
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
            <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center p-4 rounded-xl bg-[#121215] border border-[#27272a]">
              
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
                <input
                  type="text"
                  placeholder="Search by SDK name, slug or regex pattern..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-lime-400/50 font-mono"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <Filter className="w-3.5 h-3.5 text-[#71717a] mr-1 shrink-0" />
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-md text-xs font-mono transition-all shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-lime-400 text-black font-semibold'
                        : 'bg-[#18181b] text-[#a1a1aa] hover:text-white border border-[#27272a]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

            </div>

            {/* SDK TABLE MATRIX */}
            <div className="rounded-xl bg-[#121215] border border-[#27272a] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#18181b] border-b border-[#27272a] text-[#a1a1aa] font-mono uppercase text-[10px]">
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
                  <tbody className="divide-y divide-[#27272a]/60">
                    {filteredSdks.map((sdk) => (
                      <tr key={sdk.id} className="hover:bg-[#18181b]/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span>{sdk.name}</span>
                            <span className="text-[10px] font-mono text-[#71717a]">({sdk.slug})</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#27272a] text-lime-300 border border-[#3f3f46]">
                            {sdk.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#a1a1aa] text-[11px]">
                          <code className="bg-[#09090b] px-2 py-1 rounded border border-[#27272a] text-lime-200/90">
                            {sdk.signature_pattern}
                          </code>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[#e4e4e7]">
                          {sdk.android_apps_count.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[#e4e4e7]">
                          {sdk.ios_apps_count.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-[#27272a] rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-lime-400 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(5, sdk.penetration_pct))}%` }}
                              ></div>
                            </div>
                            <span className="font-bold text-lime-400">{sdk.penetration_pct}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedSdkId(sdk.id);
                              setActiveTab('console');
                            }}
                            className="px-2.5 py-1 rounded bg-[#27272a] hover:bg-lime-400 hover:text-black text-lime-300 font-mono text-[11px] transition-all"
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
            
            {/* QUERY CONTROLS CARD */}
            <div className="p-6 rounded-xl bg-[#121215] border border-[#27272a] space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-lime-400" />
                  Parameterized SQL Query Builder & Execution Profiler
                </h3>
                <span className="text-xs text-[#a1a1aa] font-mono">MixRank Benchmark Console</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* SDK Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#a1a1aa]">Select SDK Signature:</label>
                  <select
                    value={selectedSdkId}
                    onChange={(e) => setSelectedSdkId(Number(e.target.value))}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-lime-400/50"
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
                  <label className="text-xs font-mono text-[#a1a1aa]">Platform Filter:</label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-lime-400/50"
                  >
                    <option value="android">Android (Google Play)</option>
                    <option value="ios">iOS (App Store)</option>
                  </select>
                </div>

                {/* Action button */}
                <div className="flex items-end">
                  <button
                    onClick={executeConsoleQuery}
                    disabled={loadingQuery}
                    className="w-full py-2 px-4 rounded-lg bg-lime-400 hover:bg-lime-300 text-black font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
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
              <div className="p-5 rounded-xl bg-[#121215] border border-[#27272a] space-y-3">
                <div className="flex items-center justify-between text-xs text-[#a1a1aa] font-mono">
                  <span>Target SQL Query</span>
                  <span className="text-lime-400">Parameterized Input</span>
                </div>
                <div className="p-4 rounded-lg bg-[#09090b] border border-[#27272a] font-mono text-xs text-lime-300 space-y-1 overflow-x-auto">
                  <p><span className="text-lime-500 font-bold">SELECT</span> a.name, a.bundle_id, a.installs</p>
                  <p><span className="text-lime-500 font-bold">FROM</span> apps a</p>
                  <p><span className="text-lime-500 font-bold">JOIN</span> app_sdks link <span className="text-lime-500 font-bold">ON</span> a.id = link.app_id</p>
                  <p><span className="text-lime-500 font-bold">WHERE</span> link.sdk_id = <span className="text-white bg-[#27272a] px-1.5 rounded">{selectedSdkId}</span> AND a.platform = <span className="text-white bg-[#27272a] px-1.5 rounded">'{selectedPlatform}'</span></p>
                  <p><span className="text-lime-500 font-bold">ORDER BY</span> a.installs <span className="text-lime-500 font-bold">DESC</span></p>
                  <p><span className="text-lime-500 font-bold">LIMIT</span> 50;</p>
                </div>
              </div>

              {/* EXPLAIN QUERY PLAN PANEL */}
              <div className="p-5 rounded-xl bg-[#121215] border border-[#27272a] space-y-3">
                <div className="flex items-center justify-between text-xs text-[#a1a1aa] font-mono">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-lime-400" />
                    EXPLAIN QUERY PLAN Output
                  </span>
                  {queryResult && (
                    <span className="font-bold text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded border border-lime-400/30">
                      {queryResult.executionMs} ms
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-[#09090b] border border-[#27272a] font-mono text-xs text-[#e4e4e7] min-h-[140px] space-y-2">
                  {loadingQuery ? (
                    <div className="text-[#71717a] py-6 text-center animate-pulse">Running query planner...</div>
                  ) : queryResult?.explainPlan ? (
                    queryResult.explainPlan.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-lime-200">
                        <span className="text-lime-500">•</span>
                        <span>{step}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[#71717a]">Select parameters and click execute to view query plan.</p>
                  )}
                </div>
              </div>

            </div>

            {/* FETCHED RESULTS TABLE */}
            <div className="rounded-xl bg-[#121215] border border-[#27272a] p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-lime-400" />
                  Query Results ({selectedSdkObj?.name} on {selectedPlatform})
                </span>
                <span className="text-[#a1a1aa]">
                  Retrieved {queryResult?.resultCount || 0} matching apps
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-[#27272a]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#18181b] border-b border-[#27272a] text-[#a1a1aa] uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-4">App Name</th>
                      <th className="py-2.5 px-4">Bundle ID</th>
                      <th className="py-2.5 px-4">Developer</th>
                      <th className="py-2.5 px-4 text-right">Installs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272a]">
                    {queryResult?.data.map((app, index) => (
                      <tr key={app.id} className="hover:bg-[#18181b]/50">
                        <td className="py-2 px-4 text-[#71717a]">{index + 1}</td>
                        <td className="py-2 px-4 text-white font-sans font-medium">{app.name}</td>
                        <td className="py-2 px-4 text-lime-300 text-[11px]">{app.bundle_id}</td>
                        <td className="py-2 px-4 text-[#a1a1aa] text-[11px]">{app.developer}</td>
                        <td className="py-2 px-4 text-right text-white font-bold">
                          {app.installs.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {(!queryResult || queryResult.data.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-[#71717a]">
                          No records retrieved for this parameter combination.
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
            <div className="p-6 rounded-xl bg-[#121215] border border-[#27272a] space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                <div>
                  <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-lime-400" />
                    Database Index Latency & Sequential Scan Comparison
                  </h3>
                  <p className="text-xs text-[#a1a1aa] mt-0.5">
                    Demonstrates query acceleration on many-to-many lookup table <code className="text-lime-300">app_sdks(sdk_id)</code>.
                  </p>
                </div>

                <button
                  onClick={runBenchmark}
                  disabled={runningBenchmark}
                  className="py-2 px-4 rounded-lg bg-lime-400 hover:bg-lime-300 text-black font-semibold text-xs transition-all flex items-center gap-2 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${runningBenchmark ? 'animate-spin' : ''}`} />
                  {runningBenchmark ? 'Profiling...' : 'Re-Run Benchmark'}
                </button>
              </div>

              {/* LATENCY SUMMARY CARDS */}
              {benchmarkData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  
                  <div className="p-5 rounded-lg bg-[#18181b] border border-[#27272a] space-y-2">
                    <span className="text-xs text-[#a1a1aa] font-mono">UNINDEXED QUERY TIME</span>
                    <div className="text-2xl font-bold font-mono text-red-400">
                      {benchmarkData.unindexedMs} ms
                    </div>
                    <p className="text-[11px] text-[#71717a]">Forces Full Table Scan</p>
                  </div>

                  <div className="p-5 rounded-lg bg-[#18181b] border border-lime-400/40 space-y-2 lime-border-glow">
                    <span className="text-xs text-[#a1a1aa] font-mono">INDEXED B-TREE TIME</span>
                    <div className="text-2xl font-bold font-mono text-lime-400">
                      {benchmarkData.indexedMs} ms
                    </div>
                    <p className="text-[11px] text-lime-300/80">Uses idx_app_sdks_sdk_id Index</p>
                  </div>

                  <div className="p-5 rounded-lg bg-[#18181b] border border-[#27272a] space-y-2">
                    <span className="text-xs text-[#a1a1aa] font-mono">LATENCY REDUCTION</span>
                    <div className="text-2xl font-bold font-mono text-white flex items-center gap-1">
                      <span>{benchmarkData.speedupMultiplier}x</span>
                      <span className="text-xs font-normal text-lime-400">Faster</span>
                    </div>
                    <p className="text-[11px] text-[#71717a]">Indexed vs Sequential scan speedup</p>
                  </div>

                </div>
              )}
            </div>

            {/* SIDE BY SIDE PLAN COMPARISON */}
            {benchmarkData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* UNINDEXED PLAN */}
                <div className="p-5 rounded-xl bg-[#121215] border border-red-500/20 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-red-400 font-semibold uppercase">1. Without Index (Sequential Scan)</span>
                    <span className="text-red-400 font-mono">{benchmarkData.unindexedMs} ms</span>
                  </div>
                  <div className="p-4 rounded-lg bg-[#09090b] border border-red-500/20 font-mono text-xs text-[#a1a1aa] space-y-2">
                    {benchmarkData.unindexedPlan.map((plan, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-red-400">•</span>
                        <span>{plan}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* INDEXED PLAN */}
                <div className="p-5 rounded-xl bg-[#121215] border border-lime-400/30 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-lime-400 font-semibold uppercase">2. With B-Tree Index (Index Scan)</span>
                    <span className="text-lime-400 font-mono">{benchmarkData.indexedMs} ms</span>
                  </div>
                  <div className="p-4 rounded-lg bg-[#09090b] border border-lime-400/30 font-mono text-xs text-lime-200 space-y-2">
                    {benchmarkData.indexedPlan.map((plan, i) => (
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
      <footer className="border-t border-[#27272a] bg-[#09090b] py-4 text-center text-xs text-[#71717a]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Mobile SDK Detector & Crawl Pipeline &bull; MixRank Focus Architecture</span>
          <span className="font-mono text-[#a1a1aa]">Charan Sai Pathuri Portfolio Prototype</span>
        </div>
      </footer>

    </div>
  );
}
