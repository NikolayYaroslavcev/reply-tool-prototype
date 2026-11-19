import { describe, expect, it } from 'vitest'
import { isStale, reducer, type State } from './state'

const q = { text: 'Сможем перенести созвон?', tone: 'confident' as const }
const loading = (id: number): State => ({ s: 'loading', id, query: q })

describe('reducer', () => {
  it('новый запрос сразу убирает прошлые варианты', () => {
    const done: State = { s: 'done', query: q, variants: ['a'], copied: null }
    expect(reducer(done, { type: 'submit', id: 2, query: { ...q, text: 'другое' } })).toEqual({ s: 'loading', id: 2, query: { ...q, text: 'другое' } })
  })

  it('ответ на отменённый запрос не перезаписывает новый', () => {
    expect(reducer(loading(2), { type: 'success', id: 1, variants: ['старое'] })).toEqual(loading(2))
    expect(reducer(loading(2), { type: 'failure', id: 1, kind: 'network' })).toEqual(loading(2))
  })

  it('ошибка не содержит вариантов', () => {
    const next = reducer(loading(1), { type: 'failure', id: 1, kind: 'limit', retryAt: 10 })
    expect(next).toEqual({ s: 'error', query: q, kind: 'limit', retryAt: 10 })
  })

  it('«Скопировано» только у одного варианта', () => {
    let s = reducer(loading(1), { type: 'success', id: 1, variants: ['a', 'b'] })
    s = reducer(s, { type: 'copied', index: 0 })
    s = reducer(s, { type: 'copied', index: 1 })
    expect(s).toMatchObject({ copied: 1 })
    expect(reducer(s, { type: 'copyReset' })).toMatchObject({ copied: null })
  })

  it('варианты устаревают, если поменяли текст или тон', () => {
    const done: State = { s: 'done', query: q, variants: ['a'], copied: null }
    expect(isStale(done, q)).toBe(false)
    expect(isStale(done, { ...q, text: q.text + '  ' })).toBe(false)
    expect(isStale(done, { ...q, tone: 'short' })).toBe(true)
    expect(isStale(done, { ...q, text: 'Ты где?' })).toBe(true)
  })
})
