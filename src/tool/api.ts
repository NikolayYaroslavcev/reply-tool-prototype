import type { ErrorKind, Tone } from './state'

// Мок вместо настоящего API: сценарий выбирается на странице, чтобы проверить все состояния.
export const SCENARIOS = [
  { id: 'ok', label: 'Обычный ответ' },
  { id: 'slow', label: 'Медленно (4 с)' },
  { id: 'network', label: 'Ошибка сети' },
  { id: 'timeout', label: 'Таймаут' },
  { id: 'limit', label: 'Лимит 429' },
] as const
export type Scenario = (typeof SCENARIOS)[number]['id']

export const TIMEOUT_MS = 6000

export class ApiError extends Error {
  kind: ErrorKind
  retryAfter?: number
  constructor(kind: ErrorKind, retryAfter?: number) {
    super(kind)
    this.kind = kind
    this.retryAfter = retryAfter
  }
}

const REPLIES: Record<Tone, string[]> = {
  confident: ['Да, договорились. Напиши, когда тебе удобно.', 'Подходит. Давай так и сделаем.', 'Да, беру на себя, вернусь с ответом сегодня.'],
  calm: ['Хорошо, без проблем. Давай спокойно всё обсудим.', 'Понял тебя, давай так.', 'Да, конечно. Как будет удобно, так и сделаем.'],
  short: ['Да, ок.', 'Договорились.', 'Принято.'],
  humor: ['Да, если кофе с тебя.', 'Договорились, записал кровью в календарь.', 'Согласен, только без сюрпризов в последний момент.'],
  work: ['Добрый день! Да, подтверждаю. Уточните, пожалуйста, удобное время.', 'Принято, возьму в работу и вернусь с ответом.', 'Согласен. Пришлите детали, и я подготовлю всё к сроку.'],
}

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(t)
      reject(signal.reason)
    })
  })

export async function fetchReplies(_text: string, tone: Tone, scenario: Scenario, signal: AbortSignal): Promise<string[]> {
  // Отмена пользователем и таймаут: один сигнал на запрос.
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const both = AbortSignal.any([signal, timeout])
  try {
    if (scenario === 'timeout') await wait(TIMEOUT_MS * 2, both)
    await wait(scenario === 'slow' ? 4000 : 900, both)
  } catch (e) {
    if (timeout.aborted && !signal.aborted) throw new ApiError('timeout')
    throw e
  }
  if (scenario === 'network') throw new ApiError('network')
  if (scenario === 'limit') throw new ApiError('limit', 15)
  return REPLIES[tone]
}
