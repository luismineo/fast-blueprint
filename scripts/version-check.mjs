import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootDir = path.resolve(fileURLToPath(import.meta.url), '../..')

const packageVersion = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8')).version
const tauriVersion = JSON.parse(
  readFileSync(path.join(rootDir, 'desktop/src-tauri/tauri.conf.json'), 'utf8'),
).version

const cargoToml = readFileSync(path.join(rootDir, 'desktop/src-tauri/Cargo.toml'), 'utf8')
const cargoVersion = cargoToml.match(/^version = "(.*)"$/m)?.[1]

const versions = {
  'package.json': packageVersion,
  'desktop/src-tauri/tauri.conf.json': tauriVersion,
  'desktop/src-tauri/Cargo.toml': cargoVersion,
}

const distinctVersions = new Set(Object.values(versions))

if (distinctVersions.size > 1) {
  console.error('version:check falhou - versoes divergentes:')
  for (const [file, version] of Object.entries(versions)) {
    console.error(`  ${file}: ${version}`)
  }
  console.error('Rode "pnpm version:sync" para corrigir (adr/0004-versionamento.md Decisao 1).')
  process.exit(1)
}

console.log(`version:check ok -> ${packageVersion}`)
