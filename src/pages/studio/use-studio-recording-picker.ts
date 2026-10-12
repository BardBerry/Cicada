import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useRecordingCatalogStore } from '@/features/recordings/use-recording-catalog-store';
import { useTypingSessionStore } from '@/features/typing/use-typing-session-store';
import { useRecordingWorkspaceActions } from '@/features/workspace/use-recording-workspace-actions';

type TUseStudioRecordingPickerParams = {
  canOpen: () => boolean;
  isPaletteOpen: () => boolean;
  focusStudio: () => void;
};

export function useStudioRecordingPicker({
  canOpen,
  isPaletteOpen,
  focusStudio,
}: TUseStudioRecordingPickerParams) {
  const isOpen = ref(false);
  let pickerSession = 0;
  let previousFocus: HTMLElement | null = null;
  let isMounted = false;

  const catalogStore = useRecordingCatalogStore();
  const typingSessionStore = useTypingSessionStore();
  const workspaceActions = useRecordingWorkspaceActions();

  function open() {
    if (isOpen.value || !canOpen()) return;

    previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    isOpen.value = true;
    void catalogStore.listRecordings();
  }

  async function openRecording(recordingId: string) {
    if (!isOpen.value || !canOpen()) return;
    const expectedPickerSession = pickerSession;
    await workspaceActions.openRecording({
      recordingId,
      canAccept: () =>
        isMounted &&
        isOpen.value &&
        pickerSession === expectedPickerSession &&
        canOpen(),
      onAccepted: (recording) => {
        typingSessionStore.showRecording(recording.recording);
        isOpen.value = false;
      },
    });
  }

  function handleCloseFocus(event: Event) {
    event.preventDefault();
    const target = previousFocus;
    previousFocus = null;
    void nextTick(() => {
      if (!isMounted || isOpen.value || isPaletteOpen()) return;
      if (
        target?.isConnected &&
        target !== document.body &&
        !target.matches(':disabled, [inert]') &&
        !target.closest('[inert]')
      ) {
        target.focus();
      } else {
        focusStudio();
      }
    });
  }

  watch(
    isOpen,
    () => {
      pickerSession += 1;
    },
    { flush: 'sync' },
  );

  onMounted(() => {
    isMounted = true;
  });

  onBeforeUnmount(() => {
    isMounted = false;
  });

  return { isOpen, open, openRecording, handleCloseFocus };
}
