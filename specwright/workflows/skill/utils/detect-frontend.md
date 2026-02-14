---
description: Detect frontend framework, version, and configuration in the project
version: 1.0
encoding: UTF-8
---

# Frontend Framework Detection

## Overview

Auto-detect frontend frameworks used in the project, including framework name, version, TypeScript usage, and key configuration details.

## Supported Frameworks

- React (with or without TypeScript)
- Angular
- Vue (Vue 2 and Vue 3)
- Svelte (with or without SvelteKit)

## Detection Process

<detection_flow>

<step number="1" name="initial_scan">

### Step 1: Initial File System Scan

Scan project for frontend framework indicator files.

<file_indicators>
  SEARCH: Project root and source directories
  LOOK_FOR:
    - package.json (All frameworks)
    - angular.json (Angular)
    - tsconfig.json (TypeScript usage)
    - vite.config.js/ts (Vite build tool)
    - next.config.js (Next.js - React)
    - nuxt.config.js/ts (Nuxt - Vue)
    - svelte.config.js (SvelteKit)
    - *.jsx, *.tsx files (React)
    - *.vue files (Vue)
    - *.svelte files (Svelte)
</file_indicators>

<instructions>
  ACTION: Use Glob tool to find indicator files
  PATTERN: Look for framework-specific files
  RECORD: Found files for framework determination
</instructions>

</step>

<step number="2" name="react_detection">

### Step 2: React Detection

Detect React framework, version, and TypeScript usage.

<detection_criteria>
  REQUIRED: package.json with react dependency

  CONFIDENCE_HIGH: If both package.json AND JSX/TSX files found
  CONFIDENCE_MEDIUM: If only package.json with react
</detection_criteria>

<package_json_detection>
  IF package.json exists:
    READ: package.json file
    PARSE: JSON content
    SEARCH: In dependencies and devDependencies:
      - "react": "version"
      - "react-dom": "version"

    EXTRACT: Version from dependency declaration
      - Exact: "18.2.0"
      - Range: "^18.2.0"
      - Latest: "*" or "latest"

    CONFIDENCE: MEDIUM if react found in dependencies
</package_json_detection>

<typescript_detection>
  CHECK: If TypeScript is used with React
    LOOK_FOR: "typescript" in package.json devDependencies
    LOOK_FOR: "@types/react" in devDependencies
    LOOK_FOR: tsconfig.json file
    SEARCH: For .tsx files
    PATTERN: ["src/**/*.tsx", "**/*.tsx"]

    IF TypeScript detected:
      typescript: true
      CONFIDENCE_BOOST: TypeScript React project
</typescript_detection>

<jsx_tsx_detection>
  SEARCH: For JSX/TSX files in project
    PATTERN: ["src/**/*.jsx", "src/**/*.tsx", "**/*.jsx", "**/*.tsx"]
    COUNT: Number of JSX/TSX files found

    IF JSX/TSX files found:
      CONFIDENCE_BOOST: Increases to HIGH
      component_files_count: N
</jsx_tsx_detection>

<meta_framework_detection>
  CHECK: For React meta-frameworks
    NEXT_JS:
      LOOK_FOR: "next" in package.json dependencies
      LOOK_FOR: next.config.js or next.config.mjs
      IF found: meta_framework = "next.js"

    GATSBY:
      LOOK_FOR: "gatsby" in package.json dependencies
      LOOK_FOR: gatsby-config.js
      IF found: meta_framework = "gatsby"

    REMIX:
      LOOK_FOR: "@remix-run/react" in package.json
      LOOK_FOR: remix.config.js
      IF found: meta_framework = "remix"
</meta_framework_detection>

<state_management_detection>
  CHECK: For state management libraries
    REDUX:
      LOOK_FOR: "react-redux" or "@reduxjs/toolkit"
      IF found: state_management = "redux"

    ZUSTAND:
      LOOK_FOR: "zustand" in dependencies
      IF found: state_management = "zustand"

    MOBX:
      LOOK_FOR: "mobx" and "mobx-react"
      IF found: state_management = "mobx"

    CONTEXT_ONLY:
      IF no state library found: state_management = "context-api"
</state_management_detection>

<result_structure>
  IF React detected:
    RETURN:
      framework: "react"
      version: "[detected version]"
      typescript: true | false
      meta_framework: "next.js" | "gatsby" | "remix" | null
      state_management: "redux" | "zustand" | "mobx" | "context-api"
      confidence: "high" | "medium"
      indicators:
        - package.json found: yes
        - react dependency found: yes
        - jsx/tsx files found: yes/no
        - component_files_count: N
        - typescript: yes/no
        - meta_framework: "[name]" | null
