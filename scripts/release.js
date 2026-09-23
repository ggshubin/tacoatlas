// npm run release:store  -> bump version, stamp CHANGELOG, commit, EAS production build
// npm run release:ota    -> stamp CHANGELOG, commit, eas update to production
// Add --dry-run to print the plan without changing anything.
//
// Rule: app.json "version" changes ONLY on store releases. runtimeVersion uses
// the appVersion policy, so bumping it in an OTA would strand every install.
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const lib = require('./releaseLib')

// Local master is the release line (origin/main is a stale, diverged branch).
const RELEASE_BRANCH = 'master'
const root = path.resolve(__dirname, '..')
const appJsonPath = path.join(root, 'app.json')
const changelogPath = path.join(root, 'CHANGELOG.md')

function sh(cmd, dryRun) {
  console.log(`$ ${cmd}`)
  if (!dryRun) execSync(cmd, { stdio: 'inherit', cwd: root })
}

// Local date, not UTC: an evening release in Portland is still "today".
function today() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function readEnvFile(name) {
  const p = path.join(root, name)
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null
}

// Never print keys or any other env value: only the Supabase host, so a
// release run makes it obvious (without leaking secrets) which backend the
// bundle will call.
function printSupabaseTarget() {
  const text = readEnvFile('.env.local') ?? readEnvFile('.env')
    ?? (process.env.EXPO_PUBLIC_SUPABASE_URL ? `EXPO_PUBLIC_SUPABASE_URL=${process.env.EXPO_PUBLIC_SUPABASE_URL}` : null)
  const host = lib.supabaseHostFrom(text)
  console.log(`Bundling against Supabase: ${host ?? '(not set)'}`)
}

function currentBranch() {
  return execSync('git rev-parse --abbrev-ref HEAD', { cwd: root }).toString().trim()
}

function main() {
  const { mode, level, dryRun } = lib.parseArgs(process.argv.slice(2))

  if (!dryRun && currentBranch() !== RELEASE_BRANCH) throw new Error(`Releases must run from ${RELEASE_BRANCH}.`)

  const dirty = execSync('git status --porcelain', { cwd: root }).toString().trim()
  if (dirty && !dryRun) throw new Error('Working tree is not clean. Commit or stash first.')

  const appJson = fs.readFileSync(appJsonPath, 'utf8')
  const changelog = fs.readFileSync(changelogPath, 'utf8')
  const summary = lib.unreleasedSummary(changelog)
  const current = JSON.parse(appJson).expo.version

  printSupabaseTarget()

  if (mode === 'store') {
    const next = lib.bumpVersion(current, level)
    console.log(`Store release ${current} -> ${next}: ${summary}`)
    if (dryRun) {
      sh('eas build --profile production --platform android', dryRun)
      console.log(`\nWhen EAS finishes, add the build number to the CHANGELOG heading: "## ${next} (<build>) (${today()})".`)
      return
    }
    fs.writeFileSync(appJsonPath, lib.setAppJsonVersion(appJson, next))
    fs.writeFileSync(changelogPath, lib.stampUnreleased(changelog, `${next} (${today()})`))
    try {
      sh('eas build --profile production --platform android', dryRun)
    } catch (e) {
      fs.writeFileSync(appJsonPath, appJson)
      fs.writeFileSync(changelogPath, changelog)
      throw e
    }
    sh('git add app.json CHANGELOG.md', dryRun)
    sh(`git commit -m "chore: release ${next}"`, dryRun)
    console.log(`\nWhen EAS finishes, add the build number to the CHANGELOG heading: "## ${next} (<build>) (${today()})".`)
    return
  }

  console.log(`OTA update on ${current}: ${summary}`)
  if (dryRun) {
    sh(`eas update --channel production --message ${JSON.stringify(summary)}`, dryRun)
    return
  }
  fs.writeFileSync(changelogPath, lib.stampUnreleased(changelog, `${current} OTA update (${today()})`))
  try {
    sh(`eas update --channel production --message ${JSON.stringify(summary)}`, dryRun)
  } catch (e) {
    fs.writeFileSync(changelogPath, changelog)
    throw e
  }
  sh('git add CHANGELOG.md', dryRun)
  sh(`git commit -m "chore: OTA update on ${current}"`, dryRun)
}

try {
  main()
} catch (e) {
  console.error(`release: ${e.message}`)
  process.exit(1)
}
