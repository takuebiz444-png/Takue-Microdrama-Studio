import React, { useState } from 'react';
import { useDrama } from '../../context/DramaContext';
import { Episode, Clip } from '../../types/drama';
import {
  Film,
  Download,
  Scissors,
  RotateCcw,
  Edit2,
  Layers,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  X,
  Search,
} from 'lucide-react';
import {
  formatClipSequenceLabel,
  formatEpisodeBadge,
  getDefaultClipFilename,
  getDefaultEpisodeFilename,
  padNumber,
} from '../../utils/naming';

interface ProjectsViewProps {
  onOpenCombine: (episodeNumber: number) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onOpenCombine }) => {
  const {
    currentProject,
    setActiveTab,
    setEditingClip,
    retryClip,
    renameClip,
    renameEpisode,
    downloadClipVideo,
    downloadEpisodeVideo,
    enqueueEpisode,
  } = useDrama();

  const [selectedEpFilter, setSelectedEpFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Rename modal
  const [renamingItem, setRenamingItem] = useState<{
    type: 'clip' | 'episode';
    id: string;
    episodeNumber: number;
    currentName: string;
  } | null>(null);
  const [newNameInput, setNewNameInput] = useState<string>('');

  // Active clip preview modal
  const [previewClip, setPreviewClip] = useState<Clip | null>(null);

  if (!currentProject) {
    return (
      <div className="py-12 px-4 text-center">
        <h3 className="font-bold text-sm text-blue-950">No Episodes Found</h3>
      </div>
    );
  }

  const filteredEpisodes = currentProject.episodes.filter((ep) => {
    if (selectedEpFilter !== 'all' && ep.episodeNumber !== selectedEpFilter) {
      return false;
    }
    return true;
  });

  const handleOpenRename = (type: 'clip' | 'episode', id: string, epNum: number, name: string) => {
    setRenamingItem({ type, id, episodeNumber: epNum, currentName: name });
    setNewNameInput(name);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingItem || !newNameInput.trim()) return;

    if (renamingItem.type === 'clip') {
      renameClip(renamingItem.id, newNameInput.trim());
    } else {
      renameEpisode(renamingItem.episodeNumber, newNameInput.trim());
    }
    setRenamingItem(null);
  };

  return (
    <div className="px-4 py-4 pb-20 space-y-4">
      {/* Mobile Header & Filter */}
      <div className="space-y-2 border-b border-blue-100 pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-blue-950 font-serif">
            Episodes & Clips
          </h2>
          <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-bold">
            {currentProject.totalEpisodes} Episodes
          </span>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2">
          <select
            value={selectedEpFilter}
            onChange={(e) =>
              setSelectedEpFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
            }
            className="flex-1 text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="all">All Episodes (1 - {currentProject.totalEpisodes})</option>
            {currentProject.episodes.map((ep) => (
              <option key={ep.episodeNumber} value={ep.episodeNumber}>
                Episode {padNumber(ep.episodeNumber, 3)}
              </option>
            ))}
          </select>

          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search clip..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-7 pr-2 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Episodes Feed */}
      <div className="space-y-4">
        {filteredEpisodes.map((episode) => {
          const completedCount = episode.clips.filter(
            (c) => c.generationStatus === 'completed'
          ).length;
          const canCombine = completedCount === episode.clips.length;
          const episodeFilename =
            episode.combinedFilename || getDefaultEpisodeFilename(episode.episodeNumber);

          const displayedClips = episode.clips.filter((c) => {
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              return (
                c.customFilename.toLowerCase().includes(q) ||
                c.prompt.toLowerCase().includes(q)
              );
            }
            return true;
          });

          return (
            <div
              key={episode.episodeNumber}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3"
            >
              {/* Episode Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-blue-600 text-white px-2.5 py-0.5 rounded-lg">
                    {formatEpisodeBadge(episode.episodeNumber)}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900">
                        Episode {episode.episodeNumber}
                      </span>
                      <button
                        onClick={() =>
                          handleOpenRename(
                            'episode',
                            `ep_${episode.episodeNumber}`,
                            episode.episodeNumber,
                            episodeFilename
                          )
                        }
                        className="text-slate-400 hover:text-blue-600 cursor-pointer"
                        title="Rename combined episode file"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-mono text-[9px] text-slate-400 block truncate max-w-[180px]">
                      {episodeFilename}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {episode.isCombined && (
                    <button
                      onClick={() => downloadEpisodeVideo(episode)}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> MP4
                    </button>
                  )}

                  <button
                    onClick={() => onOpenCombine(episode.episodeNumber)}
                    disabled={!canCombine}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      canCombine
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    {episode.isCombined ? 'Combined' : 'Combine'}
                  </button>
                </div>
              </div>

              {/* 5 Clips in mobile list */}
              <div className="space-y-2">
                {displayedClips.map((clip) => {
                  const isDone = clip.generationStatus === 'completed';
                  const isGen = clip.generationStatus === 'generating';
                  const isFail = clip.generationStatus === 'failed';

                  return (
                    <div
                      key={clip.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2.5"
                    >
                      {/* Left: Thumbnail & Badges */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          onClick={() => {
                            if (isDone) setPreviewClip(clip);
                          }}
                          className={`w-11 h-14 rounded-lg flex items-center justify-center shrink-0 cursor-pointer ${
                            isDone
                              ? 'bg-slate-900 text-white shadow-xs'
                              : isGen
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          {isDone ? (
                            <Play className="w-4 h-4 fill-white" />
                          ) : isGen ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[11px] font-bold text-blue-950">
                              Clip {clip.clipNumber} of 5
                            </span>
                            <span
                              className={`text-[8px] uppercase font-bold px-1 py-0.2 rounded-xs ${
                                isDone
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isGen
                                  ? 'bg-amber-100 text-amber-800'
                                  : isFail
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {clip.generationStatus}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[9px] text-slate-600 truncate max-w-[130px]">
                              {clip.customFilename}
                            </span>
                            <button
                              onClick={() =>
                                handleOpenRename(
                                  'clip',
                                  clip.id,
                                  clip.episodeNumber,
                                  clip.customFilename
                                )
                              }
                              className="text-slate-400 hover:text-blue-600 cursor-pointer"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          <p className="text-[10px] text-slate-500 truncate max-w-[160px] mt-0.5">
                            {clip.prompt}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isDone && (
                          <button
                            onClick={() => downloadClipVideo(clip)}
                            className="p-1.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 cursor-pointer"
                            title="Download Clip MP4"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setEditingClip(clip);
                            setActiveTab('editor');
                          }}
                          className="p-1.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 cursor-pointer"
                          title="Edit Clip"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => retryClip(clip.episodeNumber, clip.clipNumber)}
                          className="p-1.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 cursor-pointer"
                          title="Regenerate Clip"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Batch Button for this episode */}
              <button
                onClick={() => enqueueEpisode(currentProject.id, episode.episodeNumber)}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <Play className="w-3 h-3 fill-current text-blue-600" />
                Generate All 5 Clips for Episode {episode.episodeNumber}
              </button>
            </div>
          );
        })}
      </div>

      {/* Rename Modal */}
      {renamingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-blue-200 w-full max-w-sm p-4 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-blue-950">Rename MP4 File</h3>
              <button
                onClick={() => setRenamingItem(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="space-y-3">
              <input
                type="text"
                required
                value={newNameInput}
                onChange={(e) => setNewNameInput(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenamingItem(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg shadow-xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clip Preview Modal */}
      {previewClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-800 w-full max-w-xs overflow-hidden animate-in fade-in">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between text-xs">
              <span className="font-bold">
                {formatClipSequenceLabel(previewClip.episodeNumber, previewClip.clipNumber, 5)}
              </span>
              <button
                onClick={() => setPreviewClip(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-[9/16] bg-black max-h-[60vh]">
              <video
                src={previewClip.outputVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-2.5 bg-white flex items-center justify-between">
              <span className="font-mono text-[10px] text-slate-600 truncate max-w-[150px]">
                {previewClip.customFilename}
              </span>
              <button
                onClick={() => downloadClipVideo(previewClip)}
                className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> MP4
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
