<script setup lang="ts">
import {
  ListboxContent,
  ListboxFilter,
  ListboxGroup,
  ListboxGroupLabel,
  ListboxItem,
  ListboxRoot,
} from 'reka-ui';
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue';

import UiDialog from '@/shared/ui/ui-dialog.vue';

import { formatShortcut } from '../keymap/format-shortcut';
import type { EAppCommand, TResolvedCommand } from './app-command.model';
import { resolveCommandResults } from './resolve-command-results';

type TProps = { commands: readonly TResolvedCommand[] };
const props = defineProps<TProps>();
const emit = defineEmits<{
  select: [command: EAppCommand];
  closeFocus: [event: Event];
}>();
const open = defineModel<boolean>('open', { default: false });
const query = ref('');
const isKeyboardNavigation = ref(true);
const search = useTemplateRef('search');
const listbox = useTemplateRef('listbox');
const resultsId = useId();
let previousFocus: HTMLElement | null = null;
let lastPointerPosition: { x: number; y: number } | null = null;
const results = computed(() =>
  resolveCommandResults(props.commands, query.value).map((section) => ({
    ...section,
    commands: section.commands.map((command) => ({
      ...command,
      shortcutDisplays: command.shortcuts.map((shortcut) =>
        formatShortcut({ shortcut }),
      ),
    })),
  })),
);
const visibleCommands = computed(() =>
  results.value.flatMap((section) => section.commands),
);
const hasEnabledResults = computed(() =>
  visibleCommands.value.some((command) => command.enabled),
);
const activeDescendant = computed((): string | undefined => {
  const highlighted = listbox.value?.highlightedElement;
  return visibleCommands.value.some(
    (command) => command.enabled && command.id === highlighted?.dataset.command,
  )
    ? highlighted?.id
    : undefined;
});

watch(
  visibleCommands,
  () => {
    if (!open.value || !hasEnabledResults.value) return;
    const highlighted = listbox.value?.highlightedElement;
    // State changes can remove or disable the current target without a search input event.
    if (
      !highlighted?.isConnected ||
      highlighted.hasAttribute('data-disabled')
    ) {
      listbox.value?.highlightFirstItem();
    }
  },
  { flush: 'post' },
);

watch(
  open,
  (value) => {
    if (!value) return;
    query.value = '';
    isKeyboardNavigation.value = true;
    lastPointerPosition = null;
    previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  },
  { flush: 'sync' },
);

function handleOpenFocus(event: Event) {
  event.preventDefault();
  search.value?.focus();
  listbox.value?.highlightFirstItem();
}

function handleCloseFocus(event: Event) {
  emit('closeFocus', event);
  if (event.defaultPrevented) return;
  event.preventDefault();
  const target = previousFocus;
  previousFocus = null;
  // The dialog has no trigger when opened by a shortcut.
  void nextTick(() => {
    if (
      open.value ||
      !target?.isConnected ||
      target.matches(':disabled, [inert]') ||
      target.closest('[inert]')
    )
      return;
    target.focus();
  });
}

function selectCommand(event: Event, command: TResolvedCommand) {
  event.preventDefault();
  if (command.enabled) emit('select', command.id);
}

function handlePointerEnter(event: PointerEvent) {
  lastPointerPosition ??= { x: event.clientX, y: event.clientY };
}

function handlePointerMove(event: PointerEvent) {
  const position = { x: event.clientX, y: event.clientY };
  const previous = lastPointerPosition;
  lastPointerPosition = position;

  // Block stationary-pointer events before Reka's item handler, without waiting for a render.
  if (previous && previous.x === position.x && previous.y === position.y) {
    event.stopPropagation();
    return;
  }
  isKeyboardNavigation.value = false;
}

