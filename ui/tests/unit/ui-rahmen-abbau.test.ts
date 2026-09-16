// @vitest-environment happy-dom
/**
 * FA-19 / AK-16 guard (INT-2026-010, stage 1): the old frame is gone from the
 * Web-UI — chat view, voice call, project tabs, phone shell, the chat/voice
 * backend and the image upload. Reads `ui/src` and `ui/frontend/src`
 * recursively (like story-path-removed.test.ts) and expects no trace of the
 * removed files, tags and message types. Wording avoids the literal old route
 * names as whole words where a surviving file legitimately keeps them
 * (`team-view.ts` builds a dead `#/call/…` link, NZ-03).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const UI = resolve(__dirname, '../..');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      sourceFiles(p, out);
    } else if (/\.(ts|css|html)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

function hits(files: string[], needle: RegExp): string[] {
  return files.filter((f) => needle.test(readFileSync(f, 'utf8'))).map((f) => f.slice(UI.length + 1));
}

const files = [...sourceFiles(join(UI, 'src')), ...sourceFiles(join(UI, 'frontend', 'src'))];

describe('frame teardown (INT-2026-010, FA-19, AK-16)', () => {
  it('the removed frontend files are gone', () => {
    const gone = [
      'frontend/src/views/chat-view.ts',
      'frontend/src/views/voice-call-view.ts',
      'frontend/src/components/voice/call-controls.ts',
      'frontend/src/components/chat-message.ts',
      'frontend/src/components/tool-call-badge.ts',
      'frontend/src/components/aos-image-staging-area.ts',
      'frontend/src/components/aos-image-lightbox.ts',
      'frontend/src/services/audio-capture.service.ts',
      'frontend/src/services/audio-playback.service.ts',
      'frontend/src/components/aos-project-tabs.ts',
      'frontend/src/components/mobile/aos-mobile-bottom-nav.ts',
      'frontend/src/components/mobile/aos-mobile-side-drawer.ts',
      'frontend/src/components/mobile/aos-mobile-sheet.ts',
      'frontend/src/components/mobile/aos-mobile-top-bar.ts',
      'frontend/src/components/mobile/aos-mobile-terminal-pill.ts',
      'frontend/src/components/mobile/aos-mobile-project-scroller.ts',
      'frontend/src/components/mobile/aos-mobile-project-chip.ts',
      'frontend/src/components/mobile/aos-mobile-branch-row.ts',
    ];
    for (const rel of gone) expect(existsSync(join(UI, rel)), rel).toBe(false);
    expect(existsSync(join(UI, 'frontend/src/components/voice'))).toBe(false);
  });

  it('the removed backend files are gone; the voice protocol type stays (team-view imports it)', () => {
    const gone = [
      'src/server/claude-handler.ts',
      'src/server/image-storage.ts',
      'src/server/routes/image-upload.routes.ts',
      'src/server/services/voice-call.service.ts',
      'src/server/services/deepgram.adapter.ts',
      'src/server/services/elevenlabs.adapter.ts',
      'src/server/services/transcript.service.ts',
      'src/server/voice-config.ts',
    ];
    for (const rel of gone) expect(existsSync(join(UI, rel)), rel).toBe(false);
    expect(existsSync(join(UI, 'src/shared/types/voice.protocol.ts'))).toBe(true);
  });

  it('no source mentions the removed tags', () => {
    expect(hits(files, /aos-chat-view|aos-voice-call-view|aos-project-tabs|aos-mobile-bottom-nav|aos-mobile-top-bar|aos-mobile-side-drawer|aos-mobile-terminal-pill|aos-image-lightbox|aos-image-staging-area/)).toEqual([]);
  });

  it('no sender or handler for the chat, voice-call, voice-settings and image-upload messages is left', () => {
    // `settings.voice.get` in team-view.ts is tolerated (NZ-03, review F19: the default branch acks unknown types).
    expect(hits(files, /chat\.send|chat\.history|chat\.clear|chat\.settings/)).toEqual([]);
    expect(hits(files, /voice:call:|voice:audio:|voice:tts:|voice:agent:response/)).toEqual([]);
    // the message-type union in voice.protocol.ts stays (team-view imports the file, NZ-03)
    expect(hits(files, /settings\.voice\.update/).filter((f) => f !== 'src/shared/types/voice.protocol.ts')).toEqual([]);
    expect(hits(files, /\/api\/images/)).toEqual([]);
    expect(hits(files, /sendChatWithImages|sendModelSettings|sendVoiceCallStart|sendVoiceAudioChunk/)).toEqual([]);
  });

  it('the frame CSS is gone with the frame: no app sidebar, header actions, project tabs or badges', () => {
    const css = readFileSync(join(UI, 'frontend/src/styles/theme.css'), 'utf8');
    for (const sel of ['aos-app .sidebar', '.project-tabs', '.update-badge', '.version-label', '.claude-concurrency-badge', '.terminal-btn', '--sidebar-width:', '.mobile-dashboard']) {
      expect(css.includes(sel), sel).toBe(false);
    }
    expect(css.includes('aos-app .kopfzeile')).toBe(true);
    expect(css.includes('aos-app .glocke-btn')).toBe(true);
  });

  it('the removed elements are not registered in the browser', async () => {
    await import('../../frontend/src/app.js');
    for (const tag of ['aos-chat-view', 'aos-voice-call-view', 'aos-project-tabs', 'aos-mobile-bottom-nav', 'aos-mobile-top-bar', 'aos-mobile-side-drawer']) {
      expect(customElements.get(tag), tag).toBeUndefined();
    }
    for (const tag of ['aos-app', 'aos-kopfzeile', 'aos-glocke', 'aos-vorhaben-view']) {
      expect(customElements.get(tag), tag).toBeDefined();
    }
  });
});
