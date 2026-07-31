import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootDir = path.resolve(fileURLToPath(import.meta.url), '../..')
const packageJsonPath = path.join(rootDir, 'package.json')
const tauriConfPath = path.join(rootDir, 'desktop/src-tauri/tauri.conf.json')
const cargoTomlPath = path.join(rootDir, 'desktop/src-tauri/Cargo.toml')

const version = JSON.parse(readFileSync(packageJsonPath, 'utf8')).version

const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf8'))
tauriConf.version = version
writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, 2)}\n`)

const cargoToml = readFileSync(cargoTomlPath, 'utf8')
const updatedCargoToml = cargoToml.replace(/^version = ".*"$/m, `version = "${version}"`)
writeFileSync(cargoTomlPath, updatedCargoToml)

console.log(`version:sync -> ${version}`)
