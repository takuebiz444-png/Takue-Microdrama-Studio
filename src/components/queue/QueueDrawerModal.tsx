import React from 'react';
import { useDrama } from '../../context/DramaContext';
import {
  X,
  Play,
  Pause,
  Square,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatClipSequenceLabel, padNumber } from '../../utils/naming';

interface QueueDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QueueDrawerModal: React.FC<QueueDrawerModalProps> = ({ isOpen, onClose }) => {
  const {
    queue,
    isQueueRunning,
    isQueuePaused,
    startQueue,
    pauseQueue,
    resumeQueue,
    stopQueue,
    retryClip,
    retryAllFailed,
    modelArkConfig,
  } = useDrama();

  if (!isOpen) return null;

  const queuedCount = queue.filter((q) => q.status === 'queued').length;
  const generatingJob = queue.find((q) => q.status === 'generating');
  const completedCount = queue.filter((q) => q.status === 'completed').length;
  const failedCount = queue.filter((q) => q.status === 'failed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-blue-200 w-full max-w-sm max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/60 flex items-center justify-center border border-blue-400/30">
              <Clock className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Automatic Generation Queue</h2>
                <span
                  className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                    isQueueRunning && !isQueuePaused
                      ? 'bg-emerald-500 text-white animate-pulse'
                      : isQueuePaused
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {isQueueRunning && !isQueuePaused
                    ? 'Active'
                    : isQueuePaused
                    ? 'Paused'
                    : 'Idle'}
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Sequential processing: Clip 1 → Clip 2 → ... → Clip 5 → Next Episode
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

        {/* Action Controls Bar */}
        <div className="p-4 bg-blue-50/60 border-b border-blue-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!isQueueRunning || isQueuePaused ? (
              <button
                onClick={isQueuePaused ? resumeQueue : startQueue}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isQueuePaused ? 'Resume Queue' : 'Start Queue'}
              </button>
            ) : (
              <button
                onClick={pauseQueue}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                Pause
              </button>
            )}

            <button
              onClick={stopQueue}
              disabled={!isQueueRunning}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>

            {failedCount > 0 && (
              <button
                onClick={retryAllFailed}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry Failed ({failedCount})
              </button>
            )}
          </div>

          {/* Quick counts */}
          <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Queued: <strong className="text-blue-950">{queuedCount}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Done: <strong className="text-slate-900">{completedCount}</strong>
            </span>
            {failedCount > 0 && (
              <span className="flex items-center gap-1 text-rose-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Failed: {failedCount}
              </span>
            )}
          </div>
        </div>

        {/* Active Job Highlight if generating */}
        {generatingJob && (
          <div className="p-4 bg-blue-50 border-b border-blue-200 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-blue-950">
                  {formatClipSequenceLabel(
                    generatingJob.episodeNumber,
                    generatingJob.clipNumber,
                    5
                  )}{' '}
                  <span className="text-blue-600 font-extrabold">— Generating</span>
                </span>
                <span className="text-xs font-mono font-bold text-blue-700">
                  {generatingJob.progressPercent}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${generatingJob.progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-1">
                ModelArk [{generatingJob.selectedModel}]: "{generatingJob.prompt}"
              </p>
            </div>
          </div>
        )}

        {/* Queue Items List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2 bg-slate-50">
          {queue.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Sparkles className="w-8 h-8 mx-auto text-blue-400 mb-2 opacity-60" />
              <p className="text-sm font-semibold">Queue is currently empty</p>
              <p className="text-xs text-slate-400 mt-1">
                Go to "Create Drama" or "My Projects" and click "Generate Episode" or "Batch Generate All 40 Episodes"
              </p>
            </div>
          ) : (
            queue.map((job) => {
              const isGen = job.status === 'generating';
              const isRendering = job.status === 'rendering';
              const isDone = job.status === 'completed';
              const isFail = job.status === 'failed';

              return (
                <div
                  key={job.jobId}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isGen || isRendering
                      ? 'bg-blue-50/90 border-blue-300 shadow-xs'
                      : isDone
                      ? 'bg-white border-emerald-200'
                      : isFail
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isGen || isRendering ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                    ) : isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : isFail ? (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          Episode {job.episodeNumber} — Clip {job.clipNumber} of 5
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                            isRendering
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : isGen
                              ? 'bg-blue-100 text-blue-800'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : isFail
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isRendering ? 'Rendering...' : job.status === 'queued' ? 'Waiting' : job.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-md">
                        {job.prompt}
                      </p>
                      {isFail && job.error && (
                        <p className="text-[11px] text-rose-600 font-medium truncate">
                          Error: {job.error}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                      Ep{padNumber(job.episodeNumber, 3)}_C{padNumber(job.clipNumber, 3)}
                    </span>
                    {isFail && (
                      <button
                        onClick={() => retryClip(job.episodeNumber, job.clipNumber)}
                        className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg cursor-pointer"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-white border-t border-slate-200 text-center text-[11px] text-slate-500">
          Queue progress is persisted in local storage. Reopening Takue Microdrama restores queue jobs without duplicate generation.
        </div>
      </div>
    </div>
  );
};
