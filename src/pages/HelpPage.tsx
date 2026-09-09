import Header from '../layout/Header'
import '../layout/layout.css'

const SUPPORT_EMAIL = 'veronika.kharlova@gmail.com'
const MAILTO =
  `mailto:${SUPPORT_EMAIL}` +
  `?subject=${encodeURIComponent('Проблема в приложении: анализ ОЭРГ')}` +
  `&body=${encodeURIComponent('Опишите, что не работает и на какой странице:\n\n')}`

export default function HelpPage() {
  return (
    <div>
      <Header title="Помощь" />

      <div className="help-layout">
        <div className="data-card help-main" style={{ padding: 'var(--space-28) var(--space-32)', lineHeight: 1.65, fontSize: 14.5 }}>
          <h2 style={{ fontSize: 16, margin: '0 0 var(--space-8)' }}>Как читать графики</h2>
          <p>
            На карточке пациента три панели: АЧХ и ФЧХ построены на линейной оси частот, ЛАЧХ на логарифмической, в декадах. Сплошная линия показывает выбранного пациента, серая пунктирная — средние значения по группе «Норма» для сравнения. Диапазон частот можно сузить как числами слева от графика, так и выделением прямо на нём (drag-zoom), и оба способа синхронизированы между собой.
          </p>

          <h2 style={{ fontSize: 16, margin: 'var(--space-20) 0 var(--space-8)' }}>Загрузка с прибора</h2>
          <p>
            В форме добавления пациента можно загрузить CSV-выгрузку с прибора вместо ручного ввода признаков.
            Длительность реальных файлов прибора не всегда совпадает с длительностью прежних записей в приложении. Если это влияет на конкретную загрузку, приложение прямо показывает предупреждение в форме, а не скрывает расхождение.
          </p>

          <h2 style={{ fontSize: 16, margin: 'var(--space-20) 0 var(--space-8)' }}>Уведомления</h2>
          <p>
            Колокольчик в шапке показывает только то, что реально можно посчитать по текущим данным: пациентов, у
            которых классификация расходится с диагнозом, и недавно добавленные записи. Придуманной активности там нет: если посмотреть не на что, список так и скажет.
          </p>

          <h2 style={{ fontSize: 16, margin: 'var(--space-20) 0 var(--space-8)' }}>Скачать график PDF</h2>
          <p>
            Кнопка «Скачать PDF» на карточке пациента открывает системный диалог печати браузера. Вы сами выбираете папку и нажимаете «Сохранить как PDF» — в файл попадает только сам график, без меню и шапки сайта.
          </p>
        </div>

        <aside className="data-card help-aside" style={{ padding: 'var(--space-20) var(--space-22)' }}>
          <span className="panel__label">Что-то не работает?</span>
          <p style={{ margin: '0 0 var(--space-16)', fontSize: 13.5, color: 'var(--muted)' }}>
            Опишите, что случилось и на какой странице. Письмо уйдёт прямо на почту разработчика.
          </p>
          <a
            href={MAILTO}
            className="page-btn page-btn--primary"
            style={{ display: 'inline-block', textDecoration: 'none', width: '100%', textAlign: 'center' }}
          >
            Сообщить о проблеме
          </a>
        </aside>
      </div>
    </div>
  )
}
