<script setup lang="ts">
import { CheckIcon } from '@lucide/vue';
import {
  ListboxContent,
  ListboxFilter,
  ListboxGroup,
  ListboxGroupLabel,
  ListboxItem,
  ListboxRoot,
} from 'reka-ui';
import { computed, ref, useId, useTemplateRef, watch } from 'vue';

import UiButton from '@/shared/ui/ui-button.vue';
import UiDialog from '@/shared/ui/ui-dialog.vue';

import type { TRecordingSummary } from './recording.model';
import { compareRecordingSummaries } from './recording-consistency';

type TProps = {
  recordings: readonly TRecordingSummary[];
  currentRecordingId: string | null;
  loading: boolean;
  errorMessage: string | null;
  disabledReason?: string;
};

const props = defineProps<TProps>();
const emit = defineEmits<{
  select: [recordingId: string];
  retry: [];
  closeFocus: [event: Event];
}>();
const open = defineModel<boolean>('open', { default: false });
const query = ref('');
const isKeyboardNavigation = ref(true);
const currentDate = ref(new Date());
const search = useTemplateRef('search');
const listbox = useTemplateRef('listbox');
const resultsId = useId();
let lastPointerPosition: { x: number; y: number } | null = null;
const titleDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'short',
});
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  timeStyle: 'short',
});
const groupLabels = ['Today', 'Yesterday', 'Last 7 Days', 'Older'] as const;

const disabled = computed(() => props.loading || Boolean(props.disabledReason));
const results = computed(() => {
  const searchText = query.value.trim().toLocaleLowerCase();
  const today = new Date(currentDate.value);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);

  return [...props.recordings]
    .sort(compareRecordingSummaries)
    .map((recording) => {
      const createdAt = new Date(recording.createdAt);
      const group =
        createdAt >= today
          ? 'Today'
          : createdAt >= yesterday
            ? 'Yesterday'
            : createdAt >= weekStart
              ? 'Last 7 Days'
              : 'Older';
      const date = (
        group === 'Today' || group === 'Yesterday'
          ? timeFormatter
          : dateFormatter
      ).format(createdAt);
      return {
        ...recording,
        title:
          recording.name || `Recording ${titleDateFormatter.format(createdAt)}`,
        date,
        group,
        duration: formatDuration(recording.durationMs),
      };
    })
    .filter((recording) =>
      `${recording.title} ${recording.preview}`
        .toLocaleLowerCase()
        .includes(searchText),
    );
});
const groups = computed(() =>
  groupLabels
    .map((label) => ({
      label,
      recordings: results.value.filter(
        (recording) => recording.group === label,
      ),
    }))
    .filter((group) => group.recordings.length),
);
const resultCount = computed(() => {
  const total = props.recordings.length;
  const noun = total === 1 ? 'recording' : 'recordings';
  return query.value.trim()
    ? `${results.value.length} of ${total} ${noun}`
    : `${total} ${noun}`;
});
const activeDescendant = computed(() => {
  const highlighted = listbox.value?.highlightedElement;
  return !disabled.value &&
    results.value.some(
      (recording) => recording.id === highlighted?.dataset.recording,
    )
    ? highlighted?.id
    : undefined;
});

function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function handleOpenFocus(event: Event) {
  event.preventDefault();
  search.value?.focus();
  if (!disabled.value) listbox.value?.highlightFirstItem();
}

function selectRecording(event: Event, recordingId: string) {
  event.preventDefault();
  if (!disabled.value) emit('select', recordingId);
}

function handlePointerEnter(event: PointerEvent) {
  lastPointerPosition ??= { x: event.clientX, y: event.clientY };
}

function handlePointerMove(event: PointerEvent) {
  const position = { x: event.clientX, y: event.clientY };
  const previous = lastPointerPosition;
  lastPointerPosition = position;

  // Scrolling can emit pointermove without the pointer actually moving.
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
  const group = groups.value.find((group) => group.recordings[0]?.id === value);
  if (!group) return;

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

  // Reveal the heading only when it and the highlighted row fit together.
  if (offset > 0 && element.getBoundingClientRect().bottom + offset <= bottom) {
    viewport.scrollTop -= offset;
  }
}

function handleTab(event: KeyboardEvent) {
  // Leave normal focus navigation available for the error state's retry button.
  if (
    props.errorMessage ||
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  )
    return;
  event.preventDefault();
  event.stopPropagation();
  if (disabled.value || !results.value.length) return;

  const current = listbox.value?.highlightedElement?.dataset.recording;
  const index = results.value.findIndex(
    (recording) => recording.id === current,
  );
  const nextIndex =
    index === -1
      ? event.shiftKey
        ? results.value.length - 1
        : 0
      : (index + (event.shiftKey ? -1 : 1) + results.value.length) %
        results.value.length;
  const recording = results.value[nextIndex];
  if (recording) listbox.value?.highlightItem(recording.id);
}

watch(
  open,
  (value) => {
    if (value) {
      query.value = '';
      isKeyboardNavigation.value = true;
      currentDate.value = new Date();
      lastPointerPosition = null;
    }
  },
  { flush: 'sync' },
);

watch(
  [results, disabled],
  () => {
    if (!open.value || disabled.value || !results.value.length) return;
    const highlighted = listbox.value?.highlightedElement;
    // Loading and filtering can remove the target without a keyboard event.
    if (
      !highlighted?.isConnected ||
      highlighted.hasAttribute('data-disabled')
    ) {
      listbox.value?.highlightFirstItem();
    }
  },
  { flush: 'post' },
);
</script>

