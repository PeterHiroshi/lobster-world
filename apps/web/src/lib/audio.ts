// Procedural sound effects using Web Audio API
// All sounds are generated programmatically — no audio files needed

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isMuted = false;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function getMasterGain(): GainNode {
  getContext();
  return masterGain!;
}

export function setMuted(muted: boolean): void {
  isMuted = muted;
  if (masterGain) {
    masterGain.gain.value = muted ? 0 : 0.3;
  }
}

export function getMuted(): boolean {
  return isMuted;
}

// Chat notification — soft ping (sine wave with decay)
export function playChatPing(): void {
  if (isMuted) return;
  const ctx = getContext();
  const gain = getMasterGain();

  const osc = ctx.createOscillator();
  const env = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);

  env.gain.setValueAtTime(0.15, ctx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  osc.connect(env);
  env.connect(gain);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

// Typing click — short noise burst
export function playTypingClick(): void {
  if (isMuted) return;
  const ctx = getContext();
  const gain = getMasterGain();

  const bufferSize = ctx.sampleRate * 0.02; // 20ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;

  const env = ctx.createGain();
  env.gain.value = 0.05;

  source.connect(filter);
  filter.connect(env);
  env.connect(gain);

  source.start(ctx.currentTime);
}

// Join celebration — rising tone
export function playJoinSound(): void {
  if (isMuted) return;
  const ctx = getContext();
  const gain = getMasterGain();

  const osc = ctx.createOscillator();
  const env = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);

  env.gain.setValueAtTime(0.1, ctx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

  osc.connect(env);
  env.connect(gain);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);
}
