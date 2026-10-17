import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  DramaProject,
  Episode,
  Clip,
  Character,
  QueueJob,
  ModelArkConfig,
  GenerationStatus,
  ActiveTabType,
} from '../types/drama';
import { DEFAULT_CHARACTERS } from '../data/defaultCharacters';
import { DEFAULT_MASTER_PROMPT } from '../data/masterPrompts';
import { getDefaultClipFilename, getDefaultEpisodeFilename } from '../utils/naming';
import { ModelArkService, ModelArkStatusResponse } from '../services/modelarkApi';
import { soundFx } from '../services/soundEffects';

interface DramaContextType {
  // Navigation
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
  createWizardStep: number;
  setCreateWizardStep: (step: number) => void;
  goToHome: () => void;
  goToCharacters: () => void;
  goToCreate: (step?: number) => void;
  goToProjects: () => void;
  goToEditor: () => void;
  goToSettings: () => void;

  // Projects
  projects: DramaProject[];
  currentProject: DramaProject | null;
  setCurrentProject: (proj: DramaProject | null) => void;
  createNewProject: (params: {
    title?: string;
    storyPrompt: string;
    masterPrompt?: string;
    isMasterPromptLocked?: boolean;
    totalEpisodes: number;
    clipsPerEpisode: number;
    selectedModel: string;
    tone?: string;
    characters?: Character[];
  }) => Promise<DramaProject>;
  updateMasterPrompt: (projectId: string, masterPrompt: string, isLocked?: boolean) => void;
  updateProject: (updated: DramaProject) => void;
  deleteProject: (id: string) => void;

  // Characters
  characters: Character[];
  addCharacter: (char: Character) => void;
  updateCharacter: (char: Character) => void;
  deleteCharacter: (id: string) => void;
  toggleLockCharacter: (id: string) => void;

  // Queue
  queue: QueueJob[];
  isQueueRunning: boolean;
  isQueuePaused: boolean;
  startQueue: () => void;
  pauseQueue: () => void;
  resumeQueue: () => void;
  stopQueue: () => void;
  retryClip: (episodeNumber: number, clipNumber: number) => void;
  retryAllFailed: () => void;
  enqueueEntireProject: (projectId: string) => void;
  enqueueEpisode: (projectId: string, episodeNumber: number) => void;

  // Editor
  editingClip: Clip | null;
  setEditingClip: (clip: Clip | null) => void;
  updateClipInProject: (clip: Clip) => void;
  reorderClips: (episodeNumber: number, fromIndex: number, toIndex: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Renaming & Downloading
  renameClip: (clipId: string, newFilename: string) => void;
  renameEpisode: (episodeNumber: number, newFilename: string) => void;
  downloadClipVideo: (clip: Clip) => void;
  downloadEpisodeVideo: (episode: Episode) => void;

  // Combine Episode
  markEpisodeCombined: (episodeNumber: number, videoUrl: string, filename: string) => void;

  // Settings & ModelArk
  modelArkConfig: ModelArkConfig;
  updateModelArkConfig: (updates: Partial<ModelArkConfig>) => void;
  checkConnection: () => Promise<any>;
  statusInfo: ModelArkStatusResponse | null;

  // Auto-Save
  lastSavedAt: number | null;
  isAutoSaving: boolean;
  forceSaveNow: () => Promise<void>;
}

const DramaContext = createContext<DramaContextType | null>(null);

const STORAGE_KEY_PROJECTS = 'takue_microdrama_projects_v6';
const STORAGE_KEY_CHARS = 'takue_microdrama_characters_v6';
const STORAGE_KEY_CONFIG = 'takue_microdrama_config_v6';

export const getCharacterStageForEpisode = (
  char: Character,
  episodeNumber: number
): { id: string; label: string; description: string; url: string; fromEpisode: number; toEpisode: number } => {
  if (char.stageLooks && char.stageLooks.length > 0) {
    const validLooks = char.stageLooks.filter((l) => Boolean(l.url && l.url.trim()));
    if (validLooks.length > 0) {
      // Find range match
      const matched = validLooks.find((l) => {
        const from = l.fromEpisode ?? 1;
        const to = l.toEpisode ?? 40;
        return episodeNumber >= from && episodeNumber <= to;
      });
      if (matched) {
        return {
          id: matched.id,
          label: matched.label || (episodeNumber <= 20 ? 'Poor / Humble Era' : 'Rich / Elite Billionaire Era'),
          description: matched.description || char.clothingDetails || char.visualTraits,
          url: matched.url,
          fromEpisode: matched.fromEpisode ?? 1,
          toEpisode: matched.toEpisode ?? 40,
        };
      }
      // If no exact episode match, choose based on halfway progression
      if (episodeNumber <= 20) {
        const first = validLooks[0];
        return {
          id: first.id,
          label: first.label || 'Poor / Humble Era',
          description: first.description || char.clothingDetails,
          url: first.url,
          fromEpisode: first.fromEpisode ?? 1,
          toEpisode: first.toEpisode ?? 20,
        };
      } else {
        const last = validLooks[validLooks.length - 1];
        return {
          id: last.id,
          label: last.label || 'Rich / Elite Billionaire Era',
          description: last.description || char.clothingDetails,
          url: last.url,
          fromEpisode: last.fromEpisode ?? 21,
          toEpisode: last.toEpisode ?? 40,
        };
      }
    }
  }

  // Fallback if no stage looks attached
  const isPoorEra = episodeNumber <= 20;
  return {
    id: isPoorEra ? 'look_1' : 'look_3',
    label: isPoorEra ? 'Poor / Humble Era' : 'Rich / Elite Billionaire Era',
    description: char.clothingDetails || (isPoorEra ? 'Humble worn clothing, impoverished lifestyle' : 'Tailored luxury suit, elite status'),
    url: char.referenceImageUrl,
    fromEpisode: isPoorEra ? 1 : 21,
    toEpisode: isPoorEra ? 20 : 40,
  };
};

export const DramaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTabType>('dashboard');
  const [createWizardStep, setCreateWizardStep] = useState<number>(1);

