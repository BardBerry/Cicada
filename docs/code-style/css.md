# CSS Conventions

Cicada uses plain CSS with Vue `<style scoped>`.

The goal is to keep styles local, readable, and easy to modify without the verbosity of full BEM naming.

## General Principles

- Use plain CSS.
- Use `<style scoped>` for component-specific styles.
- Use global CSS only for shared design tokens, resets, and application/theme-level styles.
- Do not introduce SCSS, Tailwind, CSS Modules, CSS-in-JS, or another styling system unless explicitly requested.
- Prefer simple CSS over abstractions.
- Do not create utility classes for styles used by only one component.
- Do not attempt to eliminate every CSS literal.
- Use tokens when they represent an existing shared design decision.

## Class Naming

Vue scoped styles already provide component-level namespacing.

Therefore, do not use full BEM names for every internal element.

### Component Root

The root class of a component uses the component's kebab-case name.

Example:

```vue
<div class="caption-canvas">
```

```css
.caption-canvas {
  /* ... */
}
```

Examples:

```css
.caption-canvas
.app-navigation
.studio-controls
.studio-status
```

The root class should remain descriptive because it is useful when reading templates and inspecting the DOM in DevTools.

### Internal Elements

Internal component elements use short semantic class names.

Prefer:

```css
.stack
.item
.link
.icon
.label
.tooltip
.divider
```

Do not repeat the component name for internal elements when `<style scoped>` already provides isolation.

Prefer:

```css
.item
.stack
.tooltip
```

instead of:

```css
.caption-canvas__item
.caption-canvas__stack
.app-navigation__tooltip
```

### Modifiers

Use `--modifier` for a variation, configuration, or state of a specific element.

The name before `--` identifies exactly what is being modified.

Examples:

```css
.item--placeholder
.item--exiting
.link--active
.button--primary
```

This means:

- `item--placeholder`: an `item` in its placeholder variation
- `item--exiting`: an `item` in its exiting state
- `link--active`: a `link` in its active state
- `button--primary`: a `button` in its primary variation

Do not use generic state classes such as:

```css
.is-active
.is-hidden
.is-exiting
```

when they make it unclear which element owns the state.

Prefer:

```css
.link--active
.item--exiting
```

### Root Modifiers

When the configuration belongs to the whole component, keep the component root name.

Examples:

```css
.caption-canvas--align-left
.caption-canvas--align-center
.caption-canvas--align-right

.caption-canvas--history-up
.caption-canvas--history-down
```

These describe configuration of the `caption-canvas` itself rather than one of its internal elements.

Example:

```css
.caption-canvas--align-center .stack {
  left: var(--caption-x);
  transform: translateX(-50%);
}

.caption-canvas--align-center .item {
  justify-content: center;
}
```

## Entity vs Modifier

Create a new base class when something is a distinct structural entity.

Use a modifier when it is still the same entity but in a different state or configuration.

Example:

```html
<div class="stack">
  <div class="item item--exiting">
    <!-- ... -->
  </div>
</div>
```

Here:

- `stack` is a distinct entity
- `item` is a distinct entity
- `item--exiting` is the exiting state of `item`

Do not write:

```css
.item--icon
```

if the icon is actually a separate child element.

Use:

```css
.icon
```

Likewise, prefer:

```html
<div class="item">
  <span class="label"></span>
  <Icon class="icon" />
</div>
```

rather than treating `label` and `icon` as modifiers of `item`.

## Dynamic Classes

Use a static `class` for the base class and `:class` only for dynamic modifiers.

Prefer:

```vue
<div
  class="item"
  :class="{
    'item--placeholder': caption.placeholder,
    'item--exiting': caption.exiting,
  }"
>
```

For enum-backed component configuration, generated modifier names are allowed when enum values intentionally match the CSS vocabulary:

```vue
<div
  class="caption-canvas"
  :class="[
    `caption-canvas--align-${props.layout.horizontalAlignment}`,
    `caption-canvas--history-${props.layout.historyDirection}`,
  ]"
>
```

Do not create TypeScript mappings merely to translate between identical semantic names.

## Naming Quality

Prefer names that describe an element's role in the component.

Good:

```css
.stack
.item
.tooltip
.divider
.label
```

Avoid vague names when a more meaningful role exists:

```css
.wrapper
.container
.inner
.thing
.content
```

Generic names are acceptable when they genuinely describe the role, but do not use them by default.

## Selectors

Prefer shallow selectors.

Good:

```css
.item {
  /* ... */
}

.item--exiting {
  /* ... */
}

.caption-canvas--align-center .item {
  /* ... */
}
```

Avoid unnecessarily deep selectors:

```css
.caption-canvas .stack .item .label {
  /* ... */
}
```

Do not encode the DOM tree into class names or selectors.

Prefer classes over element selectors when an element has component-specific styling.

## Scoped CSS Boundaries

Do not use `:deep()` merely to make linting pass.

Use `:deep()` only when intentionally styling implementation details inside a child component.

When styling the root element of a child component through normal Vue class fallthrough, first prefer an ordinary class.

If a runtime-generated class causes a static-analysis false positive, prefer making the state explicit in the template when that remains simple and readable.

## Global Styles

Component-specific structural styles belong in the component's scoped `<style>` block.

Global files are reserved for shared concerns such as:

```text
normalize.css
tokens.css
app-theme.css
caption-theme.css
zen-theme.css
```

Do not move component layout rules into global CSS merely to reuse a selector name.

## Design Tokens

Use existing tokens when the value represents the same semantic concept.

Examples:

```css
gap: var(--space-2);
border-radius: var(--radius-md);
color: var(--app-text);
background: var(--app-surface-raised);
```

Do not substitute a token only because its numeric value happens to match.

For example, do not use a spacing token for a control height just because both currently equal `48px`.

Do not create new tokens for every literal.

Literals are acceptable for component-specific details such as:

- `1px` borders
- icon dimensions
- composite shadows
- optical offsets
- specialized animation geometry
- one-off placement values

Create a token only when it represents a real shared design decision.

## Refactoring Existing Components

When applying these conventions to existing code:

- Preserve behavior and appearance.
- Rename classes only; do not redesign components as part of a naming cleanup.
- Keep component roots descriptive.
- Shorten internal BEM-style names where scoped CSS makes the prefix redundant.
- Preserve meaningful `--modifier` relationships.
- Do not blindly shorten names if doing so makes their role ambiguous.
- Update templates and selectors together.
- Do not introduce new styling abstractions as part of the rename.
- Run formatter, ESLint, typecheck, and production build after the refactor.

## Example

Before:

```vue
<div class="caption-canvas">
  <div class="caption-canvas__stack">
    <div
      class="caption-canvas__item"
      :class="{
        'caption-canvas__item--placeholder': caption.placeholder,
        'caption-canvas__item--exiting': caption.exiting,
      }"
    >
      <!-- ... -->
    </div>
  </div>
</div>
```

After:

```vue
<div class="caption-canvas">
  <div class="stack">
    <div
      class="item"
      :class="{
        'item--placeholder': caption.placeholder,
        'item--exiting': caption.exiting,
      }"
    >
      <!-- ... -->
    </div>
  </div>
</div>
```

The component root remains explicit, while internal scoped class names stay short and readable.
