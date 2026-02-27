import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SkillSummary } from '../../src/shared/types/team.protocol.js';

describe('AosTeamCard', () => {
  const baseSkill: SkillSummary = {
    id: 'backend-express',
    name: 'Backend Express',
    description: 'Express.js backend patterns',
    category: 'backend',
    learningsCount: 3,
    globs: ['src/server/**/*.ts'],
    alwaysApply: false,
    teamType: 'devteam',
    teamName: '',
  };

  describe('Component structure', () => {
    it('should export AosTeamCard class', async () => {
      const module = await import('../../frontend/src/components/team/aos-team-card.js');
      expect(module).toHaveProperty('AosTeamCard');
    });

    it('should have skill property', async () => {
      const { AosTeamCard } = await import('../../frontend/src/components/team/aos-team-card.js');
      const instance = new AosTeamCard();
      instance.skill = baseSkill;
      expect(instance.skill).toEqual(baseSkill);
    });
  });

  describe('getCategoryClass', () => {
    let instance: InstanceType<typeof import('../../frontend/src/components/team/aos-team-card.js').AosTeamCard>;

    beforeEach(async () => {
      const { AosTeamCard } = await import('../../frontend/src/components/team/aos-team-card.js');
      instance = new AosTeamCard();
    });

    const getCategoryClass = (inst: unknown) =>
      (inst as { getCategoryClass: () => string }).getCategoryClass.bind(inst);

    it('should return category-frontend for frontend', () => {
      instance.skill = { ...baseSkill, category: 'frontend' };
      expect(getCategoryClass(instance)()).toBe('category-frontend');
    });

    it('should return category-backend for backend', () => {
      instance.skill = { ...baseSkill, category: 'backend' };
      expect(getCategoryClass(instance)()).toBe('category-backend');
    });

    it('should return category-architecture for architect', () => {
      instance.skill = { ...baseSkill, category: 'architect' };
      expect(getCategoryClass(instance)()).toBe('category-architecture');
    });

    it('should return category-architecture for architecture', () => {
      instance.skill = { ...baseSkill, category: 'architecture' };
      expect(getCategoryClass(instance)()).toBe('category-architecture');
    });

    it('should return category-quality for quality', () => {
      instance.skill = { ...baseSkill, category: 'quality' };
      expect(getCategoryClass(instance)()).toBe('category-quality');
    });

    it('should return category-quality for qa', () => {
      instance.skill = { ...baseSkill, category: 'qa' };
      expect(getCategoryClass(instance)()).toBe('category-quality');
    });

    it('should return category-domain for domain', () => {
      instance.skill = { ...baseSkill, category: 'domain' };
      expect(getCategoryClass(instance)()).toBe('category-domain');
    });

    it('should return category-devops for devops', () => {
      instance.skill = { ...baseSkill, category: 'devops' };
      expect(getCategoryClass(instance)()).toBe('category-devops');
    });

    it('should return category-product for po', () => {
      instance.skill = { ...baseSkill, category: 'po' };
      expect(getCategoryClass(instance)()).toBe('category-product');
    });

    it('should return category-product for product', () => {
      instance.skill = { ...baseSkill, category: 'product' };
      expect(getCategoryClass(instance)()).toBe('category-product');
    });

    it('should return category-default for unknown categories', () => {
      instance.skill = { ...baseSkill, category: 'unknown' };
      expect(getCategoryClass(instance)()).toBe('category-default');
    });

    it('should handle empty category', () => {
      instance.skill = { ...baseSkill, category: '' };
      expect(getCategoryClass(instance)()).toBe('category-default');
    });
  });

  describe('getTeamTypeBadgeClass', () => {
    let instance: InstanceType<typeof import('../../frontend/src/components/team/aos-team-card.js').AosTeamCard>;

    beforeEach(async () => {
      const { AosTeamCard } = await import('../../frontend/src/components/team/aos-team-card.js');
      instance = new AosTeamCard();
    });

    const getTeamTypeBadgeClass = (inst: unknown) =>
      (inst as { getTeamTypeBadgeClass: () => string }).getTeamTypeBadgeClass.bind(inst);

    it('should return team-type--devteam for devteam', () => {
      instance.skill = { ...baseSkill, teamType: 'devteam' };
      expect(getTeamTypeBadgeClass(instance)()).toBe('team-type--devteam');
    });

    it('should return team-type--team for team', () => {
      instance.skill = { ...baseSkill, teamType: 'team' };
      expect(getTeamTypeBadgeClass(instance)()).toBe('team-type--team');
    });

    it('should return team-type--individual for individual', () => {
      instance.skill = { ...baseSkill, teamType: 'individual' };
      expect(getTeamTypeBadgeClass(instance)()).toBe('team-type--individual');
    });
  });

  describe('getTeamTypeLabel', () => {
    let instance: InstanceType<typeof import('../../frontend/src/components/team/aos-team-card.js').AosTeamCard>;

    beforeEach(async () => {
      const { AosTeamCard } = await import('../../frontend/src/components/team/aos-team-card.js');
      instance = new AosTeamCard();
    });

    const getTeamTypeLabel = (inst: unknown) =>
      (inst as { getTeamTypeLabel: () => string }).getTeamTypeLabel.bind(inst);

    it('should return DevTeam for devteam', () => {
      instance.skill = { ...baseSkill, teamType: 'devteam' };
      expect(getTeamTypeLabel(instance)()).toBe('DevTeam');
    });

    it('should return Team for team', () => {
      instance.skill = { ...baseSkill, teamType: 'team' };
      expect(getTeamTypeLabel(instance)()).toBe('Team');
    });

    it('should return Individual for individual', () => {
      instance.skill = { ...baseSkill, teamType: 'individual' };
      expect(getTeamTypeLabel(instance)()).toBe('Individual');
    });
  });

  describe('Event handling', () => {
    let instance: InstanceType<typeof import('../../frontend/src/components/team/aos-team-card.js').AosTeamCard>;

    beforeEach(async () => {
      const { AosTeamCard } = await import('../../frontend/src/components/team/aos-team-card.js');
      instance = new AosTeamCard();
      instance.skill = baseSkill;
    });

    it('handleClick should dispatch card-click event with skillId', () => {
      const handler = vi.fn();
      instance.addEventListener('card-click', handler);

      const handleClick = (instance as unknown as { handleClick: () => void }).handleClick.bind(instance);
      handleClick();

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0] as CustomEvent<{ skillId: string }>;
      expect(event.detail.skillId).toBe('backend-express');
    });

    it('handleEditClick should dispatch edit-click event with skillId', () => {
      const handler = vi.fn();
      instance.addEventListener('edit-click', handler);

      const handleEditClick = (instance as unknown as {
        handleEditClick: (e: Event) => void;
      }).handleEditClick.bind(instance);

      const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;
      handleEditClick(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0] as CustomEvent<{ skillId: string }>;
      expect(event.detail.skillId).toBe('backend-express');
    });

    it('handleDeleteClick should dispatch delete-click event with skillId, name, and teamType', () => {
      const handler = vi.fn();
      instance.addEventListener('delete-click', handler);

      const handleDeleteClick = (instance as unknown as {
        handleDeleteClick: (e: Event) => void;
      }).handleDeleteClick.bind(instance);

      const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;
      handleDeleteClick(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0] as CustomEvent<{
        skillId: string;
        skillName: string;
        teamType: string;
      }>;
      expect(event.detail.skillId).toBe('backend-express');
      expect(event.detail.skillName).toBe('Backend Express');
      expect(event.detail.teamType).toBe('devteam');
    });

    it('card-click event should bubble and be composed', () => {
      const handler = vi.fn();
      instance.addEventListener('card-click', handler);

      const handleClick = (instance as unknown as { handleClick: () => void }).handleClick.bind(instance);
      handleClick();

      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
    });
  });

  describe('createRenderRoot', () => {
    it('should return the element itself (light DOM)', async () => {
      const { AosTeamCard } = await import('../../frontend/src/components/team/aos-team-card.js');
      const instance = new AosTeamCard();
      const renderRoot = instance.createRenderRoot();
      expect(renderRoot).toBe(instance);
    });
  });
});
