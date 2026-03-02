/**
 * TranscriptService
 *
 * Persists voice call transcripts as JSON files in specwright/transcripts/.
 * Called by VoiceCallService at call end to save the complete conversation.
 *
 * Storage format: { sessionId, skillId, agentName, startTime, endTime, messages[], actions[] }
 * File naming: YYYY-MM-DD-HH-mm-skillId.json
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface TranscriptMessage {
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
}

export interface TranscriptAction {
  toolId: string;
  toolName: string;
  timestamp: string;
  output?: string;
}

export interface TranscriptData {
  sessionId: string;
  skillId: string;
  agentName?: string;
  startTime: string;
  endTime: string;
  messages: TranscriptMessage[];
  actions: TranscriptAction[];
}

/**
 * Save a transcript to the project's specwright/transcripts/ directory.
 * @param projectPath - Project root directory
 * @param data - Transcript data to save
 * @returns Path to the saved transcript file
 */
export function saveTranscript(projectPath: string, data: TranscriptData): string {
  const transcriptDir = join(projectPath, 'specwright', 'transcripts');

  if (!existsSync(transcriptDir)) {
    mkdirSync(transcriptDir, { recursive: true });
  }

  const startDate = new Date(data.startTime);
  const pad = (n: number): string => String(n).padStart(2, '0');
  const dateStr = [
    startDate.getFullYear(),
    pad(startDate.getMonth() + 1),
    pad(startDate.getDate()),
    pad(startDate.getHours()),
    pad(startDate.getMinutes()),
  ].join('-');

  const safeSkillId = data.skillId.replace(/[^a-zA-Z0-9-_]/g, '-');
  const filename = `${dateStr}-${safeSkillId}.json`;
  const filePath = join(transcriptDir, filename);

  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[TranscriptService] Saved transcript: ${filePath}`);

  return filePath;
}

/**
 * Load a transcript from a file path.
 * @param filePath - Path to the transcript JSON file
 * @returns Parsed transcript data
 */
export function loadTranscript(filePath: string): TranscriptData {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as TranscriptData;
}

/**
 * List all transcript files in a project's specwright/transcripts/ directory.
 * @param projectPath - Project root directory
 * @returns Array of transcript file paths, sorted newest first
 */
export function listTranscripts(projectPath: string): string[] {
  const transcriptDir = join(projectPath, 'specwright', 'transcripts');

  if (!existsSync(transcriptDir)) {
    return [];
  }

  return readdirSync(transcriptDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse()
    .map(f => join(transcriptDir, f));
}
