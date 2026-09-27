# Vue and TypeScript Conventions

Cicada uses Vue 3 Composition API with TypeScript.

Prefer explicit, readable code and consistent conventions over clever abstractions.

## Vue Components

Use:

```vue
<script setup lang="ts">
```

Do not introduce Options API components unless explicitly required.

Component files use kebab-case.

Examples:

```text
caption-canvas.vue
studio-controls.vue
app-navigation.vue
```

Do not use PascalCase filenames for Vue components.

---

## Type Naming

Use these prefixes consistently:

```text
T...
→ type aliases

E...
→ enums

I...
→ interfaces

C...
→ classes
```

Examples:

```ts
type TCaptionLayout = {
  // ...
};

enum ECaptionHistoryDirection {
  Up = 'up',
  Down = 'down',
}

interface IExample {
  // ...
}

class CExample {
  // ...
}
```

Do not create an interface where a type alias is more appropriate merely to use the `I` prefix.

Choose the TypeScript construct first, then apply the naming convention.

---

## Props

For component-local props, use:

```ts
type TProps = {
  text: string;
  active?: boolean;
};

const props = defineProps<TProps>();
```

Prefer keeping the `props` object when explicit ownership improves readability.

Use:

```vue
{{ props.text }}
```

rather than destructuring every prop merely to shorten usage.

For defaults:

```ts
const props = withDefaults(defineProps<TProps>(), {
  variant: 'secondary',
});
```

---

## Emits

Declare emits explicitly when the component owns an event contract.

Do not declare and manually re-emit native events when ordinary Vue attribute/event fallthrough already provides the correct behavior.

Avoid wrappers that add no semantics.

---

## Function Style

Prefer function declarations for normal named functions:

```ts
function startReplay() {
  // ...
}
```

Use arrow functions primarily for:

- callbacks
- small function values
- array transformations
- APIs that require function expressions

Example:

```ts
const captions = values.map((value) => ({
  text: value,
}));
```

Do not convert all functions to arrow functions merely for stylistic consistency.

---

## Parameter Types

When a function needs multiple related parameters, prefer an object parameter with a named type.

Example:

```ts
type TApplyTypingSessionEventParams = {
  state: TTypingSessionState;
  event: TTypingEvent;
};

function applyTypingSessionEvent({
  state,
  event,
}: TApplyTypingSessionEventParams) {
  // ...
}
```

This is especially useful when several parameters have similar primitive types or when call-site meaning benefits from named fields.

Do not create parameter-object types for trivial single-argument functions.

---

## Enums vs String Literal Unions

Use enums for stable runtime/domain vocabulary when runtime values and semantic identity are useful.

Examples:

```ts
enum ETypingEventType {
  Insert = 'insert',
  Delete = 'delete',
  Commit = 'commit',
}
```

Small declarative component appearance APIs may use string literal unions when they remain simpler.

Example:

```ts
type TProps = {
  variant?: 'primary' | 'secondary';
  size?: 'standard' | 'icon';
};
```

Do not introduce an enum merely because there are two or three local visual options.

Choose the form that makes usage and refactoring clearest.

---

## Script Ordering

Within `<script setup>`, prefer this order:

```text
1. imports
2. component contract
3. local state and template refs
4. stores and stateful composables
5. derived state
6. handlers and commands
7. effects and subscriptions
8. lifecycle and cleanup
```

Example:

```ts
import { computed, ref } from 'vue';

import { useExampleStore } from '@/features/example/use-example-store';

type TProps = {
  // ...
};

const props = defineProps<TProps>();

const element = ref<HTMLElement | null>(null);

const exampleStore = useExampleStore();

const isVisible = computed(() => {
  // ...
});

function handleClick() {
  // ...
}

// watch(), useKeymap(), subscriptions...

// onMounted(), onUnmounted()...
```

This is a convention, not a reason to create artificial sections or comments in every small component.

Keep very small files naturally readable.

---

## Import Ordering

Use these conceptual groups:

```text
1. external packages
2. @/ cross-area project imports
3. ./ local imports
```

