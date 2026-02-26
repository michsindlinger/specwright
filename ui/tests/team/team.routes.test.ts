import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import type { SkillSummary, SkillDetail } from '../../src/shared/types/team.protocol.js';

// Mock skills-reader.service before importing routes
const mockListSkills = vi.fn<(projectPath: string) => Promise<SkillSummary[]>>();
const mockGetSkillDetail = vi.fn<(projectPath: string, skillId: string) => Promise<SkillDetail | null>>();

vi.mock('../../src/server/services/skills-reader.service.js', () => ({
  skillsReaderService: {
    listSkills: (...args: Parameters<typeof mockListSkills>) => mockListSkills(...args),
    getSkillDetail: (...args: Parameters<typeof mockGetSkillDetail>) => mockGetSkillDetail(...args),
  },
}));

// Import router after mocking
const routerModule = await import('../../src/server/routes/team.routes.js');
const router = routerModule.default;

// Helper: extract route handler from Express router
function getHandler(method: string, pathPattern: string) {
  const layer = router.stack.find(
    (l: { route?: { path: string; methods: Record<string, boolean> } }) =>
      l.route?.path === pathPattern && l.route?.methods[method]
  );
  if (!layer) throw new Error(`No handler for ${method.toUpperCase()} ${pathPattern}`);
  return layer.route.stack[0].handle as (req: Request, res: Response) => Promise<void>;
}

function mockReq(params: Record<string, string> = {}): Partial<Request> {
  return { params } as Partial<Request>;
}

function mockRes(): Partial<Response> & { _status: number; _json: unknown } {
  const res: Partial<Response> & { _status: number; _json: unknown } = {
    _status: 200,
    _json: null,
    status(code: number) {
      res._status = code;
      return res as Response;
    },
    json(data: unknown) {
      res._json = data;
      return res as Response;
    },
  };
  return res;
}

describe('Team Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // GET /:projectPath/skills
  // ==========================================================================

  describe('GET /:projectPath/skills', () => {
    const handler = getHandler('get', '/:projectPath/skills');

    it('should return skills list with 200', async () => {
      const skills: SkillSummary[] = [
        {
          id: 'backend-express',
          name: 'Backend Express',
          description: 'Express patterns',
          category: 'backend',
          learningsCount: 2,
          globs: ['src/server/**/*.ts'],
          alwaysApply: false,
        },
      ];
      mockListSkills.mockResolvedValue(skills);

      const req = mockReq({ projectPath: encodeURIComponent('/tmp/project') });
      const res = mockRes();

      await handler(req as Request, res as Response);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, skills });
      expect(mockListSkills).toHaveBeenCalledWith('/tmp/project');
    });

    it('should return empty array when no skills found', async () => {
      mockListSkills.mockResolvedValue([]);

      const req = mockReq({ projectPath: encodeURIComponent('/tmp/empty') });
      const res = mockRes();

      await handler(req as Request, res as Response);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, skills: [] });
    });

    it('should return 500 on service error', async () => {
      mockListSkills.mockRejectedValue(new Error('Read failed'));

      const req = mockReq({ projectPath: encodeURIComponent('/tmp/broken') });
      const res = mockRes();

      await handler(req as Request, res as Response);

      expect(res._status).toBe(500);
      expect(res._json).toMatchObject({ success: false, error: 'Read failed' });
    });
  });

  // ==========================================================================
  // GET /:projectPath/skills/:skillId
  // ==========================================================================

  describe('GET /:projectPath/skills/:skillId', () => {
    const handler = getHandler('get', '/:projectPath/skills/:skillId');

    it('should return skill detail with 200', async () => {
      const skill: SkillDetail = {
        id: 'backend-express',
        name: 'Backend Express',
        description: 'Express patterns',
        category: 'backend',
        learningsCount: 1,
        globs: ['src/server/**/*.ts'],
        alwaysApply: false,
        skillContent: '# Backend Express\nContent.',
        dosAndDontsContent: '# Dos and Donts\n## Entries\n### Learning',
        subDocuments: ['patterns.md'],
      };
      mockGetSkillDetail.mockResolvedValue(skill);

      const req = mockReq({
        projectPath: encodeURIComponent('/tmp/project'),
        skillId: 'backend-express',
      });
      const res = mockRes();

      await handler(req as Request, res as Response);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, skill });
      expect(mockGetSkillDetail).toHaveBeenCalledWith('/tmp/project', 'backend-express');
    });

    it('should return 404 when skill not found', async () => {
      mockGetSkillDetail.mockResolvedValue(null);

      const req = mockReq({
        projectPath: encodeURIComponent('/tmp/project'),
        skillId: 'nonexistent',
      });
      const res = mockRes();

      await handler(req as Request, res as Response);

      expect(res._status).toBe(404);
      expect(res._json).toMatchObject({
        success: false,
        error: 'Skill "nonexistent" not found',
      });
    });

    it('should return 500 on service error', async () => {
      mockGetSkillDetail.mockRejectedValue(new Error('Permission denied'));

      const req = mockReq({
        projectPath: encodeURIComponent('/tmp/project'),
        skillId: 'broken',
      });
      const res = mockRes();

      await handler(req as Request, res as Response);

      expect(res._status).toBe(500);
      expect(res._json).toMatchObject({ success: false, error: 'Permission denied' });
    });
  });
});
