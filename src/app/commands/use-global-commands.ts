import { useRoute, useRouter } from 'vue-router';

import { useTypingSessionStore } from '@/features/typing/use-typing-session-store';

import { EAppRouteName } from '../router/app-route.model';
import {
  EAppCommand,
  ECommandRelevance,
  type TCommandEvaluation,
  type TCommandOwner,
} from './app-command.model';
import {
  GLOBAL_COMMANDS,
  GLOBAL_NAVIGATION_COMMANDS,
  type TGlobalCommand,
} from './app-command-routing';

export function useGlobalCommands(
  openPalette: () => void,
): TCommandOwner<TGlobalCommand> {
  const route = useRoute();
  const router = useRouter();
  const typingSessionStore = useTypingSessionStore();

  function evaluate(command: TGlobalCommand): TCommandEvaluation {
    if (command === EAppCommand.OpenCommandPalette) {
      return { availability: { enabled: true }, relevance: null };
    }

    const navigation = GLOBAL_NAVIGATION_COMMANDS.find(
      (navigation) => navigation.command === command,
    );
    if (!navigation) {
      throw new Error(`Navigation command has no destination: ${command}`);
    }
    const destination = router.resolve({ name: navigation.destination });
    const studioBoundary = route.matched.find(
      (record) => record.name === EAppRouteName.Studio,
    );
    const isLeavingStudio =
      studioBoundary !== undefined &&
      !destination.matched.some(
        (record) =>
          (record.aliasOf ?? record) ===
          (studioBoundary.aliasOf ?? studioBoundary),
      );

    return {
      availability:
        isLeavingStudio && typingSessionStore.isRecording
          ? {
              enabled: false,
              disabledReason: 'Stop recording before leaving Studio',
            }
          : { enabled: true },
      relevance:
        destination.name === route.name ? null : ECommandRelevance.Global,
    };
  }

  function execute(command: TGlobalCommand): boolean {
    if (command === EAppCommand.OpenCommandPalette) {
      openPalette();
      return true;
    }

    const navigation = GLOBAL_NAVIGATION_COMMANDS.find(
      (navigation) => navigation.command === command,
    );
    if (!navigation) {
      throw new Error(`Navigation command has no destination: ${command}`);
    }
    void router.push({ name: navigation.destination });
    return true;
  }

  return { commands: GLOBAL_COMMANDS, evaluate, execute };
}
