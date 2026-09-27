/**
 * INT-2026-025 (D3, D11): Downsampling auf 16 kHz, Base64-Rundlauf, WAV-Kopf.
 */
import { describe, it, expect } from 'vitest';
import { base64ZuInt16, dauerSekunden, downsampleAuf16k, int16ZuBase64, rms, wavKopf } from '../../src/shared/anruf-audio.js';

describe('downsampleAuf16k', () => {
  it('48 kHz → 16 kHz: Länge durch 3, Mittelwert', () => {
    const input = new Float32Array(48000).fill(0.5);
    const out = downsampleAuf16k(input, 48000);
    expect(out.length).toBe(16000);
    expect(out[0]).toBe(Math.round(0.5 * 0x7fff));
  });

  it('44,1 kHz: Länge gerundet', () => {
    expect(downsampleAuf16k(new Float32Array(44100), 44100).length).toBe(16000);
  });

  it('begrenzt Werte außerhalb −1…1', () => {
    const out = downsampleAuf16k(new Float32Array([2, -2, 1, -1]), 16000);
    expect(Array.from(out)).toEqual([32767, -32768, 32767, -32768]);
  });

  it('8 kHz → 16 kHz: lineare Interpolation', () => {
    const out = downsampleAuf16k(new Float32Array([0, 1]), 8000);
    expect(Array.from(out)).toEqual([0, Math.round(0.5 * 0x7fff), 32767, 32767]);
  });

  it('leer oder ungültige Rate → leer', () => {
    expect(downsampleAuf16k(new Float32Array(0), 48000).length).toBe(0);
    expect(downsampleAuf16k(new Float32Array(10), 0).length).toBe(0);
  });
});

describe('Base64', () => {
  it('Rundlauf erhält alle Werte', () => {
    const pcm = new Int16Array([0, 1, -1, 32767, -32768, 12345, -12345]);
    expect(Array.from(base64ZuInt16(int16ZuBase64(pcm)))).toEqual(Array.from(pcm));
  });

  it('Little Endian', () => {
    expect(int16ZuBase64(new Int16Array([1]))).toBe('AQA=');
  });

  it('großer Puffer (30 s)', () => {
    const pcm = new Int16Array(16000 * 30).map((_, i) => (i % 65536) - 32768);
    const b64 = int16ZuBase64(pcm);
    expect(base64ZuInt16(b64)).toEqual(pcm);
  });
});

describe('wavKopf', () => {
  it('44 Byte RIFF/WAVE mono 16 bit', () => {
    const k = wavKopf(32000);
    const v = new DataView(k.buffer);
    const text = (pos: number, len: number): string => String.fromCharCode(...k.subarray(pos, pos + len));
    expect(k.length).toBe(44);
    expect(text(0, 4)).toBe('RIFF');
    expect(v.getUint32(4, true)).toBe(36 + 32000);
    expect(text(8, 4)).toBe('WAVE');
    expect(text(12, 4)).toBe('fmt ');
    expect(v.getUint32(16, true)).toBe(16);
    expect(v.getUint16(20, true)).toBe(1);
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint32(24, true)).toBe(16000);
    expect(v.getUint32(28, true)).toBe(32000);
    expect(v.getUint16(32, true)).toBe(2);
    expect(v.getUint16(34, true)).toBe(16);
    expect(text(36, 4)).toBe('data');
    expect(v.getUint32(40, true)).toBe(32000);
  });
});

describe('rms und Dauer', () => {
  it('Stille 0, Vollaussteuerung ~1', () => {
    expect(rms(new Int16Array(100))).toBe(0);
    expect(rms(new Int16Array(0))).toBe(0);
    expect(rms(new Int16Array(100).fill(-32768))).toBeCloseTo(1, 5);
  });
  it('Dauer in Sekunden', () => {
    expect(dauerSekunden(new Int16Array(24000))).toBe(1.5);
    expect(dauerSekunden(new Int16Array(8000), 8000)).toBe(1);
  });
});
