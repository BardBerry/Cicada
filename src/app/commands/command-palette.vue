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
import UiInput from '@/shared/ui/ui-input.vue';

import { formatShortcut } from '../keymap/resolve-command-shortcuts';
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
const search = useTemplateRef('search');
const listbox = useTemplateRef('listbox');
const resultsId = useId();
let previousFocus: HTMLElement | null = null;
const results = computed(() =>
  resolveCommandResults(props.commands, query.value),
);
const hasEnabledResults = computed(() =>
  results.value.some((group) =>
    group.commands.some((command) => command.enabled),
  ),
);

watch(
  open,
  (value) => {
    if (!value) return;
    query.value = '';
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
</script>

<template>
  <UiDialog
    v-model:open="open"
    title="Command Palette"
    @open-focus="handleOpenFocus"
    @close-focus="handleCloseFocus"
  >
    <!-- Pointer exit should not clear the current keyboard target. -->
    <ListboxRoot ref="listbox" class="command-palette" highlight-on-hover>
      <div class="command-palette" @pointerleave.capture.self.stop>
        <ListboxFilter v-model="query" as-child>
          <UiInput
            ref="search"
            v-model="query"
            type="search"
            role="combobox"
            aria-label="Search commands"
            aria-autocomplete="list"
            :aria-expanded="open"
            :aria-controls="resultsId"
            :aria-activedescendant="
              hasEnabledResults ? listbox?.highlightedElement?.id : undefined
            "
            placeholder="Search commands..."
            autocomplete="off"
          />
        </ListboxFilter>
        <ListboxContent as-child>
          <div :id="resultsId" class="results" aria-label="Commands">
            <ListboxGroup
              v-for="group in results"
              :key="group.id"
              class="group"
            >
              <ListboxGroupLabel class="group-label">{{
                group.label
              }}</ListboxGroupLabel>
              <ListboxItem
                v-for="command in group.commands"
                :key="command.id"
                :value="command.id"
                :disabled="!command.enabled"
                as-child
                @select="selectCommand($event, command)"
              >
                <div
                  :aria-disabled="!command.enabled"
                  class="item"
                  :class="{ 'item--disabled': !command.enabled }"
                >
                  <component
                    :is="command.icon"
                    class="icon"
                    aria-hidden="true"
                  />
                  <div class="description">
                    <span class="label">{{ command.label }}</span>
                    <span v-if="!command.enabled" class="reason">{{
                      command.disabledReason
                    }}</span>
                  </div>
                  <div
                    v-if="command.shortcuts.length"
                    class="shortcuts"
                    aria-label="Keyboard shortcuts"
                  >
                    <kbd
                      v-for="shortcut in command.shortcuts"
                      :key="formatShortcut(shortcut)"
                      class="shortcut"
                    >
                      {{ formatShortcut(shortcut) }}
                    </kbd>
                  </div>
                </div>
              </ListboxItem>
            </ListboxGroup>
            <p v-if="!results.length" class="empty" role="status">
              No matching commands
            </p>
          </div>
        </ListboxContent>
      </div>
    </ListboxRoot>
  </UiDialog>
</template>

<style scoped>
.command-palette {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.results {
  max-height: min(420px, 55dvh);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.group + .group {
  margin-top: var(--space-3);
}

.group-label {
  padding: var(--space-2) var(--space-3);
  color: var(--app-muted);
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
  color: var(--app-muted);
  cursor: default;
}

.icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.description {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.label {
  overflow-wrap: anywhere;
}

.reason {
  font-size: var(--font-size-sm);
}

.shortcuts {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-1);
  margin-left: auto;
}

.shortcut {
  padding: 2px var(--space-1);
  color: var(--app-muted);
  border: 1px solid var(--app-border);
  border-radius: 4px;
  font-family: var(--font-family-ui);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.empty {
  margin: 0;
  color: var(--app-muted);
  font-size: var(--font-size-sm);
}

.empty {
  padding: var(--space-5) var(--space-3);
  text-align: center;
}
</style>
