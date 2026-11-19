import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api'
import { ReplyTool } from './ReplyTool'

const calls: { resolve: (v: string[]) => void; reject: (e: unknown) => void }[] = []
vi.mock('./api', async (orig) => ({
  ...(await orig<typeof import('./api')>()),
  fetchReplies: () => new Promise((resolve, reject) => calls.push({ resolve, reject })),
}))

beforeEach(() => {
  calls.length = 0
  Element.prototype.scrollIntoView = vi.fn()
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never
})
afterEach(cleanup)

const type = (v: string) => fireEvent.change(screen.getByRole('textbox'), { target: { value: v } })
const send = () => fireEvent.click(screen.getByRole('button', { name: /варианты|Повторить/ }))
const variants = () => screen.queryAllByRole('listitem').map((li) => li.textContent)

describe('ReplyTool', () => {
  it('после ошибки не показывает варианты к прошлому сообщению', async () => {
    render(<ReplyTool scenario="ok" />)
    type('Скинешь отчёт до обеда?')
    send()
    await act(async () => calls[0].resolve(['Да, скину до обеда.']))
    expect(variants()[0]).toContain('Да, скину до обеда.')

    type('Ты где? Мы уже собрались')
    send()
    await act(async () => calls[1].reject(new ApiError('network')))
    expect(variants()).toEqual([])
    expect(screen.getByRole('status').textContent).toMatch(/Сервис не ответил/)
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeTruthy()
  })

  it('опоздавший ответ отменённого запроса игнорируется', async () => {
    render(<ReplyTool scenario="slow" />)
    type('Первое сообщение')
    send()
    type('Второе сообщение')
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    await act(async () => calls[1].resolve(['ответ на второе']))
    await act(async () => calls[0].resolve(['ответ на первое']))
    expect(variants().join()).toContain('ответ на второе')
    expect(variants().join()).not.toContain('ответ на первое')
  })

  it('после смены тона предлагает обновить варианты', async () => {
    render(<ReplyTool scenario="ok" />)
    type('Привет, как дела?')
    send()
    await act(async () => calls[0].resolve(['Норм']))
    fireEvent.click(screen.getByLabelText('Коротко'))
    expect(screen.getByRole('button', { name: 'Обновить варианты' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toMatch(/к прошлому сообщению/)
  })
})
