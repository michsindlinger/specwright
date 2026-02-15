import { describe, it, expect, beforeEach } from 'vitest';
import { QueueService } from '../../src/server/services/queue.service.js';

describe('QueueService (Global Queue)', () => {
  let service: QueueService;

  beforeEach(() => {
    service = new QueueService();
  });

  describe('add()', () => {
    it('should add an item to the global queue with projectPath and projectName', () => {
      const item = service.add('/projects/a', 'Project A', 'spec-001', 'My Spec');

      expect(item.specId).toBe('spec-001');
      expect(item.specName).toBe('My Spec');
      expect(item.projectPath).toBe('/projects/a');
      expect(item.projectName).toBe('Project A');
      expect(item.status).toBe('pending');
      expect(item.position).toBe(0);
    });

    it('should allow specs from different projects in the same queue', () => {
      service.add('/projects/a', 'Project A', 'spec-001', 'Spec A');
      service.add('/projects/b', 'Project B', 'spec-002', 'Spec B');

      const items = service.getItems();
      expect(items).toHaveLength(2);
      expect(items[0].projectPath).toBe('/projects/a');
      expect(items[1].projectPath).toBe('/projects/b');
    });

    it('should reject duplicate specId within the same project', () => {
      service.add('/projects/a', 'Project A', 'spec-001', 'Spec A');
      expect(() => service.add('/projects/a', 'Project A', 'spec-001', 'Spec A Dupe'))
        .toThrow('Spec spec-001 is already in the queue');
    });

    it('should allow same specId from different projects', () => {
      service.add('/projects/a', 'Project A', 'spec-001', 'Spec A');
      const item = service.add('/projects/b', 'Project B', 'spec-001', 'Spec B');

      expect(item.projectPath).toBe('/projects/b');
      expect(service.getItems()).toHaveLength(2);
    });

    it('should insert at specific position', () => {
      service.add('/projects/a', 'Project A', 'spec-001', 'First');
      service.add('/projects/a', 'Project A', 'spec-002', 'Second');
      service.add('/projects/b', 'Project B', 'spec-003', 'Inserted', undefined, 1);

      const items = service.getItems();
      expect(items[0].specId).toBe('spec-001');
      expect(items[1].specId).toBe('spec-003');
      expect(items[2].specId).toBe('spec-002');
    });
  });

  describe('getState()', () => {
    it('should return the global queue state', () => {
      const state = service.getState();
      expect(state.items).toEqual([]);
      expect(state.currentlyRunning).toBeNull();
      expect(state.isQueueRunning).toBe(false);
    });
  });

  describe('remove()', () => {
    it('should remove an item by queue item ID', () => {
      const item = service.add('/projects/a', 'Project A', 'spec-001', 'Spec');
      expect(service.remove(item.id)).toBe(true);
      expect(service.getItems()).toHaveLength(0);
    });

    it('should not remove a running item', () => {
      const item = service.add('/projects/a', 'Project A', 'spec-001', 'Spec');
      service.updateStatus(item.id, 'running');
      expect(() => service.remove(item.id)).toThrow('Cannot remove a running queue item');
    });
  });

  describe('reorder()', () => {
    it('should reorder pending items', () => {
      service.add('/projects/a', 'Project A', 'spec-001', 'First');
      const second = service.add('/projects/b', 'Project B', 'spec-002', 'Second');

      service.reorder(second.id, 0);

      const items = service.getItems();
      expect(items[0].specId).toBe('spec-002');
      expect(items[1].specId).toBe('spec-001');
    });
  });

  describe('updateStatus()', () => {
    it('should update item status and set timestamps', () => {
      const item = service.add('/projects/a', 'Project A', 'spec-001', 'Spec');

      service.updateStatus(item.id, 'running');
      const running = service.getItem(item.id);
      expect(running?.status).toBe('running');
      expect(running?.startedAt).toBeDefined();
      expect(service.getState().currentlyRunning).toBe(item.id);

      service.updateStatus(item.id, 'done');
      const done = service.getItem(item.id);
      expect(done?.status).toBe('done');
      expect(done?.completedAt).toBeDefined();
      expect(service.getState().currentlyRunning).toBeNull();
    });
  });

  describe('getNextPending()', () => {
    it('should return the first pending item globally', () => {
      service.add('/projects/a', 'Project A', 'spec-001', 'Spec A');
      service.add('/projects/b', 'Project B', 'spec-002', 'Spec B');

      const next = service.getNextPending();
      expect(next?.specId).toBe('spec-001');
    });

    it('should skip non-pending items', () => {
      const first = service.add('/projects/a', 'Project A', 'spec-001', 'Spec A');
      service.add('/projects/b', 'Project B', 'spec-002', 'Spec B');
      service.updateStatus(first.id, 'running');

      const next = service.getNextPending();
      expect(next?.specId).toBe('spec-002');
    });
  });

  describe('getItemBySpecId()', () => {
    it('should find item by specId and projectPath', () => {
      service.add('/projects/a', 'Project A', 'spec-001', 'Spec A');
      service.add('/projects/b', 'Project B', 'spec-001', 'Spec B');

      const item = service.getItemBySpecId('/projects/b', 'spec-001');
      expect(item?.projectPath).toBe('/projects/b');
      expect(item?.projectName).toBe('Project B');
    });

    it('should return null if not found', () => {
      expect(service.getItemBySpecId('/projects/x', 'nonexistent')).toBeNull();
    });
  });

  describe('startQueue()', () => {
    it('should start the queue and mark first pending item as running', () => {
      service.add('/projects/a', 'Project A', 'spec-001', 'Spec A');
      service.add('/projects/b', 'Project B', 'spec-002', 'Spec B');

      const first = service.startQueue();
      expect(first?.specId).toBe('spec-001');
      expect(first?.status).toBe('running');
      expect(service.getState().isQueueRunning).toBe(true);
    });

    it('should return null if already running', () => {
      service.add('/projects/a', 'Project A', 'spec-001', 'Spec A');
      service.startQueue();
      expect(service.startQueue()).toBeNull();
    });
  });

  describe('handleSpecComplete()', () => {
    it('should advance to next pending spec regardless of project', () => {
      const first = service.add('/projects/a', 'Project A', 'spec-001', 'Spec A');
      service.add('/projects/b', 'Project B', 'spec-002', 'Spec B');

      service.startQueue();
      const result = service.handleSpecComplete(first.id, true);

      expect(result.completedItem?.status).toBe('done');
      expect(result.nextItem?.specId).toBe('spec-002');
      expect(result.nextItem?.projectPath).toBe('/projects/b');
      expect(result.queueComplete).toBe(false);
    });

    it('should mark queue complete when no more pending specs', () => {
      const item = service.add('/projects/a', 'Project A', 'spec-001', 'Spec A');
      service.startQueue();
      const result = service.handleSpecComplete(item.id, true);

      expect(result.queueComplete).toBe(true);
      expect(result.nextItem).toBeNull();
      expect(service.getState().isQueueRunning).toBe(false);
    });
  });

  describe('clear()', () => {
    it('should clear the entire global queue', () => {
      service.add('/projects/a', 'Project A', 'spec-001', 'Spec A');
      service.add('/projects/b', 'Project B', 'spec-002', 'Spec B');

      service.clear();
      expect(service.getItems()).toHaveLength(0);
      expect(service.getState().isQueueRunning).toBe(false);
    });
  });

  describe('clearCompleted()', () => {
    it('should remove only completed items', () => {
      const item = service.add('/projects/a', 'Project A', 'spec-001', 'Spec A');
      service.add('/projects/b', 'Project B', 'spec-002', 'Spec B');
      service.updateStatus(item.id, 'done');

      const removed = service.clearCompleted();
      expect(removed).toBe(1);
      expect(service.getItems()).toHaveLength(1);
      expect(service.getItems()[0].specId).toBe('spec-002');
    });
  });

  describe('canAdd()', () => {
    it('should allow adding new specs', () => {
      expect(service.canAdd('/projects/a', 'spec-001').allowed).toBe(true);
    });

    it('should reject duplicates within same project', () => {
      service.add('/projects/a', 'Project A', 'spec-001', 'Spec');
      const result = service.canAdd('/projects/a', 'spec-001');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Spec ist bereits in der Queue');
    });

    it('should allow same specId from different projects', () => {
      service.add('/projects/a', 'Project A', 'spec-001', 'Spec');
      expect(service.canAdd('/projects/b', 'spec-001').allowed).toBe(true);
    });
  });

  describe('stopQueue()', () => {
    it('should stop queue execution', () => {
      service.add('/projects/a', 'Project A', 'spec-001', 'Spec A');
      service.startQueue();
      expect(service.isQueueActive()).toBe(true);

      service.stopQueue();
      expect(service.isQueueActive()).toBe(false);
    });
  });

  describe('isRunning()', () => {
    it('should return true when a spec is currently running', () => {
      const item = service.add('/projects/a', 'Project A', 'spec-001', 'Spec A');
      expect(service.isRunning()).toBe(false);

      service.updateStatus(item.id, 'running');
      expect(service.isRunning()).toBe(true);
    });
  });
});
