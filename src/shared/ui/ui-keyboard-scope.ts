export enum EUiKeyboardScope {
  Local = 'local',
  Application = 'application',
}

export const UI_KEYBOARD_SCOPE_ATTRIBUTE = 'data-ui-keyboard-scope';

export const UI_LOCAL_KEYBOARD_SCOPE_ATTRS = {
  [UI_KEYBOARD_SCOPE_ATTRIBUTE]: EUiKeyboardScope.Local,
} as const;

export const UI_APPLICATION_KEYBOARD_SCOPE_ATTRS = {
  [UI_KEYBOARD_SCOPE_ATTRIBUTE]: EUiKeyboardScope.Application,
} as const;

export function isKeyboardEventOwnedByUi(event: KeyboardEvent): boolean {
  let hasApplicationScope = false;
  let hasFormControl = false;
  let isContentEditable: boolean | undefined;

  // The dispatch path survives removal of portalled content during key handling.
  for (const target of event.composedPath()) {
    // Avoid instanceof Element so elements from other realms also participate.
    if (!('nodeType' in target) || target.nodeType !== 1) continue;

    const element = target as Element;
    const scope = element.getAttribute(UI_KEYBOARD_SCOPE_ATTRIBUTE);

    if (scope === EUiKeyboardScope.Local) return true;
    if (scope === EUiKeyboardScope.Application) hasApplicationScope = true;

    if (['input', 'textarea', 'select'].includes(element.localName)) {
      hasFormControl = true;
    }

    if (isContentEditable === undefined) {
      const editable = element.getAttribute('contenteditable')?.toLowerCase();

      if (editable === 'false') {
        isContentEditable = false;
      } else if (
        editable === '' ||
        editable === 'true' ||
        editable === 'plaintext-only'
      ) {
        isContentEditable = true;
      }
    }
  }

  return !hasApplicationScope && (hasFormControl || isContentEditable === true);
}
