export function uploadErrorMessage(error, label, stage) {
  const status = error?.response?.status;

  if (error?.code === 'ECONNABORTED') {
    return `The ${label} upload timed out. Check your connection and retry.`;
  }
  if (status === 401) {
    return `Your session expired before the ${label} could be uploaded. Sign in again and retry.`;
  }
  if (status === 403) {
    return stage === 'storage'
      ? `Photo storage rejected the ${label} upload. Request a new upload link and retry.`
      : `Your account is not permitted to upload this ${label}.`;
  }
  if (status >= 500) {
    return `The upload service is temporarily unavailable for this ${label}. Try again later.`;
  }
  if (status) {
    return error?.response?.data?.error?.message
      || `The upload service rejected this ${label} (HTTP ${status}).`;
  }
  if (error?.code === 'ERR_NETWORK' || error?.request) {
    return `Network error while uploading the ${label}. Check your connection and retry.`;
  }
  return `Unable to upload the ${label}. ${error?.message || 'Please retry.'}`;
}
