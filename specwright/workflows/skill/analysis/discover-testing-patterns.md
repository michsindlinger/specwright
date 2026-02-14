---
description: Discover testing patterns from test files using Explore agent
version: 1.0
encoding: UTF-8
---

# Testing Pattern Discovery

## Overview

Use the Explore agent to discover testing patterns including test structure, assertions, mocking, fixtures, setup/teardown, and coverage patterns across unit, integration, and E2E tests.

## Discovery Process

<discovery_flow>

<step number="1" name="framework_based_search">

### Step 1: Framework-Based Search Strategy

<framework_strategies>
  PLAYWRIGHT:
    PATTERNS: ["**/*.spec.ts", "**/*.spec.js", "tests/**/*.ts", "e2e/**/*.spec.ts"]
    FOCUS: Page objects, selectors, assertions, fixtures

  JEST:
    PATTERNS: ["**/*.test.ts", "**/*.test.js", "**/*.spec.ts", "**/__tests__/**/*"]
    FOCUS: Test suites, mocking, assertions, setup/teardown

  VITEST:
    PATTERNS: ["**/*.test.ts", "**/*.spec.ts"]
    FOCUS: Vite-specific patterns, test utilities, mocking

  PYTEST:
    PATTERNS: ["**/test_*.py", "**/*_test.py", "tests/**/*.py"]
    FOCUS: Fixtures, parametrize, markers, conftest

  RSPEC:
    PATTERNS: ["spec/**/*_spec.rb"]
    FOCUS: Describe/context blocks, let statements, matchers

  CYPRESS:
    PATTERNS: ["cypress/e2e/**/*.cy.js", "cypress/e2e/**/*.cy.ts"]
    FOCUS: Commands, custom commands, fixtures, intercepts
</framework_strategies>

</step>

<step number="2" name="explore_test_files">

### Step 2: Explore Test Files

<playwright_exploration>
  TEST_STRUCTURE:
    PROMPT: "Discover Playwright test patterns:
             - Search for: **/*.spec.ts, tests/**/*.ts
             - Focus on: test/describe blocks, page objects, fixtures
             - Extract: Test organization, selectors, assertions
             - Identify: Common E2E test patterns"

    EXPECTED:
      - test/describe structure
      - Page object model usage
      - Fixture definitions
      - Locator strategies (getByRole, getByTestId)
      - expect assertions
      - beforeEach/afterEach hooks
</playwright_exploration>

<jest_exploration>
  TEST_STRUCTURE:
    PROMPT: "Discover Jest test patterns:
             - Search for: **/*.test.ts, **/__tests__/**/*
             - Focus on: describe/it blocks, mocking, assertions
             - Extract: Test organization, mock patterns, setup
             - Identify: Common unit test patterns"

    EXPECTED:
      - describe/it structure
      - jest.mock usage
      - beforeEach/afterEach
      - expect matchers
      - test.each for parameterized tests
      - Custom matchers
</jest_exploration>

<pytest_exploration>
  TEST_STRUCTURE:
    PROMPT: "Discover Pytest patterns:
             - Search for: test_*.py, *_test.py
             - Focus on: Fixtures, parametrize, markers
             - Extract: Test organization, fixture usage
             - Identify: Common Python test patterns"

    EXPECTED:
      - @pytest.fixture usage
      - @pytest.mark decorators
      - @pytest.parametrize
      - conftest.py patterns
      - assert statements
      - Fixture scopes
</pytest_exploration>

</step>

<step number="3" name="extract_patterns">

### Step 3: Extract Test Patterns

