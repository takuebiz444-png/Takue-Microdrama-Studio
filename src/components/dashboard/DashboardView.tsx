import React from 'react';
import { useDrama } from '../../context/DramaContext';
import {
  Film,
  Sparkles,
  Play,
  CheckCircle2,
  Layers,
  Scissors,
  ArrowRight,
  Download,
  Clock,
  Users,
  Plus,
  ListOrdered,
  Lock,
} from 'lucide-react';
import { formatEpisodeBadge, padNumber } from '../../utils/naming';
import { ModelArkCreditCard } from './ModelArkCreditCard';
import { MasterPromptSection } from './MasterPromptSection';

interface DashboardViewProps {
  onOpenQueue: () => void;
  onOpenCombine: (episodeNumber: number) => void;
  onOpenProcedures?: () => void;
  onOpenMasterPrompt?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenQueue,
  onOpenCombine,
  onOpenProcedures,
  onOpenMasterPrompt,
}) => {
  const {
    currentProject,
    setActiveTab,
    enqueueEntireProject,
    downloadClipVideo,
    downloadEpisodeVideo,
    modelArkConfig,
    characters,
    goToCharacters,
    goToCreate,
  } = useDrama();

  if (!currentProject) {
    return (
      <div className="py-12 px-4 text-center space-y-4">
        <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
          <Film className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-blue-950 font-serif">Takue Microdrama</h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Generate 40 sequential episodes with 5 video clips each using ModelArk AI.
        </p>
        <button
          onClick={() => setActiveTab('create')}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-md cursor-pointer"
        >
          Create New Drama (40 Episodes)
        </button>
      </div>
    );
  }

  const totalClips = currentProject.episodes.reduce((acc, ep) => acc + ep.clips.length, 0);
  const completedClips = currentProject.episodes.reduce(
    (acc, ep) => acc + ep.clips.filter((c) => c.generationStatus === 'completed').length,
    0
  );
  const combinedEpisodes = currentProject.episodes.filter((ep) => ep.isCombined).length;
  const progressPercent = Math.round((completedClips / (totalClips || 1)) * 100);

  const displayedEpisodes = currentProject.episodes.slice(0, 3);

  return (
    <div className="px-4 py-4 pb-20 space-y-4">
      {/* Mobile Studio Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-5 text-white shadow-xl">
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold text-blue-200 border border-white/15">
            <Sparkles className="w-3 h-3 text-blue-300" />
            <span>ModelArk Seedance AI</span>
            <span>•</span>
            <span className="text-white">9:16 Vertical</span>
          </div>

          <h2 className="text-xl font-extrabold tracking-tight text-white font-serif">
            {currentProject.title}
          </h2>

          <div className="flex items-center gap-2 text-[11px] text-blue-200 font-medium">
            <span>{currentProject.totalEpisodes} Episodes</span>
            <span>•</span>
            <span>5 Clips / Ep</span>
            <span>•</span>
            <span>12s Duration</span>
          </div>

          {/* Mobile Progress Bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-[11px] text-blue-200 mb-1 font-semibold">
              <span>Overall Generation</span>
              <span className="font-mono text-white font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-blue-950/80 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick CTA button */}
          <div className="pt-2">
            <button
              onClick={() => enqueueEntireProject(currentProject.id)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-blue-50 text-blue-950 font-extrabold text-xs rounded-2xl shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current text-blue-600" />
              Batch Generate All 40 Episodes
            </button>
          </div>
        </div>
      </div>

      {/* 1. Visual Credit and Resource Usage Card (polls ModelArk API) */}
      <ModelArkCreditCard currentProject={currentProject} />

      {/* 2. Space for Master Prompt of All Series (No Limited Words or Characters) */}
      <MasterPromptSection />

      {/* 3. Directives & Ordered Procedures Quick Cards */}
      <div className="bg-white border border-blue-200 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
              ✦
            </span>
            <span className="font-extrabold text-xs text-blue-950 font-serif">Takue Creation Directives</span>
          </div>
          <span className="text-[10px] bg-blue-50 text-blue-800 font-mono font-bold px-2 py-0.5 rounded-md border border-blue-200">
            6 Ordered Procedures
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Quick Characters Link */}
          <button
            type="button"
            onClick={goToCharacters}
            className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/80 rounded-xl text-left hover:border-blue-300 transition-all cursor-pointer active:scale-98 space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-blue-900 flex items-center gap-1">
                <Users className="w-3 h-3 text-blue-600" />
                Characters
              </span>
              <span className="text-[8px] font-mono font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-xs">
                {characters.filter((c) => c.isLocked).length} Locked
              </span>
            </div>
            <p className="text-[9px] text-blue-800/80 line-clamp-2 leading-tight">
              Maintain character facial and wardrobe continuity across all 40 episodes.
            </p>
            <span className="text-[9px] font-bold text-blue-700 block pt-0.5">
              Manage Continuity →
            </span>
          </button>

          {/* Procedures in Order Trigger */}
          <button
            type="button"
            onClick={onOpenProcedures}
            className="p-2.5 bg-gradient-to-br from-indigo-50 to-purple-50/50 border border-indigo-200/80 rounded-xl text-left hover:border-indigo-300 transition-all cursor-pointer active:scale-98 space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-indigo-950 flex items-center gap-1">
                <ListOrdered className="w-3 h-3 text-indigo-600" />
                6 Procedures
              </span>
              <span className="text-[8px] font-mono font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-xs">
                In Order
              </span>
            </div>
            <p className="text-[9px] text-indigo-900/80 line-clamp-2 leading-tight">
              1. Master Prompt → 2. Characters → 3. 40 Eps → 4. Review → 5. Batch → 6. Edit
            </p>
            <span className="text-[9px] font-bold text-indigo-700 block pt-0.5">
              View Guide & Steps →
            </span>
          </button>
        </div>
      </div>

      {/* 4 Stats Chips */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white border border-blue-100 rounded-2xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
            Episodes
          </span>
          <div className="text-xl font-extrabold text-blue-950 font-serif">
            {currentProject.totalEpisodes}
          </div>
          <span className="text-[10px] text-slate-500">5 clips per episode</span>
        </div>

        <div className="bg-white border border-blue-100 rounded-2xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
            Clips Ready
          </span>
          <div className="text-xl font-extrabold text-emerald-600 font-serif">
            {completedClips} <span className="text-xs text-slate-400 font-normal">/ {totalClips}</span>
          </div>
          <span className="text-[10px] text-slate-500">Playable MP4s</span>
        </div>

        <div className="bg-white border border-blue-100 rounded-2xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
            Combined
          </span>
          <div className="text-xl font-extrabold text-indigo-900 font-serif">
            {combinedEpisodes}
          </div>
          <span className="text-[10px] text-slate-500">Merged continuous MP4</span>
        </div>

        <div className="bg-white border border-blue-100 rounded-2xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
            ModelArk Credits
          </span>
          <div className="text-xl font-extrabold text-slate-800 font-serif">
            {modelArkConfig.usedCredits}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Limit: {modelArkConfig.spendingLimitCredits}</span>
        </div>
      </div>

      {/* Episodes Sequence Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-blue-950 font-serif">Episodes (1 to 40)</h3>
          <button
            onClick={() => setActiveTab('projects')}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
          >
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-3">
          {displayedEpisodes.map((ep) => {
            const epCompleted = ep.clips.filter((c) => c.generationStatus === 'completed').length;
            const canCombine = epCompleted === ep.clips.length;

            return (
              <div
                key={ep.episodeNumber}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-lg">
                      {formatEpisodeBadge(ep.episodeNumber)}
                    </span>
                    <span className="font-bold text-xs text-slate-900">
                      Episode {ep.episodeNumber}
                    </span>
                  </div>

                  {ep.isCombined ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Combined
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-500">
                      {epCompleted}/5 Clips
                    </span>
                  )}
                </div>

                {/* 5 Clips pill track */}
                <div className="grid grid-cols-5 gap-1.5">
                  {ep.clips.map((clip) => {
                    const isDone = clip.generationStatus === 'completed';
                    const isGen = clip.generationStatus === 'generating';
                    return (
                      <div
                        key={clip.id}
                        onClick={() => {
                          if (isDone) downloadClipVideo(clip);
                        }}
                        className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isDone
                            ? 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100'
                            : isGen
                            ? 'bg-amber-50 border-amber-300 text-amber-800 animate-pulse'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                        title={clip.customFilename}
                      >
                        <span className="text-[9px] font-bold block">C{clip.clipNumber}</span>
                        <span className="text-[8px] font-medium">
                          {isDone ? 'Ready' : isGen ? 'Gen' : 'Wait'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Mobile Action */}
                <div className="pt-1 flex items-center justify-between">
                  <span className="font-mono text-[9px] text-slate-400 truncate max-w-[140px]">
                    {ep.combinedFilename || `Takue_Microdrama_Episode_${padNumber(ep.episodeNumber, 3)}.mp4`}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {ep.isCombined && (
                      <button
                        onClick={() => downloadEpisodeVideo(ep)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> MP4
                      </button>
                    )}

                    <button
                      onClick={() => onOpenCombine(ep.episodeNumber)}
                      className={`px-3 py-1.5 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                        canCombine
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <Layers className="w-3 h-3" />
                      {ep.isCombined ? 'Re-Combine' : 'Combine 5 Clips'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
