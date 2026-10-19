import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import {
  DramaProject,
  Episode,
  Clip,
  Character,
  QueueJob,
  ModelArkConfig,
  GenerationStatus,
  ActiveTabType,
  EpisodeFolder,
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

  // Episodes & Series Folder Organization
  deleteEpisode: (projectId: string, episodeNumber: number) => void;
  deleteEpisodes: (projectId: string, episodeNumbers: number[]) => void;
  addEpisode: (projectId: string, folderId?: string) => Episode;
  createFolder: (projectId: string, name: string, color?: string, description?: string) => EpisodeFolder;
  renameFolder: (projectId: string, folderId: string, newName: string) => void;
  deleteFolder: (projectId: string, folderId: string) => void;
  moveEpisodeToFolder: (projectId: string, episodeNumber: number, folderId?: string) => void;
  moveEpisodesToFolder: (projectId: string, episodeNumbers: number[], folderId?: string) => void;
  exportFolderZip: (projectId: string, folderId?: string) => Promise<void>;

  // Settings & ModelArk
  modelArkConfig: ModelArkConfig;
  updateModelArkConfig: (updates: Partial<ModelArkConfig>) => void;
  checkConnection: () => Promise<any>;
  statusInfo: ModelArkStatusResponse | null;
  // Auto-Save & Backup
  lastSavedAt: number | null;
  isAutoSaving: boolean;
  forceSaveNow: () => Promise<void>;
  exportBackupJson: () => void;
  importBackupJson: (jsonString: string) => boolean;

  // Scene Lifestyle Looks
  setClipCharacterLook: (episodeNumber: number, clipNumber: number, characterId: string, lookId: string) => void;
}

const DramaContext = createContext<DramaContextType | null>(null);

const STORAGE_KEYS_PROJECTS = [
  'takue_microdrama_projects_v6',
  'takue_microdrama_projects_v5',
  'takue_microdrama_projects_v4',
  'takue_microdrama_projects_v3',
  'takue_microdrama_projects',
  'microdrama_projects',
];

const STORAGE_KEYS_CHARS = [
  'takue_microdrama_characters_v6',
  'takue_microdrama_characters_v5',
  'takue_microdrama_characters_v4',
  'takue_microdrama_characters_v3',
  'takue_microdrama_characters',
  'microdrama_characters',
];

const STORAGE_KEYS_CONFIG = [
  'takue_microdrama_config_v6',
  'takue_microdrama_config_v5',
  'takue_microdrama_config',
];

export const getCharacterLookForClip = (
  char: Character,
  clip?: { characterStageOverrides?: Record<string, string>; episodeNumber?: number }
): { id: string; label: string; description: string; url: string; lifestyleTag?: string } => {
  const lookOverrideId = clip?.characterStageOverrides?.[char.id];

  if (char.stageLooks && char.stageLooks.length > 0) {
    const validLooks = char.stageLooks.filter((l) => Boolean(l.url && l.url.trim()));
    if (validLooks.length > 0) {
      // 1. If clip has a specific lifestyle look selected for this character
      if (lookOverrideId) {
        const found = validLooks.find((l) => l.id === lookOverrideId);
        if (found) {
          return {
            id: found.id,
            label: found.label || 'Selected Scene Look',
            description: found.description || char.clothingDetails || char.visualTraits,
            url: found.url,
            lifestyleTag: found.lifestyleTag,
          };
        }
      }

      // 2. If look has specific optional episode range
      if (clip?.episodeNumber) {
        const matched = validLooks.find((l) => {
          if (!l.fromEpisode || !l.toEpisode) return false;
          return clip.episodeNumber! >= l.fromEpisode && clip.episodeNumber! <= l.toEpisode;
        });
        if (matched) {
          return {
            id: matched.id,
            label: matched.label,
            description: matched.description || char.clothingDetails,
            url: matched.url,
            lifestyleTag: matched.lifestyleTag,
          };
        }
      }

      // 3. Default to primary look
      const primary = validLooks[0];
      return {
        id: primary.id,
        label: primary.label || 'Primary Look',
        description: primary.description || char.clothingDetails,
        url: primary.url,
        lifestyleTag: primary.lifestyleTag,
      };
    }
  }

  // Fallback to primary character photo
  return {
    id: 'primary',
    label: 'Primary Appearance',
    description: char.clothingDetails || 'Signature wardrobe and visual styling',
    url: char.referenceImageUrl,
  };
};

