import React, { useState } from 'react';
import { useDrama } from '../../context/DramaContext';
import {
  ShieldCheck,
  Server,
  Activity,
  AlertCircle,
  CheckCircle2,
  Lock,
  Sliders,
  Loader2,
  Zap,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    modelArkConfig,
    updateModelArkConfig,
    checkConnection,
  } = useDrama();

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleRunConnectionTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await checkConnection();
      setTestResult(result);
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'Failed to contact backend test probe',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="px-4 py-4 pb-20 space-y-4">
      {/* Mobile Title */}
      <div className="border-b border-blue-100 pb-3">
        <h2 className="text-lg font-extrabold text-blue-950 font-serif">
          Settings & ModelArk API
        </h2>
        <p className="text-[11px] text-slate-500">
          Backend API credentials, safety controls, and connection diagnostics
        </p>
      </div>

      {/* ModelArk Status Card */}
      <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-blue-950">ModelArk API</h3>
              <p className="text-[10px] text-slate-500">BytePlus Content Generations</p>
            </div>
          </div>

          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Active
          </span>
        </div>

        {/* Security Notice */}
        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-[11px] text-blue-950">
          <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-tight">
            Credentials stored on backend server. Never exposed to browser or client code.
          </p>
        </div>

        {/* Masked Key Display */}
        <div className="space-y-1 text-xs">
          <span className="text-slate-500 text-[10px] block">Masked Key Identity:</span>
          <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-blue-950 font-bold">
            {modelArkConfig.maskedKey}
          </div>
        </div>

        {/* Test Connection Button */}
        <button
          onClick={handleRunConnectionTest}
          disabled={isTesting}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
        >
          {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
          {isTesting ? 'Testing ModelArk...' : 'Test API Connection'}
        </button>

        {/* Test Result */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-[11px] space-y-1 animate-in fade-in ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-blue-50 border-blue-300 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold">
              {testResult.success ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span>{testResult.message}</span>
            </div>
            {testResult.latencyMs !== undefined && (
              <span className="font-mono text-[10px] opacity-75 block">
                Latency: {testResult.latencyMs}ms • Status: {testResult.statusCode || '200'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Models Reference */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
        <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-blue-600" />
          ModelArk Models
        </span>

        <div className="space-y-1.5">
          {[
            { id: 'seedance-1-5-pro-251215', name: 'Pro 1.5', cost: '8 cr/clip' },
            { id: 'seedance-1-0-pro-fast', name: 'Pro 1.0 Fast', cost: '5 cr/clip' },
            { id: 'dreamina-seedance-2-0-mini-260615', name: 'Mini 2.0', cost: '3 cr/clip' },
          ].map((m) => (
            <div
              key={m.id}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-slate-900">{m.name}</span>
                <span className="font-mono text-[9px] text-blue-600 block">{m.id}</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {m.cost}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Credit & Safety Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-blue-600" />
          Spending & Safety Controls
        </span>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Spending Limit (Credits)
          </label>
          <input
            type="number"
            min="50"
            max="10000"
            step="50"
            value={modelArkConfig.spendingLimitCredits}
            onChange={(e) =>
              updateModelArkConfig({
                spendingLimitCredits: parseInt(e.target.value) || 500,
              })
            }
            className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Max Retries per Failed Job
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={modelArkConfig.maxRetries}
            onChange={(e) =>
              updateModelArkConfig({
                maxRetries: parseInt(e.target.value) || 3,
              })
            }
            className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Studio Engine Simulation
          </span>
          <input
            type="checkbox"
            checked={modelArkConfig.forceSimulation}
            onChange={(e) => updateModelArkConfig({ forceSimulation: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded-md"
          />
        </div>
      </div>
    </div>
  );
};
