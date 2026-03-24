import fs from 'bare-fs'
import os from 'bare-os'
import path from 'bare-path'
import FramedStream from 'framed-stream'
import run from 'pear-run'
import {
  isLinux as IS_LINUX,
  isMac as IS_MAC,
  isWindows as IS_WINDOWS
} from 'which-runtime'

export const PEAR_RUNTIME_UPDATED_MESSAGE = { type: 'pear-runtime/updated' }
export const PEAR_RUNTIME_UPDATING_MESSAGE = { type: 'pear-runtime/updating' }

function getApp() {
  try {
    const index = IS_WINDOWS ? process.argv.length - 2 : process.argv.length - 1

    const arg = process.argv[index]
    const { appling } = JSON.parse(arg).flags || {}
    console.log(appling, 'appling getApp')
    if (!appling) return
    if (IS_MAC) {
      return path.join(appling, '..', '..', '..') // appling path points to the bin
    }
    return appling
  } catch {
    return
  }
}

async function startUpdater() {
  const pkgPath = path.join(Pear.config.dir, 'package.json')
  const pkgRaw = await fs.promises.readFile(pkgPath, 'utf8')
  const pkg = JSON.parse(pkgRaw)
  const { upgrade, version, productName } = pkg
  const app = getApp()

  const dir =
    Pear?.config?.storage ||
    (IS_MAC
      ? path.join(os.homedir(), 'Library', 'Application Support', 'pear')
      : IS_LINUX
        ? path.join(os.homedir(), '.config', 'pear')
        : path.join(os.homedir(), 'AppData', 'Roaming', 'pear'))

  const extension = IS_MAC ? '.app' : IS_LINUX ? '.AppImage' : '.msix'
  const name = productName + extension

  const args = [dir, upgrade, version, app, name]

  const link = Pear.key
    ? `${Pear.config.applink}/workers/updater/index.js`
    : path.join(Pear.config.dir, 'workers', 'updater', 'index.js')
  const pipe = new FramedStream(run(link, args))

  const events = {
    UPDATING: 'UPDATING',
    UPDATED: 'UPDATED'
  }

  pipe.on('data', (data) => {
    const event = Buffer.from(data).toString()
    console.log(event, 'event')
    if (event === events.UPDATING) Pear.message(PEAR_RUNTIME_UPDATING_MESSAGE)
    if (event === events.UPDATED) Pear.message(PEAR_RUNTIME_UPDATED_MESSAGE)
  })
}

export default startUpdater