export const getCharacterStageForEpisode = (
  char: Character,
  episodeNumber: number
): { id: string; label: string; description: string; url: string; fromEpisode?: number; toEpisode?: number } => {
  const look = getCharacterLookForClip(char, { episodeNumber });
  return {
    ...look,
    fromEpisode: 1,
    toEpisode: 40,
  };
};

// Helper: Sanitize projects to purge any legacy placeholder sample URLs and ensure proper rendering status
function sanitizeProjects(projs: DramaProject[]): DramaProject[] {
  if (!Array.isArray(projs)) return [];
  return projs.map((p) => ({
    ...p,
    folders: Array.isArray(p.folders) ? p.folders : [],
    episodes: (p.episodes || []).map((ep) => ({
      ...ep,
      folderId: ep.folderId || undefined,
      folderName: ep.folderName || undefined,
      combinedVideoUrl:
        ep.combinedVideoUrl &&
        (ep.combinedVideoUrl.includes('gtv-videos-bucket') || ep.combinedVideoUrl.includes('ForBiggerBlazes'))
          ? undefined
          : ep.combinedVideoUrl,
      clips: (ep.clips || []).map((clip) => {
        const isPlaceholder =
          clip.outputVideoUrl &&
          (clip.outputVideoUrl.includes('gtv-videos-bucket') || clip.outputVideoUrl.includes('ForBiggerBlazes'));
        const outputVideoUrl = isPlaceholder ? undefined : clip.outputVideoUrl;
        const generationStatus: GenerationStatus =
          clip.generationStatus === 'completed' && !outputVideoUrl
            ? 'rendering'
            : clip.generationStatus;
        return {
          ...clip,
          outputVideoUrl,
          generationStatus,
        };
      }),
    })),
  }));
}

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

  // Load or initialize characters across any storage version or session
  const [characters, setCharacters] = useState<Character[]>(() => {
    for (const key of STORAGE_KEYS_CHARS) {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_CHARACTERS;
  });

  // Settings config
  const [modelArkConfig, setModelArkConfig] = useState<ModelArkConfig>(() => {
    for (const key of STORAGE_KEYS_CONFIG) {
      try {
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
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

  // Projects list across any storage version or session (cleansed of broken placeholder URLs)
  const [projects, setProjects] = useState<DramaProject[]>(() => {
    for (const key of STORAGE_KEYS_PROJECTS) {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return sanitizeProjects(parsed);
        }
      } catch (e) {}
    }
    // Seed initial demo project with 40 episodes and 5 clips each!
    return sanitizeProjects([createInitialDemoProject()]);
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

  // Batch generation ref: batches 5 clips at a time (1 episode per batch) to prevent network timeouts
  const batchGenerationRef = useRef<{ isBatchMode: boolean; projectId: string | null }>({
    isBatchMode: false,
    projectId: null,
  });

  // Ref to always access current queue state in async loop
  const queueRef = useRef<QueueJob[]>(queue);
  queueRef.current = queue;

  const projectsRef = useRef<DramaProject[]>(projects);
  projectsRef.current = projects;

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
            const sanitized = sanitizeProjects(serverState.projects);
            setProjects(sanitized);
            if (serverState.currentProjectId) {
              const matched = sanitized.find((p: any) => p.id === serverState.currentProjectId);
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
      localStorage.setItem('takue_microdrama_projects_v6', JSON.stringify(projects));
      localStorage.setItem('takue_microdrama_projects', JSON.stringify(projects));
    } catch (e) {}
    try {
      localStorage.setItem('takue_microdrama_characters_v6', JSON.stringify(characters));
      localStorage.setItem('takue_microdrama_characters', JSON.stringify(characters));
    } catch (e) {}
    try {
      localStorage.setItem('takue_microdrama_config_v6', JSON.stringify(modelArkConfig));
      localStorage.setItem('takue_microdrama_config', JSON.stringify(modelArkConfig));
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
      localStorage.setItem('takue_microdrama_projects_v6', JSON.stringify(projects));
      localStorage.setItem('takue_microdrama_projects', JSON.stringify(projects));
      localStorage.setItem('takue_microdrama_characters_v6', JSON.stringify(characters));
      localStorage.setItem('takue_microdrama_characters', JSON.stringify(characters));
      localStorage.setItem('takue_microdrama_config_v6', JSON.stringify(modelArkConfig));
      localStorage.setItem('takue_microdrama_config', JSON.stringify(modelArkConfig));
    } catch (e) {}
    await persistStateToServer(projects, characters, modelArkConfig, currentProject?.id);
  }, [projects, characters, modelArkConfig, currentProject?.id, persistStateToServer]);

  // Export full studio backup JSON file
  const exportBackupJson = useCallback(() => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      projects,
      characters,
      currentProjectId: currentProjectRef.current?.id,
      modelArkConfig,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Takue_Microdrama_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [projects, characters, modelArkConfig]);

  // Import studio backup JSON file
  const importBackupJson = useCallback(
    (jsonString: string): boolean => {
      try {
        const parsed = JSON.parse(jsonString);
        if (parsed.characters && Array.isArray(parsed.characters)) {
          setCharacters(parsed.characters);
        }
        if (parsed.projects && Array.isArray(parsed.projects)) {
          setProjects(parsed.projects);
          if (parsed.currentProjectId) {
            const found = parsed.projects.find((p: any) => p.id === parsed.currentProjectId);
            if (found) setCurrentProject(found);
            else setCurrentProject(parsed.projects[0] || null);
          } else {
            setCurrentProject(parsed.projects[0] || null);
          }
        }
        if (parsed.modelArkConfig) {
          setModelArkConfig((prev) => ({ ...prev, ...parsed.modelArkConfig }));
        }
        forceSaveNow();
        return true;
      } catch (e) {
        console.error('Import backup failed:', e);
        return false;
      }
    },
    [forceSaveNow]
  );

  // Set scene look for a specific character in a specific clip
  const setClipCharacterLook = useCallback(
    (episodeNumber: number, clipNumber: number, characterId: string, lookId: string) => {
      if (!currentProjectRef.current) return;
      const targetEp = currentProjectRef.current.episodes.find((e) => e.episodeNumber === episodeNumber);
      const targetClip = targetEp?.clips.find((c) => c.clipNumber === clipNumber);
      if (!targetClip) return;

      const overrides = { ...(targetClip.characterStageOverrides || {}), [characterId]: lookId };
      const char = characters.find((c) => c.id === characterId);

      let updatedPrompt = targetClip.prompt;
      if (char) {
        const look = getCharacterLookForClip(char, { characterStageOverrides: overrides, episodeNumber });
        const lookTag = `[SCENE LOOK: ${char.name} in ${look.label} (${look.lifestyleTag || 'Style'}) - ${look.description || char.clothingDetails}]`;
        if (updatedPrompt.includes(`[SCENE LOOK: ${char.name}`)) {
          updatedPrompt = updatedPrompt.replace(new RegExp(`\\[SCENE LOOK: ${char.name}[^\\]]*\\]`, 'g'), lookTag);
        } else {
          updatedPrompt = `${updatedPrompt} | ${lookTag}`;
        }
      }

      const updatedClip: Clip = {
        ...targetClip,
        characterStageOverrides: overrides,
        prompt: updatedPrompt,
      };

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== currentProjectRef.current?.id) return p;
          return {
            ...p,
            episodes: p.episodes.map((ep) => {
              if (ep.episodeNumber !== episodeNumber) return ep;
              return {
                ...ep,
                clips: ep.clips.map((c) => (c.clipNumber === clipNumber ? updatedClip : c)),
              };
            }),
            updatedAt: Date.now(),
          };
        })
      );

      if (currentProjectRef.current) {
        setCurrentProject((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            episodes: prev.episodes.map((ep) => {
              if (ep.episodeNumber !== episodeNumber) return ep;
              return {
                ...ep,
                clips: ep.clips.map((c) => (c.clipNumber === clipNumber ? updatedClip : c)),
              };
            }),
            updatedAt: Date.now(),
          };
        });
      }
    },
    [characters]
  );

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

  // Delete a single unwanted episode
  const deleteEpisode = useCallback(
    (projectId: string, episodeNumber: number) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) return;
      pushHistory(proj);

      // Remove jobs for this episode from the queue
      setQueue((prev) => prev.filter((j) => !(j.projectId === projectId && j.episodeNumber === episodeNumber)));

      const updatedEpisodes = proj.episodes.filter((e) => e.episodeNumber !== episodeNumber);

      const updatedProject: DramaProject = {
        ...proj,
        episodes: updatedEpisodes,
        totalEpisodes: updatedEpisodes.length,
        updatedAt: Date.now(),
      };

      updateProject(updatedProject);
      soundFx.playPaperRustle(0.3);
    },
    [projects, pushHistory, updateProject]
  );

  // Batch delete multiple unwanted episodes
  const deleteEpisodes = useCallback(
    (projectId: string, episodeNumbers: number[]) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj || episodeNumbers.length === 0) return;
      pushHistory(proj);

      const numSet = new Set(episodeNumbers);
      setQueue((prev) => prev.filter((j) => !(j.projectId === projectId && numSet.has(j.episodeNumber))));

      const updatedEpisodes = proj.episodes.filter((e) => !numSet.has(e.episodeNumber));

      const updatedProject: DramaProject = {
        ...proj,
        episodes: updatedEpisodes,
        totalEpisodes: updatedEpisodes.length,
        updatedAt: Date.now(),
      };

      updateProject(updatedProject);
      soundFx.playPaperRustle(0.4);
    },
    [projects, pushHistory, updateProject]
  );

  // Add a new episode
  const addEpisode = useCallback(
    (projectId: string, folderId?: string): Episode => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) throw new Error('Project not found');
      pushHistory(proj);

      const existingNumbers = proj.episodes.map((e) => e.episodeNumber);
      const nextEpNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const targetFolder = proj.folders?.find((f) => f.id === folderId);

      const sceneTypes = [
        { type: 'Establishing Shot', camera: 'Slow cinematic push-in, vertical 9:16 framing, volumetric lighting' },
        { type: 'Confrontation', camera: 'Tense medium shot, sharp eye-line focus, dramatic shadows, key lighting' },
        { type: 'Reaction', camera: 'Extreme close-up on emotional shift, micro-expressions, 8k cinematic skin texture' },
        { type: 'Escalation', camera: 'Dynamic tracking camera, sudden action, sharp reflections, high velocity tension' },
        { type: 'Cliffhanger', camera: 'Rapid zoom cut, sudden dramatic reveal, freeze-frame tension, cliffhanger beat' },
      ];

      const clips: Clip[] = [];
      for (let cl = 1; cl <= (proj.clipsPerEpisode || 5); cl++) {
        const scene = sceneTypes[(cl - 1) % sceneTypes.length];
        const rawPrompt = `Vertical 9:16 cinematic microdrama. Episode ${nextEpNumber} — Scene ${cl} (${scene.type}). ${scene.camera}. Photorealistic lighting, Seedance cinematic style, 24fps motion blur.`;
        clips.push({
          id: `clip_${projectId}_ep${nextEpNumber}_c${cl}`,
          projectId,
          episodeNumber: nextEpNumber,
          clipNumber: cl,
          totalEpisodes: proj.episodes.length + 1,
          totalClipsInEpisode: proj.clipsPerEpisode || 5,
          sceneType: scene.type,
          prompt: rawPrompt,
          selectedModel: proj.selectedModel,
          generationStatus: 'queued',
          customFilename: getDefaultClipFilename(nextEpNumber, cl),
          durationSeconds: 12,
          retryCount: 0,
          createdAt: Date.now(),
          trimStart: 0,
          trimEnd: 12,
          volume: 1,
        });
      }

      const newEp: Episode = {
        episodeNumber: nextEpNumber,
        title: `Episode ${nextEpNumber}`,
        summary: `Episode ${nextEpNumber} sequence in ${targetFolder ? targetFolder.name : 'Main Series'}.`,
        clips,
        isCombined: false,
        folderId: targetFolder ? targetFolder.id : undefined,
        folderName: targetFolder ? targetFolder.name : undefined,
      };

      const updatedProject: DramaProject = {
        ...proj,
        episodes: [...proj.episodes, newEp],
        totalEpisodes: proj.episodes.length + 1,
        updatedAt: Date.now(),
      };

      updateProject(updatedProject);
      soundFx.playWhoosh(0.2);
      return newEp;
    },
    [projects, pushHistory, updateProject]
  );

  // Folder creation within series
  const createFolder = useCallback(
    (projectId: string, name: string, color: string = 'blue', description?: string): EpisodeFolder => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) throw new Error('Project not found');
      pushHistory(proj);

      const newFolder: EpisodeFolder = {
        id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: name.trim() || 'New Folder',
        color,
        description: description?.trim(),
        createdAt: Date.now(),
      };

      const existingFolders = proj.folders || [];
      const updatedProject: DramaProject = {
        ...proj,
        folders: [...existingFolders, newFolder],
        updatedAt: Date.now(),
      };

      updateProject(updatedProject);
      soundFx.playWhoosh(0.2);
      return newFolder;
    },
    [projects, pushHistory, updateProject]
  );

  // Rename a folder
  const renameFolder = useCallback(
    (projectId: string, folderId: string, newName: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) return;
      const cleanName = newName.trim();
      if (!cleanName) return;

      const updatedFolders = (proj.folders || []).map((f) =>
        f.id === folderId ? { ...f, name: cleanName } : f
      );

      const updatedEpisodes = proj.episodes.map((ep) =>
        ep.folderId === folderId ? { ...ep, folderName: cleanName } : ep
      );

      const updatedProject: DramaProject = {
        ...proj,
        folders: updatedFolders,
        episodes: updatedEpisodes,
        updatedAt: Date.now(),
      };

      updateProject(updatedProject);
    },
    [projects, updateProject]
  );

  // Delete a folder
  const deleteFolder = useCallback(
    (projectId: string, folderId: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) return;
      pushHistory(proj);

      const updatedFolders = (proj.folders || []).filter((f) => f.id !== folderId);
      const updatedEpisodes = proj.episodes.map((ep) =>
        ep.folderId === folderId ? { ...ep, folderId: undefined, folderName: undefined } : ep
      );

      const updatedProject: DramaProject = {
        ...proj,
        folders: updatedFolders,
        episodes: updatedEpisodes,
        updatedAt: Date.now(),
      };

      updateProject(updatedProject);
      soundFx.playPaperRustle(0.3);
    },
    [projects, pushHistory, updateProject]
  );

  // Move an episode to a folder
  const moveEpisodeToFolder = useCallback(
    (projectId: string, episodeNumber: number, folderId?: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) return;

      const targetFolder = proj.folders?.find((f) => f.id === folderId);
      const updatedEpisodes = proj.episodes.map((ep) =>
        ep.episodeNumber === episodeNumber
          ? {
              ...ep,
              folderId: targetFolder ? targetFolder.id : undefined,
              folderName: targetFolder ? targetFolder.name : undefined,
            }
          : ep
      );

      const updatedProject: DramaProject = {
        ...proj,
        episodes: updatedEpisodes,
        updatedAt: Date.now(),
      };

      updateProject(updatedProject);
      soundFx.playWhoosh(0.15);
    },
    [projects, updateProject]
  );

  // Batch move episodes to a folder
  const moveEpisodesToFolder = useCallback(
    (projectId: string, episodeNumbers: number[], folderId?: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) return;

      const targetFolder = proj.folders?.find((f) => f.id === folderId);
      const numSet = new Set(episodeNumbers);

      const updatedEpisodes = proj.episodes.map((ep) =>
        numSet.has(ep.episodeNumber)
          ? {
              ...ep,
              folderId: targetFolder ? targetFolder.id : undefined,
              folderName: targetFolder ? targetFolder.name : undefined,
            }
          : ep
      );

      const updatedProject: DramaProject = {
        ...proj,
        episodes: updatedEpisodes,
        updatedAt: Date.now(),
      };

      updateProject(updatedProject);
      soundFx.playWhoosh(0.2);
    },
    [projects, updateProject]
  );

  // Export folder as ZIP organized into subdirectories
  const exportFolderZip = useCallback(
    async (projectId: string, folderId?: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) return;

      const zip = new JSZip();
      const folderName = folderId
        ? proj.folders?.find((f) => f.id === folderId)?.name || 'Folder'
        : 'All_Episodes';

      const targetEpisodes = folderId
        ? proj.episodes.filter((e) => e.folderId === folderId)
        : proj.episodes;

      if (targetEpisodes.length === 0) {
        alert('No episodes found in this folder to export.');
        return;
      }

      const rootZipFolder = zip.folder(`${proj.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${folderName.replace(/[^a-zA-Z0-9_-]/g, '_')}`);
      if (!rootZipFolder) return;

      rootZipFolder.file(
        'manifest.json',
        JSON.stringify(
          {
            seriesTitle: proj.title,
            folderName,
            totalEpisodes: targetEpisodes.length,
            exportedAt: new Date().toISOString(),
            episodes: targetEpisodes.map((e) => ({
              episodeNumber: e.episodeNumber,
              title: e.title,
              summary: e.summary,
              folderName: e.folderName || 'General',
              clipsCount: e.clips.length,
              isCombined: e.isCombined,
            })),
          },
          null,
          2
        )
      );

      for (const ep of targetEpisodes) {
        const epFolderName = `Episode_${String(ep.episodeNumber).padStart(2, '0')}_${(ep.title || '').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        const epZip = rootZipFolder.folder(epFolderName);
        if (!epZip) continue;

        epZip.file(
          'episode_metadata.json',
          JSON.stringify(
            {
              episodeNumber: ep.episodeNumber,
              title: ep.title,
              summary: ep.summary,
              folder: ep.folderName || 'General',
              isCombined: ep.isCombined,
              combinedFilename: ep.combinedFilename,
              clips: ep.clips.map((c) => ({
                clipNumber: c.clipNumber,
                sceneType: c.sceneType,
                prompt: c.prompt,
                customFilename: c.customFilename,
                durationSeconds: c.durationSeconds,
                generationStatus: c.generationStatus,
                outputVideoUrl: c.outputVideoUrl,
              })),
            },
            null,
            2
          )
        );

        for (const clip of ep.clips) {
          if (clip.outputVideoUrl && clip.outputVideoUrl.startsWith('http') && !clip.outputVideoUrl.includes('gtv-videos-bucket') && !clip.outputVideoUrl.includes('ForBiggerBlazes')) {
            try {
              const resp = await fetch(clip.outputVideoUrl);
              if (resp.ok) {
                const blob = await resp.blob();
                epZip.file(clip.customFilename, blob);
              }
            } catch (err) {
              epZip.file(`${clip.customFilename}.url.txt`, `Direct URL: ${clip.outputVideoUrl}\nPrompt: ${clip.prompt}`);
            }
          } else {
            epZip.file(`${clip.customFilename}.prompt.txt`, `Scene: ${clip.sceneType}\nDuration: ${clip.durationSeconds}s\nPrompt:\n${clip.prompt}`);
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${proj.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${folderName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Episodes.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      soundFx.playDramaticBoom(0.4);
    },
    [projects]
  );

  // Direct download clip (uses REAL URL from DB, alerts if still rendering)
  const downloadClipVideo = useCallback((clip: Clip) => {
    if (!clip.outputVideoUrl || clip.outputVideoUrl.includes('gtv-videos-bucket') || clip.outputVideoUrl.includes('ForBiggerBlazes') || clip.generationStatus !== 'completed') {
      alert(`Clip ${getDefaultClipFilename(clip.episodeNumber, clip.clipNumber)} is currently rendering on ModelArk. Download will be available as soon as rendering completes.`);
      return;
    }
    soundFx.playDramaticBoom(0.3);
    const link = document.createElement('a');
    link.href = clip.outputVideoUrl;
    link.download = clip.customFilename || getDefaultClipFilename(clip.episodeNumber, clip.clipNumber);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Direct download combined episode (uses REAL URL, alerts if still rendering)
  const downloadEpisodeVideo = useCallback((episode: Episode) => {
    if (!episode.combinedVideoUrl || episode.combinedVideoUrl.includes('gtv-videos-bucket') || episode.combinedVideoUrl.includes('ForBiggerBlazes') || !episode.isCombined) {
      alert(`Episode ${episode.episodeNumber} is still being rendered/combined. Download will be available once rendering completes.`);
      return;
    }
    soundFx.playDramaticBoom(0.4);
    const link = document.createElement('a');
    link.href = episode.combinedVideoUrl;
    link.download = episode.combinedFilename || getDefaultEpisodeFilename(episode.episodeNumber);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Queue actions: Batch generate 5 clips at a time (not 200 at once to avoid timeouts)
  const enqueueEntireProject = useCallback(
    (projectId: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) return;

      // Find first episode with uncompleted clips
      const firstUnfinishedEp =
        proj.episodes.find((ep) => ep.clips.some((c) => c.generationStatus !== 'completed')) ||
        proj.episodes[0];

      if (!firstUnfinishedEp) {
        alert('All episodes in this drama project are already completed!');
        return;
      }

      // Batch generate only this episode (5 clips at a time!)
      const newJobs: QueueJob[] = firstUnfinishedEp.clips.map((clip) => ({
        jobId: `job_${proj.id}_ep${firstUnfinishedEp.episodeNumber}_clip${clip.clipNumber}_${Date.now()}`,
        projectId: proj.id,
        episodeNumber: firstUnfinishedEp.episodeNumber,
        clipNumber: clip.clipNumber,
        clipId: clip.id,
        prompt: clip.prompt,
        selectedModel: clip.selectedModel,
        status: 'queued',
        progressPercent: 0,
        retryCount: clip.retryCount || 0,
      }));

      batchGenerationRef.current = { isBatchMode: true, projectId };
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
    batchGenerationRef.current = { isBatchMode: false, projectId: null };
    setIsQueueRunning(false);
    setIsQueuePaused(false);
  }, []);

  const startQueue = useCallback(() => {
    if (queue.length > 0) {
      setIsQueueRunning(true);
      setIsQueuePaused(false);
    }
  }, [queue]);

  // Master Sequential Queue Processing Loop (processes 5-clip batches)
  useEffect(() => {
    if (!isQueueRunning || isQueuePaused) return;

    let timeoutId: any;
    let isMounted = true;

    async function processNextJob() {
      if (!isQueueRunningRef.current || isQueuePausedRef.current) return;

      const currentQueue = queueRef.current;
      const nextIndex = currentQueue.findIndex((j) => j.status === 'queued');

      if (nextIndex === -1) {
        // Check if any jobs in this 5-clip batch are still generating or rendering
        const hasInFlight = currentQueue.some((j) => j.status === 'generating' || j.status === 'rendering');
        if (hasInFlight) {
          timeoutId = setTimeout(processNextJob, 1000);
          return;
        }

        // Current 5-clip batch is finished! Check if in batch mode to advance to next 5 clips
        if (batchGenerationRef.current.isBatchMode && batchGenerationRef.current.projectId) {
          const proj = currentProjectRef.current?.id === batchGenerationRef.current.projectId
            ? currentProjectRef.current
            : projectsRef.current.find((p) => p.id === batchGenerationRef.current.projectId);

          const nextUnfinishedEp = proj?.episodes.find((ep) =>
            ep.clips.some((c) => c.generationStatus !== 'completed')
          );

          if (nextUnfinishedEp) {
            console.log(`[Batch Generator] Progressing to next batch: Episode ${nextUnfinishedEp.episodeNumber} (5 clips)`);
            const nextBatchJobs: QueueJob[] = nextUnfinishedEp.clips.map((clip) => ({
              jobId: `job_${proj!.id}_ep${nextUnfinishedEp.episodeNumber}_clip${clip.clipNumber}_${Date.now()}`,
              projectId: proj!.id,
              episodeNumber: nextUnfinishedEp.episodeNumber,
              clipNumber: clip.clipNumber,
              clipId: clip.id,
              prompt: clip.prompt,
              selectedModel: clip.selectedModel,
              status: 'queued',
              progressPercent: 0,
              retryCount: clip.retryCount || 0,
            }));
            setQueue(nextBatchJobs);
            timeoutId = setTimeout(processNextJob, 800);
            return;
          } else {
            batchGenerationRef.current = { isBatchMode: false, projectId: null };
          }
        }

        // All queued jobs / batches finished!
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
        // 1. Get current clip from project to check scene look overrides
        const currentEp = currentProjectRef.current?.episodes.find(
          (e) => e.episodeNumber === activeJob.episodeNumber
        );
        const currentClip = currentEp?.clips.find((c) => c.clipNumber === activeJob.clipNumber);

        // Collect locked characters & reference images matching the current scene look
        const lockedChars = characters.filter((c) => c.isLocked);
        const referenceImages: string[] = [];

        // 1. Prioritize active scene lifestyle look reference image
        lockedChars.forEach((c) => {
          const sceneLook = getCharacterLookForClip(c, currentClip || { episodeNumber: activeJob.episodeNumber });
          if (sceneLook.url && sceneLook.url.length > 5 && !referenceImages.includes(sceneLook.url)) {
            referenceImages.push(sceneLook.url);
          }
          // Also append all character looks so ModelArk maintains facial consistency across outfits/lifestyles
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
                const sceneLook = getCharacterLookForClip(c, currentClip || { episodeNumber: activeJob.episodeNumber });
                const genderLabel =
                  c.gender === 'female'
                    ? 'STRICT FEMALE (Woman / Girl, feminine facial traits - STRICTLY NOT A MAN)'
                    : c.gender === 'male'
                    ? 'MALE (Man / Boy)'
                    : 'CHARACTER';
                return `${genderLabel}: ${c.name} (${c.role}), Base Facial Traits: ${c.visualTraits}. [SCENE LIFESTYLE LOOK: "${sceneLook.label}" (${sceneLook.lifestyleTag || 'Style'}) | Scene Wardrobe & Ambiance: ${sceneLook.description || c.clothingDetails}. Video generation strictly matches this photo & wardrobe for this scene.]`;
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

        // Check if backend already finished generation or synthesized video
        const immediateUrl = genRes.job?.outputVideoUrl || (genRes as any).outputVideoUrl;
        const hasImmediateUrl =
          immediateUrl &&
          typeof immediateUrl === 'string' &&
          (immediateUrl.startsWith('http') || immediateUrl.startsWith('/uploads')) &&
          !immediateUrl.includes('gtv-videos-bucket') &&
          !immediateUrl.includes('ForBiggerBlazes');

        let isDone = false;
        if (genRes.status === 'completed' && hasImmediateUrl) {
          isDone = true;
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

          if (currentProjectRef.current) {
            const ep = currentProjectRef.current.episodes.find(
              (e) => e.episodeNumber === activeJob.episodeNumber
            );
            const clip = ep?.clips.find((c) => c.clipNumber === activeJob.clipNumber);
            if (clip) {
              updateClipInProject({
                ...clip,
                generationStatus: 'completed',
                outputVideoUrl: immediateUrl,
                completedAt: Date.now(),
              });
            }
          }

          soundFx.playWhoosh(0.2);
        }

        // Poll for completion if task is rendering asynchronously
        let pollCount = 0;
        const maxPolls = 25;

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
            const realVideoUrl = polled.outputVideoUrl;
            const hasRealUrl =
              realVideoUrl &&
              typeof realVideoUrl === 'string' &&
              (realVideoUrl.startsWith('http') || realVideoUrl.startsWith('/uploads')) &&
              !realVideoUrl.includes('gtv-videos-bucket') &&
              !realVideoUrl.includes('ForBiggerBlazes');

            if (polled.generationStatus === 'completed' && hasRealUrl) {
              isDone = true;

              // Job completed successfully with REAL ModelArk video URL! Advance queue
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

              // Update project clip with REAL output video URL and completed status
              if (currentProjectRef.current) {
                const ep = currentProjectRef.current.episodes.find(
                  (e) => e.episodeNumber === activeJob.episodeNumber
                );
                const clip = ep?.clips.find((c) => c.clipNumber === activeJob.clipNumber);
                if (clip) {
                  updateClipInProject({
                    ...clip,
                    generationStatus: 'completed',
                    outputVideoUrl: realVideoUrl,
                    completedAt: Date.now(),
                  });
                }
              }

              soundFx.playWhoosh(0.2);
              break;
            } else if (
              polled.generationStatus === 'rendering' ||
              polled.generationStatus === 'generating' ||
              (polled.generationStatus === 'completed' && !hasRealUrl)
            ) {
              // Video is still rendering on ModelArk cluster - show "Rendering..."
              if (currentProjectRef.current) {
                const ep = currentProjectRef.current.episodes.find(
                  (e) => e.episodeNumber === activeJob.episodeNumber
                );
                const clip = ep?.clips.find((c) => c.clipNumber === activeJob.clipNumber);
                if (clip && clip.generationStatus !== 'rendering') {
                  updateClipInProject({
                    ...clip,
                    generationStatus: 'rendering',
                  });
                }
              }
            } else if (polled.generationStatus === 'failed') {
              throw new Error(polled.error || 'ModelArk task failed');
            }
          } catch (e: any) {
            if (pollCount >= maxPolls) {
              // Generation is still rendering on ModelArk cluster - leave in rendering status
              if (currentProjectRef.current) {
                const ep = currentProjectRef.current.episodes.find(
                  (e) => e.episodeNumber === activeJob.episodeNumber
                );
                const clip = ep?.clips.find((c) => c.clipNumber === activeJob.clipNumber);
                if (clip) {
                  updateClipInProject({
                    ...clip,
                    generationStatus: 'rendering',
                  });
                }
              }
              break;
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

      // Ground characters into their scene lifestyle look
      const episodeStageContinuity = lockedChars.length > 0
        ? `Character Continuity: ${lockedChars.map((c) => {
            const look = getCharacterLookForClip(c, { episodeNumber: epNum });
            const genderPrefix = c.gender === 'female'
              ? 'FEMALE (Woman / Girl, strictly female presentation - NOT A MAN)'
              : c.gender === 'male'
              ? 'MALE (Man / Boy)'
              : 'CHARACTER';
            return `[${genderPrefix} ${c.role}: "${c.name}" - ${look.label} (${look.lifestyleTag || 'Style'}) | Face: ${c.visualTraits}, Wardrobe: ${look.description || c.clothingDetails}]`;
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
    if (res.success && res.maskedKey) {
      setModelArkConfig((prev) => ({
        ...prev,
        configured: true,
        maskedKey: res.maskedKey || prev.maskedKey,
      }));
    }
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
        deleteEpisode,
        deleteEpisodes,
        addEpisode,
        createFolder,
        renameFolder,
        deleteFolder,
        moveEpisodeToFolder,
        moveEpisodesToFolder,
        exportFolderZip,
        modelArkConfig,
        updateModelArkConfig,
        checkConnection,
        statusInfo,
        lastSavedAt,
        isAutoSaving,
        forceSaveNow,
        exportBackupJson,
        importBackupJson,
        setClipCharacterLook,
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
        generationStatus: 'queued',
        outputVideoUrl: undefined,
        customFilename: getDefaultClipFilename(ep, cl),
        durationSeconds: 12,
        retryCount: 0,
        createdAt: Date.now() - 3600000,
        completedAt: undefined,
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
