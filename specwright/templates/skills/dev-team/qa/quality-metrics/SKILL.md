# Quality Metrics Skill

> Role: QA Engineer - Quality Metrics & Reporting
> Created: 2026-01-09
> Purpose: Track, analyze, and report quality metrics to ensure code quality standards and continuous improvement

## Skill Activation

Activate this skill when:
- Setting up code coverage and quality tracking
- Configuring quality gates in CI/CD
- Analyzing test effectiveness and trends
- Reporting quality metrics to stakeholders
- Identifying areas for test improvement
- Tracking technical debt and test health
- Establishing baseline quality metrics for new projects

## Core Capabilities

### 1. Code Coverage Analysis
- Track line, branch, and function coverage
- Set and enforce coverage thresholds
- Identify untested code paths
- Monitor coverage trends over time
- Generate coverage reports and visualizations
- Integrate coverage into CI/CD pipeline

### 2. Test Health Monitoring
- Track test execution time and performance
- Identify and fix flaky tests
- Monitor test pass/fail rates
- Analyze test stability trends
- Measure test reliability percentage
- Track test maintenance costs

### 3. Quality Gate Enforcement
- Define quality criteria for deployments
- Automate quality checks in CI/CD
- Block deployments that fail quality gates
- Track quality gate pass/fail rates
- Configure different gates for different environments
- Report on quality gate exceptions

### 4. Defect Metrics
- Track defect detection rates (testing vs. production)
- Measure mean time to detect (MTTD) defects
- Measure mean time to repair (MTTR) defects
- Analyze defect density by module
- Track defect severity distribution
- Monitor escaped defects to production

### 5. Performance Metrics
- Track test suite execution time
- Monitor CI/CD pipeline duration
- Identify slow tests for optimization
- Measure build and deployment times
- Track resource utilization in test environments

## [TECH_STACK_SPECIFIC] Metrics Configuration

### Ruby on Rails (SimpleCov)

#### Setup Coverage Tracking
```ruby
# spec/spec_helper.rb or test/test_helper.rb
require 'simplecov'

SimpleCov.start 'rails' do
  # Set minimum coverage thresholds
  minimum_coverage 85
  minimum_coverage_by_file 70

  # Refuse to merge results with coverage below threshold
  refuse_coverage_drop

  # Add groups for better organization
  add_group 'Controllers', 'app/controllers'
  add_group 'Models', 'app/models'
  add_group 'Services', 'app/services'
  add_group 'Jobs', 'app/jobs'
  add_group 'Mailers', 'app/mailers'
  add_group 'Helpers', 'app/helpers'

  # Exclude files from coverage
  add_filter '/spec/'
  add_filter '/test/'
  add_filter '/config/'
  add_filter '/vendor/'

  # Track branches as well as lines
  enable_coverage :branch

  # Output formats
  formatter SimpleCov::Formatter::MultiFormatter.new([
    SimpleCov::Formatter::HTMLFormatter,
    SimpleCov::Formatter::JSONFormatter
  ])
end
```

#### Custom Coverage Reporter
```ruby
# lib/tasks/coverage_report.rake
namespace :coverage do
  desc 'Generate and analyze coverage report'
  task report: :environment do
    require 'simplecov'
    require 'json'

    result = SimpleCov::ResultMerger.merged_result

    puts "\n=== Coverage Summary ==="
    puts "Overall Coverage: #{result.covered_percent.round(2)}%"
    puts "Total Lines: #{result.total_lines}"
    puts "Covered Lines: #{result.covered_lines}"
    puts "Missed Lines: #{result.missed_lines}"

    puts "\n=== Coverage by Group ==="
    result.groups.each do |name, files|
      coverage = files.covered_percent
      status = coverage >= 85 ? '✓' : '✗'
      puts "#{status} #{name}: #{coverage.round(2)}%"
    end

    puts "\n=== Files Below Threshold (< 70%) ==="
    result.files.each do |file|
      if file.covered_percent < 70
        puts "#{file.filename}: #{file.covered_percent.round(2)}%"
      end
    end

    # Export metrics for CI
    metrics = {
      coverage: result.covered_percent.round(2),
      total_lines: result.total_lines,
      covered_lines: result.covered_lines,
      timestamp: Time.current.iso8601
    }

    File.write('coverage/metrics.json', JSON.pretty_generate(metrics))
  end
end
```