</result_structure>

</step>

<step number="3" name="angular_detection">

### Step 3: Angular Detection

Detect Angular framework and version.

<detection_criteria>
  REQUIRED: One of the following
    - package.json with @angular dependencies
    - angular.json configuration file

  CONFIDENCE_HIGH: If both package.json AND angular.json found
  CONFIDENCE_MEDIUM: If only package.json with @angular
</detection_criteria>

<angular_json_detection>
  IF angular.json exists:
    READ: angular.json file
    PARSE: JSON content
    VERIFY: Valid Angular workspace configuration
    LOOK_FOR:
      - "version" field
      - "projects" configuration
      - Angular CLI workspace structure

    CONFIDENCE: HIGH if angular.json is valid
</angular_json_detection>

<package_json_detection>
  IF package.json exists:
    READ: package.json file
    SEARCH: For Angular core packages:
      - "@angular/core"
      - "@angular/common"
      - "@angular/platform-browser"
      - "@angular/cli" (in devDependencies)

    EXTRACT: Version from @angular/core dependency
      - Exact: "17.0.0"
      - Range: "^17.0.0"

    DETECT: Angular version family
      - Angular 17+ (latest)
      - Angular 15-16
      - Angular 14 or older
</package_json_detection>

<typescript_detection>
  CHECK: TypeScript configuration (Angular requires TypeScript)
    LOOK_FOR: tsconfig.json
    LOOK_FOR: tsconfig.app.json
    LOOK_FOR: "typescript" in package.json devDependencies

    VERIFY: TypeScript is configured
    typescript: true (always true for Angular)
</typescript_detection>

