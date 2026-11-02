export const REPO = 'LocFPV1502/FIRMWARE_BeanRCF405'
export const BRANCH = 'main'
export const GITHUB_TREE = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`
export const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/`
export const GITHUB_URL = `https://github.com/${REPO}`

export const STACKS = [
  {
    id: 'ardupilot',
    name: 'ArduPilot',
    logo: '/logos/ardupilot.png',
    tagline: 'Copter · Plane · Rover',
    hint: 'HEX flash DFU lần đầu. APJ cập nhật trong Mission Planner.',
  },
  {
    id: 'betaflight',
    name: 'Betaflight',
    logo: '/logos/betaflight.png',
    tagline: 'Freestyle · racing',
    hint: 'Flash file HEX trong Betaflight Configurator.',
  },
  {
    id: 'inav',
    name: 'INAV',
    logo: '/logos/inav.png',
    tagline: 'GPS · wing · long range',
    hint: 'Flash file HEX trong INAV Configurator.',
  },
]

const FIRMWARE_EXT = /\.(hex|apj|bin)$/i
const VERSION_RE = /(\d+\.\d+(?:\.\d+)?(?:-[A-Za-z0-9.]+)?)/

export const FALLBACK_FILES = [
  { path: 'ardupilot_4.6.3/arducopter-bl.apj', size: 843710 },
  { path: 'ardupilot_4.6.3/arducopter-bl.hex', size: 2684156 },
  { path: 'ardupilot_4.6.3/arduplane-bl.apj', size: 889522 },
  { path: 'ardupilot_4.6.3/arduplane-bl.hex', size: 2810964 },
  { path: 'ardupilot_4.6.3/ardurover-bl.apj', size: 771891 },
  { path: 'ardupilot_4.6.3/ardurover-bl.hex', size: 2433060 },
  { path: 'betaflight_2026.6.0-alpha_STM32F405_BEANRCF405.hex', size: 1547397 },
  { path: 'inav_9.1.0_BEANRCF405.hex', size: 1759275 },
]

export function isFirmwarePath(path) {
  if (!path || path.startsWith('web/')) return false
  const base = path.split('/').pop()
  if (!base || base === 'LICENSE' || base.startsWith('.')) return false
  return FIRMWARE_EXT.test(base)
}

export function parseFirmwarePath(path, size = 0) {
  const name = path.split('/').pop()
  const folder = path.includes('/') ? path.split('/')[0] : ''
  const hay = `${folder} ${name}`.toLowerCase()

  let stack = 'other'
  if (/ardupilot|arducopter|arduplane|ardurover/.test(hay)) stack = 'ardupilot'
  else if (/betaflight/.test(hay)) stack = 'betaflight'
  else if (hay.includes('inav')) stack = 'inav'

  const versionMatch = folder.match(VERSION_RE) || name.match(VERSION_RE)
  const version = versionMatch ? versionMatch[1] : ''

  let role = 'firmware'
  let format = 'hex'
  if (/\.apj$/i.test(name)) {
    role = 'gcs_update'
    format = 'apj'
  } else if (/\.bin$/i.test(name)) {
    format = 'bin'
  } else if (/with_bl|-bl\.hex$/i.test(name)) {
    role = 'first_flash'
  }

  return { path, name, stack, version, role, format, size }
}

export function groupByStack(files) {
  return STACKS.map((stack) => {
    const items = files
      .filter((file) => file.stack === stack.id)
      .sort((a, b) => roleOrder(a.role) - roleOrder(b.role) || a.name.localeCompare(b.name))
    const version = items.find((item) => item.version)?.version || ''
    return { ...stack, version, files: items }
  }).filter((stack) => stack.files.length > 0)
}

function roleOrder(role) {
  if (role === 'first_flash') return 0
  if (role === 'gcs_update') return 1
  return 2
}

export function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

export function roleLabel(role) {
  if (role === 'first_flash') return 'Flash lần đầu · DFU'
  if (role === 'gcs_update') return 'Cập nhật GCS'
  return 'Firmware HEX'
}

export function formatName(format) {
  if (format === 'apj') return 'APJ'
  if (format === 'bin') return 'BIN'
  return 'HEX'
}

let catalogPromise

export function fetchFirmwareCatalog() {
  if (!catalogPromise) catalogPromise = loadCatalog()
  return catalogPromise
}

async function loadCatalog() {
  const response = await fetch(GITHUB_TREE, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!response.ok) {
    throw new Error(`GitHub ${response.status}`)
  }
  const data = await response.json()
  const files = (data.tree || [])
    .filter((node) => node.type === 'blob' && isFirmwarePath(node.path))
    .map((node) => parseFirmwarePath(node.path, node.size))
  return groupByStack(files)
}

export function fallbackCatalog() {
  return groupByStack(FALLBACK_FILES.map((file) => parseFirmwarePath(file.path, file.size)))
}
