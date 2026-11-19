import { useState } from 'react'
import { SCENARIOS, type Scenario } from './tool/api'
import { ReplyTool } from './tool/ReplyTool'

export default function App() {
  const [scenario, setScenario] = useState<Scenario>('ok')
  return (
    <div className="page">
      <header className="head">
        <h1>Ответ на сообщение</h1>
        <p>Прототип формы к тестовому заданию: React, TypeScript и явные состояния загрузки, ошибки и лимита.</p>
      </header>

      <main className="layout">
        <ReplyTool scenario={scenario} />

        <aside className="bench" aria-label="Стенд">
          <fieldset className="scenarios">
            <legend>Ответ сервера</legend>
            {SCENARIOS.map((s) => (
              <label key={s.id} className="scenario">
                <input type="radio" name="scenario" value={s.id} checked={scenario === s.id} onChange={() => setScenario(s.id)} />
                {s.label}
              </label>
            ))}
            <p className="hint">Сервер замокан, здесь выбирается его поведение.</p>
          </fieldset>

          <section className="checks">
            <h2>Что проверить</h2>
            <ol>
              <li>Получите варианты, включите «Ошибка сети» и отправьте другой текст. Старых вариантов под новым сообщением нет.</li>
              <li>Поменяйте текст или тон после ответа: варианты бледнеют, кнопка предлагает обновить.</li>
              <li>«Медленно»: отправьте второй раз во время загрузки. Первый запрос отменится и не перезапишет ответ.</li>
              <li>«Лимит 429»: кнопка ждёт <code>Retry-After</code> и показывает отсчёт.</li>
              <li>Скопируйте два варианта подряд: отметка остаётся только у последнего.</li>
            </ol>
            <a href="https://github.com/NikolayYaroslavcev/reply-tool-prototype">Код на GitHub</a>
          </section>
        </aside>
      </main>
    </div>
  )
}
