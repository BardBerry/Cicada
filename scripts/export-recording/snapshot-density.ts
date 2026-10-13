import '@/assets/styles/main.css';
import '@fontsource-variable/quicksand';

import { invoke } from '@tauri-apps/api/core';
import { createApp, h, nextTick, reactive } from 'vue';

import CaptionCanvas from '@/features/captions/caption-canvas.vue';
import type { TCaptionLayout } from '@/features/captions/captions.model';
import { applyTypingSessionEvent } from '@/features/typing/apply-typing-session-event';
import type { TTypingRecording } from '@/features/typing/typing-recording.model';

const context = window as Window &
  typeof globalThis & {
    cicadaSnapshotInput: {
      recording: TTypingRecording;
      layout: TCaptionLayout;
    };
    cicadaExportClock: { advanceTo: (timestampMs: number) => Promise<void> };
  };
const { recording, layout } = context.cicadaSnapshotInput;
const session = reactive({ text: '', captions: [] as string[] });
let animationUpdates = 0;
createApp({
  render: () =>
    h(
      'div',
      {
        style:
          'position:relative;width:100vw;height:100vh;overflow:hidden;background:#00ff00',
      },
      [
        h(CaptionCanvas, {
          committedCaptions: session.captions,
          activeText: session.text,
          layout,
          showCaret: true,
          onAnimationUpdate: () => animationUpdates++,
        }),
      ],
    ),
}).mount('#app');

function geometry() {
  const items = [...document.querySelectorAll<HTMLElement>('.item')].map(
    (item) => {
      const caption = item.querySelector<HTMLElement>('.caption')!;
      const text = caption.querySelector<HTMLElement>('.text')!;
      const range = document.createRange();
      range.selectNodeContents(text);
      const rect = item.getBoundingClientRect();
      const style = getComputedStyle(caption);
      const caret = getComputedStyle(
        caption.querySelector('.caret')!,
        '::after',
      );
      return {
        text: text.textContent,
        rect: [rect.x, rect.y, rect.width, rect.height],
        lines: [...range.getClientRects()].map((line) => [
          line.x,
          line.y,
          line.width,
          line.height,
        ]),
        transform: getComputedStyle(item).transform,
        opacity: getComputedStyle(item).opacity,
        fontSize: style.fontSize,
        padding: style.padding,
        border: style.borderWidth,
        radius: style.borderRadius,
        caretOpacity: caret.opacity,
      };
    },
  );
  return {
    clockMs: performance.now(),
    viewport: [innerWidth, innerHeight],
    dpr: devicePixelRatio,
    laneWidth: document.querySelector('.lane')!.getBoundingClientRect().width,
    gap: getComputedStyle(document.querySelector('.history')!).gap,
    animationUpdates,
    items,
    animations: document.getAnimations().map((animation) => ({
      time: animation.currentTime,
      state: animation.playState,
    })),
  };
}

const results: unknown[] = [];
try {
  await document.fonts.ready;
  await nextTick();
  await context.cicadaExportClock.advanceTo(1100);
  const commits = recording.events.filter(
    ({ event }) => event.type === 'commit',
  );
  const samples = [
    { name: 'ordinary', time: commits[0].elapsedMs - 1 },
    { name: 'transition', time: commits[0].elapsedMs + 150 },
    { name: 'multiline', time: commits[2].elapsedMs - 1 },
    { name: 'multiple', time: commits[2].elapsedMs + 350 },
    { name: 'late', time: commits[commits.length - 1].elapsedMs - 1 },
    { name: 'endpoint', time: recording.durationMs },
  ].sort((a, b) => a.time - b.time);
  let eventIndex = 0;
  for (const sample of samples) {
    while (
      eventIndex < recording.events.length &&
      recording.events[eventIndex].elapsedMs <= sample.time
    ) {
      const recorded = recording.events[eventIndex++];
      await context.cicadaExportClock.advanceTo(1100 + recorded.elapsedMs);
      applyTypingSessionEvent({ state: session, event: recorded.event });
      await nextTick();
    }
    await context.cicadaExportClock.advanceTo(1100 + sample.time);
    await nextTick();
    const before = geometry();
    const captures: {
      metadata: unknown;
      geometryUnchanged: boolean;
      after: ReturnType<typeof geometry>;
    }[] = [];
    for (const pixelWidth of [1920, 3840, 2560, 1280, 1920]) {
      const name =
        pixelWidth === 1920 && captures.length > 0
          ? `${sample.name}-repeat`
          : sample.name;
      const metadata = await invoke('capture_snapshot_density', {
        sample: name,
        pixelWidth,
      });
      const after = geometry();
      captures.push({
        metadata,
        geometryUnchanged: JSON.stringify(before) === JSON.stringify(after),
        after,
      });
    }
    results.push({ sample, before, captures });
  }
  await invoke('finish_snapshot_density', {
    result: { recordingDurationMs: recording.durationMs, results },
  });
} catch (error) {
  await invoke('finish_snapshot_density', {
    result: { error: String(error), results },
  });
}
