import { onMounted, onUnmounted } from 'vue';

import { isKeyboardEventOwnedByUi } from '@/shared/ui/ui-keyboard-scope';

import { EAppCommand } from '../commands/app-command.model';
import type { TKeymapContext } from './keymap.model';
import { resolveShortcutCommand } from './resolve-command-shortcuts';

type TUseKeymapParams = {
  getContext: () => TKeymapContext;
  onCommand: (command: EAppCommand) => void;
};

export function useKeymap({ getContext, onCommand }: TUseKeymapParams) {
  function handleKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.isComposing || event.repeat) {
      return;
    }

    const command = resolveShortcutCommand({
      shortcut: event,
      context: getContext(),
    });

    if (!command) return;

    if (
      isKeyboardEventOwnedByUi(event, {
        allowFormControls: command === EAppCommand.OpenCommandPalette,
      })
    )
      return;

    event.preventDefault();
    onCommand(command);
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
}
