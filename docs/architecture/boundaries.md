# Architecture Boundaries

Cicada uses a small FSD-inspired architecture.

It is intentionally not strict Feature-Sliced Design.

The current useful layers are:

```text
src/
  app/
  pages/
  features/
  shared/
```

Do not introduce additional architectural layers such as `widgets`, `entities`, `services`, or similar unless a concrete problem requires them.

The goal is understandable ownership and dependency direction, not maximum architectural ceremony.

## Layers

### `shared/`

Contains generic primitives that do not know about Cicada product features.

Examples:

```text
shared/ui/app-button.vue
```

Typical responsibilities:

- generic UI primitives
- broadly reusable utilities
- generic infrastructure with no feature knowledge

Shared code must not depend on:

- features
- pages
- app

A shared component should expose generic appearance or behavior APIs rather than Cicada-specific domain concepts.

For example, a generic button may know about:

```text
primary
secondary
icon size
```

but should not know about:

```text
recording
replaying
zen mode
```

The caller maps application semantics to the generic component API.

---

### `features/`

Contains product/domain capabilities.

Current examples include:

```text
features/typing/
features/captions/
features/projects/
features/workspace/
```

A feature may contain:

- domain models
- feature stores
- composables
- feature-specific components
- feature-specific algorithms

Features may depend on:

```text
features
shared
```

Cross-feature imports are allowed when there is a genuine dependency, but do not create unnecessary coupling merely for convenience.

A feature must not depend upward on:

```text
pages
app
```

Feature code should not know which route or page is currently rendering it unless that knowledge is genuinely part of the feature.

The persistence-related feature dependencies are intentionally directional:

```text
workspace
  → projects

projects
  → typing recording model

typing
  ↛ projects
  ↛ workspace
```

The projects feature owns project metadata and persistence operations. The workspace feature owns the one recording currently being worked on and coordinates project operations without implementing filesystem behavior. The typing feature remains independent of project membership and persistence workflows.

---

### `pages/`

Pages are route-level orchestration.

Examples:

```text
pages/studio/
pages/settings/
```

A page may coordinate:

- features
- stores
- application commands
- route-level presentation
- local DOM interaction
- derived page state

Pages may depend on:

```text
pages
features
shared
app
```

A page should primarily orchestrate existing capabilities rather than become another domain layer.

Do not extract orchestration from a page solely to make the page file shorter.

For example, a command switch that coordinates Studio behavior may remain in `studio.vue` if moving it elsewhere would only hide the same orchestration.

---

### `app/`

Contains application composition and application-wide concerns.

Typical responsibilities:

- router
- application shell
- navigation
- application-level commands
- application-wide presentation state

Examples:

```text
app/router/
app/commands/
app/keymap/
app/app-shell.vue
app/app-navigation.vue
```

App code may depend on:

```text
app
pages
features
shared
```

Application-level state should only live here when it genuinely affects application-level behavior or presentation.

For example, a presentation mode that affects both Studio and AppShell may belong at the app level.

---

## Dependency Direction

The intended dependency rules are:

```text
shared
  → shared

features
  → features
  → shared

pages
  → pages
  → features
  → shared
  → app

app
  → app
  → pages
  → features
  → shared
```

These rules are also enforced where possible by ESLint boundaries configuration.

Do not bypass architectural-boundary errors with alternative import paths.

If a boundary rule appears to prevent a legitimate design, reconsider the ownership first before changing the rule.

---

## Imports Across Boundaries

Use relative imports within the same local architectural area.

Example:

```ts
import Caption from './caption.vue';
import type { TCaptionLayout } from './captions.model';
```

Use the `@/` alias for imports crossing architectural areas.

Example:

```ts
import AppButton from '@/shared/ui/app-button.vue';
import { useTypingSessionStore } from '@/features/typing/use-typing-session-store';
```

The distinction is conceptual:

```text
./
→ local relationship

@/
→ cross-area architectural dependency
```

Do not use `@/` everywhere merely for consistency.

---

## Feature Boundaries vs Lifetime Boundaries

A feature boundary describes what a concept belongs to.

A lifetime boundary describes how long a particular piece of state or behavior must survive.

These are different concerns.

For example, typing is one feature, but typing-related concepts may legitimately be split between:

```text
TypingSurface local state
→ DOM refs and native input behavior

typing-session store
→ shared recording/replay/session state
```

Do not force everything belonging to a feature into one store, one component, or one folder-level abstraction.

For recording persistence, the lifetime owners are separate:

```text
typing-session store
→ live typing, capture, and replay state

project store
→ project catalog, recording metadata, persistence operations, and persistence errors

recording-workspace store
→ current draft or saved recording and failed-save attempt state
```

Navigating between projects must not replace the workspace recording or change its presentation. A draft may exist without belonging to a project.

---

## Components and Ownership

A parent component generally owns placement.

A child component owns its internal appearance and behavior.

Example:

```text
Studio
→ decides where StudioControls is positioned

StudioControls
→ owns the internal appearance of its panel and buttons
```

Likewise:

```text
Studio
→ derives semantic studio status

StudioStatus
→ renders the provided status
```

Leaf/presentation components should prefer semantic props rather than importing high-level stores directly.

---

## Domain vs Presentation

Keep domain behavior separate from presentation behavior.

Examples:

```text
typing events
→ domain

recording/replay timing
→ feature behavior

caption layout
→ presentation/project state

caption theme
→ visual appearance

caption motion
→ presentation behavior

showTypingPrompt
→ derived page presentation state
```

Do not make typing or recording logic aware of how captions animate.

Do not put purely derived UI state into domain stores merely because the UI consumes domain state.

---

## Refactoring Boundaries

Do not move files between architectural layers merely because another arrangement appears more symmetrical.

A move should answer a concrete ownership problem.

Prefer:

```text
current structure
+ one justified change
```

over:

```text
large architectural redesign
for anticipated future requirements
```

Architecture should grow in response to real pressure from the application.
