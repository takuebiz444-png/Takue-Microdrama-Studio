import React, { useState, useRef, useEffect } from 'react';
import { useDrama } from '../../context/DramaContext';
import {
  Play,
  Pause,
  Scissors,
  RotateCcw,
  Undo2,
  Redo2,
  Type,
  Music,
  Sliders,
  ArrowUp,
  ArrowDown,
  Download,
  Layers,
  Volume2,
  Zap,
} from 'lucide-react';
import { formatClipSequenceLabel, getDefaultClipFilename, padNumber } from '../../utils/naming';
import { soundFx } from '../../services/soundEffects';

export const VideoEditorView: React.FC = () => {
  const {
    currentProject,
    editingClip,
    setEditingClip,
    updateClipInProject,
    reorderClips,
    undo,
    redo,
    canUndo,
    canRedo,
    downloadClipVideo,
  } = useDrama();

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(12);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Active tool tab
  const [activeTool, setActiveTool] = useState<'trim' | 'order' | 'subtitles' | 'audio'>('trim');

  // Subtitle state
  const [subText, setSubText] = useState<string>('');
  const [subStyle, setSubStyle] = useState<'classic' | 'yellow' | 'blue-box' | 'cinematic'>('yellow');

  // Audio adjustments
  const [clipVolume, setClipVolume] = useState<number>(1);
  const [bgmVolume, setBgmVolume] = useState<number>(0.5);

  useEffect(() => {
    if (!editingClip && currentProject?.episodes[0]?.clips[0]) {
      setEditingClip(currentProject.episodes[0].clips[0]);
    }
  }, [editingClip, currentProject, setEditingClip]);

  useEffect(() => {
    if (editingClip) {
      setSubText(editingClip.subtitleText || '');
      setSubStyle(editingClip.subtitleStyle || 'yellow');
      setClipVolume(editingClip.volume ?? 1);
    }
  }, [editingClip]);

  if (!currentProject) {
    return (
      <div className="py-12 px-4 text-center">
        <h3 className="font-bold text-sm text-blue-950">No Project Loaded</h3>
      </div>
    );
  }

  const currentEpisode = currentProject.episodes.find(
    (e) => e.episodeNumber === editingClip?.episodeNumber
  ) || currentProject.episodes[0];

  const activeClip = editingClip || currentEpisode?.clips[0];

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 12);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleTrimStartChange = (val: number) => {
    if (!activeClip) return;
    const newStart = Math.min(val, activeClip.trimEnd - 1);
    updateClipInProject({ ...activeClip, trimStart: newStart });
  };

  const handleTrimEndChange = (val: number) => {
    if (!activeClip) return;
    const newEnd = Math.max(val, activeClip.trimStart + 1);
    updateClipInProject({ ...activeClip, trimEnd: newEnd });
  };

  const handleSplitClip = () => {
    if (!activeClip) return;
    soundFx.playWhoosh(0.3);
    alert(
      `Clip split at ${currentTime.toFixed(1)}s into segment A and segment B.`
    );
  };

  const handleSaveSubtitles = () => {
    if (!activeClip) return;
    updateClipInProject({
      ...activeClip,
      subtitleText: subText,
      subtitleStyle: subStyle,
    });
    soundFx.playWhoosh(0.2);
  };

  const handleSaveAudio = () => {
    if (!activeClip) return;
    updateClipInProject({
      ...activeClip,
      volume: clipVolume,
    });
    soundFx.playWhoosh(0.2);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0 && currentEpisode) {
      reorderClips(currentEpisode.episodeNumber, index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (currentEpisode && index < currentEpisode.clips.length - 1) {
      reorderClips(currentEpisode.episodeNumber, index, index + 1);
    }
  };

  return (
    <div className="px-4 py-4 pb-20 space-y-4">
      {/* Mobile Top Controls & Switcher */}
      <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
        <div>
          <h2 className="text-base font-extrabold text-blue-950 font-serif">
            Video Editor
          </h2>
          <span className="text-[10px] text-slate-500">
            Episode {currentEpisode?.episodeNumber} • 9:16 Vertical
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg bg-white border border-slate-300 disabled:opacity-40 text-slate-700 cursor-pointer"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg bg-white border border-slate-300 disabled:opacity-40 text-slate-700 cursor-pointer"
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <select
            value={currentEpisode?.episodeNumber}
            onChange={(e) => {
              const epNum = parseInt(e.target.value);
              const foundEp = currentProject.episodes.find((ep) => ep.episodeNumber === epNum);
              if (foundEp && foundEp.clips[0]) {
                setEditingClip(foundEp.clips[0]);
              }
            }}
            className="text-[11px] font-bold px-2 py-1 bg-white border border-slate-300 rounded-lg focus:outline-hidden"
          >
            {currentProject.episodes.map((ep) => (
              <option key={ep.episodeNumber} value={ep.episodeNumber}>
                Ep {padNumber(ep.episodeNumber, 3)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile 9:16 Vertical Video Player */}
      <div className="w-full max-w-[280px] mx-auto bg-slate-900 rounded-3xl overflow-hidden shadow-xl border-2 border-white flex flex-col">
        {/* Player Header */}
        <div className="px-3 py-1.5 bg-slate-950 text-white flex items-center justify-between text-[10px]">
          <span className="font-bold text-blue-300 truncate max-w-[150px]">
            {activeClip ? `Ep ${activeClip.episodeNumber} — Clip ${activeClip.clipNumber}/5` : ''}
          </span>
          <span className="font-mono text-slate-400">
            {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
          </span>
        </div>

        {/* Video Canvas Container */}
        <div className="relative aspect-[9/16] bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            src={
              activeClip?.outputVideoUrl ||
              'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
            }
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            className="w-full h-full object-contain"
          />

          {/* Subtitle Overlay Preview */}
          {subText && (
            <div className="absolute bottom-8 left-3 right-3 text-center pointer-events-none">
              <span
                className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold shadow-md ${
                  subStyle === 'yellow'
                    ? 'bg-black/85 text-amber-300 border border-blue-600/60'
                    : subStyle === 'blue-box'
                    ? 'bg-blue-900/90 text-white'
                    : 'bg-black/90 text-white'
                }`}
              >
                {subText}
              </span>
            </div>
          )}

          {/* Center Play Button */}
          {!isPlaying && (
            <button
              onClick={handlePlayPause}
              className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-blue-600/85 hover:bg-blue-600 text-white flex items-center justify-center shadow-md cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </button>
          )}
        </div>

        {/* Scrubber & Controls */}
        <div className="p-2.5 bg-slate-950 text-white space-y-1.5">
          <input
            type="range"
            min="0"
            max={duration || 12}
            step="0.05"
            value={currentTime}
            onChange={handleSeek}
            className="w-full accent-blue-500 h-1.5 rounded-lg bg-slate-800 cursor-pointer"
          />

          <div className="flex items-center justify-between">
            <button
              onClick={handlePlayPause}
              className="p-1 rounded-md bg-white/10 hover:bg-white/20 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            </button>

            <span className="text-[9px] text-slate-400 font-mono">
              Trim: {activeClip?.trimStart || 0}s - {activeClip?.trimEnd || 12}s
            </span>

            {activeClip && (
              <button
                onClick={() => downloadClipVideo(activeClip)}
                className="p-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                title="Download Clip"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tool Tabs */}
      <div className="flex items-center justify-between gap-1 border-b border-slate-200 pb-2">
        {[
          { id: 'trim', label: 'Trim & Split', icon: Scissors },
          { id: 'order', label: 'Order', icon: Layers },
          { id: 'subtitles', label: 'Subtitles', icon: Type },
          { id: 'audio', label: 'Audio', icon: Music },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id as any)}
              className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tool Panels */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
        {/* Tool 1: Trim */}
        {activeTool === 'trim' && (
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Trim In: {activeClip?.trimStart || 0}s</span>
              <span>Trim Out: {activeClip?.trimEnd || 12}s</span>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max={11}
                step="0.5"
                value={activeClip?.trimStart || 0}
                onChange={(e) => handleTrimStartChange(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <input
                type="range"
                min="1"
                max={12}
                step="0.5"
                value={activeClip?.trimEnd || 12}
                onChange={(e) => handleTrimEndChange(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <button
              onClick={handleSplitClip}
              className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Scissors className="w-3.5 h-3.5" /> Split at {currentTime.toFixed(1)}s
            </button>
          </div>
        )}

        {/* Tool 2: Reorder */}
        {activeTool === 'order' && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-blue-950 block mb-1">
              Episode {currentEpisode.episodeNumber} Scenes (Clips 1 to 5)
            </span>
            {currentEpisode.clips.map((c, idx) => {
              const isSelected = activeClip?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setEditingClip(c)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected ? 'bg-blue-50 border-blue-400' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {c.clipNumber}
                    </span>
                    <span className="font-mono text-[10px] text-slate-700 truncate">
                      {c.customFilename}
                    </span>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 rounded bg-slate-100 disabled:opacity-30 text-slate-700 cursor-pointer"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === currentEpisode.clips.length - 1}
                      className="p-1 rounded bg-slate-100 disabled:opacity-30 text-slate-700 cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tool 3: Subtitles */}
        {activeTool === 'subtitles' && (
          <div className="space-y-3">
            <textarea
              rows={2}
              value={subText}
              onChange={(e) => setSubText(e.target.value)}
              placeholder="Type subtitle overlay text for this clip..."
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {(['yellow', 'classic', 'blue-box'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubStyle(s)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                      subStyle === s ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={handleSaveSubtitles}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Tool 4: Audio */}
        {activeTool === 'audio' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-1">
              <button
                onClick={() => soundFx.playDramaticBoom(0.6)}
                className="flex-1 py-1.5 bg-blue-50 text-blue-800 text-[10px] font-bold rounded-lg border border-blue-200"
              >
                Boom
              </button>
              <button
                onClick={() => soundFx.playWhoosh(0.5)}
                className="flex-1 py-1.5 bg-blue-50 text-blue-800 text-[10px] font-bold rounded-lg border border-blue-200"
              >
                Whoosh
              </button>
              <button
                onClick={() => soundFx.playHeartbeat(0.5)}
                className="flex-1 py-1.5 bg-blue-50 text-blue-800 text-[10px] font-bold rounded-lg border border-blue-200"
              >
                Heartbeat
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-700">
                <span>Clip Volume:</span>
                <span>{Math.round(clipVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={clipVolume}
                onChange={(e) => setClipVolume(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <button
              onClick={handleSaveAudio}
              className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Save Audio
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
