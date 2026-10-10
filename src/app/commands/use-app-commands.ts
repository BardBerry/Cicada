import { computed, ref, shallowRef } from 'vue';
import { useRoute } from 'vue-router';

import { EKeymapScope } from '../keymap/keymap.model';
import { resolveCommandShortcuts } from '../keymap/resolve-command-shortcuts';
import { EAppRouteName } from '../router/app-route.model';
import { useStudioUiStore } from '../use-studio-ui-store';
import type {
  EAppCommand,
  TCommandAvailability,
  TCommandEvaluation,
  TCommandOwner,
} from './app-command.model';
import type { TAppCommands } from './app-command-context';
import { COMMAND_DEFINITIONS } from './command-definitions';
import { useGlobalCommands } from './use-global-commands';

type TCommandRegistration = { owner: TCommandOwner };

export function useAppCommands(): TAppCommands {
  const route = useRoute();
  const studioUiStore = useStudioUiStore();
  const paletteOpen = ref(false);
  const commandOwners = shallowRef<
    ReadonlyMap<EAppCommand, TCommandRegistration>
  >(new Map());
  const keymapContext = computed(() => ({
    scope:
      route.name !== EAppRouteName.Studio
        ? null
        : studioUiStore.isZenMode
          ? EKeymapScope.StudioZen
          : EKeymapScope.Studio,
  }));
  const resolvedCommands = computed(() =>
    COMMAND_DEFINITIONS.map((definition) => {
      const evaluation = evaluate(definition.id);
      return {
        ...definition,
        ...evaluation.availability,
        relevance: evaluation.relevance,
        shortcuts: resolveCommandShortcuts({
          command: definition.id,
          context: keymapContext.value,
        }),
      };
    }),
  );

  registerOwner(
    useGlobalCommands(() => {
      paletteOpen.value = true;
    }),
  );

  function registerOwner(owner: TCommandOwner) {
    const commands = new Set(owner.commands);
    if (commands.size !== owner.commands.length) {
      throw new Error('A command owner declares duplicate commands');
    }
    for (const command of commands) {
      if (commandOwners.value.has(command)) {
        throw new Error(`Command already has an owner: ${command}`);
      }
    }

    const registration = { owner };
    const nextOwners = new Map(commandOwners.value);
    for (const command of commands) nextOwners.set(command, registration);
    commandOwners.value = nextOwners;

    return () => {
      const remainingOwners = new Map(commandOwners.value);
      for (const command of commands) {
        if (remainingOwners.get(command) === registration) {
          remainingOwners.delete(command);
        }
      }
      if (remainingOwners.size !== commandOwners.value.size) {
        commandOwners.value = remainingOwners;
      }
    };
  }

  function evaluate(command: EAppCommand): TCommandEvaluation {
    return (
      commandOwners.value.get(command)?.owner.evaluate(command) ?? {
        availability: {
          enabled: false,
          disabledReason: 'Command is not available here',
        },
        relevance: null,
      }
    );
  }

  function getAvailability(command: EAppCommand): TCommandAvailability {
    return evaluate(command).availability;
  }

  function execute(command: EAppCommand): boolean {
    if (!getAvailability(command).enabled) return false;

    return commandOwners.value.get(command)?.owner.execute(command) ?? false;
  }

  function preparePaletteCommand(command: EAppCommand) {
    if (!getAvailability(command).enabled) return null;
    const expectedOwner = commandOwners.value.get(command);
    const expectedRoute = route.fullPath;

    // Dismissal is deferred; never execute a selection against a replacement page.
    return () => {
      if (route.fullPath !== expectedRoute) return false;
      if (commandOwners.value.get(command) !== expectedOwner) {
        return false;
      }
      return execute(command);
    };
  }

  return {
    paletteOpen,
    resolvedCommands,
    keymapContext,
    getAvailability,
    execute,
    registerOwner,
    preparePaletteCommand,
  };
}
