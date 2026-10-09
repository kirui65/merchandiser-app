import * as SecureStore from 'expo-secure-store';

const LAST_ERROR_KEY = 'lastUnexpectedAppError';
let installed = false;

function persistError(details) {
  SecureStore.setItemAsync(LAST_ERROR_KEY, details).catch((storageError) => {
    console.warn('Could not save the last app error:', storageError);
  });
}

export function installGlobalErrorHandler() {
  if (installed || typeof ErrorUtils === 'undefined') return;
  installed = true;
  const previousHandler = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    const details = `${isFatal ? 'Fatal JavaScript error' : 'JavaScript error'}\n${String(error?.message || error || 'Unknown error')}\n${String(error?.stack || '').split('\n').slice(0, 8).join('\n')}`;
    persistError(details);
    try { previousHandler?.(error, isFatal); } catch (handlerError) {
      console.error('Previous global error handler failed:', handlerError);
    }
  });
  const globalObject = globalThis;
  const previousRejectionHandler = globalObject.onunhandledrejection;
  globalObject.onunhandledrejection = (event) => {
    const error = event?.reason;
    persistError(`Unhandled promise rejection\n${String(error?.message || error || 'Unknown error')}\n${String(error?.stack || '').split('\n').slice(0, 8).join('\n')}`);
    try { previousRejectionHandler?.(event); } catch (handlerError) {
      console.error('Previous rejection handler failed:', handlerError);
    }
  };
}

export async function readLastUnexpectedError() {
  try { return await SecureStore.getItemAsync(LAST_ERROR_KEY); } catch (error) {
    console.warn('Could not read the last app error:', error);
    return null;
  }
}

export async function clearLastUnexpectedError() {
  try { await SecureStore.deleteItemAsync(LAST_ERROR_KEY); } catch (error) {
    console.warn('Could not dismiss the last app error:', error);
  }
}