function handleHighlight(
  payload: { ref: HTMLElement; value: unknown } | undefined,
) {
  if (!payload || !isKeyboardNavigation.value) return;
  const { ref: element, value } = payload;
  const section = results.value.find(
    (section) =>
      section.label &&
      section.commands.find((command) => command.enabled)?.id === value,
  );
  if (!section) return;

  const viewport = element.closest<HTMLElement>('.results');
  const heading = element
    .closest('.group')
    ?.querySelector<HTMLElement>('.group-label');
  if (!viewport || !heading) return;

  const bounds = viewport.getBoundingClientRect();
  const style = getComputedStyle(viewport);
  const top =
    bounds.top + viewport.clientTop + parseFloat(style.scrollPaddingTop);
  const bottom =
    bounds.top +
    viewport.clientTop +
    viewport.clientHeight -
    parseFloat(style.scrollPaddingBottom);
  const offset = top - heading.getBoundingClientRect().top;

  // Include the heading and disabled leading rows only when the whole range fits.
  if (offset > 0 && element.getBoundingClientRect().bottom + offset <= bottom) {
    viewport.scrollTop -= offset;
  }
}

function handleTab(event: KeyboardEvent) {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();

  const commands = visibleCommands.value.filter((command) => command.enabled);
  if (!commands.length) return;

  const current = listbox.value?.highlightedElement?.dataset.command;
  const index = commands.findIndex((command) => command.id === current);
  const nextIndex =
    index === -1
      ? event.shiftKey
        ? commands.length - 1
        : 0
      : (index + (event.shiftKey ? -1 : 1) + commands.length) % commands.length;
  const command = commands[nextIndex];
  if (!command) return;

  search.value?.focus();
  listbox.value?.highlightItem(command.id);
}
</script>