<component_detection>
  SEARCH: For Angular component files
    PATTERN: ["src/**/*.component.ts", "**/*.component.ts"]
    COUNT: Number of component files

    LOOK_FOR: Component decorator usage
    SEARCH: For @Component( in .ts files

    IF components found:
      component_files_count: N
      CONFIDENCE_BOOST: Confirms Angular project
</component_detection>

<standalone_detection>
  CHECK: For standalone components (Angular 14+)
    SEARCH: For standalone: true in component files
    PATTERN: Look for standalone components

    IF standalone components found:
      uses_standalone: true
      INDICATES: Modern Angular setup
</standalone_detection>

<result_structure>
  IF Angular detected:
    RETURN:
      framework: "angular"
      version: "[detected version]"
      version_family: "17+" | "15-16" | "14-"
      typescript: true
      uses_standalone: true | false
      confidence: "high" | "medium"
      indicators:
        - package.json found: yes
        - angular.json found: yes/no
        - @angular/core found: yes
        - component files found: yes/no
        - component_files_count: N
        - standalone components: yes/no
</result_structure>

</step>

<step number="4" name="vue_detection">

### Step 4: Vue Detection

Detect Vue framework, version (Vue 2 vs Vue 3), and meta-frameworks.

<detection_criteria>
  REQUIRED: One of the following
    - package.json with vue dependency
    - .vue files in project

  CONFIDENCE_HIGH: If both package.json AND .vue files found
  CONFIDENCE_MEDIUM: If only package.json with vue
</detection_criteria>

<package_json_detection>
  IF package.json exists:
    READ: package.json file
    SEARCH: For Vue dependency:
      - "vue": "version"

    EXTRACT: Version to determine Vue 2 vs Vue 3
      - Vue 3: "^3.x.x" or "3.x.x"
      - Vue 2: "^2.x.x" or "2.x.x"

    DETECT: Vue major version
      - vue_major_version: 2 | 3
</package_json_detection>

<vue_file_detection>
  SEARCH: For .vue single-file components
    PATTERN: ["src/**/*.vue", "**/*.vue"]
    COUNT: Number of .vue files

    IF .vue files found:
      CONFIDENCE_BOOST: Increases to HIGH
      component_files_count: N
</vue_file_detection>

<composition_api_detection>
  IF vue_major_version = 3:
    CHECK: For Composition API usage
      SEARCH: In .vue files for:
        - <script setup>
        - import { ref, reactive, computed } from 'vue'
        - defineComponent

      IF Composition API found:
        uses_composition_api: true
      ELSE:
        uses_composition_api: false (using Options API)
</composition_api_detection>

<typescript_detection>
  CHECK: If TypeScript is used with Vue
    LOOK_FOR: "typescript" in package.json devDependencies
    LOOK_FOR: "@vue/typescript" or "vue-tsc"
    LOOK_FOR: tsconfig.json
    SEARCH: For <script lang="ts"> in .vue files

    IF TypeScript detected:
      typescript: true
</typescript_detection>

<meta_framework_detection>
  CHECK: For Vue meta-frameworks
    NUXT:
      LOOK_FOR: "nuxt" in package.json dependencies
      LOOK_FOR: nuxt.config.js or nuxt.config.ts
      EXTRACT: Nuxt version (Nuxt 2 vs Nuxt 3)
      IF found: meta_framework = "nuxt", nuxt_version = X

    QUASAR:
      LOOK_FOR: "quasar" in package.json
      LOOK_FOR: quasar.config.js
      IF found: meta_framework = "quasar"

    VITEPRESS:
      LOOK_FOR: "vitepress" in package.json
      IF found: meta_framework = "vitepress"
</meta_framework_detection>

<state_management_detection>
  CHECK: For state management libraries
    PINIA (Vue 3):
      LOOK_FOR: "pinia" in package.json
      IF found: state_management = "pinia"

    VUEX (Vue 2/3):
      LOOK_FOR: "vuex" in package.json
      IF found: state_management = "vuex"
</state_management_detection>

<result_structure>
  IF Vue detected:
    RETURN:
      framework: "vue"
      version: "[detected version]"
      major_version: 2 | 3
      typescript: true | false
      uses_composition_api: true | false | null
      meta_framework: "nuxt" | "quasar" | "vitepress" | null
      state_management: "pinia" | "vuex" | null
      confidence: "high" | "medium"
      indicators:
        - package.json found: yes
        - vue dependency found: yes
        - .vue files found: yes/no
        - component_files_count: N
        - composition API: yes/no/unknown
        - meta_framework: "[name]" | null
</result_structure>

</step>

<step number="5" name="svelte_detection">

### Step 5: Svelte Detection

Detect Svelte framework, version, and SvelteKit usage.

<detection_criteria>
  REQUIRED: One of the following
    - package.json with svelte dependency
    - .svelte files in project

  CONFIDENCE_HIGH: If both package.json AND .svelte files found
  CONFIDENCE_MEDIUM: If only package.json with svelte
</detection_criteria>

<package_json_detection>
  IF package.json exists:
    READ: package.json file
    SEARCH: For Svelte dependency:
      - "svelte": "version"

    EXTRACT: Version from dependency
      - Exact: "4.2.0"
      - Range: "^4.0.0"

    DETECT: Svelte major version
      - svelte_major_version: 3 | 4 | 5
</package_json_detection>

<svelte_file_detection>
  SEARCH: For .svelte component files
    PATTERN: ["src/**/*.svelte", "**/*.svelte"]
    COUNT: Number of .svelte files

    IF .svelte files found:
      CONFIDENCE_BOOST: Increases to HIGH
      component_files_count: N
</svelte_file_detection>

<sveltekit_detection>
  CHECK: For SvelteKit meta-framework
    LOOK_FOR: "@sveltejs/kit" in package.json dependencies
    LOOK_FOR: svelte.config.js file
    LOOK_FOR: src/routes directory (SvelteKit routing)

    IF SvelteKit detected:
      uses_sveltekit: true
      EXTRACT: SvelteKit version from @sveltejs/kit
      DETECT: Routing structure
        - src/routes for pages
        - +page.svelte for route pages
        - +layout.svelte for layouts
</sveltekit_detection>

<typescript_detection>
  CHECK: If TypeScript is used with Svelte
    LOOK_FOR: "typescript" in package.json devDependencies
    LOOK_FOR: tsconfig.json
    LOOK_FOR: svelte-check (TypeScript checker for Svelte)
    SEARCH: For <script lang="ts"> in .svelte files

    IF TypeScript detected:
      typescript: true
</typescript_detection>

<vite_detection>
  CHECK: If Vite is used as build tool
    LOOK_FOR: "vite" in package.json devDependencies
    LOOK_FOR: "@sveltejs/vite-plugin-svelte"
    LOOK_FOR: vite.config.js or vite.config.ts

    IF Vite detected:
      build_tool: "vite"
</vite_detection>

<result_structure>
  IF Svelte detected:
    RETURN:
      framework: "svelte"
      version: "[detected version]"
      major_version: 3 | 4 | 5
      typescript: true | false
      uses_sveltekit: true | false
      sveltekit_version: "[version]" | null
      build_tool: "vite" | "rollup" | "unknown"
      confidence: "high" | "medium"
      indicators:
        - package.json found: yes
        - svelte dependency found: yes
        - .svelte files found: yes/no
        - component_files_count: N
        - SvelteKit: yes/no
        - typescript: yes/no
</result_structure>

</step>

<step number="6" name="consolidate_results">

### Step 6: Consolidate Results

Aggregate all detection results and determine primary frontend framework.

<aggregation>
  COLLECT: All detection results from steps 2-5
  FILTER: Results with confidence >= MEDIUM
  SORT: By confidence (HIGH first, then MEDIUM)
</aggregation>

<multi_framework_handling>
  IF multiple frameworks detected:
    PRIORITIZE: By confidence score
    PRIMARY: Framework with highest confidence
    SECONDARY: List other detected frameworks
    WARN: Multi-framework project detected (unusual for frontend)

    EXAMPLE: React + Vue in same project
      - Might indicate monorepo
      - Might indicate migration in progress
</multi_framework_handling>

<no_framework_handling>
  IF no frameworks detected:
    CHECK: For vanilla JavaScript
      LOOK_FOR: .js files without framework

    RETURN:
      framework: "none" | "vanilla-js"
      message: "No supported frontend framework detected"
      suggestion: "Consider using --framework flag to specify manually"
</no_framework_handling>

<result_structure>
  RETURN:
    primary_framework:
      name: "[framework name]"
      version: "[version]"
      confidence: "high" | "medium"
      typescript: true | false
      meta_framework: "[name]" | null
      state_management: "[library]" | null
      component_files_count: N
      indicators: [list of found indicators]
      additional_info: {...}

    secondary_frameworks: [
      {name: "...", version: "...", confidence: "..."}
    ]

    detection_summary:
      total_frameworks_found: N
      primary_confidence: "high" | "medium"
      detection_method: "file-based" | "code-scan" | "hybrid"
      typescript_enabled: true | false
</result_structure>

</step>

</detection_flow>

## Confidence Scoring

<confidence_levels>
  HIGH (90-100%):
    - package.json dependency found
    - Framework-specific files found (.vue, .svelte, angular.json, etc.)
    - Component files found in codebase

  MEDIUM (60-89%):
    - package.json dependency found
    - No component files verified
    - Framework listed but not used yet

  LOW (0-59%):
    - Only indirect indicators
    - Unclear or conflicting signals
    - Dependency present but no actual usage
</confidence_levels>

## Error Handling

<error_protocols>
  <file_not_readable>
    LOG: File path and read error
    SKIP: That detection method
    CONTINUE: With other detection methods
  </file_not_readable>

  <invalid_json>
    LOG: package.json parse error
    FALLBACK: File-based detection only (look for .vue, .svelte, etc.)
  </invalid_json>

  <no_frameworks_found>
    RETURN: Empty result with suggestion
    SUGGEST: Manual framework specification
    OFFER: List of supported frameworks
  </no_frameworks_found>
</error_protocols>

## Usage Example

<example>
  INPUT: Project directory with React + TypeScript

  PROCESS:
    1. Scan for indicator files → Found: package.json, tsconfig.json
    2. Run React detection → Found "react": "^18.2.0"
    3. Check TypeScript → Found "@types/react" and tsconfig.json
    4. Search for TSX files → Found 23 .tsx files in src/
    5. Check meta-framework → Found "next": "^14.0.0"
    6. Calculate confidence → HIGH

  OUTPUT:
    {
      primary_framework: {
        name: "react",
        version: "18.2.0",
        typescript: true,
        meta_framework: "next.js",
        state_management: "context-api",
        component_files_count: 23,
        confidence: "high",
        indicators: [
          "package.json found",
          "react dependency found",
          "tsx files found (23)",
          "TypeScript configured",
          "Next.js detected"
        ]
      },
      secondary_frameworks: [],
      detection_summary: {
        total_frameworks_found: 1,
        primary_confidence: "high",
        detection_method: "hybrid",
        typescript_enabled: true
      }
    }
</example>

## Performance Considerations

- Cache package.json reads across all detection steps
- Use Glob patterns efficiently to avoid full codebase scans
- Limit component file counting to first 100 files for large projects
- Stop detection early if HIGH confidence already achieved

## Related Utilities

- `@specwright/workflows/skill/utils/detect-backend.md`
- `@specwright/workflows/skill/utils/detect-testing.md`
- `@specwright/workflows/skill/utils/detect-cicd.md`
