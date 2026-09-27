/**
 * Audio-Helfer des Anrufmodus (INT-2026-025, D3, D11): Mikrofonpuffer auf
 * 16 kHz Int16 mono, Base64 für `anruf:erkennen`, WAV-Kopf für whisper-server.
 * Rein, ohne IO; läuft im Browser und in Node (btoa/atob, kein Buffer).
 */

export const ANRUF_RATE = 16000;

/** Float-Probe (−1…1) → Int16 mit Begrenzung. */
function zuInt16(s: number): number {
  const c = Number.isNaN(s) ? 0 : Math.max(-1, Math.min(1, s));
  return c < 0 ? Math.round(c * 0x8000) : Math.round(c * 0x7fff);
}

/**
 * Auf 16 kHz: bei höherer Eingangsrate Mittelwert je Ausgabefenster,
 * sonst lineare Interpolation; Werte außerhalb −1…1 werden begrenzt.
 */
export function downsampleAuf16k(input: Float32Array, eingangsRate: number): Int16Array {
  if (!(eingangsRate > 0) || input.length === 0) return new Int16Array(0);
  const verhaeltnis = eingangsRate / ANRUF_RATE;
  const laenge = Math.floor(input.length / verhaeltnis);
  const aus = new Int16Array(laenge);
  if (verhaeltnis >= 1) {
    for (let i = 0; i < laenge; i++) {
      const start = Math.floor(i * verhaeltnis);
      const ende = Math.min(input.length, Math.max(start + 1, Math.floor((i + 1) * verhaeltnis)));
      let summe = 0;
      for (let j = start; j < ende; j++) summe += input[j] ?? 0;
      aus[i] = zuInt16(summe / (ende - start));
    }
  } else {
    for (let i = 0; i < laenge; i++) {
      const pos = i * verhaeltnis;
      const links = Math.floor(pos);
      const rechts = Math.min(input.length - 1, links + 1);
      const anteil = pos - links;
      aus[i] = zuInt16((input[links] ?? 0) * (1 - anteil) + (input[rechts] ?? 0) * anteil);
    }
  }
  return aus;
}

/** Int16-PCM (Little Endian) → Base64. */
export function int16ZuBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < pcm.length; i++) view.setInt16(i * 2, pcm[i] ?? 0, true);
  let binaer = '';
  const block = 0x8000;
  for (let i = 0; i < bytes.length; i += block) {
    binaer += String.fromCharCode(...bytes.subarray(i, i + block));
  }
  return btoa(binaer);
}

/** Base64 → Int16-PCM (Little Endian); ein überzähliges Byte fällt weg. Ungültiges Base64 wirft. */
export function base64ZuInt16(b64: string): Int16Array {
  const binaer = atob(b64);
  const pcm = new Int16Array(Math.floor(binaer.length / 2));
  for (let i = 0; i < pcm.length; i++) {
    const lo = binaer.charCodeAt(i * 2);
    const hi = binaer.charCodeAt(i * 2 + 1);
    const wert = (hi << 8) | lo;
    pcm[i] = wert >= 0x8000 ? wert - 0x10000 : wert;
  }
  return pcm;
}

/** 44-Byte-Kopf RIFF/WAVE, PCM mono 16 bit, für `pcmBytes` Nutzdaten. */
export function wavKopf(pcmBytes: number, rate: number = ANRUF_RATE): Uint8Array {
  const kopf = new Uint8Array(44);
  const v = new DataView(kopf.buffer);
  const text = (pos: number, s: string): void => {
    for (let i = 0; i < s.length; i++) v.setUint8(pos + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  v.setUint32(4, 36 + pcmBytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  v.setUint32(16, 16, true); // Größe des fmt-Blocks
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); // Bytes je Sekunde
  v.setUint16(32, 2, true); // Bytes je Probe
  v.setUint16(34, 16, true); // Bit je Probe
  text(36, 'data');
  v.setUint32(40, pcmBytes, true);
  return kopf;
}

/** Effektivwert 0…1 (1 = Vollaussteuerung); leer → 0. */
export function rms(pcm: Int16Array): number {
  if (pcm.length === 0) return 0;
  let summe = 0;
  for (let i = 0; i < pcm.length; i++) {
    const s = (pcm[i] ?? 0) / 0x8000;
    summe += s * s;
  }
  return Math.sqrt(summe / pcm.length);
}

/** Dauer in Sekunden. */
export function dauerSekunden(pcm: Int16Array, rate: number = ANRUF_RATE): number {
  return rate > 0 ? pcm.length / rate : 0;
}
