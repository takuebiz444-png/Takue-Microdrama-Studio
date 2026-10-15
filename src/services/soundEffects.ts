/**
 * Web Audio synthesizer for cinematic microdrama music and sound effects.
 * Works completely offline without external asset dependencies.
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play a dramatic impact boom
  playDramaticBoom(volume = 0.5) {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 1.2);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } catch (e) {
      // Audio might be blocked until user interaction
    }
  }

  // Play cinematic tension whoosh
  playWhoosh(volume = 0.4) {
    try {
      const ctx = this.getContext();
      const bufferSize = ctx.sampleRate * 0.8;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.4);
      filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.8);
      filter.Q.value = 3;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + 0.85);
    } catch (e) {}
  }

  // Play heartbeats for high tension
  playHeartbeat(volume = 0.4) {
    try {
      const ctx = this.getContext();
      const beats = [0, 0.25];
      beats.forEach((timeOffset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(75, ctx.currentTime + timeOffset);
        osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + timeOffset + 0.15);

        gain.gain.setValueAtTime(volume, ctx.currentTime + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.22);
      });
    } catch (e) {}
  }

  // Generate an AudioNode stream destination for mixing into MediaRecorder
  createAudioMixerStream(): { destination: MediaStreamAudioDestinationNode; ctx: AudioContext } {
    const ctx = this.getContext();
    const destination = ctx.createMediaStreamDestination();
    return { destination, ctx };
  }
}

export const soundFx = new AudioSynthesizer();
