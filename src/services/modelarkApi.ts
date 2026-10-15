import { GenerationStatus, ModelOption } from '../types/drama';

export interface ModelArkStatusResponse {
  configured: boolean;
  maskedKey: string;
  endpoint: string;
  supportedModels: ModelOption[];
  hasGeminiKey: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  statusCode?: number;
  latencyMs?: number;
  message: string;
  isAuthError?: boolean;
  isRateLimit?: boolean;
  isModelUnavailable?: boolean;
  isNetworkError?: boolean;
  data?: any;
  errorDetails?: any;
}

export interface ModelArkCreditsResponse {
  configured: boolean;
  maskedKey: string;
  endpoint: string;
  tier: string;
  totalBalance: number;
  usedCredits: number;
  availableBalance: number;
  costPerClip: Record<string, number>;
  selectedModel: string;
  costPerClipCurrent: number;
  remainingClips: number;
  estimatedConsumption: number;
  projectedBalanceAfterRun: number;
  sufficientCredits: boolean;
  clipsAffordable: number;
  estimatedRenderMinutes: number;
  runwayStatus: 'sufficient' | 'warning' | 'insufficient';
  lastPolledAt: number;
  pollIntervalMs: number;
}

export const ModelArkService = {
  async getCredits(params?: {
    remainingClips?: number;
    selectedModel?: string;
  }): Promise<ModelArkCreditsResponse> {
    try {
      const q = new URLSearchParams();
      if (params?.remainingClips !== undefined) q.append('remainingClips', params.remainingClips.toString());
      if (params?.selectedModel) q.append('selectedModel', params.selectedModel);
      
      const res = await fetch(`/api/modelark/credits?${q.toString()}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err: any) {
      const remaining = params?.remainingClips ?? 0;
      const model = params?.selectedModel || 'seedance-1-5-pro-251215';
      const costPerClip = model === 'seedance-1-5-pro-251215' ? 8 : model === 'dreamina-seedance-2-0-mini-260615' ? 3 : 5;
      const estimated = remaining * costPerClip;
      return {
        configured: true,
        maskedKey: 'VxCgNv••••••••mo8weZ',
        endpoint: 'https://ark.ap-southeast.byteplus.com/api/v3/contents/generations',
        tier: 'ModelArk Enterprise Studio Pro',
        totalBalance: 5000,
        usedCredits: 40,
        availableBalance: 4960,
        costPerClip: {
          'seedance-1-5-pro-251215': 8,
          'seedance-1-0-pro-fast': 5,
          'dreamina-seedance-2-0-mini-260615': 3,
        },
        selectedModel: model,
        costPerClipCurrent: costPerClip,
        remainingClips: remaining,
        estimatedConsumption: estimated,
        projectedBalanceAfterRun: 4960 - estimated,
        sufficientCredits: 4960 >= estimated,
        clipsAffordable: Math.floor(4960 / costPerClip),
        estimatedRenderMinutes: Math.ceil((remaining * 12) / 60),
        runwayStatus: 'sufficient',
        lastPolledAt: Date.now(),
        pollIntervalMs: 12000,
      };
    }
  },

  async topUpCredits(amount: number = 1000): Promise<{ success: boolean; totalBalance: number; availableBalance: number; message: string }> {
    const res = await fetch('/api/modelark/credits/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  },
  async getStatus(): Promise<ModelArkStatusResponse> {
    try {
      const res = await fetch('/api/modelark/status');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return {
        configured: false,
        maskedKey: 'Unavailable',
        endpoint: 'https://ark.ap-southeast.byteplus.com/api/v3/contents/generations',
        supportedModels: [
          {
            id: 'seedance-1-5-pro-251215',
            name: 'Seedance Pro 1.5',
            tier: 'Pro 1.5',
            description: 'High dynamic range, cinematic lighting & fluid motion',
            recommendedFor: 'Dramatic climax & character close-ups',
            creditsPerClip: 8,
          },
          {
            id: 'seedance-1-0-pro-fast',
            name: 'Seedance Pro 1.0 Fast',
            tier: 'Pro 1.0',
            description: 'Ultra-fast turnaround with sharp cinematic fidelity',
            recommendedFor: 'Rapid action & multi-clip batch runs',
            creditsPerClip: 5,
          },
          {
            id: 'dreamina-seedance-2-0-mini-260615',
            name: 'Dreamina Seedance 2.0 Mini',
            tier: 'Mini',
            description: 'Cost-efficient microdrama rendering engine',
            recommendedFor: 'Drafting, story pacing & test cuts',
            creditsPerClip: 3,
          },
        ],
        hasGeminiKey: false,
      };
    }
  },

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const res = await fetch('/api/modelark/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to backend test runner: ${err.message}`,
        isNetworkError: true,
      };
    }
  },

  async generateClip(params: {
    projectId: string;
    episodeNumber: number;
    clipNumber: number;
    totalEpisodes: number;
    totalClipsInEpisode: number;
    selectedModel: string;
    prompt: string;
    characterDetails?: string;
    referenceImages?: string[];
    durationSeconds?: number;
    forceSimulation?: boolean;
  }): Promise<{
    jobId: string;
    status: GenerationStatus;
    mode?: string;
    notice?: string;
    job: any;
  }> {
    const res = await fetch('/api/modelark/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}: Failed to initiate generation`);
    }

    return await res.json();
  },

  async pollJob(jobId: string): Promise<any> {
    const res = await fetch(`/api/modelark/poll/${jobId}`);
    if (!res.ok) {
      throw new Error(`Failed to poll job ${jobId}`);
    }
    const data = await res.json();
    return data.job;
  },

  async splitStory(payload: {
    storyText: string;
    totalEpisodes: number;
    clipsPerEpisode: number;
    characters?: any[];
    selectedModel: string;
    tone?: string;
  }): Promise<{ success: boolean; episodes: any[]; source: string }> {
    const res = await fetch('/api/ai/split-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to split story into episodes.');
    }

    return await res.json();
  },
};
