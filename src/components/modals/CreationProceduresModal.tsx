import React from 'react';
import { useDrama } from '../../context/DramaContext';
import {
  ListOrdered,
  Sparkles,
  Lock,
  FileText,
  Layers,
  Play,
  Scissors,
  ArrowRight,
  CheckCircle2,
  X,
  ChevronRight,
  Info,
} from 'lucide-react';
import { TAKUE_CREATION_PROCEDURES } from '../../data/creationProcedures';
import { ActiveTabType } from '../../types/drama';

interface CreationProceduresModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMasterPrompt?: () => void;
}

export const CreationProceduresModal: React.FC<CreationProceduresModalProps> = ({
  isOpen,
  onClose,
  onOpenMasterPrompt,
}) => {
  const {
    activeTab,
    setActiveTab,
    createWizardStep,
    setCreateWizardStep,
    goToCharacters,
    goToCreate,
    characters,
    currentProject,
    isQueueRunning,
    queue,
  } = useDrama();

  if (!isOpen) return null;

  const lockedCharactersCount = characters.filter((c) => c.isLocked).length;
  const isMasterPromptConfigured = Boolean(currentProject?.masterPrompt);
  const episodesCount = currentProject?.episodes?.length || 0;
  const completedClips =
    currentProject?.episodes?.reduce(
      (acc, ep) => acc + ep.clips.filter((c) => c.generationStatus === 'completed').length,
      0
    ) || 0;

  // Determine completion / active state for each procedure
  const getProcedureStatus = (stepNumber: number): 'completed' | 'active' | 'pending' => {
    switch (stepNumber) {
      case 1:
        return isMasterPromptConfigured ? 'completed' : 'active';
      case 2:
        return lockedCharactersCount > 0 ? 'completed' : isMasterPromptConfigured ? 'active' : 'pending';
      case 3:
        return episodesCount >= 40 ? 'completed' : lockedCharactersCount > 0 ? 'active' : 'pending';
      case 4:
        return episodesCount >= 40 ? 'completed' : 'pending';
      case 5:
        return completedClips > 0 ? 'completed' : episodesCount >= 40 ? 'active' : 'pending';
      case 6:
        return completedClips >= 5 ? 'active' : 'pending';
      default:
        return 'pending';
    }
  };

  const handleExecuteProcedure = (targetTab: ActiveTabType, wizardStep?: number, stepNumber?: number) => {
    onClose();
    if (stepNumber === 1 && onOpenMasterPrompt) {
      onOpenMasterPrompt();
      return;
    }
    if (targetTab === 'characters') {
      goToCharacters();
    } else if (targetTab === 'create') {
      goToCreate(wizardStep || 1);
    } else {
      setActiveTab(targetTab);
    }
  };

  const getProcedureIcon = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return <Sparkles className="w-4 h-4 text-blue-600" />;
      case 2:
        return <Lock className="w-4 h-4 text-indigo-600" />;
      case 3:
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 4:
        return <Layers className="w-4 h-4 text-sky-600" />;
      case 5:
        return <Play className="w-4 h-4 text-emerald-600" />;
      case 6:
        return <Scissors className="w-4 h-4 text-violet-600" />;
      default:
        return <ListOrdered className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-blue-100">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <ListOrdered className="w-4 h-4 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm font-serif">Takue Microdrama Procedures</h3>
                <span className="text-[10px] font-mono bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded-full border border-blue-400/30">
                  In Order
                </span>
              </div>
              <p className="text-[10px] text-blue-200">
                Official 6-step procedure for producing 40-episode vertical microdramas
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

        {/* Info callout: why order matters */}
        <div className="bg-blue-50/80 px-4 py-2.5 border-b border-blue-100 flex items-start gap-2 text-[11px] text-slate-700">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>Strict Order Rationale:</strong> Master Prompt sets the aesthetic universe; characters must be
            <strong> locked</strong> before splitting the story so their physical continuity is embedded into every prompt.
          </p>
        </div>

        {/* Procedures List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs text-slate-700">
          {TAKUE_CREATION_PROCEDURES.map((proc) => {
            const status = getProcedureStatus(proc.stepNumber);
            const isCompleted = status === 'completed';
            const isActive = status === 'active';

            return (
              <div
                key={proc.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-blue-50/70 border-blue-300 shadow-xs ring-1 ring-blue-300'
                    : isCompleted
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700'
                          : isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : getProcedureIcon(proc.stepNumber)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-blue-950">{proc.title}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 block">{proc.subtitle}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : isActive
                        ? 'bg-blue-600 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isCompleted ? 'Completed' : isActive ? 'Current Step' : proc.badge}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed mb-3 pl-9">
                  {proc.description}
                </p>

                {/* Action button */}
                <div className="pl-9 flex items-center justify-between">
                  <div className="text-[10px] text-slate-400 font-mono">
                    {proc.stepNumber === 1 && `Master Prompt: ${isMasterPromptConfigured ? 'Set' : 'Standard'}`}
                    {proc.stepNumber === 2 && `Locked: ${lockedCharactersCount} Characters`}
                    {proc.stepNumber === 3 && `Target: 40 Episodes (5 Clips/Ep)`}
                    {proc.stepNumber === 4 && `Clips: ${episodesCount * 5} Total`}
                    {proc.stepNumber === 5 && `Ready: ${completedClips} Clips`}
                    {proc.stepNumber === 6 && `Duration: 60s / Episode`}
                  </div>

                  <button
                    onClick={() => handleExecuteProcedure(proc.targetTab, proc.wizardStep, proc.stepNumber)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all active:scale-95 ${
                      isActive
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-200'
                    }`}
                  >
                    <span>{proc.actionLabel}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-medium">Takue Microdrama Studio Workflow</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition-all cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