<template>
  <UiDialog
    v-model:open="open"
    title="Command Palette"
    position="top"
    :heading="false"
    :padded="false"
    @open-focus="handleOpenFocus"
    @close-focus="handleCloseFocus"
  >
    <!-- Pointer exit should not clear the current keyboard target. -->
    <ListboxRoot
      ref="listbox"
      as-child
      highlight-on-hover
      @highlight="handleHighlight"
    >
      <div
        class="command-palette"
        @keydown.capture="isKeyboardNavigation = true"
        @pointerenter.self="handlePointerEnter"
        @pointermove.capture="handlePointerMove"
        @pointerleave.capture.stop
        @keydown.tab="handleTab"
      >
        <div class="layout">
          <div class="search">
            <ListboxFilter v-model="query" as-child>
              <input
                ref="search"
                v-model="query"
                class="input"
                type="search"
                role="combobox"
                aria-label="Search commands"
                aria-autocomplete="list"
                :aria-expanded="open"
                :aria-controls="resultsId"
                :aria-activedescendant="activeDescendant"
                placeholder="Type a command or search..."
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                :spellcheck="false"
              />
            </ListboxFilter>
          </div>
          <ListboxContent as-child>
            <div
              :id="resultsId"
              class="results"
              :class="{ 'results--empty': !results.length }"
              aria-label="Commands"
            >
              <component
                :is="section.label ? ListboxGroup : 'div'"
                v-for="section in results"
                :key="section.id"
                class="group"
              >
                <ListboxGroupLabel v-if="section.label" class="group-label">{{
                  section.label
                }}</ListboxGroupLabel>
                <ListboxItem
                  v-for="command in section.commands"
                  :key="command.id"
                  :value="command.id"
                  :disabled="!command.enabled"
                  as-child
                  @select="selectCommand($event, command)"
                >
                  <div
                    :data-command="command.id"
                    :aria-disabled="!command.enabled"
                    :aria-labelledby="`${resultsId}-${command.id}-label`"
                    :aria-describedby="
                      [
                        !command.enabled && `${resultsId}-${command.id}-reason`,
                        command.shortcuts.length &&
                          `${resultsId}-${command.id}-shortcuts`,
                      ]
                        .filter(Boolean)
                        .join(' ') || undefined
                    "
                    :title="
                      !command.enabled ? command.disabledReason : undefined
                    "
                    class="item"
                    :class="{ 'item--disabled': !command.enabled }"
                    @pointermove.capture="
                      !command.enabled && $event.stopPropagation()
                    "
                  >
                    <component
                      :is="command.icon"
                      class="icon"
                      aria-hidden="true"
                    />
                    <div
                      class="description"
                      :class="{ 'description--disabled': !command.enabled }"
                    >
                      <span
                        :id="`${resultsId}-${command.id}-label`"
                        class="label"
                        >{{ command.label }}</span
                      >
                      <span
                        v-if="!command.enabled"
                        class="separator"
                        aria-hidden="true"
                      />
                      <span
                        v-if="!command.enabled"
                        :id="`${resultsId}-${command.id}-reason`"
                        class="reason"
                        >{{ command.disabledReason }}</span
                      >
                    </div>
                    <div
                      v-if="command.shortcuts.length"
                      :id="`${resultsId}-${command.id}-shortcuts`"
                      class="shortcuts"
                      role="group"
                      :aria-label="`Keyboard shortcuts: ${command.shortcutDisplays
                        .map((display) => display.accessibleLabel)
                        .join(' or ')}`"
                    >
                      <span
                        v-for="display in command.shortcutDisplays"
                        :key="display.accessibleLabel"
                        class="shortcut"
                        role="img"
                        :aria-label="display.accessibleLabel"
                        :title="display.accessibleLabel"
                      >
                        <kbd
                          v-for="(token, index) in display.tokens"
                          :key="index"
                          class="keycap"
                          aria-hidden="true"
                          >{{ token.text }}</kbd
                        >
                      </span>
                    </div>
                  </div>
                </ListboxItem>
              </component>
              <p v-if="!results.length" class="empty" role="status">
                No matching commands
              </p>
            </div>
          </ListboxContent>
        </div>
      </div>
    </ListboxRoot>
  </UiDialog>
</template>

<style scoped>
.command-palette {
  /* Reserve space for the search field and the dialog border. */
  --results-max-height: min(
    420px,
    max(
      0px,
      calc(var(--dialog-available-height) - var(--control-size-md) - 2px)
    )
  );
  min-width: 0;
}

.layout {
  min-width: 0;
}

.input {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: var(--control-size-md);
  padding: var(--space-2) var(--space-4);
  color: var(--app-text);
  background: var(--app-background);
  border: 0;
  border-bottom: 1px solid var(--app-border);
  border-radius: 0;
  outline: none;
}

.input::-webkit-search-cancel-button {
  display: none;
}

.results {
  min-height: min(180px, var(--results-max-height));
  max-height: var(--results-max-height);
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-padding-block: var(--space-4);
  padding: var(--space-4);
}

.results--empty {
  display: grid;
  place-items: center;
}

.group + .group {
  margin-top: var(--space-3);
}

.group-label {
  padding: var(--space-2) var(--space-3);
  color: var(--app-accent);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--control-size-md);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  user-select: none;
}

.item[data-highlighted]:not(.item--disabled) {
  color: var(--app-accent);
  background: var(--app-accent-soft);
}

.item--disabled {
  color: color-mix(in srgb, var(--app-muted) 75%, var(--app-background));
  cursor: default;
}

.item--disabled .keycap {
  color: inherit;
}

.icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.description {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: baseline;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
}

.description--disabled {
  grid-template-columns: auto auto minmax(0, 1fr);
}

.separator {
  position: relative;
  bottom: 2px;
  width: 3px;
  height: 3px;
  background: currentColor;
  border-radius: var(--radius-full);
}

.label {
  overflow-wrap: anywhere;
}

.reason {
  overflow: hidden;
  font-size: var(--font-size-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortcuts {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-1);
  margin-left: auto;
}

.shortcut {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.keycap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  min-height: 22px;
  padding: 2px var(--space-1);
  color: var(--app-muted);
  border: 1px solid var(--app-border);
  border-radius: 4px;
  font-family: var(--font-family-ui);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: var(--app-muted);
  font-size: var(--font-size-sm);
}

.empty {
  padding: var(--space-5) var(--space-3);
  text-align: center;
}
</style>
