import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Lock,
  Unlock,
  Check,
  Copy,
  RotateCcw,
  Sliders,
  Trash2,
  Film,
  Camera,
  Layers,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { useDrama } from '../../context/DramaContext';
import { MASTER_PROMPT_PRESETS, DEFAULT_MASTER_PROMPT, MasterPromptTemplate } from '../../data/masterPrompts';

export const MasterPromptSection: React.FC = () => {
  const { currentProject, updateMasterPrompt } = useDrama();

  const [promptText, setPromptText] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showPresets, setShowPresets] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with current project
  useEffect(() => {
    if (currentProject) {
      setPromptText(currentProject.masterPrompt ?? DEFAULT_MASTER_PROMPT);
      setIsLocked(currentProject.isMasterPromptLocked ?? true);
    } else {
      setPromptText(DEFAULT_MASTER_PROMPT);
      setIsLocked(true);
    }
  }, [currentProject?.id, currentProject?.masterPrompt, currentProject?.isMasterPromptLocked]);

  const handleSave = () => {
    if (currentProject) {
      updateMasterPrompt(currentProject.id, promptText, isLocked);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2200);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyPreset = (preset: MasterPromptTemplate) => {
    setPromptText(preset.prompt);
    if (currentProject) {
      updateMasterPrompt(currentProject.id, preset.prompt, isLocked);
    }
    setSaveSuccess(true);
    setShowPresets(false);
    setTimeout(() => setSaveSuccess(false), 1800);
  };

  const handleReset = () => {
    setPromptText(DEFAULT_MASTER_PROMPT);
    if (currentProject) {
      updateMasterPrompt(currentProject.id, DEFAULT_MASTER_PROMPT, true);
    }
    setIsLocked(true);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1800);
  };

  const handleClear = () => {
    setPromptText('');
    if (currentProject) {
      updateMasterPrompt(currentProject.id, '', isLocked);
    }
  };

  const charCount = promptText.length;
  const wordCount = promptText.trim().length > 0 ? promptText.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="bg-white border-2 border-amber-300/90 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5 relative overflow-hidden">
      {/* Background ambient accent */}
      <div className="absolute -top-12 -left-12 w-44 h-44 bg-gradient-to-br from-amber-400/10 via-orange-300/10 to-transparent rounded-full blur-xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 text-amber-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-blue-950 font-serif">
                Master Prompt of All Series
              </h3>
              <span className="text-[10px] font-mono bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                All 40 Episodes
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Global master visual directive applied across every scene. <strong className="text-amber-900 font-semibold">No word or character limits.</strong>
            </p>
          </div>
        </div>

        {/* Action badges & presets dropdown */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-700" />
            <span>Presets</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
            title="Copy entire master prompt"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Presets Tray */}
      {showPresets && (
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between text-[11px] text-amber-950 font-bold">
            <span>Select a Master Directive Preset:</span>
            <button
              onClick={() => setShowPresets(false)}
              className="text-[10px] text-slate-500 hover:underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MASTER_PROMPT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="p-2.5 bg-white hover:bg-amber-100/60 border border-amber-200 rounded-xl text-left transition-all cursor-pointer space-y-1 shadow-2xs group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 group-hover:text-blue-900">
                    {preset.name}
                  </span>
                  <span className="text-[9px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-xs">
                    {preset.category}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-1">
                  {preset.prompt}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Unrestricted Master Prompt Textarea Space */}
      <div className="space-y-1.5">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={isExpanded ? 10 : 5}
            className="w-full text-xs font-mono p-3 bg-amber-50/20 hover:bg-amber-50/30 focus:bg-white border-2 border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/40 rounded-2xl focus:outline-hidden resize-y leading-relaxed text-slate-900 placeholder:text-slate-400 transition-all"
            placeholder="Paste or write your unrestricted Master Prompt for the entire series here (unlimited words, unlimited characters, no truncation)...
Examples:
- Camera: Vertical 9:16 cinematic framing, 35mm lens, shallow depth of field, slow dramatic push-in
- Lighting: Moody volumetric rim light, high-contrast chiaroscuro shadows, warm interior vs cold exterior
- Tone: High-stakes billionaire microdrama, intense rivalry, cinematic tension
- Production: ModelArk Seedance photorealistic human textures, 24fps motion blur, zero distortion..."
          />
        </div>

        {/* Capacity Indicator & Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          {/* Live Character & Word Count Badge */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-[10px] font-mono font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {charCount.toLocaleString()} chars • {wordCount.toLocaleString()} words
              </span>
              <span className="text-emerald-600 font-bold">• Unlimited Capacity</span>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[10px] text-slate-500 hover:text-blue-700 font-semibold hover:underline cursor-pointer"
            >
              {isExpanded ? 'Collapse' : 'Expand Area'}
            </button>
          </div>

          {/* Reset / Clear */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] text-slate-500 hover:text-blue-700 font-bold transition-colors cursor-pointer flex items-center gap-1"
              title="Reset to default Seedance master prompt"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Default</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer flex items-center gap-1"
              title="Clear master prompt"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lock Toggle & Primary Save Action */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/60">
        {/* Lock Switch */}
        <button
          type="button"
          onClick={() => setIsLocked(!isLocked)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
            isLocked
              ? 'bg-amber-100/70 border-amber-300 text-amber-950 font-bold'
              : 'bg-slate-100 border-slate-200 text-slate-600 font-normal'
          }`}
        >
          {isLocked ? (
            <Lock className="w-3.5 h-3.5 text-amber-700" />
          ) : (
            <Unlock className="w-3.5 h-3.5 text-slate-400" />
          )}
          <div className="text-left">
            <span className="text-[11px] block leading-none">
              {isLocked ? 'Master Prompt Locked' : 'Prompt Unlocked'}
            </span>
            <span className="text-[9px] text-slate-500 font-normal block leading-tight pt-0.5">
              {isLocked ? 'Strict consistency for all 40 episodes' : 'Optional style enforcement'}
            </span>
          </div>
        </button>

        {/* Save & Apply Button */}
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in duration-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Applied to All 40 Episodes!
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Save & Apply to Series</span>
          </button>
        </div>
      </div>
    </div>
  );
};
