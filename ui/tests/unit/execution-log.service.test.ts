import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionLogService } from '../../src/server/services/execution-log.service.js';

// Mock the websocket-manager to prevent actual broadcasts during tests
vi.mock('../../src/server/websocket-manager.service.js', () => ({
  webSocketManager: {
    broadcast: vi.fn()
  }
}));

import { webSocketManager } from '../../src/server/websocket-manager.service.js';

describe('ExecutionLogService', () => {
  let service: ExecutionLogService;

  beforeEach(() => {
    service = new ExecutionLogService();
    vi.clearAllMocks();
  });

  describe('addEntry()', () => {
    it('should add a log entry with all fields', () => {
      const entry = service.addEntry(
        'spec-start',
        '/projects/a',
        'Project A',
        'spec-001',
        'My Spec',
        'Spec gestartet: My Spec'
      );

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.type).toBe('spec-start');
      expect(entry.projectPath).toBe('/projects/a');
      expect(entry.projectName).toBe('Project A');
      expect(entry.specId).toBe('spec-001');
      expect(entry.specName).toBe('My Spec');
      expect(entry.message).toBe('Spec gestartet: My Spec');
      expect(entry.storyId).toBeUndefined();
      expect(entry.storyTitle).toBeUndefined();
    });

    it('should include optional storyId and storyTitle', () => {
      const entry = service.addEntry(
        'story-start',
        '/projects/a',
        'Project A',
        'spec-001',
        'My Spec',
        'Story gestartet: GSQ-001',
        'GSQ-001',
        'Backend Service'
      );

      expect(entry.storyId).toBe('GSQ-001');
      expect(entry.storyTitle).toBe('Backend Service');
    });

    it('should broadcast the new entry via WebSocket', () => {
      service.addEntry(
        'spec-start',
        '/projects/a',
        'Project A',
        'spec-001',
        'My Spec',
        'Spec gestartet'
      );

      expect(webSocketManager.broadcast).toHaveBeenCalledOnce();
      const broadcastCall = vi.mocked(webSocketManager.broadcast).mock.calls[0][0];
      expect(broadcastCall.type).toBe('queue.log.entry');
      expect(broadcastCall.entry).toBeDefined();
    });

    it('should store entries in order', () => {
      service.addEntry('spec-start', '/p', 'P', 's1', 'S1', 'First');
      service.addEntry('story-start', '/p', 'P', 's1', 'S1', 'Second');
      service.addEntry('story-complete', '/p', 'P', 's1', 'S1', 'Third');

      const entries = service.getEntries();
      expect(entries).toHaveLength(3);
      expect(entries[0].message).toBe('First');
      expect(entries[1].message).toBe('Second');
      expect(entries[2].message).toBe('Third');
    });
  });

  describe('FIFO rotation', () => {
    it('should remove oldest entry when exceeding 500 entries', () => {
      // Add 500 entries
      for (let i = 0; i < 500; i++) {
        service.addEntry('spec-start', '/p', 'P', `s${i}`, `S${i}`, `Entry ${i}`);
      }

      expect(service.getCount()).toBe(500);
      expect(service.getEntries()[0].message).toBe('Entry 0');

      // Add one more - should push out the first
      service.addEntry('spec-start', '/p', 'P', 's500', 'S500', 'Entry 500');

      expect(service.getCount()).toBe(500);
      expect(service.getEntries()[0].message).toBe('Entry 1');
      expect(service.getEntries()[499].message).toBe('Entry 500');
    });

    it('should maintain 500 limit after multiple overflows', () => {
      // Add 510 entries
      for (let i = 0; i < 510; i++) {
        service.addEntry('spec-start', '/p', 'P', `s${i}`, `S${i}`, `Entry ${i}`);
      }

      expect(service.getCount()).toBe(500);
      expect(service.getEntries()[0].message).toBe('Entry 10');
      expect(service.getEntries()[499].message).toBe('Entry 509');
    });
  });

  describe('getEntries()', () => {
    it('should return empty array when no entries', () => {
      expect(service.getEntries()).toEqual([]);
    });

    it('should return all entries', () => {
      service.addEntry('spec-start', '/p', 'P', 's1', 'S1', 'One');
      service.addEntry('spec-complete', '/p', 'P', 's1', 'S1', 'Two');

      expect(service.getEntries()).toHaveLength(2);
    });
  });

  describe('clear()', () => {
    it('should remove all entries', () => {
      service.addEntry('spec-start', '/p', 'P', 's1', 'S1', 'One');
      service.addEntry('spec-complete', '/p', 'P', 's1', 'S1', 'Two');

      service.clear();

      expect(service.getEntries()).toEqual([]);
      expect(service.getCount()).toBe(0);
    });
  });

  describe('getCount()', () => {
    it('should return 0 for empty log', () => {
      expect(service.getCount()).toBe(0);
    });

    it('should return correct count', () => {
      service.addEntry('spec-start', '/p', 'P', 's1', 'S1', 'One');
      service.addEntry('spec-complete', '/p', 'P', 's1', 'S1', 'Two');

      expect(service.getCount()).toBe(2);
    });
  });

  describe('log entry types', () => {
    it('should support all defined log types', () => {
      const types = [
        'spec-start',
        'story-start',
        'story-complete',
        'spec-complete',
        'queue-complete',
        'error'
      ] as const;

      for (const type of types) {
        service.addEntry(type, '/p', 'P', 's1', 'S1', `Type: ${type}`);
      }

      const entries = service.getEntries();
      expect(entries).toHaveLength(6);
      expect(entries.map(e => e.type)).toEqual([...types]);
    });
  });
});