Example:

```ts
import { computed } from 'vue';

import AppButton from '@/shared/ui/app-button.vue';

import Caption from './caption.vue';
import type { TCaptionLayout } from './captions.model';
```

Within the same architectural area, prefer relative imports.

Across top-level architectural areas, prefer the `@/` alias.

Import sorting is handled by the project's ESLint configuration.

Do not manually fight the configured sorter.

---

## Stores

When consuming Pinia setup stores, use `storeToRefs()` for reactive state that is destructured.

Example:

```ts
const typingSessionStore = useTypingSessionStore();

const { session, lastRecording, isRecording, isReplaying } =
  storeToRefs(typingSessionStore);
```

Store methods may be destructured directly:

```ts
const { startRecording, stopRecording, startReplay, stopReplay } =
  typingSessionStore;
```

Do not wrap store methods merely to rename a single call unless the wrapper adds page-specific semantics.

Prefer:

```ts
typingSurface.value?.focus();
```

over:

```ts
function focusCaptionInput() {
  typingSurface.value?.focus();
}
```

when the wrapper adds no meaning.

---

## Computed State

Use `computed` for derived state.

Do not mirror existing reactive state into another `ref` with a watcher unless an actual independent state transition is required.

Prefer:

```ts
const isSessionEmpty = computed(() => {
  return session.value.text.length === 0 && session.value.captions.length === 0;
});
```

over synchronizing another mutable ref through `watch()`.

Watchers are appropriate for side effects and synchronization with external systems, not as a default mechanism for deriving values.

---

## Watchers

Use `watch` or `watchEffect` only when reacting to a change must cause a side effect.

Examples of valid side effects:

```text
external API synchronization
DOM/browser integration
persistence
subscriptions
imperative library integration
```

Do not use a watcher when the same value can be expressed as:

- `computed`
- template derivation
- a direct event/command
- normal data flow

Prefer explicit causal flow when possible.

---

## Component Responsibilities

Pages and parent components orchestrate.

Leaf components render and expose focused behavior.

Prefer semantic props for presentation components.

Example:

```text
Studio
→ computes EStudioStatus

StudioStatus
→ accepts status prop
```

Avoid making a leaf component import a high-level store merely to derive something its parent can already provide clearly.

---

## Template Refs

Keep DOM and component refs local to the component that interacts with them.

Example:

```ts
const typingSurface = ref<InstanceType<typeof TypingSurface> | null>(null);
```

Do not move template refs into stores.

Expose only the narrow imperative API a parent genuinely needs.

Example:

```ts
defineExpose({
  focus,
  blur,
});
```

---

## Classes in Templates

Use static `class` for classes that are always present.

Use `:class` for dynamic modifiers.

Prefer:

```vue
<div
  class="item"
  :class="{
    'item--exiting': caption.exiting,
  }"
>
```

rather than putting static and dynamic classes into one unnecessarily complex binding.

Detailed CSS naming rules live in:

```text
docs/code-style/css.md
```

---

## Avoid Empty Abstractions

Do not extract:

- one-line wrappers
- pass-through functions
- components with no meaningful responsibility
- models containing types with no reuse or conceptual value

merely to make another file shorter.

An abstraction should clarify ownership, reuse, semantics, or behavior.

File length alone is not sufficient justification.

---

## Comments

Prefer code whose names explain the behavior.

Use comments for:

- non-obvious invariants
- important browser/platform behavior
- deliberate deviations
- architectural reasons that cannot be expressed by naming

Do not narrate straightforward code.

Good:

```ts
// Caption output intentionally ignores the OS reduced-motion preference because
// motion is part of the authored project output.
```

Avoid:

```ts
// Increment index by one.
index += 1;
```

---

## General Rule

Prefer code that makes the causal path obvious.

Good Cicada code should make it easy to answer:

```text
Where does this state live?

Who changes it?

Who consumes it?

How long does it survive?

Why is this abstraction necessary?
```

If those answers become harder after a refactor, the refactor probably did not improve the code.
