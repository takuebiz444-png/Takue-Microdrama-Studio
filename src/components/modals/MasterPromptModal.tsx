import React, { useState, useEffect } from 'react';
import { useDrama } from '../../context/DramaContext';
import {
  Sparkles,
  Lock,
  Unlock,
  Check,
  Copy,
  RotateCcw,
  X,
  Sliders,
  Film,
  Camera,
  Sun,
  Palette,
} from 'lucide-react';
import { MASTER_PROMPT_PRESETS, DEFAULT_MASTER_PROMPT, MasterPromptTemplate } from '../../data/masterPrompts';

interface MasterPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterPromptModal: React.FC<MasterPromptModalProps> = ({ isOpen, onClose }) => {
  const { currentProject, updateMasterPrompt } = useDrama();

  const [promptText, setPromptText] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('universal_vertical_cinema');
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (currentProject) {
      setPromptText(currentProject.masterPrompt || DEFAULT_MASTER_PROMPT);
      setIsLocked(currentProject.isMasterPromptLocked ?? true);
    } else {
      setPromptText(DEFAULT_MASTER_PROMPT);
      setIsLocked(true);
    }
  }, [currentProject, isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: MasterPromptTemplate) => {
    setSelectedPresetId(preset.id);
    setPromptText(preset.prompt);
  };

  const handleSave = () => {
    if (currentProject) {
      updateMasterPrompt(currentProject.id, promptText, isLocked);
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetDefault = () => {
    setPromptText(DEFAULT_MASTER_PROMPT);
    setSelectedPresetId('universal_vertical_cinema');
    setIsLocked(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-blue-100">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Sparkles className="w-4 h-4 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm font-serif">Takue Master Prompt</h3>
                <span className="text-[10px] font-mono bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded-full border border-blue-400/30">
                  Global Directive
                </span>
              </div>
              <p className="text-[10px] text-blue-200">
                Visual aesthetic, 9:16 vertical rules & lighting applied to all 40 episodes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-700 flex-1">
          {/* Why Master Prompt matters */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 text-[11px] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-blue-950">
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              <span>What is the Master Prompt?</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              The Master Prompt is the overarching cinematic blueprint for your microdrama. It sets the
              <strong> 9:16 vertical orientation</strong>, lighting style, camera lenses, and color grade.
              When locked, it automatically injects into every clip prompt to guarantee total style unity.
            </p>
          </div>

          {/* Master Prompt Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Palette className="w-3 h-3 text-blue-600" />
                <span>Cinematic Style Presets</span>
              </label>
              <span className="text-[10px] text-blue-600 font-semibold">Tap to apply</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {MASTER_PROMPT_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white hover:bg-blue-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-tight opacity-80">
                        {preset.category}
                      </span>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="font-extrabold text-[11px] block leading-tight">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Master Prompt Text Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                <Film className="w-3 h-3 text-blue-600" />
                <span>Active Master Prompt Text</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[10px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="text-[10px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={6}
                className="w-full p-3 bg-amber-50/20 hover:bg-amber-50/30 focus:bg-white border-2 border-amber-200 focus:border-amber-500 rounded-2xl text-[11px] leading-relaxed font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-400/40 resize-y transition-all"
                placeholder="Enter your master visual directives for all 40 episodes (no character or word limits: e.g. 9:16 vertical cinema, 50mm lens, volumetric lighting, high emotional tension)..."
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-mono font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {promptText.length.toLocaleString()} chars •{' '}
                    {promptText.trim().length > 0 ? promptText.trim().split(/\s+/).filter(Boolean).length : 0} words • Unlimited Capacity
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Reset Default
                </button>
              </div>
            </div>
          </div>

          {/* Lock Master Prompt Toggle */}
          <div
            onClick={() => setIsLocked(!isLocked)}
            className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
              isLocked
                ? 'bg-blue-50 border-blue-300 text-blue-950'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                  isLocked ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </div>
              <div>
                <span className="font-extrabold text-xs block">
                  {isLocked ? '🔒 Master Prompt Locked' : 'Master Prompt Unlocked'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {isLocked
                    ? 'Injected into every episode & clip generation prompt'
                    : 'Prompt only applies to newly configured clips'}
                </span>
              </div>
            </div>
            <div
              className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                isLocked ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isLocked ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Quick Style Pillars Guide */}
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl">
              <span className="font-bold text-blue-900 block">Aspect Ratio</span>
              <span className="text-slate-500">9:16 Portrait</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl">
              <span className="font-bold text-blue-900 block">Episodes</span>
              <span className="text-slate-500">40 Episodes</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl">
              <span className="font-bold text-blue-900 block">Clip Pacing</span>
              <span className="text-slate-500">5 Clips / 12s</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-[2] py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved & Locked!</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Apply Master Prompt</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
