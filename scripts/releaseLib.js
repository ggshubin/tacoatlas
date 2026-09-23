// Pure helpers for scripts/release.js. CommonJS so Node runs it directly and
// Jest can require it without a transform.

function bumpVersion(version, level) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!m) throw new Error(`Unrecognized version "${version}"`)
  const [major, minor, patch] = m.slice(1).map(Number)
  if (level === 'major') return `${major + 1}.0.0`
  if (level === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

function setAppJsonVersion(appJsonText, version) {
  const json = JSON.parse(appJsonText)
  const next = { ...json, expo: { ...json.expo, version } }
  return JSON.stringify(next, null, 2) + '\n'
}

const UNRELEASED = /^## Unreleased[ \t]*$/m

function unreleasedSection(changelog) {
  const start = changelog.search(UNRELEASED)
  if (start === -1) return null
  const rest = changelog.slice(start).split('\n').slice(1)
  const end = rest.findIndex(line => line.startsWith('## '))
  return (end === -1 ? rest : rest.slice(0, end)).join('\n')
}

function unreleasedSummary(changelog) {
  const section = unreleasedSection(changelog)
  const bullet = section && section.split('\n').find(line => /^\s*[-*] \S/.test(line))
  if (!bullet) {
    throw new Error('Add at least one bullet under "## Unreleased" in CHANGELOG.md first.')
  }
  return bullet.replace(/^\s*[-*] /, '').replace(/\*\*/g, '').trim()
}

function stampUnreleased(changelog, heading) {
  return changelog.replace(UNRELEASED, `## ${heading}`)
}

// Reads EXPO_PUBLIC_SUPABASE_URL out of a .env-style file's text (or null if
// the file doesn't exist) and returns just its host, so the release script
// can print which Supabase project a bundle will target without ever
// printing a key or any other env value. Commented-out lines are ignored.
function supabaseHostFrom(envFileText) {
  if (envFileText === null || envFileText === undefined) return null
  const line = envFileText
    .split('\n')
    .find(l => /^\s*EXPO_PUBLIC_SUPABASE_URL\s*=/.test(l))
  if (!line) return null
  const raw = line.replace(/^\s*EXPO_PUBLIC_SUPABASE_URL\s*=/, '').trim()
  const unquoted = raw.replace(/^['"]|['"]$/g, '')
  try {
    return new URL(unquoted).host
  } catch {
    return null
  }
}

function parseArgs(argv) {
  const [mode, ...flags] = argv
  if (mode !== 'store' && mode !== 'ota') {
    throw new Error('Usage: node scripts/release.js <store|ota> [--minor|--major] [--dry-run]')
  }
  const level = flags.includes('--major') ? 'major' : flags.includes('--minor') ? 'minor' : 'patch'
  return { mode, level, dryRun: flags.includes('--dry-run') }
}

module.exports = {
  bumpVersion, setAppJsonVersion, unreleasedSummary, stampUnreleased, supabaseHostFrom, parseArgs,
}
