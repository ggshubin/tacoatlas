// "1.3.1 (52)": store version, then the store build number (Android
// versionCode / iOS buildNumber). OTA updates never change this label; the
// short update id shown beneath it tells OTA builds apart.
export function formatVersionLabel(
  appVersion: string | null,
  buildNumber: string | null,
  fallbackVersion: string | null,
): string {
  const version = appVersion ?? fallbackVersion
  if (!version) return 'unknown'
  return buildNumber ? `${version} (${buildNumber})` : version
}

export function shortUpdateId(updateId: string | null): string | null {
  return updateId ? updateId.replace(/-/g, '').slice(0, 8) : null
}
