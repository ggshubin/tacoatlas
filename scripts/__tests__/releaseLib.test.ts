// eslint-disable-next-line @typescript-eslint/no-var-requires
const lib = require('../releaseLib.js')

describe('bumpVersion', () => {
  it.each([
    ['1.3.1', 'patch', '1.3.2'],
    ['1.3.1', 'minor', '1.4.0'],
    ['1.3.1', 'major', '2.0.0'],
  ])('%s %s -> %s', (from, level, to) => {
    expect(lib.bumpVersion(from, level)).toBe(to)
  })
  it('rejects non-semver', () => {
    expect(() => lib.bumpVersion('1.3', 'patch')).toThrow('Unrecognized version "1.3"')
  })
})

describe('setAppJsonVersion', () => {
  it('changes only expo.version and keeps a trailing newline', () => {
    const input = JSON.stringify({ expo: { name: 'TacoAtlas', version: '1.3.1' } }, null, 2) + '\n'
    const out = lib.setAppJsonVersion(input, '1.3.2')
    expect(JSON.parse(out)).toEqual({ expo: { name: 'TacoAtlas', version: '1.3.2' } })
    expect(out.endsWith('\n')).toBe(true)
  })
})

const CHANGELOG = [
  '# Changelog', '', 'Intro.', '',
  '## Unreleased', '', '### Added', '- **Announcements** in Settings', '- Update popup', '',
  '## versionCode 52 (2026-09-08)', '', '- old', '',
].join('\n')

describe('unreleasedSummary', () => {
  it('returns the first bullet without markdown bold', () => {
    expect(lib.unreleasedSummary(CHANGELOG)).toBe('Announcements in Settings')
  })
  it('throws when Unreleased is missing or empty', () => {
    expect(() => lib.unreleasedSummary('# Changelog\n\n## versionCode 1\n- x\n')).toThrow('## Unreleased')
    expect(() => lib.unreleasedSummary('# Changelog\n\n## Unreleased\n\n## versionCode 1\n- x\n')).toThrow('## Unreleased')
  })
})

describe('stampUnreleased', () => {
  it('renames Unreleased to the given heading and leaves the rest', () => {
    const out = lib.stampUnreleased(CHANGELOG, '1.3.2 (2026-09-22)')
    expect(out).toContain('## 1.3.2 (2026-09-22)\n')
    expect(out).not.toContain('## Unreleased')
    expect(out).toContain('## versionCode 52 (2026-09-08)')
  })
})

describe('parseArgs', () => {
  it('defaults to patch, not dry run', () => {
    expect(lib.parseArgs(['store'])).toEqual({ mode: 'store', level: 'patch', dryRun: false })
  })
  it('reads flags', () => {
    expect(lib.parseArgs(['ota', '--dry-run'])).toEqual({ mode: 'ota', level: 'patch', dryRun: true })
    expect(lib.parseArgs(['store', '--minor'])).toEqual({ mode: 'store', level: 'minor', dryRun: false })
  })
  it('rejects unknown modes', () => {
    expect(() => lib.parseArgs(['ship'])).toThrow('Usage')
  })
})
