import { useEffect, useReducer, useRef, useState } from 'react'
import { ApiError, fetchReplies, type Scenario } from './api'
import { isStale, reducer, TONES, type ErrorKind, type State, type Tone } from './state'

const MAX = 2000
const ERRORS: Record<ErrorKind, string> = {
  timeout: 'Нейросеть не успела ответить. Попробуйте ещё раз или сократите текст.',
  network: 'Сервис не ответил. Проверьте интернет и попробуйте ещё раз.',
  limit: 'Слишком много запросов подряд.',
}

export function ReplyTool({ scenario }: { scenario: Scenario }) {
  const [text, setText] = useState('')
  const [tone, setTone] = useState<Tone>('confident')
  const [hint, setHint] = useState('')
  const [state, dispatch] = useReducer(reducer, { s: 'idle' } as State)
  const [now, setNow] = useState(() => Date.now())
  const request = useRef<{ id: number; ctrl: AbortController } | null>(null)
  const results = useRef<HTMLDivElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)

  const length = [...text.trim()].length
  const waitLeft = state.s === 'error' && state.retryAt ? Math.ceil((state.retryAt - now) / 1000) : 0
  const busy = state.s === 'loading'
  const stale = isStale(state, { text, tone })

  async function submit() {
    if (length < 2) {
      setHint(`Вставьте текст от 2 до ${MAX} знаков.`)
      textarea.current?.focus()
      return
    }
    setHint('')
    request.current?.ctrl.abort()
    const id = (request.current?.id ?? 0) + 1
    const ctrl = new AbortController()
    request.current = { id, ctrl }
    dispatch({ type: 'submit', id, query: { text: text.trim(), tone } })
    try {
      const variants = await fetchReplies(text.trim(), tone, scenario, ctrl.signal)
      dispatch({ type: 'success', id, variants })
    } catch (e) {
      if (ctrl.signal.aborted) return // отменён новым запросом
      const err = e instanceof ApiError ? e : new ApiError('network')
      const retryAt = err.retryAfter ? Date.now() + err.retryAfter * 1000 : undefined
      setNow(Date.now())
      dispatch({ type: 'failure', id, kind: err.kind, retryAt })
    }
  }

  // Готовые варианты не должны оказаться за краем экрана.
  useEffect(() => {
    if (state.s !== 'done') return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    results.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
    results.current?.querySelector('button')?.focus({ preventScroll: true })
  }, [state.s])

  // «Скопировано» живёт 2 секунды и только у одного варианта.
  const copied = state.s === 'done' ? state.copied : null
  useEffect(() => {
    if (copied === null) return
    const t = setTimeout(() => dispatch({ type: 'copyReset' }), 2000)
    return () => clearTimeout(t)
  }, [copied])

  // Обратный отсчёт до следующей попытки после 429.
  useEffect(() => {
    if (waitLeft <= 0) return
    const t = setTimeout(() => setNow(Date.now()), 1000)
    return () => clearTimeout(t)
  }, [waitLeft, now])

  async function copy(index: number, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      dispatch({ type: 'copied', index })
    } catch {
      setHint('Не удалось скопировать автоматически: выделите текст варианта и нажмите Ctrl+C.')
    }
  }

  const status =
    hint ||
    (state.s === 'loading' && 'Подбираем варианты…') ||
    (state.s === 'done' && (stale ? 'Текст или тон изменились: эти варианты к прошлому сообщению.' : 'Готово. Выберите вариант и отправьте сами.')) ||
    (state.s === 'error' && (waitLeft > 0 ? `${ERRORS.limit} Повторить можно через ${waitLeft} с.` : ERRORS[state.kind])) ||
    ''

  return (
    <form
      className="tool"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <label className="field">
        <span className="field-head">
          Сообщение собеседника
          <span className={length > MAX ? 'count over' : 'count'}>
            {length} / {MAX}
          </span>
        </span>
        <textarea ref={textarea} value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Например: Сможем перенести созвон на четверг?" />
      </label>

      <fieldset className="chips">
        <legend>Тон</legend>
        {TONES.map((t) => (
          <label key={t.id} className="chip">
            <input type="radio" name="tone" value={t.id} checked={tone === t.id} onChange={() => setTone(t.id)} />
            {t.label}
          </label>
        ))}
      </fieldset>

      <div className="actions">
        <button type="submit" className="primary" disabled={busy || length > MAX || waitLeft > 0} aria-busy={busy}>
          {state.s === 'error' ? 'Повторить' : stale ? 'Обновить варианты' : 'Получить варианты'}
        </button>
        <p className={`status ${state.s === 'error' ? 'error' : ''}`} role="status" aria-live="polite">
          {status}
        </p>
      </div>

      <div ref={results} className="results" aria-busy={busy}>
        {state.s === 'loading' && (
          <ul className="variants">
            {[0, 1, 2].map((i) => (
              <li key={i} className="variant skeleton" aria-hidden />
            ))}
          </ul>
        )}
        {state.s === 'done' && (
          <ul className={`variants ${stale ? 'stale' : ''}`}>
            {state.variants.map((v, i) => (
              <li key={i} className="variant">
                <p>{v}</p>
                <button type="button" data-copied={state.copied === i || undefined} onClick={() => void copy(i, v)}>
                  {state.copied === i ? 'Скопировано' : 'Копировать'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  )
}