  // Quick navigation helpers
  const goToHome = useCallback(() => setActiveTab('dashboard'), []);
  const goToCharacters = useCallback(() => setActiveTab('characters'), []);
  const goToCreate = useCallback((step: number = 1) => {
    setCreateWizardStep(step);
    setActiveTab('create');
  }, []);
  const goToProjects = useCallback(() => setActiveTab('projects'), []);
  const goToEditor = useCallback(() => setActiveTab('editor'), []);
  const goToSettings = useCallback(() => setActiveTab('settings'), []);

  // Load or initialize characters - start clean with no personal names!
  const [characters, setCharacters] = useState<Character[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHARS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return DEFAULT_CHARACTERS;
  });

  // Settings config
  const [modelArkConfig, setModelArkConfig] = useState<ModelArkConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      endpoint: 'https://ark.ap-southeast.byteplus.com/api/v3/contents/generations',
      maskedKey: 'Loading...',
      configured: true,
      spendingLimitCredits: 500,
      usedCredits: 0,
      maxRetries: 3,
      forceSimulation: false,
    };
  });

  const [statusInfo, setStatusInfo] = useState<ModelArkStatusResponse | null>(null);

  // Projects list
  const [projects, setProjects] = useState<DramaProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    // Seed initial demo project with 40 episodes and 5 clips each!
    return [createInitialDemoProject()];
  });

  const [currentProject, setCurrentProject] = useState<DramaProject | null>(() => {
    return projects[0] || null;
  });

  // Queue state
  const [queue, setQueue] = useState<QueueJob[]>([]);
  const [isQueueRunning, setIsQueueRunning] = useState<boolean>(false);
  const [isQueuePaused, setIsQueuePaused] = useState<boolean>(false);

  // Editor state & undo/redo
  const [editingClip, setEditingClip] = useState<Clip | null>(null);
  const [history, setHistory] = useState<DramaProject[]>([]);
  const [redoStack, setRedoStack] = useState<DramaProject[]>([]);

  // Ref to always access current queue state in async loop
  const queueRef = useRef<QueueJob[]>(queue);
  queueRef.current = queue;

  const isQueueRunningRef = useRef(isQueueRunning);
  isQueueRunningRef.current = isQueueRunning;

  const isQueuePausedRef = useRef(isQueuePaused);
  isQueuePausedRef.current = isQueuePaused;

  const currentProjectRef = useRef(currentProject);
  currentProjectRef.current = currentProject;

  // Auto-Save State
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(Date.now());
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const saveTimeoutRef = useRef<any>(null);

  // Reconcile and load server-persisted state across sessions on mount
  useEffect(() => {
    fetch('/api/storage/state')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.hasSavedState && data.state) {
          const serverState = data.state;
          if (Array.isArray(serverState.characters) && serverState.characters.length > 0) {
            setCharacters(serverState.characters);
          }
          if (Array.isArray(serverState.projects) && serverState.projects.length > 0) {
            setProjects(serverState.projects);
            if (serverState.currentProjectId) {
              const matched = serverState.projects.find((p: any) => p.id === serverState.currentProjectId);
              if (matched) setCurrentProject(matched);
            }
          }
          if (serverState.modelArkConfig) {
            setModelArkConfig((prev) => ({ ...prev, ...serverState.modelArkConfig }));
          }
          if (data.savedAt) {
            setLastSavedAt(data.savedAt);
          }
        }
      })
      .catch((err) => console.warn('Could not load server auto-save state:', err));
  }, []);

  const persistStateToServer = useCallback(
    async (projs: DramaProject[], chars: Character[], cfg: ModelArkConfig, curProjId?: string) => {
      setIsAutoSaving(true);
      try {
        const res = await fetch('/api/storage/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projects: projs,
            characters: chars,
            modelArkConfig: cfg,
            currentProjectId: curProjId,
            masterPrompt: currentProjectRef.current?.masterPrompt,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setLastSavedAt(data.savedAt || Date.now());
        }
      } catch (err) {
        console.warn('Server auto-save error:', err);
      } finally {
        setIsAutoSaving(false);
      }
    },
    []
  );

  // Sync to local storage & server-side auto-save (debounced)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
    } catch (e) {}
    try {
      localStorage.setItem(STORAGE_KEY_CHARS, JSON.stringify(characters));
    } catch (e) {}
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(modelArkConfig));
    } catch (e) {}

    // Auto-save to server storage
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistStateToServer(projects, characters, modelArkConfig, currentProject?.id);
    }, 400);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [projects, characters, modelArkConfig, currentProject?.id, persistStateToServer]);

  const forceSaveNow = useCallback(async () => {
    setIsAutoSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
      localStorage.setItem(STORAGE_KEY_CHARS, JSON.stringify(characters));
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(modelArkConfig));
    } catch (e) {}
    await persistStateToServer(projects, characters, modelArkConfig, currentProject?.id);
  }, [projects, characters, modelArkConfig, currentProject?.id, persistStateToServer]);

  // Fetch ModelArk backend status on boot
  useEffect(() => {
    ModelArkService.getStatus().then((status) => {
      setStatusInfo(status);
      setModelArkConfig((prev) => ({
        ...prev,
        configured: status.configured,
        maskedKey: status.maskedKey,
        endpoint: status.endpoint,
      }));
    });
  }, []);

  // Update a project
  const updateProject = useCallback((updated: DramaProject) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (currentProjectRef.current?.id === updated.id) {
      setCurrentProject(updated);
    }
  }, []);

  // Character operations
  const addCharacter = useCallback((char: Character) => {
    setCharacters((prev) => [...prev, char]);
  }, []);

  const updateCharacter = useCallback((char: Character) => {
    setCharacters((prev) => prev.map((c) => (c.id === char.id ? char : c)));
  }, []);

  const deleteCharacter = useCallback((id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const toggleLockCharacter = useCallback((id: string) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isLocked: !c.isLocked } : c))
    );
  }, []);

  // History push for undo/redo
  const pushHistory = useCallback((proj: DramaProject) => {
    setHistory((prev) => [...prev.slice(-15), JSON.parse(JSON.stringify(proj))]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0 || !currentProject) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => [...r, JSON.parse(JSON.stringify(currentProject))]);
    setHistory((h) => h.slice(0, -1));
    updateProject(prev);
    if (editingClip) {
      // Refresh editing clip from restored project
      for (const ep of prev.episodes) {
        const found = ep.clips.find((c) => c.id === editingClip.id);
        if (found) {
          setEditingClip(found);
          break;
        }
      }
    }
  }, [history, currentProject, editingClip, updateProject]);

  const redo = useCallback(() => {
    if (redoStack.length === 0 || !currentProject) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((h) => [...h, JSON.parse(JSON.stringify(currentProject))]);
    setRedoStack((r) => r.slice(0, -1));
    updateProject(next);
  }, [redoStack, currentProject, updateProject]);

  // Update a single clip in project
  const updateClipInProject = useCallback(
    (clip: Clip) => {
      if (!currentProject) return;
      pushHistory(currentProject);

      const updatedEpisodes = currentProject.episodes.map((ep) => {
        if (ep.episodeNumber !== clip.episodeNumber) return ep;
        const updatedClips = ep.clips.map((c) => (c.id === clip.id ? clip : c));
        return { ...ep, clips: updatedClips };
      });

      const updatedProject = {
        ...currentProject,
        episodes: updatedEpisodes,
        updatedAt: Date.now(),
      };

      updateProject(updatedProject);
      setEditingClip(clip);
    },
    [currentProject, pushHistory, updateProject]
  );

  // Reorder clips within an episode
  const reorderClips = useCallback(
    (episodeNumber: number, fromIndex: number, toIndex: number) => {
      if (!currentProject) return;
      pushHistory(currentProject);

      const targetEp = currentProject.episodes.find((e) => e.episodeNumber === episodeNumber);
      if (!targetEp) return;

      const newClips = [...targetEp.clips];
      const [moved] = newClips.splice(fromIndex, 1);
      newClips.splice(toIndex, 0, moved);

      // Re-assign clip numbers to maintain strict 1..5 sequence
      const renumberedClips = newClips.map((c, idx) => ({
        ...c,
        clipNumber: idx + 1,
        customFilename: getDefaultClipFilename(episodeNumber, idx + 1),
      }));

      const updatedEpisodes = currentProject.episodes.map((ep) =>
        ep.episodeNumber === episodeNumber ? { ...ep, clips: renumberedClips } : ep
      );

      const updatedProject = {
        ...currentProject,
        episodes: updatedEpisodes,
        updatedAt: Date.now(),
      };
      updateProject(updatedProject);
    },
    [currentProject, pushHistory, updateProject]
  );

  // Rename a clip
  const renameClip = useCallback(
    (clipId: string, newFilename: string) => {
      if (!currentProject) return;
      const cleanFilename = newFilename.endsWith('.mp4') ? newFilename : `${newFilename}.mp4`;
      const updatedEpisodes = currentProject.episodes.map((ep) => ({
        ...ep,
        clips: ep.clips.map((c) => (c.id === clipId ? { ...c, customFilename: cleanFilename } : c)),
      }));
      updateProject({ ...currentProject, episodes: updatedEpisodes, updatedAt: Date.now() });
    },
    [currentProject, updateProject]
  );

  // Rename an episode combined file
  const renameEpisode = useCallback(
    (episodeNumber: number, newFilename: string) => {
      if (!currentProject) return;
      const cleanFilename = newFilename.endsWith('.mp4') ? newFilename : `${newFilename}.mp4`;
      const updatedEpisodes = currentProject.episodes.map((ep) =>
        ep.episodeNumber === episodeNumber ? { ...ep, combinedFilename: cleanFilename } : ep
      );
      updateProject({ ...currentProject, episodes: updatedEpisodes, updatedAt: Date.now() });
    },
    [currentProject, updateProject]
  );

  // Mark episode as combined
  const markEpisodeCombined = useCallback(
    (episodeNumber: number, videoUrl: string, filename: string) => {
      if (!currentProject) return;
      const updatedEpisodes = currentProject.episodes.map((ep) =>
        ep.episodeNumber === episodeNumber
          ? {
              ...ep,
              isCombined: true,
              combinedVideoUrl: videoUrl,
              combinedFilename: filename,
              combinedAt: Date.now(),
            }
          : ep
      );
      updateProject({ ...currentProject, episodes: updatedEpisodes, updatedAt: Date.now() });
    },
    [currentProject, updateProject]
  );

  // Direct download clip
  const downloadClipVideo = useCallback((clip: Clip) => {
    soundFx.playDramaticBoom(0.3);
    const link = document.createElement('a');
    link.href = clip.outputVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    link.download = clip.customFilename || getDefaultClipFilename(clip.episodeNumber, clip.clipNumber);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Direct download combined episode
  const downloadEpisodeVideo = useCallback((episode: Episode) => {
    soundFx.playDramaticBoom(0.4);
    const link = document.createElement('a');
    link.href = episode.combinedVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    link.download = episode.combinedFilename || getDefaultEpisodeFilename(episode.episodeNumber);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Queue actions: Enqueue entire project (all 40 episodes x 5 clips sequentially)
  const enqueueEntireProject = useCallback(
    (projectId: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) return;

      const newJobs: QueueJob[] = [];
      // Strictly in order: Ep1 Clip1..5 -> Ep2 Clip1..5 -> ... -> Ep40 Clip1..5
      proj.episodes.forEach((ep) => {
        ep.clips.forEach((clip) => {
          if (clip.generationStatus !== 'completed') {
            newJobs.push({
              jobId: `job_${proj.id}_ep${ep.episodeNumber}_clip${clip.clipNumber}_${Date.now()}`,
              projectId: proj.id,
              episodeNumber: ep.episodeNumber,
              clipNumber: clip.clipNumber,
              clipId: clip.id,
              prompt: clip.prompt,
              selectedModel: clip.selectedModel,
              status: 'queued',
              progressPercent: 0,
              retryCount: clip.retryCount || 0,
            });
          }
        });
      });

      setQueue(newJobs);
      setIsQueueRunning(true);
      setIsQueuePaused(false);
    },
    [projects]
  );

  // Enqueue a single episode (all 5 clips)
  const enqueueEpisode = useCallback(
    (projectId: string, episodeNumber: number) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) return;
      const targetEp = proj.episodes.find((e) => e.episodeNumber === episodeNumber);
      if (!targetEp) return;

      const newJobs: QueueJob[] = targetEp.clips.map((clip) => ({
        jobId: `job_${proj.id}_ep${episodeNumber}_clip${clip.clipNumber}_${Date.now()}`,
        projectId: proj.id,
        episodeNumber,
        clipNumber: clip.clipNumber,
        clipId: clip.id,
        prompt: clip.prompt,
        selectedModel: clip.selectedModel,
        status: 'queued',
        progressPercent: 0,
        retryCount: clip.retryCount || 0,
      }));

      // Add to queue avoiding duplicates
      setQueue((prev) => {
        const filtered = prev.filter((j) => j.episodeNumber !== episodeNumber);
        return [...filtered, ...newJobs];
      });
      setIsQueueRunning(true);
      setIsQueuePaused(false);
    },
    [projects]
  );

  // Retry a single clip
  const retryClip = useCallback(
    (episodeNumber: number, clipNumber: number) => {
      if (!currentProject) return;
      const ep = currentProject.episodes.find((e) => e.episodeNumber === episodeNumber);
      const clip = ep?.clips.find((c) => c.clipNumber === clipNumber);
      if (!clip) return;

      const job: QueueJob = {
        jobId: `retry_${currentProject.id}_ep${episodeNumber}_clip${clipNumber}_${Date.now()}`,
        projectId: currentProject.id,
        episodeNumber,
        clipNumber,
        clipId: clip.id,
        prompt: clip.prompt,
        selectedModel: clip.selectedModel,
        status: 'queued',
        progressPercent: 0,
        retryCount: (clip.retryCount || 0) + 1,
      };

      setQueue((prev) => [job, ...prev]);
      setIsQueueRunning(true);
      setIsQueuePaused(false);
    },
    [currentProject]
  );

  // Retry all failed
  const retryAllFailed = useCallback(() => {
    setQueue((prev) =>
      prev.map((j) => (j.status === 'failed' ? { ...j, status: 'queued', progressPercent: 0 } : j))
    );
    setIsQueueRunning(true);
    setIsQueuePaused(false);
  }, []);

  const pauseQueue = useCallback(() => {
    setIsQueuePaused(true);
  }, []);

  const resumeQueue = useCallback(() => {
    setIsQueuePaused(false);
  }, []);

  const stopQueue = useCallback(() => {
    setIsQueueRunning(false);
    setIsQueuePaused(false);
  }, []);

  const startQueue = useCallback(() => {
    if (queue.length > 0) {
      setIsQueueRunning(true);
      setIsQueuePaused(false);
    }
  }, [queue]);

  // Master Sequential Queue Processing Loop
  useEffect(() => {
    if (!isQueueRunning || isQueuePaused) return;

    let timeoutId: any;
    let isMounted = true;

    async function processNextJob() {
      if (!isQueueRunningRef.current || isQueuePausedRef.current) return;

      const currentQueue = queueRef.current;
      const nextIndex = currentQueue.findIndex((j) => j.status === 'queued');

      if (nextIndex === -1) {
        // Queue finished!
        setIsQueueRunning(false);
        soundFx.playDramaticBoom(0.4);
        return;
      }

      const activeJob = currentQueue[nextIndex];

      // Check spending limit & credit safety
      if (modelArkConfig.usedCredits >= modelArkConfig.spendingLimitCredits) {
        setIsQueuePaused(true);
        alert(
          `Takue Credit Safety Alert: Spending limit of ${modelArkConfig.spendingLimitCredits} credits reached. Queue paused.`
        );
        return;
      }

      // Mark as generating
      setQueue((prev) =>
        prev.map((j, idx) =>
          idx === nextIndex
            ? { ...j, status: 'generating', startedAt: Date.now(), progressPercent: 10 }
            : j
        )
      );

      // Update clip status in project
      if (currentProjectRef.current) {
        const ep = currentProjectRef.current.episodes.find(
          (e) => e.episodeNumber === activeJob.episodeNumber
        );
        const clip = ep?.clips.find((c) => c.clipNumber === activeJob.clipNumber);
        if (clip) {
          updateClipInProject({
            ...clip,
            generationStatus: 'generating',
          });
        }
      }

      try {
        // Collect locked characters & reference images matching the current episode's stage (e.g. Poor vs Rich)
        const lockedChars = characters.filter((c) => c.isLocked);
        const referenceImages: string[] = [];

        // 1. Prioritize active stage reference image for this episode
        lockedChars.forEach((c) => {
          const stage = getCharacterStageForEpisode(c, activeJob.episodeNumber);
          if (stage.url && stage.url.length > 5 && !referenceImages.includes(stage.url)) {
            referenceImages.push(stage.url);
          }
          // Also append remaining stage looks so ModelArk maintains facial consistency across transformations
          if (c.stageLooks) {
            c.stageLooks.forEach((look) => {
              if (look.url && look.url.length > 5 && !referenceImages.includes(look.url)) {
                referenceImages.push(look.url);
              }
            });
          }
          if (c.referenceImages) {
            c.referenceImages.forEach((img) => {
              if (img && img.length > 5 && !referenceImages.includes(img)) {
                referenceImages.push(img);
              }
            });
          }
        });

        const characterDetails = lockedChars.length > 0
          ? lockedChars
              .map((c) => {
                const stage = getCharacterStageForEpisode(c, activeJob.episodeNumber);
                const genderLabel =
                  c.gender === 'female'
                    ? 'STRICT FEMALE (Woman / Girl, feminine facial traits - STRICTLY NOT A MAN)'
                    : c.gender === 'male'
                    ? 'MALE (Man / Boy)'
                    : 'CHARACTER';
                return `${genderLabel}: ${c.name} (${c.role}), Base Facial Traits: ${c.visualTraits}. [EPISODE ${activeJob.episodeNumber} CURRENT STAGE: "${stage.label.toUpperCase()}" (Ep ${stage.fromEpisode}-${stage.toEpisode}) | Appearance & Wardrobe: ${stage.description || c.clothingDetails}. Reference Photo matches this character in this stage. Maintain exact facial features across stages.]`;
              })
              .join(' | ')
          : undefined;

        // Submit generation to ModelArk
        const genRes = await ModelArkService.generateClip({
          projectId: activeJob.projectId,
          episodeNumber: activeJob.episodeNumber,
          clipNumber: activeJob.clipNumber,
          totalEpisodes: currentProjectRef.current?.totalEpisodes || 40,
          totalClipsInEpisode: currentProjectRef.current?.clipsPerEpisode || 5,
          selectedModel: activeJob.selectedModel,
          prompt: activeJob.prompt,
          characterDetails,
          referenceImages,
          durationSeconds: 12,
          forceSimulation: modelArkConfig.forceSimulation,
        });

        // Track credits
        setModelArkConfig((prev) => ({
          ...prev,
          usedCredits: prev.usedCredits + 5,
        }));

        // Poll for completion
        let isDone = false;
        let pollCount = 0;
        const maxPolls = 20;

        while (!isDone && pollCount < maxPolls && isMounted) {
          if (!isQueueRunningRef.current) break;
          await new Promise((r) => setTimeout(r, 1200));
          pollCount++;

          // Simulated or real progress increment
          setQueue((prev) =>
            prev.map((j) =>
              j.jobId === activeJob.jobId
                ? {
                    ...j,
                    progressPercent: Math.min(20 + pollCount * 8, 95),
                  }
                : j
            )
          );

          try {
            const polled = await ModelArkService.pollJob(genRes.jobId);
            if (polled.generationStatus === 'completed') {
              isDone = true;

              // Job completed successfully! Advance queue to next clip
              setQueue((prev) =>
                prev.map((j) =>
                  j.jobId === activeJob.jobId
                    ? {
                        ...j,
                        status: 'completed',
                        progressPercent: 100,
                      }
                    : j
                )
              );

              // Update project clip with output video URL and completed status
              if (currentProjectRef.current) {
                const ep = currentProjectRef.current.episodes.find(
                  (e) => e.episodeNumber === activeJob.episodeNumber
                );
                const clip = ep?.clips.find((c) => c.clipNumber === activeJob.clipNumber);
                if (clip) {
                  updateClipInProject({
                    ...clip,
                    generationStatus: 'completed',
                    outputVideoUrl: polled.outputVideoUrl,
                    completedAt: Date.now(),
                  });
                }
              }

              soundFx.playWhoosh(0.2);
              break;
            } else if (polled.generationStatus === 'failed') {
              throw new Error(polled.error || 'ModelArk task failed');
            }
          } catch (e: any) {
            if (pollCount >= maxPolls) {
              throw e;
            }
          }
        }
      } catch (err: any) {
        // Mark failed
        const canRetry = (activeJob.retryCount || 0) < modelArkConfig.maxRetries;
        setQueue((prev) =>
          prev.map((j) =>
            j.jobId === activeJob.jobId
              ? {
                  ...j,
                  status: 'failed',
                  error: err.message || 'Generation error',
                  retryCount: (j.retryCount || 0) + 1,
                }
              : j
          )
        );

        if (currentProjectRef.current) {
          const ep = currentProjectRef.current.episodes.find(
            (e) => e.episodeNumber === activeJob.episodeNumber
          );
          const clip = ep?.clips.find((c) => c.clipNumber === activeJob.clipNumber);
          if (clip) {
            updateClipInProject({
              ...clip,
              generationStatus: 'failed',
              error: err.message,
              retryCount: (clip.retryCount || 0) + 1,
            });
          }
        }
      }

      // Automatically trigger next job sequentially
      if (isMounted && isQueueRunningRef.current && !isQueuePausedRef.current) {
        timeoutId = setTimeout(processNextJob, 400);
      }
    }

    processNextJob();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isQueueRunning, isQueuePaused]);

  // Create new drama project
  const createNewProject = async (params: {
    title?: string;
    storyPrompt: string;
    masterPrompt?: string;
    isMasterPromptLocked?: boolean;
    totalEpisodes: number;
    clipsPerEpisode: number;
    selectedModel: string;
    tone?: string;
    characters?: Character[];
  }): Promise<DramaProject> => {
    // Generate breakdown from backend
    const splitResult = await ModelArkService.splitStory({
      storyText: params.storyPrompt,
      totalEpisodes: params.totalEpisodes,
      clipsPerEpisode: params.clipsPerEpisode,
      selectedModel: params.selectedModel,
      tone: params.tone || 'Cinematic Microdrama',
    });

    const masterPromptText = params.masterPrompt !== undefined ? params.masterPrompt : DEFAULT_MASTER_PROMPT;
    const isMasterPromptLocked = params.isMasterPromptLocked ?? true;

    // Gather locked characters to guarantee visual continuity across all 40 episodes
    const projectChars = params.characters && params.characters.length > 0 ? params.characters : characters;
    const lockedChars = projectChars.filter((c) => c.isLocked);
    const projectId = `proj_${Date.now()}`;

    const newEpisodes: Episode[] = splitResult.episodes.map((epData: any) => {
      const epNum = epData.episode_number;

      // Ground characters into their active life stage (e.g. Poor in Ep 1-20, Rich in Ep 21-40)
      const episodeStageContinuity = lockedChars.length > 0
        ? `Character Continuity: ${lockedChars.map((c) => {
            const stage = getCharacterStageForEpisode(c, epNum);
            const genderPrefix = c.gender === 'female'
              ? 'FEMALE (Woman / Girl, strictly female presentation - NOT A MAN)'
              : c.gender === 'male'
              ? 'MALE (Man / Boy)'
              : 'CHARACTER';
            return `[${genderPrefix} ${c.role}: "${c.name}" in ${stage.label.toUpperCase()} (Ep ${stage.fromEpisode}-${stage.toEpisode}) - Face: ${c.visualTraits}, Status & Wardrobe: ${stage.description || c.clothingDetails}]`;
          }).join('; ')}.`
        : '';

      const clips: Clip[] = (epData.clips || []).map((cData: any) => {
        const rawPrompt = cData.visual_prompt || `Vertical 9:16 cinematic scene for Episode ${epNum} Clip ${cData.clip_number}`;
        
        // Assemble final prompt: Master Prompt (global direction) + Scene prompt + Locked Characters with current stage
        const promptSections: string[] = [];
        if (masterPromptText && masterPromptText.trim()) {
          promptSections.push(`[MASTER PROMPT: ${masterPromptText.trim()}]`);
        }
        promptSections.push(rawPrompt);
        if (episodeStageContinuity) {
          promptSections.push(`[${episodeStageContinuity}]`);
        }
        const finalPrompt = promptSections.join(' | ');

        return {
          id: `clip_${projectId}_ep${epNum}_c${cData.clip_number}`,
          projectId,
          episodeNumber: epNum,
          clipNumber: cData.clip_number,
          totalEpisodes: params.totalEpisodes,
          totalClipsInEpisode: params.clipsPerEpisode,
          sceneType: cData.scene_type || `Scene ${cData.clip_number}`,
          prompt: finalPrompt,
          selectedModel: params.selectedModel,
          generationStatus: 'queued',
          customFilename: getDefaultClipFilename(epNum, cData.clip_number),
          durationSeconds: 12,
          retryCount: 0,
          createdAt: Date.now(),
          trimStart: 0,
          trimEnd: 12,
          volume: 1,
          characterIds: lockedChars.map((c) => c.id),
        };
      });

      return {
        episodeNumber: epNum,
        title: epData.title || `Episode ${epNum}`,
        summary: epData.summary || `Episode ${epNum} sequence`,
        clips,
      };
    });

    const newProject: DramaProject = {
      id: projectId,
      title: params.title || 'Takue Microdrama Series',
      logline: params.storyPrompt.slice(0, 100),
      storyPrompt: params.storyPrompt,
      masterPrompt: masterPromptText,
      isMasterPromptLocked,
      totalEpisodes: params.totalEpisodes,
      clipsPerEpisode: params.clipsPerEpisode,
      clipDurationSeconds: 12,
      orientation: '9:16',
      selectedModel: params.selectedModel,
      tone: params.tone || 'Cinematic Microdrama',
      episodes: newEpisodes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setProjects((prev) => [newProject, ...prev]);
    setCurrentProject(newProject);
    return newProject;
  };

  const updateMasterPrompt = useCallback((projectId: string, newMasterPrompt: string, isLocked: boolean = true) => {
    const cleanMaster = newMasterPrompt.trim();
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const updatedEpisodes = p.episodes.map((ep) => ({
          ...ep,
          clips: ep.clips.map((c) => {
            if (c.generationStatus === 'completed') return c;
            let newPrompt = c.prompt;
            if (newPrompt.includes('[MASTER PROMPT:')) {
              newPrompt = newPrompt.replace(/\[MASTER PROMPT:[^\]]*\]\s*\|\s*/i, '');
            }
            if (cleanMaster) {
              newPrompt = `[MASTER PROMPT: ${cleanMaster}] | ${newPrompt}`;
            }
            return { ...c, prompt: newPrompt };
          }),
        }));
        return {
          ...p,
          masterPrompt: newMasterPrompt,
          isMasterPromptLocked: isLocked,
          episodes: updatedEpisodes,
          updatedAt: Date.now(),
        };
      })
    );
    setCurrentProject((prev) => {
      if (prev && prev.id === projectId) {
        const updatedEpisodes = prev.episodes.map((ep) => ({
          ...ep,
          clips: ep.clips.map((c) => {
            if (c.generationStatus === 'completed') return c;
            let newPrompt = c.prompt;
            if (newPrompt.includes('[MASTER PROMPT:')) {
              newPrompt = newPrompt.replace(/\[MASTER PROMPT:[^\]]*\]\s*\|\s*/i, '');
            }
            if (cleanMaster) {
              newPrompt = `[MASTER PROMPT: ${cleanMaster}] | ${newPrompt}`;
            }
            return { ...c, prompt: newPrompt };
          }),
        }));
        return {
          ...prev,
          masterPrompt: newMasterPrompt,
          isMasterPromptLocked: isLocked,
          episodes: updatedEpisodes,
          updatedAt: Date.now(),
        };
      }
      return prev;
    });
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setCurrentProject((prev) => (prev?.id === id ? null : prev));
  }, []);

  const updateModelArkConfig = useCallback((updates: Partial<ModelArkConfig>) => {
    setModelArkConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const checkConnection = useCallback(async () => {
    const res = await ModelArkService.testConnection();
    return res;
  }, []);

  return (
    <DramaContext.Provider
      value={{
        activeTab,
        setActiveTab,
        createWizardStep,
        setCreateWizardStep,
        goToHome,
        goToCharacters,
        goToCreate,
        goToProjects,
        goToEditor,
        goToSettings,
        projects,
        currentProject,
        setCurrentProject,
        createNewProject,
        updateMasterPrompt,
        updateProject,
        deleteProject,
        characters,
        addCharacter,
        updateCharacter,
        deleteCharacter,
        toggleLockCharacter,
        queue,
        isQueueRunning,
        isQueuePaused,
        startQueue,
        pauseQueue,
        resumeQueue,
        stopQueue,
        retryClip,
        retryAllFailed,
        enqueueEntireProject,
        enqueueEpisode,
        editingClip,
        setEditingClip,
        updateClipInProject,
        reorderClips,
        undo,
        redo,
        canUndo: history.length > 0,
        canRedo: redoStack.length > 0,
        renameClip,
        renameEpisode,
        downloadClipVideo,
        downloadEpisodeVideo,
        markEpisodeCombined,
        modelArkConfig,
        updateModelArkConfig,
        checkConnection,
        statusInfo,
        lastSavedAt,
        isAutoSaving,
        forceSaveNow,
      }}
    >
      {children}
    </DramaContext.Provider>
  );
};

export function useDrama() {
  const context = useContext(DramaContext);
  if (!context) {
    throw new Error('useDrama must be used within a DramaProvider');
  }
  return context;
}

// Initial default 40-episode project generator with pre-populated authoritatively numbered clips
function createInitialDemoProject(): DramaProject {
  const projectId = 'proj_microdrama_studio_40ep';
  const totalEpisodes = 40;
  const clipsPerEpisode = 5;

  const episodes: Episode[] = [];

  for (let ep = 1; ep <= totalEpisodes; ep++) {
    const clips: Clip[] = [];
    const isFirstEpisode = ep === 1;

    for (let cl = 1; cl <= clipsPerEpisode; cl++) {
      let sceneType = 'Establishing Shot';
      let prompt = '';

      if (cl === 1) {
        sceneType = 'Establishing Shot';
        prompt = `Vertical 9:16 cinematic microdrama. High-angle slow push into a rain-slicked penthouse balcony overlooking a glowing metropolis. Anamorphic lens flare, Seedance photorealistic lighting.`;
      } else if (cl === 2) {
        sceneType = 'Confrontation';
        prompt = `Vertical 9:16 dramatic scene. Tense confrontation across an executive boardroom table. Shifting eye contact, volumetric fog, dramatic depth of field.`;
      } else if (cl === 3) {
        sceneType = 'Reaction';
        prompt = `Vertical 9:16 high-stakes drama. Extreme close-up on emotional expression as classified documents hit the glass table. 8k hyper-detailed texture, dramatic shadow.`;
      } else if (cl === 4) {
        sceneType = 'Escalation';
        prompt = `Vertical 9:16 action escalation. High velocity motion, emergency blue beacon lights pulsing across the room, electric tension.`;
      } else {
        sceneType = 'Cliffhanger';
        prompt = `Vertical 9:16 episode cliffhanger. Sudden shadow engulfs the frame as a secret seal is revealed under flickering lights. Shock freeze frame.`;
      }

      clips.push({
        id: `clip_${projectId}_ep${ep}_c${cl}`,
        projectId,
        episodeNumber: ep,
        clipNumber: cl,
        totalEpisodes,
        totalClipsInEpisode: clipsPerEpisode,
        sceneType,
        prompt,
        selectedModel: 'seedance-1-5-pro-251215',
        // Make Episode 1 completed so user can immediately test combine & download!
        generationStatus: isFirstEpisode ? 'completed' : 'queued',
        outputVideoUrl: isFirstEpisode
          ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
          : undefined,
        customFilename: getDefaultClipFilename(ep, cl),
        durationSeconds: 12,
        retryCount: 0,
        createdAt: Date.now() - 3600000,
        completedAt: isFirstEpisode ? Date.now() - 1800000 : undefined,
        trimStart: 0,
        trimEnd: 12,
        volume: 1,
      });
    }

    episodes.push({
      episodeNumber: ep,
      title: `Episode ${ep}`,
      summary: `Episode ${ep} sequence: 5 sequential scenes encoded for 9:16 vertical drama.`,
      clips,
      isCombined: false,
    });
  }

  return {
    id: projectId,
    title: 'Takue Microdrama Series',
    logline: 'Vertical 9:16 Microdrama Studio • 40 Episodes • 5 Clips Each',
    storyPrompt: 'A fast-paced dramatic sequence across 40 episodes with cliffhangers, confrontations, and cinematic visual pacing.',
    masterPrompt: DEFAULT_MASTER_PROMPT,
    isMasterPromptLocked: true,
    totalEpisodes,
    clipsPerEpisode,
    clipDurationSeconds: 12,
    orientation: '9:16',
    selectedModel: 'seedance-1-5-pro-251215',
    tone: 'Cinematic Microdrama',
    episodes,
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now(),
  };
}
