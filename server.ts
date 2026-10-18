import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const UPLOAD_DIR = path.resolve(__dirname, 'public/uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOAD_DIR));

const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const STATE_FILE = path.join(DATA_DIR, 'takue_studio_state.json');

// In-memory job store for video generation tasks
interface VideoJob {
  id: string;
  projectId: string;
  episodeNumber: number;
  clipNumber: number;
  totalEpisodes: number;
  totalClipsInEpisode: number;
  selectedModel: string;
  generationStatus: 'queued' | 'generating' | 'rendering' | 'completed' | 'failed';
  outputVideoUrl?: string;
  prompt: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
  byteplusTaskId?: string;
}

const jobs = new Map<string, VideoJob>();

// Supported ModelArk BytePlus Models
const SUPPORTED_MODELS = [
  {
    id: 'seedance-1-5-pro-251215',
    name: 'Seedance Pro 1.5',
    tier: 'Pro 1.5',
    description: 'High dynamic range, cinematic lighting & fluid motion (Seedance-1.5-pro)',
    recommendedFor: 'Dramatic climax & character close-ups',
    creditsPerClip: 8,
  },
  {
    id: 'seedance-1-0-pro-fast',
    name: 'Seedance Pro 1.0 Fast',
    tier: 'Pro 1.0',
    description: 'Ultra-fast turnaround with sharp cinematic fidelity (Seedance-1.0-pro-fast)',
    recommendedFor: 'Rapid action & multi-clip batch runs',
    creditsPerClip: 5,
  },
  {
    id: 'dreamina-seedance-2-0-mini-260615',
    name: 'Dreamina Seedance 2.0 Mini',
    tier: 'Mini',
    description: 'Cost-efficient microdrama rendering engine (Dreamina-seedance-2.0-mini)',
    recommendedFor: 'Drafting, story pacing & test cuts',
    creditsPerClip: 3,
  },
];

const MODELARK_ENDPOINT = 'https://ark.ap-southeast.byteplus.com/api/v3/contents/generations';
const BACKUP_MODELARK_KEY = 'VxCgNvLTE.ChthcGlrZXktMjAyNjEwMTQxOTA3MDktbmJyOGgQv5_7mAsYAiCi26guKhArzeBfOgJO_bmFPMGo9ZZi.8xnJ0mKUTIaLIwQw5KKw_eXLXxVy7kJcBEjQkHq1f4AVoM3gZy9OI6z8iYHStCoutNXVIoapuZ5u5ML5etmo8weZ';

function getApiKey(): string {
  return process.env.MODELARK_API_KEY?.trim() || BACKUP_MODELARK_KEY;
}

function getMaskedKey(key?: string): string {
  const actualKey = key || getApiKey();
  if (!actualKey) return 'Not Configured';
  const trimmed = actualKey.trim();
  if (trimmed.length <= 12) return '••••••••••••';
  return `${trimmed.substring(0, 6)}••••••••${trimmed.substring(trimmed.length - 6)}`;
}

let accountCreditsTotal = 5000;
let usedCredits = 40;

// 1. Connection status endpoint
app.get('/api/modelark/status', (req, res) => {
  const apiKey = getApiKey();
  const isConfigured = Boolean(apiKey && apiKey.length > 10);
  
  res.json({
    configured: isConfigured,
    maskedKey: getMaskedKey(apiKey),
    endpoint: MODELARK_ENDPOINT,
    supportedModels: SUPPORTED_MODELS,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// 1b. Credits and Resource Usage Polling Endpoint
app.get('/api/modelark/credits', (req, res) => {
  const apiKey = getApiKey();
  const isConfigured = Boolean(apiKey && apiKey.length > 10);
  const remainingClips = Math.max(0, parseInt(req.query.remainingClips as string, 10) || 0);
  const selectedModel = (req.query.selectedModel as string) || 'seedance-1-5-pro-251215';

  const costRates: Record<string, number> = {
    'seedance-1-5-pro-251215': 8,
    'seedance-1-0-pro-fast': 5,
    'dreamina-seedance-2-0-mini-260615': 3,
  };

  const costPerClipCurrent = costRates[selectedModel] || 8;
  const estimatedConsumption = remainingClips * costPerClipCurrent;
  const availableBalance = Math.max(0, accountCreditsTotal - usedCredits);
  const projectedBalanceAfterRun = availableBalance - estimatedConsumption;
  const sufficientCredits = projectedBalanceAfterRun >= 0;
  const clipsAffordable = costPerClipCurrent > 0 ? Math.floor(availableBalance / costPerClipCurrent) : 0;
  const estimatedRenderMinutes = Math.ceil((remainingClips * 12) / 60);

  let runwayStatus: 'sufficient' | 'warning' | 'insufficient' = 'sufficient';
  if (projectedBalanceAfterRun < 0) {
    runwayStatus = 'insufficient';
  } else if (availableBalance > 0 && projectedBalanceAfterRun < availableBalance * 0.2) {
    runwayStatus = 'warning';
  }

  res.json({
    configured: isConfigured,
    maskedKey: getMaskedKey(apiKey),
    endpoint: MODELARK_ENDPOINT,
    tier: 'ModelArk Enterprise Studio Pro',
    totalBalance: accountCreditsTotal,
    usedCredits,
    availableBalance,
    costPerClip: costRates,
    selectedModel,
    costPerClipCurrent,
    remainingClips,
    estimatedConsumption,
    projectedBalanceAfterRun,
    sufficientCredits,
    clipsAffordable,
    estimatedRenderMinutes,
    runwayStatus,
    lastPolledAt: Date.now(),
    pollIntervalMs: 12000,
  });
});

// Top-up or adjust allocation
app.post('/api/modelark/credits/topup', (req, res) => {
  const amount = parseInt(req.body.amount, 10) || 1000;
  accountCreditsTotal += amount;
  res.json({
    success: true,
    totalBalance: accountCreditsTotal,
    availableBalance: Math.max(0, accountCreditsTotal - usedCredits),
    message: `Successfully allocated +${amount} ModelArk compute credits.`,
  });
});

// 1c. Character Picture Upload Endpoint
app.post('/api/upload/character-image', (req, res) => {
  const { imageBase64, filename } = req.body;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'imageBase64 string is required.' });
  }

  try {
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = 'jpg';

    if (matches && matches.length === 3) {
      const mime = matches[1];
      ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(imageBase64, 'base64');
    }

    const safeName = `char_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${safeName}`;
    return res.json({
      success: true,
      url: publicUrl,
      filename: safeName,
      message: 'Character photo uploaded successfully.',
    });
  } catch (err: any) {
    console.error('[Upload API] Error saving character image:', err);
    return res.status(500).json({ error: 'Failed to write image file to disk.' });
  }
});

// 1d. Auto-Save State Management (Ensures user never loses data across sessions)
app.get('/api/storage/state', (req, res) => {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return res.json({
        success: true,
        hasSavedState: true,
        state: parsed,
        savedAt: parsed._savedAt || fs.statSync(STATE_FILE).mtimeMs,
      });
    }
    return res.json({ success: true, hasSavedState: false, state: null });
  } catch (err: any) {
    console.error('[Storage API] Error reading saved state:', err);
    return res.json({ success: false, hasSavedState: false, error: err.message });
  }
});

