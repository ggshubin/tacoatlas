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

function main() {
  const { mode, level, dryRun } = lib.parseArgs(process.argv.slice(2))

  const dirty = execSync('git status --porcelain', { cwd: root }).toString().trim()
  if (dirty && !dryRun) throw new Error('Working tree is not clean. Commit or stash first.')

  const appJson = fs.readFileSync(appJsonPath, 'utf8')
  const changelog = fs.readFileSync(changelogPath, 'utf8')
  const summary = lib.unreleasedSummary(changelog)
  const current = JSON.parse(appJson).expo.version

  if (mode === 'store') {
    const next = lib.bumpVersion(current, level)
    console.log(`Store release ${current} -> ${next}: ${summary}`)
    if (!dryRun) {
      fs.writeFileSync(appJsonPath, lib.setAppJsonVersion(appJson, next))
      fs.writeFileSync(changelogPath, lib.stampUnreleased(changelog, `${next} (${today()})`))
    }
    sh('git add app.json CHANGELOG.md', dryRun)
    sh(`git commit -m "chore: release ${next}"`, dryRun)
    sh('eas build --profile production --platform android', dryRun)
    console.log(`\nWhen EAS finishes, add the build number to the CHANGELOG heading: "## ${next} (<build>) (${today()})".`)
    return
  }

  console.log(`OTA update on ${current}: ${summary}`)
  if (!dryRun) fs.writeFileSync(changelogPath, lib.stampUnreleased(changelog, `${current} OTA update (${today()})`))
  sh('git add CHANGELOG.md', dryRun)
  sh(`git commit -m "chore: OTA update on ${current}"`, dryRun)
  sh(`eas update --channel production --message ${JSON.stringify(summary)}`, dryRun)
}

try {
  main()
} catch (e) {
  console.error(`release: ${e.message}`)
  process.exit(1)
}
