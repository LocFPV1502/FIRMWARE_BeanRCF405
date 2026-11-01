import { useEffect, useState } from 'react'
import {
  GITHUB_URL,
  RAW_BASE,
  fallbackCatalog,
  fetchFirmwareCatalog,
  formatBytes,
  formatName,
  roleLabel,
} from './catalog.js'

export default function App() {
  const [stacks, setStacks] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedPath, setSelectedPath] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

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

  const selected = stacks.find((stack) => stack.id === selectedId)
  const selectedFile = selected?.files.find((file) => file.path === selectedPath)

  function pickFirmware(stack) {
    setSelectedId(stack.id)
    setNotice('')
    if (stack.files.length === 1) setSelectedPath(stack.files[0].path)
    else setSelectedPath('')
  }

  async function download() {
    if (!selectedFile) return
    setBusy(true)
    setNotice('')
    try {
      const response = await fetch(`${RAW_BASE}${selectedFile.path}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = selectedFile.name
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setNotice(`Đã tải ${selectedFile.name}`)
    } catch {
      window.open(`${RAW_BASE}${selectedFile.path}`, '_blank', 'noopener,noreferrer')
      setNotice('Mở file trên GitHub. Lưu thủ công nếu trình duyệt không tự tải.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-6 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">
            BeanRC · STM32F405
          </p>
          <a
            href={GITHUB_URL}
            className="min-h-11 font-mono text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </header>

        <section className="mt-8 grid items-end gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <h1 className="max-w-[16ch] text-balance text-[clamp(2.4rem,6vw,4.4rem)] leading-[0.95] font-semibold">
            Firmware cho BeanRCF405
          </h1>
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
          <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
            1 · Firmware
          </p>
          <div
            role="radiogroup"
            aria-label="Firmware"
            className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {status === 'loading' &&
              [0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
              ))}
            {stacks.map((stack) => {
              const active = stack.id === selectedId
              return (
                <button
                  key={stack.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-testid={`stack-${stack.id}`}
                  onClick={() => pickFirmware(stack)}
                  className={`flex min-h-20 items-center gap-4 rounded-2xl border px-4 py-3 text-left ${
                    active
                      ? 'border-accent bg-raised'
                      : 'border-line bg-surface hover:border-ink/20'
                  }`}
                >
                  <img
                    src={stack.logo}
                    alt=""
                    width="48"
                    height="48"
                    className="size-12 shrink-0 rounded-xl bg-canvas object-contain"
                  />
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

        {selected && selected.files.length > 1 && (
          <section className="mt-8" aria-label="Chọn file">
            <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
              2 · File
            </p>
            <div
              role="radiogroup"
              aria-label="Loại file"
              className="mt-3 flex flex-col gap-2 sm:flex-row"
            >
              {selected.files.map((file) => {
                const active = file.path === selectedPath
                return (
                  <button
                    key={file.path}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-testid={`file-${file.format}`}
                    onClick={() => {
                      setSelectedPath(file.path)
                      setNotice('')
                    }}
                    className={`flex min-h-16 min-w-[11rem] flex-1 flex-col justify-center rounded-2xl border px-4 py-3 text-left ${
                      active
                        ? 'border-accent bg-raised'
                        : 'border-line bg-surface hover:border-ink/20'
                    }`}
                  >
                    <span className="font-mono text-[15px] font-medium">
                      {formatName(file.format)}
                    </span>
                    <span className="mt-0.5 font-mono text-[11px] text-muted tabular-nums">
                      {roleLabel(file.role)}
                      {file.size ? ` · ${formatBytes(file.size)}` : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <section className="mt-8">
          {status === 'fallback' && (
            <p className="mb-3 text-[13px] text-accent" role="status">
              GitHub chậm — đang hiện bản local. {error}
            </p>
          )}
          <button
            type="button"
            data-testid="download"
            onClick={download}
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
          {selected && (
            <p className="mt-2 max-w-[52ch] text-pretty text-[14px] text-muted">
              {selected.hint}
            </p>
          )}
          {notice && (
            <p className="mt-2 text-[14px] text-muted" role="status">
              {notice}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
