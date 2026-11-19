export const TONES = [
  { id: 'confident', label: 'Уверенно' },
  { id: 'calm', label: 'Спокойно' },
  { id: 'short', label: 'Коротко' },
  { id: 'humor', label: 'С юмором' },
  { id: 'work', label: 'По работе' },
] as const

export type Tone = (typeof TONES)[number]['id']
export type ErrorKind = 'timeout' | 'limit' | 'network'
export type Query = { text: string; tone: Tone }

// Одно состояние вместо набора флагов: невозможно показать варианты и ошибку одновременно.
export type State =
  | { s: 'idle' }
  | { s: 'loading'; id: number; query: Query }
  | { s: 'done'; query: Query; variants: string[]; copied: number | null }
  | { s: 'error'; query: Query; kind: ErrorKind; retryAt?: number }

export type Action =
  | { type: 'submit'; id: number; query: Query }
  | { type: 'success'; id: number; variants: string[] }
  | { type: 'failure'; id: number; kind: ErrorKind; retryAt?: number }
  | { type: 'copied'; index: number }
  | { type: 'copyReset' }

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'submit':
      // Старые варианты уходят сразу, а не висят под новым текстом.
      return { s: 'loading', id: action.id, query: action.query }
    case 'success':
    case 'failure':
      // Ответ на прошлый запрос (его отменили или он опоздал) отбрасываем.
      if (state.s !== 'loading' || state.id !== action.id) return state
      return action.type === 'success'
        ? { s: 'done', query: state.query, variants: action.variants, copied: null }
        : { s: 'error', query: state.query, kind: action.kind, retryAt: action.retryAt }
    case 'copied':
      return state.s === 'done' ? { ...state, copied: action.index } : state
    case 'copyReset':
      return state.s === 'done' ? { ...state, copied: null } : state
  }
}

export const isStale = (state: State, current: Query) =>
  state.s === 'done' && (state.query.text !== current.text.trim() || state.query.tone !== current.tone)