<test_structure_patterns>
  PLAYWRIGHT:
    ```typescript
    test.describe('User Management', () => {
      test.beforeEach(async ({ page }) => {
        await page.goto('/users');
      });

      test('should display users list', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
        await expect(page.getByRole('row')).toHaveCount(10);
      });
    });
    ```

  JEST:
    ```typescript
    describe('UserService', () => {
      let service: UserService;
      let mockRepository: jest.Mocked<UserRepository>;

      beforeEach(() => {
        mockRepository = {
          findById: jest.fn(),
          save: jest.fn()
        } as any;
        service = new UserService(mockRepository);
      });

      it('should find user by id', async () => {
        const user = { id: 1, name: 'John' };
        mockRepository.findById.mockResolvedValue(user);

        const result = await service.findById(1);

        expect(result).toEqual(user);
        expect(mockRepository.findById).toHaveBeenCalledWith(1);
      });
    });
    ```

  PYTEST:
    ```python
    @pytest.fixture
    def user_service(mock_repository):
        return UserService(mock_repository)

    @pytest.mark.parametrize('user_id,expected_name', [
        (1, 'John'),
        (2, 'Jane')
    ])
    def test_find_user_by_id(user_service, user_id, expected_name):
        user = user_service.find_by_id(user_id)
        assert user.name == expected_name
    ```
</test_structure_patterns>

<mocking_patterns>
  JEST:
    - jest.mock() for module mocks
    - jest.fn() for function mocks
    - mockImplementation/mockResolvedValue
    - mockReturnValue patterns
    - Spy usage with jest.spyOn()

  PYTEST:
    - @patch decorator
    - @patch.object usage
    - Mock() objects
    - MagicMock for magic methods
    - return_value/side_effect

  RSPEC:
    - allow/expect stubs
    - instance_double usage
    - have_received matcher
    - and_return/and_raise
</mocking_patterns>

<assertion_patterns>
  PLAYWRIGHT:
    - expect(locator).toBeVisible()
    - expect(locator).toHaveText()
    - expect(page).toHaveURL()
    - expect(locator).toHaveCount()

  JEST:
    - expect(value).toBe()
    - expect(value).toEqual()
    - expect(fn).toHaveBeenCalled()
    - expect(value).toMatchObject()

  PYTEST:
    - assert value == expected
    - assert value is not None
    - pytest.raises(Exception)
</assertion_patterns>

<page_object_patterns>
  PLAYWRIGHT:
    ```typescript
    export class UserPage {
      constructor(private page: Page) {}

      get heading() {
        return this.page.getByRole('heading', { name: 'Users' });
      }

      get userRows() {
        return this.page.getByRole('row');
      }

      async selectUser(id: number) {
        await this.page.getByTestId(`user-${id}`).click();
      }
    }
    ```
</page_object_patterns>

</step>

<step number="4" name="pattern_summary">

### Step 4: Generate Pattern Summary

<summary_structure>
  {
    framework: "playwright",
    test_type: "e2e",
    files_analyzed: 32,
    patterns: {
      test_structure: {
        dominant: "test.describe with beforeEach",
        occurrences: 28
      },
      selectors: {
        dominant: "getByRole (accessibility-first)",
        occurrences: 156
      },
      assertions: {
        dominant: "toBeVisible/toHaveText",
        occurrences: 203
      },
      page_objects: {
        usage: "60% of tests",
        pattern: "Class-based page objects"
      }
    },
    recommendations: [
      "Consistent use of getByRole for accessibility",
      "Page object model for complex flows",
      "Fixture usage for test data"
    ]
  }
</summary_structure>

</step>

</discovery_flow>

## Output Format

<output>
  {
    discovery_summary: {
      framework: "playwright",
      test_type: "e2e",
      files_analyzed: 32,
      patterns_found: 24,
      confidence: "high"
    },
    patterns: {
      test_structure: [...],
      assertions: [...],
      mocking: [...],
      setup_teardown: [...],
      page_objects: [...],
      fixtures: [...]
    },
    naming_conventions: {...},
    recommendations: [...]
  }
</output>

## Related Utilities

- `@specwright/workflows/skill/utils/extract-patterns.md`
- `@specwright/workflows/skill/utils/detect-testing.md`
