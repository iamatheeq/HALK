// On Android, launching a separate system activity (image picker, document picker,
// share sheet) sends the host app's AppState to "background" just like actually
// leaving the app does — there's no way to tell them apart from the event alone.
// Screens that intentionally open one of those pickers call suppressNextBackgroundLock()
// first so the app-level re-lock-on-background listener knows to ignore that one transition.
let suppressed = false;

export function suppressNextBackgroundLock() {
  suppressed = true;
}

export function consumeBackgroundLockSuppression() {
  const was = suppressed;
  suppressed = false;
  return was;
}
