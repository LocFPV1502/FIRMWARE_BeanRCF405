import { useEffect, useState } from 'react'
import {
  ARDUPILOT_BDSHOT,
  ARDUPILOT_KINDS,
  ARDUPILOT_VEHICLES,
  GITHUB_URL,
  RAW_BASE,
  fallbackCatalog,
  fetchFirmwareCatalog,
  formatBytes,
  roleLabel,
} from './catalog.js'

function usePath() {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  return path
}

function openPath(event, path) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function useCatalog() {
  const [stacks, setStacks] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchFirmwareCatalog()
      .then((data) => {
        if (cancelled) return
        if (!data.length) throw new Error('empty')
        setStacks(data)
        setStatus('live')
      })
      .catch((err) => {
        if (cancelled) return
        setStacks(fallbackCatalog())
        setStatus('fallback')
        setError(err.message || 'GitHub không trả danh sách')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { stacks, status, error }
}

async function saveFirmware(file, setBusy, setNotice) {
  setBusy(true)
  setNotice('')
  try {
    const response = await fetch(`${RAW_BASE}${file.path}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setNotice(`Đã tải ${file.name}`)
  } catch {
    window.open(`${RAW_BASE}${file.path}`, '_blank', 'noopener,noreferrer')
    setNotice('Mở file trên GitHub. Lưu thủ công nếu trình duyệt không tự tải.')
  } finally {
    setBusy(false)
  }
}

function Shell({ children }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-6 sm:px-8">{children}</div>
    </div>
  )
}

function TopBar() {
  return (
    <header className="flex items-center justify-between gap-4">
      <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">BeanRC · STM32F405</p>
      <a
        href={GITHUB_URL}
        className="min-h-11 font-mono text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline"
        target="_blank"
        rel="noreferrer"
      >
        GitHub
      </a>
    </header>
  )
}

function Choice({ active, title, detail, onClick, testId }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      data-testid={testId}
      onClick={onClick}
      className={`flex min-h-24 flex-col justify-center rounded-2xl border px-4 py-4 text-left ${
        active ? 'border-accent bg-raised' : 'border-line bg-surface hover:border-ink/20'
      }`}
    >
      <span className="text-[17px] font-medium">{title}</span>
      <span className="mt-1 text-[13px] text-pretty text-muted">{detail}</span>
    </button>
  )
}

export default function App() {
  const path = usePath()
  const catalog = useCatalog()
  if (path === '/ardupilot') return <ArduPilotPage catalog={catalog} />
  return <Home catalog={catalog} />
}

function Home({ catalog }) {
  const { stacks, status, error } = catalog
  const [selectedId, setSelectedId] = useState('')
  const [selectedPath, setSelectedPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const selected = stacks.find((stack) => stack.id === selectedId)
  const selectedFile = selected?.files.find((file) => file.path === selectedPath)

  function pickFirmware(stack) {
    setSelectedId(stack.id)
    setNotice('')
    setSelectedPath(stack.files.length === 1 ? stack.files[0].path : '')
  }

  return (
    <Shell>
      <TopBar />
      <section className="mt-8 grid items-end gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div>
          <h1 className="max-w-[16ch] text-balance text-[clamp(2.4rem,6vw,4.4rem)] leading-[0.95] font-semibold">
            Firmware cho BeanRCF405
          </h1>
          <p className="mt-4 max-w-[42ch] text-pretty text-[16px] text-muted">
            ArduPilot mở trang hướng dẫn. Chọn loại máy, rồi chọn file, rồi tải.
          </p>
        </div>
        <figure className="justify-self-end overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-[0_24px_60px_rgb(0_0_0_/_0.35)]">
          <img
            src="/fc.jpg"
            alt="Flight controller STM32F405, soldermask đen, pad vàng"
            className="aspect-square h-auto w-full max-w-[380px] object-cover"
            width="380"
            height="380"
          />
        </figure>
      </section>

      <section className="mt-10" aria-label="Chọn firmware">
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Firmware</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {status === 'loading' &&
            [0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />)}
          {stacks.map((stack) => {
            if (stack.id === 'ardupilot') {
              return (
                <a
                  key={stack.id}
                  href="/ardupilot"
                  data-testid="stack-ardupilot"
                  onClick={(event) => openPath(event, '/ardupilot')}
                  className="flex min-h-20 items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-3 text-left hover:border-ink/20"
                >
                  <img src={stack.logo} alt="" width="48" height="48" className="size-12 shrink-0 rounded-xl bg-canvas object-contain" />
                  <span>
                    <span className="block text-[16px] font-medium">{stack.name}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">Chọn loại máy, rồi chọn file</span>
                  </span>
                </a>
              )
            }
            const active = stack.id === selectedId
            return (
              <button
                key={stack.id}
                type="button"
                aria-pressed={active}
                data-testid={`stack-${stack.id}`}
                onClick={() => pickFirmware(stack)}
                className={`flex min-h-20 items-center gap-4 rounded-2xl border px-4 py-3 text-left ${
                  active ? 'border-accent bg-raised' : 'border-line bg-surface hover:border-ink/20'
                }`}
              >
                <img src={stack.logo} alt="" width="48" height="48" className="size-12 shrink-0 rounded-xl bg-canvas object-contain" />
                <span>
                  <span className="block text-[16px] font-medium">{stack.name}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-muted tabular-nums">
                    {stack.version || stack.tagline}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {selected && (
        <section className="mt-8">
          {status === 'fallback' && (
            <p className="mb-3 text-[13px] text-accent" role="status">
              GitHub chậm — đang hiện bản local. {error}
            </p>
          )}
          <button
            type="button"
            data-testid="download"
            onClick={() => saveFirmware(selectedFile, setBusy, setNotice)}
            disabled={!selectedFile || busy}
            className="inline-flex min-h-12 min-w-[10rem] items-center justify-center rounded-full bg-accent px-8 text-[15px] font-medium text-accent-ink active:translate-y-px disabled:opacity-40"
          >
            {busy ? 'Đang tải…' : 'Download'}
          </button>
          {selectedFile && (
            <p className="mt-3 max-w-[52ch] break-all font-mono text-[12px] text-muted">
              {selectedFile.name}
              {selectedFile.size ? ` · ${formatBytes(selectedFile.size)}` : ''}
            </p>
          )}
          <p className="mt-2 max-w-[52ch] text-pretty text-[14px] text-muted">{selected.hint}</p>
          {notice && (
            <p className="mt-2 text-[14px] text-muted" role="status">
              {notice}
            </p>
          )}
        </section>
      )}
    </Shell>
  )
}

function ArduPilotPage({ catalog }) {
  const { stacks, status, error } = catalog
  const stack = stacks.find((item) => item.id === 'ardupilot')
  const files = stack?.files || []
  const [vehicle, setVehicle] = useState('')
  const [bdshot, setBdshot] = useState('')
  const [kind, setKind] = useState('')
  const [picked, setPicked] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const wantsBdshot = bdshot === 'yes'
  const scoped = files.filter((item) => item.vehicle === vehicle && item.bdshot === wantsBdshot)
  const kinds = bdshot
    ? ARDUPILOT_KINDS.filter((item) => scoped.some((file) => file.role === item.role))
    : []
  const matches = scoped.filter((item) => item.role === kind)
  const file = matches.length === 1 ? matches[0] : matches.find((item) => item.path === picked) || null

  function pickVehicle(id) {
    setVehicle(id)
    setPicked('')
    setNotice('')
    const next = files.filter((item) => item.vehicle === id && item.bdshot === wantsBdshot)
    if (bdshot && kind && !next.some((item) => item.role === kind)) setKind('')
  }

  function pickBdshot(id) {
    setBdshot(id)
    setPicked('')
    setNotice('')
    const next = files.filter((item) => item.vehicle === vehicle && item.bdshot === (id === 'yes'))
    if (kind && !next.some((item) => item.role === kind)) setKind('')
  }

  return (
    <Shell>
      <TopBar />
      <a
        href="/"
        onClick={(event) => openPath(event, '/')}
        className="mt-8 inline-flex min-h-11 items-center font-mono text-[12px] text-muted hover:text-ink"
      >
        ← Tất cả firmware
      </a>
      <h1 className="mt-4">
        <img
          src="/logos/ardupilot.png"
          alt="ArduPilot"
          width="96"
          height="96"
          className="size-24 rounded-2xl object-contain"
        />
      </h1>

      {status === 'fallback' && (
        <p className="mt-4 text-[13px] text-accent" role="status">
          GitHub chậm — đang hiện bản local. {error}
        </p>
      )}

      <section className="mt-10" aria-label="Loại thiết bị">
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">1 · Loại thiết bị</p>
        <div role="radiogroup" aria-label="Loại thiết bị" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {status === 'loading' &&
            [0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface" />)}
          {ARDUPILOT_VEHICLES.map((item) => (
            <Choice
              key={item.id}
              active={vehicle === item.id}
              title={item.name}
              detail={item.detail}
              testId={`vehicle-${item.id}`}
              onClick={() => pickVehicle(item.id)}
            />
          ))}
        </div>
      </section>

      <section className="mt-8" aria-label="Bdshot">
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">2 · Bdshot</p>
        {!vehicle && <p className="mt-3 text-[14px] text-muted">Chọn loại thiết bị trước.</p>}
        {vehicle && (
          <div role="radiogroup" aria-label="Bdshot" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ARDUPILOT_BDSHOT.map((item) => (
              <Choice
                key={item.id}
                active={bdshot === item.id}
                title={item.name}
                detail={item.detail}
                testId={`bdshot-${item.id}`}
                onClick={() => pickBdshot(item.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8" aria-label="Loại firmware">
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">3 · Loại firmware</p>
        {!vehicle && <p className="mt-3 text-[14px] text-muted">Chọn loại thiết bị trước.</p>}
        {vehicle && !bdshot && <p className="mt-3 text-[14px] text-muted">Chọn có bdshot hay không trước.</p>}
        {vehicle && bdshot && kinds.length === 0 && status !== 'loading' && (
          <p className="mt-3 text-[14px] text-muted">Chưa có firmware cho loại máy này.</p>
        )}
        {vehicle && kinds.length > 0 && (
          <div role="radiogroup" aria-label="Loại firmware" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {kinds.map((item) => (
              <Choice
                key={item.role}
                active={kind === item.role}
                title={item.name}
                detail={item.detail}
                testId={`kind-${item.role}`}
                onClick={() => {
                  setKind(item.role)
                  setPicked('')
                  setNotice('')
                }}
              />
            ))}
          </div>
        )}
        {matches.length > 1 && (
          <div role="radiogroup" aria-label="Phiên bản" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {matches.map((item) => (
              <Choice
                key={item.path}
                active={picked === item.path}
                title={item.version || item.name}
                detail={item.name}
                testId={`file-${item.name}`}
                onClick={() => {
                  setPicked(item.path)
                  setNotice('')
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">4 · Tải về</p>
        <button
          type="button"
          data-testid="download"
          onClick={() => file && saveFirmware(file, setBusy, setNotice)}
          disabled={!file || busy || status === 'loading'}
          className="mt-3 inline-flex min-h-12 min-w-[10rem] items-center justify-center rounded-full bg-accent px-8 text-[15px] font-medium text-accent-ink active:translate-y-px disabled:opacity-40"
        >
          {busy ? 'Đang tải…' : 'Download'}
        </button>
        {file && (
          <p className="mt-3 max-w-[52ch] break-all font-mono text-[12px] text-muted">
            {file.name}
            {file.size ? ` · ${formatBytes(file.size)}` : ''}
            {` · ${roleLabel(file.role)}`}
          </p>
        )}
        {vehicle && bdshot && kind && matches.length === 0 && status !== 'loading' && (
          <p className="mt-3 text-[14px] text-muted" role="status">
            Không có file cho lựa chọn này.
          </p>
        )}
        {notice && (
          <p className="mt-2 text-[14px] text-muted" role="status">
            {notice}
          </p>
        )}
      </section>
    </Shell>
  )
}