### JavaScript (Istanbul/NYC)

#### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  // Coverage collection
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/index.{js,jsx,ts,tsx}',
    '!src/setupTests.{js,ts}'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Stricter thresholds for critical paths
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/components/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'json',
    'lcov'
  ],

  // Test result reporting
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › '
    }]
  ]
};
```

#### Custom Coverage Report Script
```javascript
// scripts/coverage-report.js
const fs = require('fs');
const path = require('path');

// Read coverage summary
const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');
const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

console.log('\n=== Coverage Summary ===');
console.log(`Lines: ${coverage.total.lines.pct}%`);
console.log(`Statements: ${coverage.total.statements.pct}%`);
console.log(`Functions: ${coverage.total.functions.pct}%`);
console.log(`Branches: ${coverage.total.branches.pct}%`);

// Find files below threshold
const threshold = 70;
const lowCoverage = [];

Object.entries(coverage).forEach(([file, metrics]) => {
  if (file === 'total') return;

  const lineCoverage = metrics.lines.pct;
  if (lineCoverage < threshold) {
    lowCoverage.push({ file, coverage: lineCoverage });
  }
});

if (lowCoverage.length > 0) {
  console.log(`\n=== Files Below ${threshold}% Coverage ===`);
  lowCoverage
    .sort((a, b) => a.coverage - b.coverage)
    .forEach(({ file, coverage }) => {
      console.log(`${coverage.toFixed(2)}% - ${file}`);
    });
}

// Export metrics
const metrics = {
  coverage: coverage.total.lines.pct,
  branches: coverage.total.branches.pct,
  functions: coverage.total.functions.pct,
  statements: coverage.total.statements.pct,
  timestamp: new Date().toISOString()
};

fs.writeFileSync(
  path.join(__dirname, '../coverage/metrics.json'),
  JSON.stringify(metrics, null, 2)
);

// Exit with error if below threshold
if (coverage.total.lines.pct < 80) {
  console.error('\n❌ Coverage below 80% threshold');
  process.exit(1);
}

console.log('\n✅ Coverage meets threshold');
```

### CI/CD Integration (GitHub Actions)

#### Quality Metrics Workflow
```yaml
# .github/workflows/quality-metrics.yml
name: Quality Metrics

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test-coverage:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.2
          bundler-cache: true

      - name: Run tests with coverage
        run: |
          bundle exec rspec
          bundle exec rake coverage:report

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage.json
          flags: backend
          fail_ci_if_error: true

      - name: Check coverage threshold
        run: |
          COVERAGE=$(jq -r '.coverage' coverage/metrics.json)
          if (( $(echo "$COVERAGE < 85" | bc -l) )); then
            echo "❌ Coverage $COVERAGE% is below 85% threshold"
            exit 1
          fi
          echo "✅ Coverage $COVERAGE% meets threshold"

      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const metrics = JSON.parse(fs.readFileSync('coverage/metrics.json'));
            const body = `## Coverage Report

            - **Overall Coverage**: ${metrics.coverage}%
            - **Total Lines**: ${metrics.total_lines}
            - **Covered Lines**: ${metrics.covered_lines}

            ${metrics.coverage >= 85 ? '✅' : '❌'} Coverage threshold: 85%`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });

  test-reliability:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Run tests multiple times to check flakiness
        run: |
          for i in {1..3}; do
            echo "Run $i of 3"
            bundle exec rspec || exit 1
          done

      - name: Report test stability
        run: |
          echo "✅ All test runs passed - tests are stable"

  performance-metrics:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Measure test execution time
        run: |
          START_TIME=$(date +%s)
          bundle exec rspec
          END_TIME=$(date +%s)
          DURATION=$((END_TIME - START_TIME))

          echo "Test suite execution time: ${DURATION}s"

          # Fail if tests take longer than 10 minutes
          if [ $DURATION -gt 600 ]; then
            echo "❌ Test suite too slow (${DURATION}s > 600s)"
            exit 1
          fi

          echo "{\"test_duration\": $DURATION}" > metrics/performance.json

      - name: Track metrics over time
        uses: benchmark-action/github-action-benchmark@v1
        with:
          tool: 'customSmallerIsBetter'
          output-file-path: metrics/performance.json
          github-token: ${{ secrets.GITHUB_TOKEN }}
          auto-push: true

  quality-gates:
    runs-on: ubuntu-latest
    needs: [test-coverage, test-reliability]

    steps:
      - name: All quality gates passed
        run: |
          echo "✅ All quality gates passed"
          echo "- Coverage threshold met"
          echo "- Tests are reliable"
          echo "- Performance acceptable"
