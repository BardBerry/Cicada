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
current recording
```

need store lifetime because Studio is not their lifetime owner. The current completed recording belongs to Workspace; capture and replay belong to Typing Session.

A store may compose lower-level composables.

For example:

```text
typing-session store
  → useTypingRecording()
  → useTypingReplay()
```

This does not mean recording and replay each need their own stores.

Prefer one meaningful owner over many tiny stores created only for structural symmetry.

### Recording Ownership

The typing session, recording catalog, and recording workspace have different lifetimes and responsibilities:

```text
TypingSessionStore:
  live session
  recording capture
  replay

RecordingCatalogStore:
  saved recording summaries
  recording persistence operations
  persistence errors and cleanup warnings

RecordingWorkspaceStore:
  one current temporary or saved recording
  workspace identity and generation
  failed-save attempt identity
  shared in-flight save guard
```

Workspace Actions call the Recording Catalog Store for persistence. Workspace does not construct catalogs, resolve paths, or duplicate persistence errors. Browsing summaries does not change Workspace. Accepted Open installs saved content before any session reset/static preview, with no intervening await.

A failed save is ambiguous because persistence may have completed before the caller observed the failure. Workspace retains the exact attempt and immutable performance for retry. In-flight saves block replacement; settled failed attempts can be abandoned by Record or New Recording without confirmation. Abandonment does not roll back storage: the catalog may contain a complete recording, or an unreferenced payload may remain.

Workspace content is either absent, temporary, or saved. Both temporary and saved content are presented as read-only recording previews. Capture/replay activity is not a content state. Record clears a temporary take only after capture start is accepted, as one synchronous admitted workflow. New Recording cancels capture, stops replay, clears content/capture targets, and resets the live session without resetting visual settings or requesting input focus.

The catalog is authoritative for logical membership. Saving creates or verifies an immutable payload before publishing its summary. Catalog writes use an exclusive sibling temporary file, complete writes, close, and replacement rename. This avoids direct truncation but is not a multi-file transaction, fsync durability, or cross-process locking. Operations are serialized by the catalog store within one application runtime. Deletion publishes membership removal before physical cleanup; cleanup failure is a warning, not logical failure. Orphans are not automatically imported.

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

recording catalog and payload files
→ explicitly saved recordings
```

Do not add persistence merely because state has moved into a store.

Choose persistence based on product semantics.

---

## Ownership and Activity Policy

Cleanup must follow the lifetime of the actual owner.

Store ownership does not mean every activity must continue when a consumer leaves. End an activity on page departure only when an explicit product policy requires it; do not reset all store-owned state merely because a component unmounted.

Capture and replay mechanisms belong to Typing Session, while Studio owns the departure policy:

- Recording blocks Studio departure. Navigation commands expose the restriction, and a route-leave guard also rejects navigation that bypasses commands. Leaving does not implicitly finish or discard a take.
- Active replay ends on actual Studio unmount. Restore the current Workspace recording's static preview; if there is no Workspace recording, stop replay without clearing other session state. Cancelled navigation does not stop replay, and returning to Studio does not restart it.
- Drafts, saved recordings, free typing, appearance settings, in-flight saves, and retained retry attempts survive route departure. Persistence continues under its existing store-owned guards.

Conversely, if a mode only makes sense while Studio exists:

```text
Chroma mode
→ Studio lifetime
```

then resetting Chroma mode when Studio unmounts is appropriate.

Ask whether the resource owner disappeared or an explicit activity policy applies. Neither case implies that unrelated state should be cleared.

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
   current recording in Workspace
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

Command owners use the existing lifetime owners to derive availability and palette relevance rather than copying their state into a generic context store. Multiple owners may coexist within one page; their registrations are detached with the orchestrating components without destroying domain state or cancelling saves.

---

## Application-Level State

Use app-level state when multiple high-level application areas must observe the same concept.

Example:

```text
Chroma presentation mode
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

Authored output behavior should come from recording/application state, not unrelated operating-system preferences.

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

recording caption motion
→ determined by authored presentation settings

Chroma / output rendering
→ renders the performance deterministically
```

---

## MP4 Export

The Recording Export Store owns the single background export, its progress,
and session-only output settings, including the unfinished filename and directory.
Closing the dialog retains those settings, and a failed export does not replace
them with an older attempt. Success generates a fresh filename unless the user
has already edited it. Studio owns whether its title-only settings dialog is open;
the Studio status identifies the current draft or saved source. Every Export entry point selects Video Frame
and opens this same output-settings dialog in one action; cancellation leaves that
view selected. No separate static preview is rendered in the dialog.

Studio UI owns the selected Workspace/Video Frame view for the application session.
Navigation preserves it; restarting defaults to Workspace. Chroma is a separate
presentation flag, available only in Workspace and cleared on Studio departure.
The Caption Layout Store owns Workspace layout, Video Frame position, and the
derived Video Frame layout. Video Frame position is a global preference persisted under
`cicada.video-frame-position` in localStorage. Coordinates are validated as finite
numbers in `[0, 1]` on load, with a centered default when missing or invalid.
Recording replacement, capture, saving, discarding, and navigation never reset it.
Workspace position remains independent. The effective export layout copies shared
caption configuration with Video Frame position substituted, without mutating
the original layout or recording format.
Progress listeners follow the export operation and are removed on success or failure.

The experimental macOS exporter renders a fixed 1920x1080 logical WebView and
varies native snapshot bitmap dimensions. Caption dimensions, wrapping, Motion
geometry, and the controlled animation clock are not scaled for output resolution.
VideoFrameCanvas teleports the same live CaptionCanvas into a fixed-size same-origin
iframe, then scales that document for display. This keeps Motion measurements
unscaled; a scaled Motion ancestor failed shared-layout projection and CSS zoom
changed text geometry in WKWebView. The iframe reuses compiled application styles
and the caption theme. Its animation-update callback selects Motion's JS clock
to avoid mixing the main document clock with the iframe's WAAPI timeline. Neither
Workspace nor the native renderer's appearance or timing is changed. The frame
and top toolbar are centered on the full Studio viewport; floating panels do not
participate in their geometry. The iframe renderer owns its ResizeObserver and
asynchronous stylesheet/font initialization; teardown prevents late Teleport setup.
The application and exporter share the chroma color token from `tokens.css`.
Native 4K detail is verified on a 2x Retina display;
equivalent detail on a 1x display remains unverified. This is a backing-density
verification limit, not a declared physical monitor-resolution limit.

The partial MP4 is encoded on the destination filesystem and published with
macOS exclusive rename. Existing outputs are never replaced. Working frame and
partial-output directories are removed after completion or failure.

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
