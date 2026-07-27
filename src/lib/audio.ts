/** Grabación de audio en WAV (16 kHz mono) — compatible con iOS Safari y Android. */

function encodeWav(chunks: Float32Array[], sampleRate: number, targetRate = 16000): Blob {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }

  // Downsample
  const ratio = sampleRate / targetRate;
  const outLength = Math.floor(merged.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), merged.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += merged[j];
    out[i] = sum / Math.max(1, end - start);
  }

  const buffer = new ArrayBuffer(44 + out.length * 2);
  const view = new DataView(buffer);
  const writeStr = (pos: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(pos + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + out.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, out.length * 2, true);

  let pos = 44;
  for (let i = 0; i < out.length; i++) {
    const s = Math.max(-1, Math.min(1, out[i]));
    view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    pos += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export interface Recorder {
  stop: () => Promise<Blob>;
  cancel: () => void;
  getLevel: () => number;
}

export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  if (ctx.state === "suspended") await ctx.resume();

  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  const node = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];

  node.onaudioprocess = (e) => {
    chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  };

  source.connect(analyser);
  source.connect(node);
  node.connect(ctx.destination);

  const levelData = new Uint8Array(analyser.frequencyBinCount);

  const teardown = () => {
    try {
      node.disconnect();
      analyser.disconnect();
      source.disconnect();
    } catch {
      /* noop */
    }
    stream.getTracks().forEach((t) => t.stop());
  };

  return {
    getLevel: () => {
      analyser.getByteFrequencyData(levelData);
      let sum = 0;
      for (let i = 0; i < levelData.length; i++) sum += levelData[i];
      return Math.min(1, sum / levelData.length / 90);
    },
    stop: async () => {
      const rate = ctx.sampleRate;
      teardown();
      await ctx.close();
      return encodeWav(chunks, rate);
    },
    cancel: () => {
      teardown();
      void ctx.close();
    },
  };
}
