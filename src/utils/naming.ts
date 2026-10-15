/**
 * Authoritative file naming and numbering utilities for Takue Microdrama Studio.
 * Enforces standard 3-digit zero-padding format:
 * - Clip: Takue_Microdrama_Ep001_Clip001.mp4
 * - Combined: Takue_Microdrama_Episode_001.mp4
 */

export function padNumber(num: number, digits: number = 3): string {
  return String(num).padStart(digits, '0');
}

export function getDefaultClipFilename(episodeNumber: number, clipNumber: number): string {
  const epPadded = padNumber(episodeNumber, 3);
  const clipPadded = padNumber(clipNumber, 3);
  return `Takue_Microdrama_Ep${epPadded}_Clip${clipPadded}.mp4`;
}

export function getDefaultEpisodeFilename(episodeNumber: number): string {
  const epPadded = padNumber(episodeNumber, 3);
  return `Takue_Microdrama_Episode_${epPadded}.mp4`;
}

export function formatClipSequenceLabel(episodeNumber: number, clipNumber: number, totalClips: number = 5): string {
  return `Episode ${episodeNumber} — Clip ${clipNumber} of ${totalClips}`;
}

export function formatEpisodeBadge(episodeNumber: number): string {
  return `EP ${padNumber(episodeNumber, 3)}`;
}

export function formatClipBadge(clipNumber: number, totalClips: number = 5): string {
  return `Clip ${padNumber(clipNumber, 3)} / ${padNumber(totalClips, 3)}`;
}