```

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - github - Access CI/CD metrics and test results
     - fetch - Retrieve coverage reports and metrics data
     - filesystem - Read and analyze test artifacts

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Coverage Tools
- **Ruby**: SimpleCov, Coverband
- **JavaScript**: Istanbul (NYC), Jest coverage
- **E2E**: Playwright coverage, Cypress code coverage
- **Aggregation**: Codecov, Coveralls

### Quality Analysis
- **Static Analysis**: RuboCop, ESLint, SonarQube
- **Complexity**: CodeClimate, Flog, Plato
- **Security**: Brakeman, npm audit, Snyk

### Metrics Platforms
- **CI/CD**: GitHub Actions, CircleCI, GitLab CI
- **Dashboards**: Grafana, DataDog, New Relic
- **Reporting**: Allure, ReportPortal

### Visualization
- **Coverage**: SimpleCov HTML, Istanbul HTML reports
- **Trends**: Codecov graphs, SonarQube dashboards
- **Custom**: Chart.js, D3.js for custom metrics

## Quality Checklist

### Coverage Metrics
- [ ] Line coverage > 85%
- [ ] Branch coverage > 80%
- [ ] Function coverage > 85%
- [ ] Coverage tracked in CI/CD
- [ ] Coverage reports generated automatically
- [ ] Coverage trends monitored over time
- [ ] Low coverage files identified and addressed

### Test Health
- [ ] Test pass rate > 98%
- [ ] Zero flaky tests
- [ ] Test execution time < 10 minutes
- [ ] No skipped tests without reason
- [ ] Test reliability tracked
- [ ] Slow tests identified and optimized

### Quality Gates
- [ ] Quality gates defined for all environments
- [ ] Gates enforced in CI/CD pipeline
- [ ] Failed gates block deployments
- [ ] Gate exceptions documented
- [ ] Gate effectiveness measured
- [ ] Gates reviewed and updated regularly

### Defect Metrics
- [ ] Defect detection rate tracked
- [ ] Production defects monitored
- [ ] MTTD and MTTR measured
- [ ] Defect trends analyzed
- [ ] Root causes investigated
- [ ] Process improvements implemented

## Key Metrics to Track

### 1. Code Coverage Metrics
```markdown
**Targets:**
- Overall Coverage: 85%+
- New Code Coverage: 90%+
- Critical Paths Coverage: 95%+

**Tracking:**
- Coverage trend over last 30 days
- Coverage by module/component
- Uncovered lines count
- Coverage delta per PR
```

### 2. Test Reliability Metrics
```markdown
**Targets:**
- Test Pass Rate: 98%+
- Flaky Test Rate: 0%
- Test Execution Time: < 10 minutes
- Test Failure Recovery Time: < 1 hour

**Tracking:**
- Pass/fail trends by test suite
- Flaky test detection and fixes
- Test execution time trends
- Test retry rates
```

### 3. Defect Detection Metrics
```markdown
**Targets:**
- Defects Found in Testing: 95%+
- Production Defects: < 5%
- MTTD: < 24 hours
- MTTR: < 4 hours

**Tracking:**
- Defects by severity (Critical/High/Medium/Low)
- Defects by component
- Escaped defects analysis
- Time to detect and fix trends
```

### 4. Quality Gate Metrics
```markdown
**Targets:**
- Quality Gate Pass Rate: 95%+
- Deployment Success Rate: 98%+
- Rollback Rate: < 2%

