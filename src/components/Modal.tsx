import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import './modal.css'

type Props = {
  title: string
  onClose: () => void
  children: React.ReactNode
  /** Кнопки/действия внизу модалки (например «Отмена» / «Сохранить»). */
  footer?: React.ReactNode
  width?: number
}

/**
 * Общая модалка: подложка + панель по центру. Закрывается по клику на
 * подложку, по крестику или по Escape. Используется и для фильтров,
 * и для форм добавления пациента — чтобы оба сценария выглядели одинаково.
 */
export default function Modal({ title, onClose, children, footer, width = 480 }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-panel__header">
          <h2 className="modal-panel__title">{title}</h2>
          <button type="button" className="modal-panel__close" onClick={onClose} aria-label="Закрыть">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="modal-panel__body">{children}</div>
        {footer && <div className="modal-panel__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
