# State Ownership

State belongs to the smallest owner whose lifetime and visibility requirements match the state.

Do not choose between component state, composables, or Pinia based only on which feature the concept belongs to.

The main questions are:

1. Who needs this state?
2. How long must it survive?
3. Who owns the behavior that changes it?
4. What lifecycle should clean it up?

## Component-Local State

Keep state local when it is only meaningful to one mounted component.

Typical examples:

- template refs
- DOM element references
- native focus state
- transient interaction state
- local visual state
- component-specific measurement state

Example:

```text
TypingSurface textarea ref
→ local

TypingSurface native focus behavior
→ local

Studio isTypingFocused
→ local page state
```

Do not put DOM elements or component-instance concerns into Pinia.

A store should not need to know how to call:

```text
element.focus()
element.blur()
```

unless the application architecture genuinely requires a DOM service, which Cicada currently does not.

---

## Derived State

If a value can be derived from existing state, prefer `computed` rather than storing another mutable copy.

Examples:

```text
isSessionEmpty
showTypingPrompt
studioStatus
```

A derived presentation value generally belongs near the consumer that needs it.

For example:

```text
typing store
→ owns isRecording and isReplaying

Studio
→ derives EStudioStatus from them
```

Do not put `studioStatus` into the typing store merely because it depends on typing state.

---

## Composables

A composable represents reusable behavior or a mechanism.

It does not automatically imply shared global ownership.

Examples:

```text
useTypingRecording()
useTypingReplay()
useKeymap()
```

A composable may create refs, timers, subscriptions, or methods for the owner that invokes it.

Its lifetime normally follows the owner that instantiated it.

The same composable can therefore have different lifetimes depending on where it is called.

Example:

```text
useTypingReplay() called during Pinia store creation
→ replay mechanism now has store lifetime
```

This is different from calling the same composable directly inside a page component.

---

## Pinia Stores

Use a store when state needs a shared, named owner whose lifetime extends beyond an individual consumer component.

Good reasons include:

- multiple consumers need the same state
- state must survive route/component changes
- one owner must coordinate several related mechanisms
- the application needs a clear source of truth

Example:

```text
typing session
recording state
replay state
last recording
```

belong in the typing session store because Studio is not their lifetime owner.

A store may compose lower-level composables.

For example:

```text
typing-session store
  → useTypingRecording()
  → useTypingReplay()
```

This does not mean recording and replay each need their own stores.

Prefer one meaningful owner over many tiny stores created only for structural symmetry.

### Recording and Project Ownership

The typing session, project catalog, and recording workspace have different lifetimes and responsibilities:

```text
TypingSessionStore:
  live session
  recording capture
  replay

ProjectStore:
  project catalog and metadata
  project and recording persistence operations
  persistence errors and cleanup warnings

RecordingWorkspaceStore:
  one current draft or saved recording
  failed-save attempt identity
  unsaved-work replacement guards
```

The workspace calls the Project Store for persistence. It does not construct manifests, resolve paths, or duplicate persistence errors. Project navigation does not change workspace state.

A failed save is ambiguous because persistence may have completed before the caller observed the failure. Abandoning a save attempt only unlocks the draft so it can be saved elsewhere, discarded, or replaced. It does not roll back storage. The original project may contain no recording, an unreferenced recording file, or a complete valid recording. A future confirmation dialog must explain that possibility, but dialog state and wording do not belong in the workspace store.

---

## Store State Is Not Persistence

Pinia provides runtime ownership.

It does not determine whether data is permanently persisted.

These are separate concerns:

```text
Pinia
→ runtime source of truth

localStorage / Tauri settings
→ persistent user preferences

future project file
→ project-specific persistent state
```

Do not add persistence merely because state has moved into a store.

Choose persistence based on product semantics.

---

## Ownership Determines Cleanup

Cleanup must follow the lifetime of the actual owner.

Do not stop long-lived work merely because one consumer component unmounted.

Example:

If replay belongs to the typing-session store:

```text
Studio unmounts
≠
replay owner disappears
```

Therefore Studio should not automatically stop replay simply because Studio unmounted.

Conversely, if a mode only makes sense while Studio exists:

```text
Zen mode
→ Studio lifetime
```

then resetting Zen when Studio unmounts is appropriate.

The correct question is:

> Did the owner disappear?

not:

> Did one consumer disappear?

---

## Local UI State vs Feature State

A single feature may legitimately contain both local and shared state.

Example:

```text
Typing feature

TypingSurface:
  textarea ref
  native focus handling
  input-event interpretation

TypingSessionStore:
  session text/captions
  recording
  replay
  last recording
```

Do not force these into the same ownership model simply because they belong to the same feature.

Feature boundaries and state-lifetime boundaries are separate.

---

## Presentation State

Keep page-specific presentation concerns close to the page.

Examples:

```text
showTypingPrompt
studioStatus
whether a local panel is open
whether an input is currently focused
```

These should not be promoted into stores unless another consumer genuinely needs them or their lifetime must extend beyond the page.

---

## Application-Level State

Use app-level state when multiple high-level application areas must observe the same concept.

Example:

```text
Zen presentation mode
```

affects:

```text
Studio
AppShell
navigation visibility
application chrome
```

That makes it broader than Studio-local presentation state.

Do not call something `studio` state if its actual ownership is application-wide.

Names should match ownership.

---

## Presentation Output Must Be Deterministic

Cicada produces visual content.

Authored output behavior should come from project/application state, not unrelated operating-system preferences.

For example:

```text
macOS prefers-reduced-motion
```

may reasonably affect optional Cicada application chrome motion.

It must not silently disable caption motion that is part of the authored video output.

Think of the layers separately:

```text
OS accessibility preference
→ Cicada chrome may respect it

project caption motion
→ determined by the project

Zen / output rendering
→ renders the project deterministically
```

---

## Decision Checklist

Before moving state into a store, ask:

```text
Does another consumer need it?

Does it need to survive this component?

Does it represent shared application or feature state?

Does a named long-lived owner improve the model?
```

If the answers are no, keep it local.

Before keeping state local, ask:

```text
Will destroying this component accidentally destroy behavior
that conceptually belongs somewhere else?
```

If yes, move ownership upward to the appropriate owner.

The goal is not minimum or maximum store usage.

The goal is correct lifetime and ownership.
