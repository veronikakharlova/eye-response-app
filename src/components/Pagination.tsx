type Props = {
  page: number
  pageCount: number
  onChange: (page: number) => void
}

/** Пагинация номерами страниц — как в референсе (1 2 3 … N, Previous/Next). */
export default function Pagination({ page, pageCount, onChange }: Props) {
  if (pageCount <= 1) return null

  const items: Array<number | '…'> = []
  const add = (n: number) => items.push(n)
  add(1)
  if (page > 3) items.push('…')
  for (let n = Math.max(2, page - 1); n <= Math.min(pageCount - 1, page + 1); n++) add(n)
  if (page < pageCount - 2) items.push('…')
  if (pageCount > 1) add(pageCount)

  return (
    <div className="pagination">
      <button type="button" className="pagination__edge" disabled={page === 1} onClick={() => onChange(page - 1)}>
        ← Назад
      </button>
      {items.map((it, i) =>
        it === '…' ? (
          <span key={`dots-${i}`} className="pagination__btn" style={{ cursor: 'default' }}>
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            className={`pagination__btn ${it === page ? 'pagination__btn--active' : ''}`}
            onClick={() => onChange(it)}
          >
            {it}
          </button>
        ),
      )}
      <button
        type="button"
        className="pagination__edge"
        disabled={page === pageCount}
        onClick={() => onChange(page + 1)}
      >
        Дальше →
      </button>
    </div>
  )
}