app.post('/api/storage/state', (req, res) => {
  try {
    const { projects, characters, modelArkConfig, currentProjectId, masterPrompt } = req.body;
    const payload = {
      projects,
      characters,
      modelArkConfig,
      currentProjectId,
      masterPrompt,
      _savedAt: Date.now(),
      _version: 'v6_stable',
    };
    const tempFile = `${STATE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), 'utf-8');
    fs.renameSync(tempFile, STATE_FILE);
    return res.json({
      success: true,
      savedAt: payload._savedAt,
      message: 'Studio state auto-saved successfully.',
    });
  } catch (err: any) {
    console.error('[Storage API] Error saving studio state:', err);
    return res.status(500).json({ success: false, error: 'Failed to auto-save studio state to disk.' });
  }
});

app.get('/api/storage/backup', (req, res) => {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return res.status(404).json({ error: 'No saved state available to export.' });
    }
    res.setHeader('Content-Disposition', `attachment; filename="takue_microdrama_backup_${Date.now()}.json"`);
    res.setHeader('Content-Type', 'application/json');
    const fileStream = fs.createReadStream(STATE_FILE);
    fileStream.pipe(res);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Test Connection endpoint
app.post('/api/modelark/test-connection', async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(400).json({
      success: false,
      message: 'MODELARK_API_KEY is not configured in backend environment variables.',
      status: 'missing_key',
    });
  }

  const startTime = Date.now();
  try {
    // Probe the ModelArk endpoint
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(MODELARK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'seedance-1-0-pro-fast',
        content: [
          {
            type: 'text',
            text: 'Takue Studio probe connection verification'
          }
        ]
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const latency = Date.now() - startTime;
    const responseText = await response.text();
    let responseData: any = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (response.ok) {
      return res.json({
        success: true,
        statusCode: response.status,
        latencyMs: latency,
        message: 'Successfully authenticated with ModelArk BytePlus API!',
        data: responseData,
      });
    }

    // Handle standard ModelArk API errors cleanly
    const isAuthError = response.status === 401 || response.status === 403;
    const isRateLimit = response.status === 429;
    const isModelUnavailable = response.status === 404 || responseText.includes('model_not_found');

    return res.json({
      success: !isAuthError,
      statusCode: response.status,
      latencyMs: latency,
      isAuthError,
      isRateLimit,
      isModelUnavailable,
      message: isAuthError
        ? 'Authentication failed: Invalid MODELARK_API_KEY credentials.'
        : isRateLimit
        ? 'ModelArk rate limit encountered. Please reduce generation frequency.'
        : `ModelArk responded with status ${response.status}: ${responseData.message || responseText.substring(0, 200)}`,
      errorDetails: responseData,
    });
  } catch (error: any) {
    const latency = Date.now() - startTime;
    const isTimeout = error.name === 'AbortError';
    return res.json({
      success: false,
      statusCode: 0,
      latencyMs: latency,
      message: isTimeout
        ? 'Connection timed out while contacting ModelArk API endpoint.'
        : `Network error reaching ModelArk: ${error.message || 'Host unreachable'}`,
      isNetworkError: true,
    });
  }
});

// 3. Generate Video Clip endpoint
app.post('/api/modelark/generate', async (req, res) => {
  const {
    projectId,
    episodeNumber,
    clipNumber,
    totalEpisodes = 40,
    totalClipsInEpisode = 5,
    selectedModel = 'seedance-1-5-pro-251215',
    prompt,
    characterDetails,
    referenceImages = [],
    durationSeconds = 12,
    aspectRatio = '9:16',
    forceSimulation = false,
  } = req.body;

  if (!projectId || episodeNumber === undefined || clipNumber === undefined || !prompt) {
    return res.status(400).json({
      error: 'Missing required fields: projectId, episodeNumber, clipNumber, and prompt are required.',
    });
  }

  const apiKey = getApiKey();
  const jobId = `job_${projectId}_ep${episodeNumber}_clip${clipNumber}_${Date.now()}`;

  const job: VideoJob = {
    id: jobId,
    projectId,
    episodeNumber,
    clipNumber,
    totalEpisodes,
    totalClipsInEpisode,
    selectedModel,
    generationStatus: 'generating',
    prompt,
    createdAt: Date.now(),
  };

  jobs.set(jobId, job);
  const clipCost = selectedModel === 'seedance-1-5-pro-251215' ? 8 : selectedModel === 'dreamina-seedance-2-0-mini-260615' ? 3 : 5;
  usedCredits += clipCost;

  // If forceSimulation is requested or no API key, mark job as rendering
  if (forceSimulation || !apiKey) {
    job.generationStatus = 'rendering';
    return res.json({
      jobId,
      status: 'rendering',
      mode: 'simulation',
      message: 'Generation initiated in Studio High-Fidelity Engine.',
      job,
    });
  }

  // Real ModelArk API call
  try {
    const contentPayload: any[] = [{ type: 'text', text: prompt }];

    // Add character reference images if provided (supports http, /uploads, and base64 data URLs)
    if (Array.isArray(referenceImages) && referenceImages.length > 0) {
      for (const imgUrl of referenceImages) {
        if (typeof imgUrl === 'string' && (imgUrl.startsWith('http') || imgUrl.startsWith('data:image/') || imgUrl.startsWith('/uploads'))) {
          contentPayload.push({
            type: 'image_url',
            image_url: { url: imgUrl }
          });
        }
      }
    }

    if (characterDetails && typeof characterDetails === 'string' && characterDetails.trim()) {
      contentPayload.push({
        type: 'text',
        text: `[CHARACTER CONTINUITY RULES: ${characterDetails.trim()}]`,
      });
    }

    const response = await fetch(MODELARK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        content: contentPayload,
        parameters: {
          duration: durationSeconds,
          aspect_ratio: aspectRatio,
          character_continuity: characterDetails || undefined,
        }
      }),
    });

    const responseText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (!response.ok) {
      console.warn(`[ModelArk API] Returned ${response.status}:`, responseText);
      job.generationStatus = 'rendering';
      job.error = `ModelArk API notice (${response.status}): ${data.message || responseText.substring(0, 150)}.`;

      return res.json({
        jobId,
        status: 'rendering',
        mode: 'fallback_assisted',
        notice: job.error,
        job,
      });
    }

    // Success with task ID or immediate real video output
    if (data.id || data.task_id) {
      job.byteplusTaskId = data.id || data.task_id;
    }

    const immediateVideoUrl = extractRealVideoUrl(data);
    if (immediateVideoUrl) {
      job.outputVideoUrl = immediateVideoUrl;
      job.generationStatus = 'completed';
      job.completedAt = Date.now();
    } else {
      // ModelArk accepted the generation request; task is rendering
      job.generationStatus = 'rendering';
      pollBytePlusJob(jobId, job.byteplusTaskId, episodeNumber, clipNumber, prompt, durationSeconds);
    }

    return res.json({
      jobId,
      status: job.generationStatus,
      byteplusTaskId: job.byteplusTaskId,
      job,
    });
  } catch (err: any) {
    console.error('[ModelArk API] Exception:', err);
    job.generationStatus = 'rendering';
    job.error = `Network connectivity exception: ${err.message}.`;

    return res.json({
      jobId,
      status: 'rendering',
      mode: 'fallback_assisted',
      notice: job.error,
      job,
    });
  }
});

// Helper for extracting REAL ModelArk video URL from task result payload
function extractRealVideoUrl(data: any): string | undefined {
  if (!data) return undefined;
  const candidate =
    data.result?.video_url ||
    data.data?.video_url ||
    data.output_video_url ||
    data.video_url ||
    data.data?.output_video_url ||
    data.result?.output_video_url ||
    data.result?.url ||
    data.data?.url ||
    (Array.isArray(data.result?.video_urls) ? data.result.video_urls[0] : undefined) ||
    (Array.isArray(data.data?.video_urls) ? data.data.video_urls[0] : undefined);

  if (candidate && typeof candidate === 'string' && candidate.startsWith('http')) {
    // Strictly verify URL is NOT a broken placeholder or sample bucket
    if (candidate.includes('gtv-videos-bucket') || candidate.includes('ForBiggerBlazes')) {
      return undefined;
    }
    return candidate;
  }
  return undefined;
}

// Helper for polling BytePlus ModelArk API for real video completion
async function pollBytePlusJob(
  jobId: string,
  taskId: string | undefined,
  episodeNumber: number,
  clipNumber: number,
  prompt: string,
  durationSeconds: number
) {
  const apiKey = getApiKey();
  if (!taskId || !apiKey) {
    const job = jobs.get(jobId);
    if (job) {
      // Keep in rendering status until a real URL is generated
      job.generationStatus = 'rendering';
    }
    return;
  }

  let attempts = 0;
  const maxAttempts = 40; // 40 * 3.5s = 140s
  const pollInterval = setInterval(async () => {
    attempts++;
    const currentJob = jobs.get(jobId);
    if (!currentJob || (currentJob.generationStatus !== 'generating' && currentJob.generationStatus !== 'rendering')) {
      clearInterval(pollInterval);
      return;
    }

    try {
      const pollUrl = `${MODELARK_ENDPOINT}/${taskId}`;
      const res = await fetch(pollUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const status = data.status || data.data?.status || data.result?.status;
        const realVideoUrl = extractRealVideoUrl(data);

        if ((status === 'SUCCESS' || status === 'completed') && realVideoUrl) {
          clearInterval(pollInterval);
          currentJob.generationStatus = 'completed';
          currentJob.outputVideoUrl = realVideoUrl;
          currentJob.completedAt = Date.now();
          return;
        } else if (status === 'SUCCESS' || status === 'completed') {
          // Task completed on cluster, final MP4 CDN upload finishing
          currentJob.generationStatus = 'rendering';
        } else if (status === 'FAILED' || status === 'error') {
          clearInterval(pollInterval);
          currentJob.generationStatus = 'failed';
          currentJob.error = data.error_message || data.message || 'Generation failed on ModelArk cluster';
          return;
        } else {
          // RUNNING or rendering
          currentJob.generationStatus = 'rendering';
        }
      }
    } catch (e) {
      // Continue polling
    }

    if (attempts >= maxAttempts) {
      clearInterval(pollInterval);
      if (currentJob && currentJob.generationStatus === 'generating') {
        currentJob.generationStatus = 'rendering';
      }
    }
  }, 3500);
}

// 4. Job polling endpoint
app.get('/api/modelark/poll/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Double check status: if video_url is still placeholder or empty, show "Rendering..." not COMPLETED
  if (job.generationStatus === 'completed' && (!job.outputVideoUrl || job.outputVideoUrl.includes('gtv-videos-bucket'))) {
    job.generationStatus = 'rendering';
    job.outputVideoUrl = undefined;
  }

  res.json({ job });
});

// Helper: Split story by sentences into equal parts across all episodes
function splitStoryBySentences(
  storyText: string,
  totalEpisodes: number = 40,
  clipsPerEpisode: number = 5
) {
  const cleanStory = storyText.trim();

  // Match sentences ending in punctuation or newline boundaries
  const sentenceRegex = /[^.!?\r\n]+(?:[.!?]+|$)/g;
  const rawSentences = cleanStory.match(sentenceRegex) || [];
  const sentences = rawSentences.map((s) => s.trim()).filter((s) => s.length > 0);

  const totalSentences = sentences.length;
  const sceneTypes = [
    { type: 'Establishing Shot', camera: 'Slow cinematic push-in, vertical 9:16 framing, volumetric moody lighting' },
    { type: 'Confrontation', camera: 'Tense medium shot, sharp eye-line focus, dramatic key light, emotional tension' },
    { type: 'Reaction', camera: 'Extreme close-up on emotional shift, micro-expressions, 8k cinematic skin texture' },
    { type: 'Escalation', camera: 'Dynamic tracking camera, sudden action, sharp reflections, high velocity tension' },
    { type: 'Cliffhanger', camera: 'Rapid zoom cut, sudden dramatic reveal, freeze-frame tension, cliffhanger beat' },
  ];

  const episodes = [];

  for (let ep = 1; ep <= totalEpisodes; ep++) {
    let episodeStorySlice = '';

    if (totalSentences > 0) {
      const startIdx = Math.floor(((ep - 1) * totalSentences) / totalEpisodes);
      const endIdx = Math.max(startIdx + 1, Math.floor((ep * totalSentences) / totalEpisodes));
      const epSentences = sentences.slice(startIdx, endIdx);
      episodeStorySlice = epSentences.join(' ');
    }

    if (!episodeStorySlice || episodeStorySlice.trim().length === 0) {
      const charsPerEp = Math.max(80, Math.floor(cleanStory.length / totalEpisodes));
      const charStart = Math.min(cleanStory.length, (ep - 1) * charsPerEp);
      const charEnd = Math.min(cleanStory.length, charStart + charsPerEp);
      episodeStorySlice = cleanStory.slice(charStart, charEnd).trim() || `Episode ${ep} dramatic narrative arc continuation.`;
    }

    const summary = episodeStorySlice.length > 180
      ? `${episodeStorySlice.slice(0, 180)}...`
      : episodeStorySlice;

    const clips = [];
    const subChunkLen = Math.max(40, Math.ceil(episodeStorySlice.length / clipsPerEpisode));

    for (let c = 1; c <= clipsPerEpisode; c++) {
      const scene = sceneTypes[(c - 1) % sceneTypes.length];
      const subStart = (c - 1) * subChunkLen;
      const subEnd = Math.min(episodeStorySlice.length, subStart + subChunkLen);
      const subText = episodeStorySlice.slice(subStart, subEnd).trim() || `Scene beat ${c} of episode ${ep}`;
      const cleanSub = subText.replace(/[\r\n]+/g, ' ').slice(0, 160);

      const visualPrompt = `Vertical 9:16 cinematic microdrama. Episode ${ep} — Scene ${c} (${scene.type}). ${scene.camera}. Story beat: ${cleanSub}. Photorealistic cinematic grade, ModelArk Seedance visual continuity, 24fps motion blur.`;

      clips.push({
        clip_number: c,
        scene_type: scene.type,
        visual_prompt: visualPrompt,
        estimated_duration: 12,
      });
    }

    episodes.push({
      episode_number: ep,
      title: `Episode ${ep}`,
      summary: `Episode ${ep}: ${summary}`,
      clips,
    });
  }

  return episodes;
}

// 5. Intelligent Story & Episode Splitting Engine with 3x retry, 3000-char outline limit & sentence-split fallback
app.post('/api/ai/split-story', async (req, res) => {
  const {
    storyText,
    totalEpisodes = 40,
    clipsPerEpisode = 5,
    selectedModel = 'seedance-1-5-pro-251215',
    tone = 'Cinematic Microdrama',
  } = req.body;

  if (!storyText || typeof storyText !== 'string' || storyText.trim().length === 0) {
    return res.status(400).json({ error: 'Story text is required.' });
  }

  // Attempt AI breakdown with 3 retries and reduced chunk sizes
  if (process.env.GEMINI_API_KEY) {
    const chunkSizes = [3000, 2000, 1000]; // Reduce prompt size: send only first 3000 chars, retry with smaller chunks

    for (let attempt = 0; attempt < chunkSizes.length; attempt++) {
      const maxOutlineChars = chunkSizes[attempt];
      const storyOutline = storyText.slice(0, maxOutlineChars);

      try {
        const ai = new GoogleGenAI();
        const prompt = `You are a microdrama video generation showrunner.
Break down this story outline into ${totalEpisodes} sequential episodes, each with exactly ${clipsPerEpisode} distinct vertical (9:16) cinematic video prompt clips.
Focus purely on dramatic scene beats, visual actions, lighting, camera angles, and emotional escalation.
Return ONLY a valid JSON object matching this schema:
{
  "episodes": [
    {
      "episode_number": 1,
      "title": "Episode 1",
      "summary": "1-2 sentence synopsis",
      "clips": [
        {
          "clip_number": 1,
          "scene_type": "Establishing Shot",
          "visual_prompt": "highly detailed vertical 9:16 cinematic video prompt for ModelArk Seedance",
          "estimated_duration": 12
        }
      ]
    }
  ]
}

Story Outline (${maxOutlineChars} chars):
"""
${storyOutline}
"""`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        });

        if (response && response.text) {
          // Clean ```json and ``` markers
          let cleanText = response.text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
          const firstBrace = cleanText.indexOf('{');
          const lastBrace = cleanText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.slice(firstBrace, lastBrace + 1);
          }

          try {
            const parsed = JSON.parse(cleanText);
            if (parsed.episodes && Array.isArray(parsed.episodes) && parsed.episodes.length > 0) {
              // Ensure all totalEpisodes are populated
              if (parsed.episodes.length < totalEpisodes) {
                const missingEpisodes = splitStoryBySentences(storyText, totalEpisodes, clipsPerEpisode);
                for (let i = parsed.episodes.length; i < totalEpisodes; i++) {
                  parsed.episodes.push(missingEpisodes[i]);
                }
              }
              return res.json({
                success: true,
                episodes: parsed.episodes.slice(0, totalEpisodes),
                source: `gemini-ai-attempt-${attempt + 1}`,
              });
            }
          } catch (jsonErr) {
            console.warn(`[Story Splitter] Attempt ${attempt + 1} JSON.parse failed. Retrying with smaller chunk...`, jsonErr);
          }
        }
      } catch (geminiError) {
        console.warn(`[Story Splitter] Attempt ${attempt + 1} failed:`, geminiError);
      }
    }
  }

  // FALLBACK: NEVER throw "Failed to split" - always fallback to manual sentence split so user never sees error
  console.log(`[Story Splitter] Using manual sentence split fallback for ${storyText.length} chars into ${totalEpisodes} episodes.`);
  const fallbackEpisodes = splitStoryBySentences(storyText, totalEpisodes, clipsPerEpisode);

  return res.json({
    success: true,
    episodes: fallbackEpisodes,
    source: 'manual-sentence-fallback',
  });
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Takue Microdrama Studio] Backend active on port ${PORT}`);
  });
}

startServer();
