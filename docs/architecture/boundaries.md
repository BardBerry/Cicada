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
chroma mode
```

The caller maps application semantics to the generic component API.

---

### `features/`

Contains product/domain capabilities.

Current examples include:

```text
features/typing/
features/captions/
features/recordings/
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
  → recordings
  → typing

recordings
  → typing recording model and pure reduction

typing
  ↛ recordings
  ↛ workspace
```

The recordings feature owns the app-wide recording catalog, listing metadata, and persistence operations. The workspace feature owns the current temporary or saved recording and coordinates recording operations without implementing filesystem behavior. The typing feature remains independent of saved status and persistence workflows.

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

Application commands have registered owners, not one owner per route. Global and Studio owners coexist; additional areas within Studio may contribute their own commands through app/page orchestration without making feature code depend upward on `app/`.

Each command ID has one registered owner at a time. Owners evaluate availability, palette relevance, and optional display-only shortcut fallbacks from existing state and execute their own commands. The dispatcher prefers directly assigned shortcuts over owner-provided fallback hints without reading feature-specific state. Registration rejects duplicate ownership, cleanup is identity-safe, and dispatch revalidates availability before execution. Internal commands do not require palette definitions. Palette relevance may be absent while execution remains permitted; keyboard scope comes from the current route rather than a command's registration. Global bindings remain active on every route, and Studio bindings remain active throughout Studio, including Chroma mode.

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

recording catalog store
→ saved metadata, persistence operations, errors, and cleanup warnings

recording-workspace store
→ current temporary or saved recording, generation, and retained save-attempt state
```

Browsing the catalog must not replace Workspace content or change its presentation. Only an explicitly accepted Open installs a saved recording. Free typing and capture require no persisted entity; completed temporary takes live in Workspace until saved or replaced.

Studio derives read-only recording preview from the presence of Workspace content; temporary and saved recordings share preview behavior but have different actions. Capture and replay remain independent activities. New Recording unloads content without deleting a saved catalog entry. An admitted retake starts capture before clearing the previous temporary take, then advances Workspace generation and retains the new capture target synchronously.

Studio departure is blocked during capture, both by navigation command availability and by a route-leave guard. Capture must be stopped explicitly before leaving. Active replay stops and restores the current recording's static preview on actual Studio unmount, not on a navigation attempt that may be cancelled. Departure exits Chroma mode but preserves Workspace content, free typing, appearance settings, in-flight saves, and retained retry attempts. These lifecycle policies are independent of palette visibility and ranking.

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
→ current presentation state

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
