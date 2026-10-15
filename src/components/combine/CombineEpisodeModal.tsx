import React, { useState } from 'react';
import { useDrama } from '../../context/DramaContext';
import { Episode, Clip } from '../../types/drama';
import {
  X,
  Layers,
  Sparkles,
  Download,
  Play,
  CheckCircle2,
  Sliders,
  Music,
  Type,
  Film,
} from 'lucide-react';
import { combineEpisodeClips } from '../../services/videoMerger';
import { getDefaultEpisodeFilename, padNumber } from '../../utils/naming';

interface CombineEpisodeModalProps {
  episode: Episode | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CombineEpisodeModal: React.FC<CombineEpisodeModalProps> = ({
  episode,
  isOpen,
  onClose,
}) => {
  const { markEpisodeCombined, downloadEpisodeVideo } = useDrama();

  const [transition, setTransition] = useState<'fade' | 'crossfade' | 'cut'>('crossfade');
  const [includeSubtitles, setIncludeSubtitles] = useState<boolean>(true);
  const [backgroundMusic, setBackgroundMusic] = useState<'tension' | 'cyber' | 'piano' | 'none'>('tension');
  const [musicVolume, setMusicVolume] = useState<number>(0.5);

  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [combinedResult, setCombinedResult] = useState<{
    url: string;
    filename: string;
    blob: Blob;
  } | null>(null);

  if (!isOpen || !episode) return null;

  const handleStartCombine = async () => {
    setIsMerging(true);
    setProgress(5);
    setProgressStatus('Initializing video composition canvas...');
    setCombinedResult(null);

    try {
      const result = await combineEpisodeClips(episode.clips, episode.episodeNumber, {
        transition,
        includeSubtitles,
        backgroundMusic,
        musicVolume,
        onProgress: (p, status) => {
          setProgress(p);
          setProgressStatus(status);
        },
      });

      setCombinedResult(result);
      markEpisodeCombined(episode.episodeNumber, result.url, result.filename);
    } catch (err: any) {
      alert(`Combine failed: ${err.message}`);
    } finally {
      setIsMerging(false);
    }
  };

  const handleDownloadCombined = () => {
    if (combinedResult) {
      const link = document.createElement('a');
      link.href = combinedResult.url;
      link.download = combinedResult.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (episode.combinedVideoUrl) {
      downloadEpisodeVideo(episode);
    }
  };

  const filename = episode.combinedFilename || getDefaultEpisodeFilename(episode.episodeNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-blue-200 w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/70 flex items-center justify-center border border-blue-400/30">
              <Layers className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">
                  Combine Episode {padNumber(episode.episodeNumber, 3)}
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/40 text-blue-100 border border-blue-400/30">
                  5 Clips Engine
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Stitch 5 sequential clips into one continuous MP4 episode
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50">
          {/* Target Output Filename info */}
          <div className="p-3.5 bg-white border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Film className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="text-xs text-slate-500 font-medium">Authoritative Output Filename:</span>
                <p className="font-mono text-xs font-bold text-blue-950">{filename}</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
              9:16 Vertical Drama
            </span>
          </div>

          {/* Sequential Clips List preview */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Clips to Stitch in Sequence ({episode.clips.length} of 5)
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {episode.clips.map((clip, index) => (
                <div
                  key={clip.id}
                  className="bg-white border border-slate-200 rounded-xl p-2 text-center shadow-2xs"
                >
                  <div className="w-full aspect-[9/14] bg-blue-900 rounded-lg flex flex-col items-center justify-center text-white mb-1 relative overflow-hidden">
                    <span className="text-xs font-bold">Clip {clip.clipNumber}</span>
                    <span className="text-[9px] text-blue-200 mt-0.5 truncate px-1">
                      {clip.sceneType.split(' ')[0]}
                    </span>
                    <span className="absolute bottom-1 right-1 bg-emerald-500 text-white text-[8px] font-bold px-1 rounded-xs">
                      12s
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 block truncate">
                    Take {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Customization Options */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-950 border-b border-slate-100 pb-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Stitching & Mastering Settings
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Transitions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Scene Transitions
                </label>
                <select
                  value={transition}
                  onChange={(e) => setTransition(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="crossfade">Cinematic Crossfade</option>
                  <option value="fade">Fade to Black (High Tension)</option>
                  <option value="cut">Direct Cut (Fast Paced)</option>
                </select>
              </div>

              {/* Background Audio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Background Score
                </label>
                <select
                  value={backgroundMusic}
                  onChange={(e) => setBackgroundMusic(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="tension">Dramatic Suspense Drone</option>
                  <option value="cyber">Cyberpunk Tension</option>
                  <option value="piano">Melancholic Piano</option>
                  <option value="none">Original Audio Only</option>
                </select>
              </div>
            </div>

            {/* Subtitles & Volume */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSubtitles}
                  onChange={(e) => setIncludeSubtitles(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Type className="w-3.5 h-3.5 text-blue-600" />
                  Burn-in Subtitles & Dialogue Overlays
                </span>
              </label>

              {backgroundMusic !== 'none' && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Music className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs text-slate-600">BGM Volume:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                    className="w-24 accent-blue-600"
                  />
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {Math.round(musicVolume * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Active Rendering Progress */}
          {isMerging && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                  Processing Video Engine
                </span>
                <span className="font-mono font-bold text-blue-700">{progress}%</span>
              </div>
              <div className="w-full bg-blue-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-blue-800 font-medium truncate">
                {progressStatus}
              </p>
            </div>
          )}

          {/* Combined Success & Preview */}
          {(combinedResult || episode.isCombined) && !isMerging && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Episode Combined Successfully!
                </div>
                <button
                  onClick={handleDownloadCombined}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download {filename}
                </button>
              </div>

              {/* Preview player */}
              <div className="w-full max-w-xs mx-auto aspect-[9/16] bg-black rounded-xl overflow-hidden shadow-lg border border-slate-700">
                <video
                  src={combinedResult?.url || episode.combinedVideoUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleStartCombine}
              disabled={isMerging}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              {combinedResult || episode.isCombined ? 'Re-Combine Episode' : 'Combine 5 Clips Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
