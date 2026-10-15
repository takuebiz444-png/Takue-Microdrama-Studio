export type ActiveTabType = 'dashboard' | 'characters' | 'create' | 'projects' | 'editor' | 'settings';
export type GenerationStatus = 'queued' | 'generating' | 'completed' | 'failed';

export interface Character {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  archetype?: string;
  tagline: string;
  description: string;
  clothingDetails: string;
  visualTraits: string;
  referenceImageUrl: string;
  voiceStyle: string;
  isLocked: boolean;
}

export interface Clip {
  id: string;
  projectId: string;
  episodeNumber: number; // 1 to 40
  clipNumber: number; // 1 to 5
  totalEpisodes: number;
  totalClipsInEpisode: number;
  sceneType: string;
  prompt: string;
  selectedModel: string;
  generationStatus: GenerationStatus;
  outputVideoUrl?: string;
  thumbnailUrl?: string;
  customFilename: string; // e.g., "Takue_Microdrama_Ep001_Clip001.mp4"
  durationSeconds: number; // default 12
  error?: string;
  retryCount: number;
  createdAt: number;
  completedAt?: number;
  characterIds?: string[];
  
  // Video Editor adjustments
  trimStart: number;
  trimEnd: number;
  subtitleText?: string;
  subtitleStyle?: 'classic' | 'yellow' | 'blue-box' | 'cinematic';
  volume: number; // 0 to 1
}

export interface Episode {
  episodeNumber: number;
  title: string;
  summary: string;
  clips: Clip[];
  isCombined?: boolean;
  combinedVideoUrl?: string;
  combinedFilename?: string; // e.g., "Takue_Microdrama_Episode_001.mp4"
  combinedAt?: number;
}

export interface DramaProject {
  id: string;
  title: string;
  logline: string;
  storyPrompt: string;
  masterPrompt?: string;
  isMasterPromptLocked?: boolean;
  totalEpisodes: number; // default 40
  clipsPerEpisode: number; // default 5
  clipDurationSeconds: number; // default 12
  orientation: '9:16' | '16:9';
  selectedModel: string;
  tone: string;
  episodes: Episode[];
  createdAt: number;
  updatedAt: number;
}

export interface CreationProcedure {
  stepNumber: number;
  id: string;
  title: string;
  subtitle: string;
  description: string;
  actionLabel: string;
  targetTab: ActiveTabType;
  wizardStep?: number;
  badge: string;
}

export interface QueueJob {
  jobId: string;
  projectId: string;
  episodeNumber: number;
  clipNumber: number;
  clipId: string;
  prompt: string;
  selectedModel: string;
  status: GenerationStatus;
  progressPercent: number;
  startedAt?: number;
  error?: string;
  retryCount: number;
}

export interface ModelArkConfig {
  endpoint: string;
  maskedKey: string;
  configured: boolean;
  spendingLimitCredits: number;
  usedCredits: number;
  maxRetries: number;
  forceSimulation: boolean;
}

export interface ModelOption {
  id: string;
  name: string;
  tier: string;
  description: string;
  recommendedFor: string;
  creditsPerClip: number;
}
