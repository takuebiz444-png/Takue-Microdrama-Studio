import React from 'react';
import { useDrama } from '../../context/DramaContext';
import {
  Home,
  ArrowLeft,
  ArrowRight,
  ListOrdered,
  Shield,
  Film,
  Sparkles,
  Settings as SettingsIcon,
  Check,
  Save,
} from 'lucide-react';

interface NavbarProps {
  onOpenQueue: () => void;
  onOpenProcedures?: () => void;
  onOpenMasterPrompt?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenQueue,
  onOpenProcedures,
  onOpenMasterPrompt,
}) => {
  const {
    activeTab,
    setActiveTab,
    createWizardStep,
    setCreateWizardStep,
    goToHome,
    modelArkConfig,
    queue,
    isQueueRunning,
    currentProject,
    characters,
    lastSavedAt,
    isAutoSaving,
    forceSaveNow,
  } = useDrama();

  const activeQueueCount = queue.filter(
    (q) => q.status === 'queued' || q.status === 'generating'
  ).length;

  // Handle Back button
  const handleBack = () => {
    if (activeTab === 'create') {
      if (createWizardStep > 1) {
        setCreateWizardStep(createWizardStep - 1);
        return;
      }
    }
    // Otherwise go to home/dashboard
    goToHome();
  };

  // Handle Next button
  const handleNext = () => {
    if (activeTab === 'create' && createWizardStep < 4) {
      setCreateWizardStep(createWizardStep + 1);
    } else if (activeTab === 'characters') {
      setActiveTab('create');
      setCreateWizardStep(2);
    } else if (activeTab === 'dashboard') {
      setActiveTab('create');
      setCreateWizardStep(1);
    }
  };

  // Screen Title - firmly branded as Takue Microdrama
  const getScreenTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Takue Microdrama';
      case 'characters':
        return 'Character Vault';
      case 'create':
        return `Takue Creator (${createWizardStep}/4)`;
      case 'projects':
        return 'Episode Library';
      case 'editor':
        return 'Video Editor';
      case 'settings':
        return 'ModelArk Settings';
      default:
        return 'Takue Microdrama';
    }
  };

  const isHome = activeTab === 'dashboard';
  const showNext = activeTab === 'create' && createWizardStep < 4;
  const isMasterPromptLocked = currentProject?.isMasterPromptLocked ?? true;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-blue-100 shadow-2xs px-3 py-2">
      {/* Top Mobile Bar: Navigation row with Home, Back, Title, and Next */}
      <div className="flex items-center justify-between gap-1.5">
        {/* Left: Home & Back Buttons */}
        <div className="flex items-center gap-1">
          {/* Home Button */}
          <button
            onClick={goToHome}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isHome
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 text-blue-900 hover:bg-blue-100 active:scale-95'
            }`}
            title="Go to Home Dashboard"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Home</span>
          </button>

          {/* Back Button */}
          {!isHome && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>Back</span>
            </button>
          )}
        </div>

        {/* Center: Screen Title */}
        <div className="text-center truncate px-1 flex-1">
          <h1 className="font-extrabold text-xs tracking-tight text-blue-950 font-serif truncate">
            {getScreenTitle()}
          </h1>
          <p className="text-[9px] text-slate-500 font-medium truncate">
            {currentProject?.title || '40 Episodes • 9:16'}
          </p>
        </div>

        {/* Right: Next button, Queue, and Credit status */}
        <div className="flex items-center gap-1">
          {/* Next Button when in Wizard */}
          {showNext && (
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-2xs hover:bg-blue-700 active:scale-95 cursor-pointer"
              title="Next step"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Queue Button */}
          <button
            onClick={onOpenQueue}
            className={`flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold rounded-xl border transition-all cursor-pointer active:scale-95 ${
              isQueueRunning
                ? 'bg-blue-600 text-white border-blue-700 shadow-xs animate-pulse'
                : activeQueueCount > 0
                ? 'bg-blue-50 text-blue-900 border-blue-200'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title="View sequential production queue"
          >
            <ListOrdered className="w-3 h-3" />
            {activeQueueCount > 0 && (
              <span
                className={`text-[9px] font-extrabold px-1 py-0.2 rounded-full ${
                  isQueueRunning ? 'bg-white text-blue-700' : 'bg-blue-200 text-blue-900'
                }`}
              >
                {activeQueueCount}
              </span>
            )}
          </button>

          {/* Auto-Save Status Beacon & Force Save */}
          <button
            onClick={forceSaveNow}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
              isAutoSaving
                ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 active:scale-95'
            }`}
            title="Auto-saved continuously to local storage and server. Click to force instant save now."
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isAutoSaving ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
              }`}
            />
            <span className="hidden sm:inline">
              {isAutoSaving ? 'Saving...' : 'Auto-Saved'}
            </span>
            <Check className="w-2.5 h-2.5 sm:hidden" />
          </button>

          {/* ModelArk Status Dot */}
          <div
            className="flex items-center gap-1 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-[10px] font-bold text-blue-900 cursor-pointer"
            onClick={() => setActiveTab('settings')}
            title="ModelArk API Settings"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            <span className="font-mono text-[9px]">{modelArkConfig.usedCredits}cr</span>
          </div>
        </div>
      </div>

      {/* Quick Access Sub-Bar: Procedures in Order & Master Prompt */}
      <div className="flex items-center justify-between gap-1.5 pt-1.5 mt-1 border-t border-slate-100">
        <button
          onClick={onOpenProcedures}
          className="flex-1 flex items-center justify-center gap-1 py-1 px-2 bg-blue-50/80 hover:bg-blue-100/80 text-blue-900 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-blue-200/60 active:scale-98"
          title="View step-by-step procedures to create microdrama in order"
        >
          <ListOrdered className="w-3 h-3 text-blue-600" />
          <span>Procedures in Order</span>
        </button>

        <button
          onClick={onOpenMasterPrompt}
          className="flex-1 flex items-center justify-center gap-1 py-1 px-2 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-slate-200 active:scale-98"
          title="View and configure Master Prompt"
        >
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Master Prompt</span>
          {isMasterPromptLocked && (
            <span className="text-[8px] bg-blue-100 text-blue-800 px-1 py-0.2 rounded-xs font-mono font-extrabold">🔒 Locked</span>
          )}
        </button>
      </div>
    </header>
  );
};
