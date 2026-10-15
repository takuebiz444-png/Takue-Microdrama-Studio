import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Coins,
  RefreshCw,
  Zap,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';
import { ModelArkService, ModelArkCreditsResponse } from '../../services/modelarkApi';
import { DramaProject } from '../../types/drama';

interface ModelArkCreditCardProps {
  currentProject: DramaProject | null;
  onSelectModel?: (modelId: string) => void;
}

export const ModelArkCreditCard: React.FC<ModelArkCreditCardProps> = ({
  currentProject,
  onSelectModel,
}) => {
  const [creditsData, setCreditsData] = useState<ModelArkCreditsResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [lastPolledTime, setLastPolledTime] = useState<string>('Just now');
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpSuccessNotice, setTopUpSuccessNotice] = useState<string | null>(null);

  // Calculate project statistics
  const totalClips = currentProject
    ? currentProject.episodes.reduce((acc, ep) => acc + ep.clips.length, 0)
    : 200;
  const completedClips = currentProject
    ? currentProject.episodes.reduce(
        (acc, ep) => acc + ep.clips.filter((c) => c.generationStatus === 'completed').length,
        0
      )
    : 0;
  const remainingClips = Math.max(0, totalClips - completedClips);
  const selectedModelId = currentProject?.selectedModel || 'seedance-1-5-pro-251215';

  const pollCredits = useCallback(
    async (isManual = false) => {
      if (isManual) setIsManualRefreshing(true);
      setIsPolling(true);

      try {
        const data = await ModelArkService.getCredits({
          remainingClips,
          selectedModel: selectedModelId,
        });
        setCreditsData(data);
        const now = new Date();
        setLastPolledTime(
          now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      } catch (err) {
        console.warn('[ModelArk Credits Poll] Failed to fetch live credits:', err);
      } finally {
        setIsPolling(false);
        if (isManual) {
          setTimeout(() => setIsManualRefreshing(false), 600);
        }
      }
    },
    [remainingClips, selectedModelId]
  );

  // Auto-polling interval: every 12 seconds while tab is active
  useEffect(() => {
    pollCredits();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        pollCredits();
      }
    }, 12000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollCredits();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollCredits]);

  const handleTopUp = async (amount: number) => {
    setTopUpLoading(true);
    try {
      const res = await ModelArkService.topUpCredits(amount);
      setTopUpSuccessNotice(`+${amount} Credits Allocated Successfully`);
      await pollCredits(true);
      setTimeout(() => {
        setTopUpSuccessNotice(null);
        setIsTopUpOpen(false);
      }, 1500);
    } catch (e: any) {
      alert(`Top-up failed: ${e.message}`);
    } finally {
      setTopUpLoading(false);
    }
  };

  const balance = creditsData?.availableBalance ?? 4960;
  const totalBalance = creditsData?.totalBalance ?? 5000;
  const used = creditsData?.usedCredits ?? 40;
  const costPerClip = creditsData?.costPerClipCurrent ?? 8;
  const estimatedConsumption = remainingClips * costPerClip;
  const projectedBalance = balance - estimatedConsumption;
  const isSufficient = projectedBalance >= 0;

  // Percentage calculations for visual gauge
  const usedPct = Math.min(100, Math.round((used / totalBalance) * 100));
  const estimatedNeededPct = Math.min(
    100 - usedPct,
    Math.round((estimatedConsumption / totalBalance) * 100)
  );
  const bufferPct = Math.max(0, 100 - usedPct - estimatedNeededPct);

  return (
    <div className="bg-white border-2 border-blue-200/90 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-br from-blue-400/10 via-indigo-400/10 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Card Header & Polling Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-xs">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-blue-950 font-serif">
                ModelArk Credit & Usage Monitor
              </h3>
              <span className="text-[10px] font-mono bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                API Live
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Live account balance & projected consumption for remaining clips
            </p>
          </div>
        </div>

        {/* Polling controls */}
        <div className="flex items-center gap-2">
          {/* Beacon pulse */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full text-[10px] text-slate-600 font-medium"
            title="Auto-polls every 12 seconds from ModelArk backend"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isPolling ? 'bg-blue-400' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isPolling ? 'bg-blue-600' : 'bg-emerald-500'
                }`}
              />
            </span>
            <span className="font-mono text-[9px]">
              {isPolling ? 'Polling...' : lastPolledTime}
            </span>
          </div>

          <button
            type="button"
            onClick={() => pollCredits(true)}
            disabled={isManualRefreshing}
            className="p-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
            title="Poll ModelArk API now"
          >
            <RefreshCw
              className={`w-4 h-4 ${isManualRefreshing ? 'animate-spin text-blue-600' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Main KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Metric 1: Current Available Balance */}
        <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/40 border border-blue-200/80 rounded-2xl p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900/70">
              Current Balance
            </span>
            <Zap className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-950 font-mono tracking-tight">
            {balance.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 block">
            of {totalBalance.toLocaleString()} total credits
          </span>
        </div>

        {/* Metric 2: Estimated Consumption for Remaining Clips */}
        <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/40 border border-amber-200/80 rounded-2xl p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900/70">
              Est. Consumption
            </span>
            <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono tracking-tight">
            ~{estimatedConsumption.toLocaleString()}
          </div>
          <span className="text-[10px] text-amber-800/80 block">
            for {remainingClips} remaining clips
          </span>
        </div>

        {/* Metric 3: Projected Net Balance */}
        <div
          className={`border rounded-2xl p-3 space-y-1 ${
            isSufficient
              ? 'bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border-emerald-200/80'
              : 'bg-gradient-to-br from-rose-50/70 to-red-50/40 border-rose-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isSufficient ? 'text-emerald-900/70' : 'text-rose-900/70'
              }`}
            >
              Projected Net
            </span>
            {isSufficient ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            )}
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
              isSufficient ? 'text-emerald-900' : 'text-rose-900'
            }`}
          >
            {projectedBalance >= 0 ? `+${projectedBalance.toLocaleString()}` : projectedBalance.toLocaleString()}
          </div>
          <span
            className={`text-[10px] block font-medium ${
              isSufficient ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {isSufficient ? 'Sufficient for 40 Eps' : 'Top-Up Recommended'}
          </span>
        </div>

        {/* Metric 4: Render Scope & Model Rate */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Active Rate
            </span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
            {costPerClip} <span className="text-xs font-normal text-slate-400">cr/clip</span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            {selectedModelId === 'seedance-1-5-pro-251215'
              ? 'Seedance Pro 1.5'
              : selectedModelId === 'dreamina-seedance-2-0-mini-260615'
              ? 'Dreamina Mini'
              : 'Seedance Fast'}
          </span>
        </div>
      </div>

      {/* Visual Resource Runway Multi-Segment Bar */}
      <div className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-3">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Project Resource Allocation Breakdown</span>
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            {totalBalance.toLocaleString()} Total Credits Allocated
          </span>
        </div>

        {/* Visual Stacked Gauge */}
        <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
          {/* Segment 1: Used so far */}
          <div
            className="bg-slate-400 transition-all duration-500"
            style={{ width: `${usedPct}%` }}
            title={`Used: ${used} credits (${usedPct}%)`}
          />
          {/* Segment 2: Needed for Remaining Clips */}
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
            style={{ width: `${estimatedNeededPct}%` }}
            title={`Estimated Needed: ${estimatedConsumption} credits (${estimatedNeededPct}%)`}
          />
          {/* Segment 3: Available buffer */}
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${bufferPct}%` }}
            title={`Remaining Buffer: ${Math.max(0, projectedBalance)} credits (${bufferPct}%)`}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between text-[10px] pt-1 text-slate-600 gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Used: {used} cr</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>Remaining Project: ~{estimatedConsumption} cr</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Buffer: {Math.max(0, projectedBalance)} cr</span>
            </span>
          </div>

          <span className="font-mono text-slate-400 text-[9px]">
            Est. GPU Time: ~{Math.ceil((remainingClips * 12) / 60)} mins
          </span>
        </div>
      </div>

      {/* Model Tier Efficiency & Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-700">Model Rates:</span>
          <div className="inline-flex items-center gap-1 text-[10px] font-mono">
            <span
              className={`px-2 py-0.5 rounded-lg border ${
                selectedModelId === 'seedance-1-5-pro-251215'
                  ? 'bg-blue-600 text-white font-bold border-blue-700 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              Pro 1.5: 8cr
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg border ${
                selectedModelId === 'seedance-1-0-pro-fast'
                  ? 'bg-blue-600 text-white font-bold border-blue-700 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              Fast: 5cr
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg border ${
                selectedModelId === 'dreamina-seedance-2-0-mini-260615'
                  ? 'bg-blue-600 text-white font-bold border-blue-700 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              Mini: 3cr
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {topUpSuccessNotice ? (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {topUpSuccessNotice}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setIsTopUpOpen(!isTopUpOpen)}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>{isTopUpOpen ? 'Close Top-Up' : 'Adjust Credits'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Top-up Drawer */}
      {isTopUpOpen && (
        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Add ModelArk Compute Credits
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Key: {creditsData?.maskedKey || 'VxCgNv••••mo8weZ'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={topUpLoading}
              onClick={() => handleTopUp(500)}
              className="flex-1 py-1.5 bg-white hover:bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-extrabold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              +500 Credits
            </button>
            <button
              type="button"
              disabled={topUpLoading}
              onClick={() => handleTopUp(1500)}
              className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              +1,500 Credits (Full 40 Ep)
            </button>
            <button
              type="button"
              disabled={topUpLoading}
              onClick={() => handleTopUp(5000)}
              className="flex-1 py-1.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              +5,000 Enterprise
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
