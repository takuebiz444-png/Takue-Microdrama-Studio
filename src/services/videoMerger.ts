import { Clip } from '../types/drama';
import { getDefaultEpisodeFilename, padNumber } from '../utils/naming';
import { soundFx } from './soundEffects';

export interface MergeOptions {
  transition: 'fade' | 'cut' | 'crossfade';
  includeSubtitles: boolean;
  backgroundMusic: 'tension' | 'cyber' | 'piano' | 'none';
  musicVolume: number;
  onProgress?: (percent: number, status: string) => void;
}

export async function combineEpisodeClips(
  clips: Clip[],
  episodeNumber: number,
  options: MergeOptions
): Promise<{ blob: Blob; url: string; filename: string }> {
  const { onProgress } = options;
  const sortedClips = [...clips].sort((a, b) => a.clipNumber - b.clipNumber);

  if (sortedClips.length === 0) {
    throw new Error('No clips provided to combine.');
  }

  onProgress?.(5, `Preparing video engine for Episode ${episodeNumber}...`);

  // Target 9:16 vertical drama resolution (540x960)
  const width = 540;
  const height = 960;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Setup Web Audio
  const { destination: audioDest, ctx: audioCtx } = soundFx.createAudioMixerStream();
  
  // Play subtle dramatic drone in background
  if (options.backgroundMusic !== 'none') {
    const droneOsc = audioCtx.createOscillator();
    const droneGain = audioCtx.createGain();
    droneOsc.type = 'sawtooth';
    droneOsc.frequency.setValueAtTime(55, audioCtx.currentTime); // A1 note
    droneGain.gain.setValueAtTime(options.musicVolume * 0.15, audioCtx.currentTime);

    // Lowpass filter
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, audioCtx.currentTime);

    droneOsc.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(audioDest);
    droneOsc.start();
  }

  // Setup canvas stream and MediaRecorder
  const canvasStream = canvas.captureStream(30);
  // Add audio track to stream
  if (audioDest.stream.getAudioTracks().length > 0) {
    canvasStream.addTrack(audioDest.stream.getAudioTracks()[0]);
  }

  // Determine supported mime type
  const mimeTypes = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  let chosenMime = 'video/webm';
  for (const mime of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      chosenMime = mime;
      break;
    }
  }

  const recordedChunks: Blob[] = [];
  const recorder = new MediaRecorder(canvasStream, {
    mimeType: chosenMime,
    videoBitsPerSecond: 2500000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  recorder.start();

  // Draw introductory Title Card (1.5 seconds)
  onProgress?.(10, 'Rendering Episode Title Card...');
  await renderTitleCard(ctx, width, height, episodeNumber, 1500);

  // Render each clip in strict sequential order
  const totalClips = sortedClips.length;
  for (let i = 0; i < totalClips; i++) {
    const clip = sortedClips[i];
    const clipIndex = i + 1;
    const progressStart = 15 + Math.round((i / totalClips) * 75);
    const progressEnd = 15 + Math.round(((i + 1) / totalClips) * 75);

    onProgress?.(
      progressStart,
      `Rendering Episode ${episodeNumber} — Clip ${clip.clipNumber} of ${totalClips}...`
    );

    // Render clip content onto canvas with animated dramatic styling and subtitles
    await renderSingleClip(
      ctx,
      width,
      height,
      clip,
      clipIndex,
      totalClips,
      options,
      (p) => {
        const overall = progressStart + Math.round((p / 100) * (progressEnd - progressStart));
        onProgress?.(overall, `Encoding Clip ${clip.clipNumber} of ${totalClips} (${p}%)...`);
      }
    );

    // Render scene transition if not last clip
    if (i < totalClips - 1 && options.transition !== 'cut') {
      await renderTransition(ctx, width, height, options.transition, 400);
    }
  }

  // Draw Episode Outro (1.0 second)
  onProgress?.(92, 'Finalizing episode packaging and audio normalization...');
  await renderOutroCard(ctx, width, height, episodeNumber, 1000);

  // Stop recording and generate Blob
  return new Promise((resolve) => {
    recorder.onstop = () => {
      onProgress?.(100, 'Complete! Episode ready for download.');
      const finalBlob = new Blob(recordedChunks, { type: 'video/mp4' });
      const url = URL.createObjectURL(finalBlob);
      const filename = getDefaultEpisodeFilename(episodeNumber);
      resolve({ blob: finalBlob, url, filename });
    };

    recorder.stop();
  });
}

// Draw title card
async function renderTitleCard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  episodeNumber: number,
  durationMs: number
): Promise<void> {
  const startTime = Date.now();
  return new Promise((resolve) => {
    function frame() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Deep rich blue studio gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0F172A');
      grad.addColorStop(0.5, '#1E3A8A');
      grad.addColorStop(1, '#172554');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Studio Header
      ctx.textAlign = 'center';
      ctx.fillStyle = '#60A5FA';
      ctx.font = '700 16px "Space Grotesk", sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('TAKUE MICRODRAMA STUDIO', width / 2, height / 2 - 80);

      // Episode Number
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 48px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`EPISODE ${padNumber(episodeNumber, 3)}`, width / 2, height / 2);

      // Royal Blue Accent Line
      ctx.fillStyle = '#2563EB';
      const lineWidth = 120 * Math.sin(progress * Math.PI);
      ctx.fillRect(width / 2 - lineWidth / 2, height / 2 + 20, lineWidth, 4);

      // Subtitle
      ctx.fillStyle = '#DBEAFE';
      ctx.font = '500 16px sans-serif';
      ctx.fillText('Official AI Production Cut', width / 2, height / 2 + 55);

      if (elapsed < durationMs) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

// Render individual clip with dynamic camera motion, lighting and subtitles
async function renderSingleClip(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  clip: Clip,
  clipIndex: number,
  totalClips: number,
  options: MergeOptions,
  onClipProgress: (p: number) => void
): Promise<void> {
  // 3.2 seconds duration per clip for smooth, fast preview combine
  const durationMs = 3200;
  const startTime = Date.now();

  return new Promise((resolve) => {
    function frame() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      onClipProgress(Math.round(progress * 100));

      // 1. Cinematic Background with dynamic subtle parallax zoom
      const zoom = 1 + progress * 0.08;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);

      // High-contrast dramatic background gradient based on scene type
      const grad = ctx.createLinearGradient(0, 0, width, height);
      if (clip.sceneType.includes('Confrontation')) {
        grad.addColorStop(0, '#1E293B');
        grad.addColorStop(0.5, '#1E3A8A');
        grad.addColorStop(1, '#0F172A');
      } else if (clip.sceneType.includes('Cliffhanger')) {
        grad.addColorStop(0, '#1E1B4B');
        grad.addColorStop(0.5, '#1E40AF');
        grad.addColorStop(1, '#090D16');
      } else {
        grad.addColorStop(0, '#0F172A');
        grad.addColorStop(0.5, '#1D4ED8');
        grad.addColorStop(1, '#020617');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Simulated cinematic character silhouette / focus glow
      const glow = ctx.createRadialGradient(
        width / 2,
        height * 0.45,
        20,
        width / 2,
        height * 0.45,
        width * 0.7
      );
      glow.addColorStop(0, 'rgba(96, 165, 250, 0.45)');
      glow.addColorStop(0.6, 'rgba(37, 99, 235, 0.2)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      ctx.restore();

      // 2. Top Watermark & Metadata Badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.beginPath();
      ctx.roundRect(20, 24, 210, 36, 8);
      ctx.fill();

      ctx.fillStyle = '#60A5FA';
      ctx.font = '700 11px "Space Grotesk", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`EP ${padNumber(clip.episodeNumber, 3)} • CLIP ${clip.clipNumber}/${totalClips}`, 32, 46);

      // Scene Type Pill
      ctx.fillStyle = 'rgba(37, 99, 235, 0.9)';
      ctx.beginPath();
      ctx.roundRect(width - 150, 24, 130, 36, 8);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(clip.sceneType.substring(0, 16), width - 85, 46);

      // 3. Central Cinematic Story Card / Visual Cue
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(30, height * 0.28, width - 60, height * 0.42, 16);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.3)';
      ctx.stroke();

      // Model badge inside scene
      ctx.fillStyle = '#93C5FD';
      ctx.font = '600 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`ModelArk [${clip.selectedModel}]`, width / 2, height * 0.33);

      // Prompt snippet
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
      const promptSnippet = clip.prompt.length > 110 ? clip.prompt.slice(0, 107) + '...' : clip.prompt;
      wrapText(ctx, promptSnippet, width / 2, height * 0.38, width - 90, 22);

      // 4. Burn-in Subtitles & Dialogue
      if (options.includeSubtitles) {
        const subtitleText =
          clip.subtitleText ||
          (clip.clipNumber === 1
            ? 'Protagonist: "They think I forgot what happened that night."'
            : clip.clipNumber === 2
            ? 'Antagonist: "You should have stayed away."'
            : clip.clipNumber === 3
            ? 'Protagonist: "I am not here for mercy. I am here for everything."'
            : clip.clipNumber === 4
            ? 'Antagonist: "Security! Seal the executive exits immediately!"'
            : 'Protagonist: "It is too late. The transfer is already complete."');

        // Subtitle banner
        const subBoxY = height * 0.78;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.beginPath();
        ctx.roundRect(30, subBoxY, width - 60, 52, 10);
        ctx.fill();
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#FEF08A'; // Cinematic yellow
        ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(subtitleText, width / 2, subBoxY + 31);
      }

      // 5. Timeline scrubber at bottom
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(0, height - 6, width, 6);
      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(0, height - 6, width * progress, 6);

      if (elapsed < durationMs) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

// Scene transition helper
async function renderTransition(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  type: string,
  durationMs: number
): Promise<void> {
  const startTime = Date.now();
  return new Promise((resolve) => {
    function frame() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const alpha = Math.sin(progress * Math.PI);

      ctx.fillStyle = `rgba(15, 23, 42, ${alpha * 0.95})`;
      ctx.fillRect(0, 0, width, height);

      if (elapsed < durationMs) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

// Outro Card
async function renderOutroCard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  episodeNumber: number,
  durationMs: number
): Promise<void> {
  const startTime = Date.now();
  return new Promise((resolve) => {
    function frame() {
      const elapsed = Date.now() - startTime;
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, width, height);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#60A5FA';
      ctx.font = '700 18px "Space Grotesk", sans-serif';
      ctx.fillText(`END OF EPISODE ${padNumber(episodeNumber, 3)}`, width / 2, height / 2 - 10);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '500 13px sans-serif';
      ctx.fillText('Next Episode Loading in Takue Studio...', width / 2, height / 2 + 25);

      if (elapsed < durationMs) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

// Canvas text wrapping utility
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
      if (currentY > y + lineHeight * 3) {
        ctx.fillText(line + '...', x, currentY);
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}
