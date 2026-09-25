import { onMounted, onUnmounted } from 'vue';

import type { EAppCommand } from '../commands/app-command.model';
import type { TKeymapContext } from './keymap.model';
import { resolveKeydownCommand } from './resolve-keydown-command';

type TUseKeymapParams = {
  getContext: () => TKeymapContext;
  onCommand: (command: EAppCommand) => void;
};

export function useKeymap({ getContext, onCommand }: TUseKeymapParams) {
  function handleKeydown(event: KeyboardEvent) {
    const command = resolveKeydownCommand({
      event,
      context: getContext(),
    });

    if (!command) return;

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
