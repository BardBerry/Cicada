# Cicada Agent Instructions

Cicada is a Tauri + Vue 3 + TypeScript desktop application.

The project intentionally favors simple, explicit code over speculative abstractions.

Before making architectural, state-management, Vue, TypeScript, or styling changes, read the relevant documents under `docs/`.

## Core Principles

- Prefer the smallest change that solves the current problem.
- Do not introduce abstractions for hypothetical future requirements.
- Do not extract code solely to reduce file length.
- Duplication is acceptable when a useful shared abstraction is not yet clear.
- Do not mix unrelated cleanup into feature work.
- Preserve existing architecture unless the task explicitly requires changing it.
- Do not introduce new architectural layers merely to make the folder tree look more structured.
- When proposing a new abstraction, explain the concrete problem that requires it.

Prioritize correctness in normal usage and protection of user data. Handle realistic failure scenarios, but avoid speculative defensive logic, elaborate rollback mechanisms, and abstractions introduced solely to cover hypothetical edge cases. When you identify an unusual failure path, report its likelihood and impact before adding complexity.

## Architecture

Follow:

- `docs/architecture/boundaries.md`
- `docs/architecture/state-ownership.md`

Important principles:

- Feature boundaries and state-lifetime boundaries are not the same thing.
- State belongs to the smallest owner whose lifetime and visibility requirements match it.
- Presentation components should not import application state when semantic props are sufficient.
- Cleanup must follow the lifetime of the owner of the resource or operation.

## Vue and TypeScript

Follow:

- `docs/code-style/vue-typescript.md`

Use Vue 3 Composition API with `<script setup lang="ts">`.

Do not introduce Options API code unless explicitly required.

## CSS

Follow:

- `docs/code-style/css.md`

Vue component styles use plain CSS with `<style scoped>`.

Do not introduce SCSS, Tailwind, CSS Modules, CSS-in-JS, or another styling system unless explicitly requested.

## Dependencies and Tooling

Use existing project dependencies and tooling unless there is a concrete reason to add something new.

Before adding a dependency:

1. confirm that the existing platform or dependencies do not already solve the problem;
2. explain what problem the dependency solves;
3. keep its responsibility narrow.

## Verification

After code changes, run the relevant existing project checks.

For normal application changes this generally includes:

- formatter
- ESLint
- typecheck
- production build

Do not weaken linting, typing, architectural-boundary rules, or other checks merely to make a change pass.
