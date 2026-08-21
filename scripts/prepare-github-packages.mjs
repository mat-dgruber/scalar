import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const TARGET_SCOPE = process.env.GITHUB_REPOSITORY_OWNER
  ? `@${process.env.GITHUB_REPOSITORY_OWNER.toLowerCase()}`
  : '@mat-dgruber'

const SOURCE_SCOPE = '@scalar'

console.log(`[scope-replacer] Target scope: ${TARGET_SCOPE}`)

const directoriesToScan = ['packages', 'integrations', 'projects']
const packageJsonPaths = []

for (const dir of directoriesToScan) {
  if (!existsSync(dir)) continue
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) {
      const pkgPath = join(fullPath, 'package.json')
      if (existsSync(pkgPath)) {
        packageJsonPaths.push(pkgPath)
      }
    }
  }
}

// Map of all packages and their versions
const modifiedPackages = new Set()
const packageVersions = new Map()

for (const pkgPath of packageJsonPaths) {
  try {
    const content = JSON.parse(readFileSync(pkgPath, 'utf8'))
    if (content.name) {
      if (content.name.startsWith(`${SOURCE_SCOPE}/`)) {
        modifiedPackages.add(content.name)
      }
      if (content.version) {
        packageVersions.set(content.name, content.version)
        const targetName = content.name.replace(SOURCE_SCOPE, TARGET_SCOPE)
        packageVersions.set(targetName, content.version)
      }
    }
  } catch (err) {
    console.error(`Error reading ${pkgPath}:`, err)
  }
}

console.log(`[scope-replacer] Found ${modifiedPackages.size} packages to rename.`)

// ─── Patch pnpm-workspace.yaml catalog ────────────────────────────────────────
// The catalog may have entries like '@scalar/typebox: 0.1.3'. After we rename
// dependencies in package.json files to '@mat-dgruber/typebox', pnpm can no
// longer resolve 'catalog:*' because the key doesn't exist. We fix this by
// duplicating every '@scalar/*' catalog entry under the renamed key.
const workspaceYamlPath = 'pnpm-workspace.yaml'
if (existsSync(workspaceYamlPath)) {
  let yaml = readFileSync(workspaceYamlPath, 'utf8')

  // Find all '@scalar/<name>: <version>' lines and add a renamed twin next to them
  const catalogRegex = /^(\s+)'(@scalar\/[^']+)'(:[ \t]+.+)$/gm
  const catalogAltRegex = /^(\s+)"(@scalar\/[^"]+)"(:[ \t]+.+)$/gm
  const bareRegex = /^(\s+)(@scalar\/[^\s:]+)(:[ \t]+.+)$/gm

  const replacer = (_, indent, pkg, rest) => {
    const renamed = pkg.replace(SOURCE_SCOPE, TARGET_SCOPE)
    // Only add the twin if it doesn't already exist
    const twinPattern = renamed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (!new RegExp(twinPattern).test(yaml)) {
      return `${indent}${pkg}${rest}\n${indent}${renamed}${rest}`
    }
    return `${indent}${pkg}${rest}`
  }

  const replacerQuoted = (quote) => (_, indent, pkg, rest) => {
    const renamed = pkg.replace(SOURCE_SCOPE, TARGET_SCOPE)
    const twinPattern = renamed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (!new RegExp(twinPattern).test(yaml)) {
      return `${indent}${quote}${pkg}${quote}${rest}\n${indent}${quote}${renamed}${quote}${rest}`
    }
    return `${indent}${quote}${pkg}${quote}${rest}`
  }

  yaml = yaml.replace(catalogRegex, replacerQuoted("'"))
  yaml = yaml.replace(catalogAltRegex, replacerQuoted('"'))
  yaml = yaml.replace(bareRegex, replacer)

  writeFileSync(workspaceYamlPath, yaml, 'utf8')
  console.log(`[scope-replacer] Patched catalog in ${workspaceYamlPath}`)
}

// ─── Transform package.json files ─────────────────────────────────────────────
for (const pkgPath of packageJsonPaths) {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))

    // 1. Rename package name
    if (pkg.name && pkg.name.startsWith(`${SOURCE_SCOPE}/`)) {
      pkg.name = pkg.name.replace(SOURCE_SCOPE, TARGET_SCOPE)
    }

    // 2. Set publishConfig for GitHub Packages
    pkg.publishConfig = {
      ...pkg.publishConfig,
      access: 'public',
      registry: 'https://npm.pkg.github.com',
    }

    // 3. Update dependencies and resolve workspace:* protocol to explicit versions
    const depFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
    for (const field of depFields) {
      if (pkg[field]) {
        for (const [depName, version] of Object.entries(pkg[field])) {
          let resolvedVersion = version
          const originalName = depName.startsWith(TARGET_SCOPE) ? depName.replace(TARGET_SCOPE, SOURCE_SCOPE) : depName

          // Replace workspace protocol with real version
          if (typeof version === 'string' && version.startsWith('workspace:')) {
            const actualVer = packageVersions.get(originalName) || packageVersions.get(depName)
            if (actualVer) {
              resolvedVersion = version.startsWith('workspace:^') ? `^${actualVer}` : actualVer
            } else {
              resolvedVersion = 'latest'
            }
          }

          if (depName.startsWith(`${SOURCE_SCOPE}/`)) {
            const newDepName = depName.replace(SOURCE_SCOPE, TARGET_SCOPE)
            pkg[field][newDepName] = resolvedVersion
            delete pkg[field][depName]
          } else {
            pkg[field][depName] = resolvedVersion
          }
        }
      }
    }

    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
    console.log(`[scope-replacer] Transformed: ${pkgPath}`)
  } catch (err) {
    console.error(`Error writing ${pkgPath}:`, err)
  }
}

console.log('[scope-replacer] Scope replacement complete!')