<template>
  <UiDialog
    v-model:open="open"
    title="Open Recording"
    position="top"
    :heading="false"
    :padded="false"
    @open-focus="handleOpenFocus"
    @close-focus="emit('closeFocus', $event)"
  >
    <ListboxRoot
      ref="listbox"
      as-child
      highlight-on-hover
      @highlight="handleHighlight"
    >
      <!-- Keep the keyboard target when the pointer leaves the palette. -->
      <div
        class="recording-picker"
        @keydown.capture="isKeyboardNavigation = true"
        @pointerenter.self="handlePointerEnter"
        @pointermove.capture="handlePointerMove"
        @pointerleave.capture.stop
      >
        <ListboxFilter v-model="query" as-child>
          <input
            ref="search"
            v-model="query"
            class="input"
            type="search"
            role="combobox"
            aria-label="Search recordings"
            aria-autocomplete="list"
            :aria-expanded="open"
            :aria-controls="resultsId"
            :aria-activedescendant="activeDescendant"
            placeholder="Search saved recordings..."
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            :spellcheck="false"
            @keydown.tab="handleTab"
          />
        </ListboxFilter>
        <div class="results" :aria-busy="props.loading">
          <p v-if="props.loading" class="message" role="status">
            Loading recordings...
          </p>
          <div v-if="props.errorMessage" class="message">
            <p class="error" role="alert">{{ props.errorMessage }}</p>
            <UiButton :disabled="props.loading" @click="emit('retry')">
              Reload recordings
            </UiButton>
          </div>
          <p
            v-if="props.disabledReason && !props.loading"
            class="message"
            role="status"
          >
            {{ props.disabledReason }}
          </p>
          <ListboxContent as-child>
            <div :id="resultsId" aria-label="Saved recordings">
              <ListboxGroup
                v-for="group in groups"
                :key="group.label"
                class="group"
              >
                <ListboxGroupLabel class="group-label">{{
                  group.label
                }}</ListboxGroupLabel>
                <ListboxItem
                  v-for="recording in group.recordings"
                  :key="recording.id"
                  :value="recording.id"
                  :disabled="disabled"
                  as-child
                  @select="selectRecording($event, recording.id)"
                >
                  <div
                    :data-recording="recording.id"
                    :aria-disabled="disabled"
                    :aria-labelledby="`${resultsId}-${recording.id}-title`"
                    :aria-describedby="`${resultsId}-${recording.id}-metadata ${resultsId}-${recording.id}-preview`"
                    class="item"
                  >
                    <div
                      :id="`${resultsId}-${recording.id}-title`"
                      class="heading"
                    >
                      <span class="title">{{ recording.title }}</span>
                      <span
                        v-if="recording.id === props.currentRecordingId"
                        class="current"
                      >
                        <CheckIcon class="current-icon" aria-hidden="true" />
                        Current
                      </span>
                    </div>
                    <span
                      :id="`${resultsId}-${recording.id}-metadata`"
                      class="metadata"
                    >
                      <time :datetime="recording.createdAt">{{
                        recording.date
                      }}</time>
                      <span
                        :aria-label="`Duration ${recording.duration}`"
                        class="duration"
                      >
                        {{ recording.duration }}
                      </span>
                    </span>
                    <span
                      :id="`${resultsId}-${recording.id}-preview`"
                      class="preview"
                    >
                      {{ recording.preview || 'No caption text' }}
                    </span>
                  </div>
                </ListboxItem>
              </ListboxGroup>
            </div>
          </ListboxContent>
          <p
            v-if="!results.length && !props.loading && !props.errorMessage"
            class="empty"
            role="status"
          >
            {{
              props.recordings.length
                ? 'No matching recordings'
                : 'No saved recordings yet'
            }}
          </p>
        </div>
        <footer class="footer">
          <span class="count" role="status">{{ resultCount }}</span>
        </footer>
      </div>
    </ListboxRoot>
  </UiDialog>
</template>

<style scoped>
.recording-picker {
  display: flex;
  flex-direction: column;
  max-height: calc(var(--dialog-available-height) - 2px);
  min-width: 0;
}

.input {
  display: block;
  flex-shrink: 0;
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
  flex: 0 1 auto;
  min-height: 0;
  max-height: 420px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-padding-block: var(--space-4);
  padding: var(--space-4);
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

.footer {
  flex-shrink: 0;
  padding: var(--space-2) var(--space-4);
  color: var(--app-muted);
  border-top: 1px solid var(--app-border);
  font-size: var(--font-size-sm);
}

.count {
  font-variant-numeric: tabular-nums;
}

.item {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  user-select: none;
}

.item[data-highlighted]:not([data-disabled]) {
  color: var(--app-accent);
  background: var(--app-accent-soft);
}

.item[data-disabled] {
  opacity: 0.6;
  cursor: default;
}

.heading {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}

.title {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.current {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-1);
  color: var(--app-accent);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.current-icon {
  width: 14px;
  height: 14px;
}

.metadata {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-2);
  color: var(--app-muted);
  font-size: var(--font-size-sm);
}

.duration {
  font-variant-numeric: tabular-nums;
}

.preview {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  color: var(--app-muted);
  font-size: var(--font-size-sm);
  overflow-wrap: anywhere;
}

.message,
.empty {
  margin: 0;
  padding: var(--space-5) var(--space-3);
  color: var(--app-muted);
  font-size: var(--font-size-sm);
  text-align: center;
}

.error {
  margin: 0 0 var(--space-3);
  overflow-wrap: anywhere;
}
</style>