**Tracking:**
- Gate pass/fail by environment
- Most common gate failures
- Time to pass quality gates
- Gate exception frequency
```

### 5. Test Efficiency Metrics
```markdown
**Targets:**
- Test Execution Time: Decreasing trend
- Test Maintenance Time: < 10% of development time
- Test ROI: High value tests identified

**Tracking:**
- Slowest tests identified
- Test execution time per suite
- Test creation vs. maintenance time
- Value delivered by test suite
```

## Metrics Dashboard Example

```markdown
# Quality Metrics Dashboard
*Last Updated: 2026-01-09*

## Overview
| Metric | Current | Target | Status | Trend |
|--------|---------|--------|--------|-------|
| Code Coverage | 87.5% | 85% | ✅ | ↗️ +2.3% |
| Test Pass Rate | 99.2% | 98% | ✅ | → |
| Flaky Tests | 0 | 0 | ✅ | → |
| Test Duration | 8m 32s | <10m | ✅ | ↘️ -1m 12s |
| Production Bugs | 2 | <5 | ✅ | ↘️ -3 |
| MTTD | 18hrs | <24hrs | ✅ | ↘️ -6hrs |
| MTTR | 3.2hrs | <4hrs | ✅ | → |

## Coverage Breakdown
| Component | Coverage | Change | Status |
|-----------|----------|--------|--------|
| Controllers | 92.3% | +1.2% | ✅ |
| Models | 95.1% | +0.5% | ✅ |
| Services | 88.7% | -0.8% | ⚠️ |
| Helpers | 82.4% | +3.1% | ✅ |
| Jobs | 79.3% | -1.5% | ❌ |

## Test Suite Performance
| Suite | Tests | Duration | Pass Rate | Flaky |
|-------|-------|----------|-----------|-------|
| Unit | 1,247 | 3m 22s | 100% | 0 |
| Integration | 312 | 4m 18s | 99.7% | 0 |
| System | 89 | 52s | 98.9% | 0 |
| Total | 1,648 | 8m 32s | 99.2% | 0 |

## Recent Defects (Last 30 Days)
| Severity | Testing | Production | Total |
|----------|---------|------------|-------|
| Critical | 0 | 0 | 0 |
| High | 3 | 1 | 4 |
| Medium | 12 | 1 | 13 |
| Low | 24 | 0 | 24 |
| **Total** | **39** | **2** | **41** |

**Detection Rate:** 95.1% (39/41 found in testing)

## Quality Gate Results
| Gate | Passed | Failed | Success Rate |
|------|--------|--------|--------------|
| Coverage Threshold | 28 | 2 | 93.3% |
| Linting | 30 | 0 | 100% |
| Security Scan | 29 | 1 | 96.7% |
| Performance | 30 | 0 | 100% |

## Actions Required
1. ⚠️ Increase Services coverage from 88.7% to 90%+
2. ❌ Improve Jobs coverage from 79.3% to 85%+
3. ⚠️ Investigate 1 high-severity production bug
4. ℹ️ Review 2 coverage threshold failures
```

## Best Practices

### 1. Establish Baselines
- Measure current state before setting targets
- Track trends over time, not just absolute values
- Set realistic, achievable targets

### 2. Automate Metrics Collection
- Integrate metrics into CI/CD pipeline
- Generate reports automatically
- Store historical data for trend analysis

### 3. Make Metrics Visible
- Display metrics on team dashboard
- Include metrics in PR comments
- Share metrics in team meetings

### 4. Act on Metrics
- Set up alerts for threshold violations
- Review metrics regularly in retrospectives
- Create action plans for improvement

### 5. Focus on Trends
- Track direction of change, not just current value
- Identify patterns and anomalies
- Predict future issues based on trends

### 6. Balance Multiple Metrics
- Don't optimize for single metric at expense of others
- Consider trade-offs (e.g., speed vs. thoroughness)
- Use holistic view of quality

### 7. Keep Metrics Honest
- Don't game metrics (e.g., empty tests for coverage)
- Ensure metrics reflect real quality
- Update metrics as needs change

## Related Skills

- **test-strategy** - For planning quality targets
- **test-automation** - For implementing tests
- **regression-testing** - For maintaining test suites
