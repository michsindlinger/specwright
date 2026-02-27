import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import type { SkillSummary, SkillDetail } from '../../src/shared/types/team.protocol.js';

// Mock skills-reader.service before importing routes
const mockListSkills = vi.fn<(projectPath: string) => Promise<SkillSummary[]>>();
const mockGetSkillDetail = vi.fn<(projectPath: string, skillId: string) => Promise<SkillDetail | null>>();
const mockUpdateSkillContent = vi.fn<(projectPath: string, skillId: string, content: string) => Promise<void>>();
const mockDeleteSkill = vi.fn<(projectPath: string, skillId: string) => Promise<void>>();

vi.mock('../../src/server/services/skills-reader.service.js', () => ({
  skillsReaderService: {
    listSkills: (...args: Parameters<typeof mockListSkills>) => mockListSkills(...args),
    getSkillDetail: (...args: Parameters<typeof mockGetSkillDetail>) => mockGetSkillDetail(...args),
    updateSkillContent: (...args: Parameters<typeof mockUpdateSkillContent>) => mockUpdateSkillContent(...args),
    deleteSkill: (...args: Parameters<typeof mockDeleteSkill>) => mockDeleteSkill(...args),
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

function mockReq(params: Record<string, string> = {}, body?: Record<string, unknown>): Partial<Request> {
  return { params, body } as Partial<Request>;
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
          teamType: 'devteam',
          teamName: '',
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
        teamType: 'devteam',
        teamName: '',
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

  // ==========================================================================
  // PUT /:projectPath/skills/:skillId
  // ==========================================================================

  describe('PUT /:projectPath/skills/:skillId', () => {
    const handler = getHandler('put', '/:projectPath/skills/:skillId');

    it('should update skill content and return 200', async () => {
      mockUpdateSkillContent.mockResolvedValue(undefined);

      const req = mockReq(
        {
          projectPath: encodeURIComponent('/tmp/project'),
          skillId: 'backend-express',
        },
        { content: '# Updated Skill\nNew content.' }
      );
      const res = mockRes();

      await handler(req as Request, res as Response);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true });
      expect(mockUpdateSkillContent).toHaveBeenCalledWith(
        '/tmp/project',
        'backend-express',
        '# Updated Skill\nNew content.'
      );
    });

    it('should URL-decode projectPath before calling service', async () => {
      mockUpdateSkillContent.mockResolvedValue(undefined);

      const req = mockReq(
        {
          projectPath: encodeURIComponent('/home/user/my project'),
          skillId: 'frontend-lit',
        },
        { content: '# Skill' }
      );
      const res = mockRes();

      await handler(req as Request, res as Response);

      expect(mockUpdateSkillContent).toHaveBeenCalledWith(
        '/home/user/my project',
        'frontend-lit',
        '# Skill'
      );
    });

    it('should return 400 when content is missing', async () => {
      const req = mockReq(
        {
          projectPath: encodeURIComponent('/tmp/project'),
          skillId: 'backend-express',
        },
        {}
      );
      const res = mockRes();

      await handler(req as Request, res as Response);

      expect(res._status).toBe(400);
      expect(res._json).toMatchObject({
        success: false,
        error: 'content field is required and must be a string',
      });
      expect(mockUpdateSkillContent).not.toHaveBeenCalled();
    });

    it('should return 400 when content is not a string', async () => {
      const req = mockReq(
        {
          projectPath: encodeURIComponent('/tmp/project'),
          skillId: 'backend-express',
        },
        { content: 42 as unknown }
      );
      const res = mockRes();

      await handler(req as Request, res as Response);

      expect(res._status).toBe(400);
      expect(res._json).toMatchObject({
        success: false,
        error: 'content field is required and must be a string',
      });
    });

    it('should return 500 on service error', async () => {
      mockUpdateSkillContent.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const req = mockReq(
        {
          projectPath: encodeURIComponent('/tmp/project'),
          skillId: 'nonexistent',
        },
        { content: '# Content' }
      );
      const res = mockRes();

      await handler(req as Request, res as Response);

      expect(res._status).toBe(500);
      expect(res._json).toMatchObject({
        success: false,
        error: 'ENOENT: no such file or directory',
      });
    });
  });

  // ==========================================================================
  // DELETE /:projectPath/skills/:skillId
  // ==========================================================================

  describe('DELETE /:projectPath/skills/:skillId', () => {
    const handler = getHandler('delete', '/:projectPath/skills/:skillId');

    it('should delete skill and return 200', async () => {
      mockDeleteSkill.mockResolvedValue(undefined);

      const req = mockReq({
        projectPath: encodeURIComponent('/tmp/project'),
        skillId: 'backend-express',
      });
      const res = mockRes();

      await handler(req as Request, res as Response);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true });
      expect(mockDeleteSkill).toHaveBeenCalledWith('/tmp/project', 'backend-express');
    });

    it('should URL-decode projectPath before calling service', async () => {
      mockDeleteSkill.mockResolvedValue(undefined);

      const req = mockReq({
        projectPath: encodeURIComponent('/home/user/my project'),
        skillId: 'frontend-lit',
      });
      const res = mockRes();

      await handler(req as Request, res as Response);

      expect(mockDeleteSkill).toHaveBeenCalledWith('/home/user/my project', 'frontend-lit');
    });

    it('should return 500 on service error', async () => {
      mockDeleteSkill.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const req = mockReq({
        projectPath: encodeURIComponent('/tmp/project'),
        skillId: 'nonexistent',
      });
      const res = mockRes();

      await handler(req as Request, res as Response);

      expect(res._status).toBe(500);
      expect(res._json).toMatchObject({
        success: false,
        error: 'ENOENT: no such file or directory',
      });
    });

    it('should return 500 with generic message for non-Error throws', async () => {
      mockDeleteSkill.mockRejectedValue('string error');

      const req = mockReq({
        projectPath: encodeURIComponent('/tmp/project'),
        skillId: 'broken',
      });
      const res = mockRes();

      await handler(req as Request, res as Response);

      expect(res._status).toBe(500);
      expect(res._json).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });
});
