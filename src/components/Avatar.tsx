// Один и тот же градиентный кружок с инициалами врача использовался в двух
// местах (шапка сайта — компактно, «Настройки» — крупнее), но раньше был
// собран вручную дважды, с одинаковым дизайном, но разными числами. Теперь
// это один компонент с параметром размера, и «Настройки» больше не
// расходятся с шапкой случайно — расхождение в размере (40 в шапке против
// 56 на «Настройках») осталось осознанным: в шапке кружок один из многих
// элементов в тесном ряду, на «Настройках» это главный акцент карточки
// профиля, крупнее — оправданно.

export function initialsFromEmail(email: string | undefined): string {
  if (!email) return 'Вр'
  const local = email.split('@')[0]
  const parts = local.split(/[._-]+/).filter(Boolean)
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2)
  return letters.toUpperCase()
}

type AvatarProps = {
  initials: string
  size: 40 | 56
}

export default function Avatar({ initials, size }: AvatarProps) {
  const sizeVar = size === 40 ? 'var(--space-40)' : 'var(--space-56)'
  const fontSize = size === 40 ? 13 : 18
  return (
    <div className="avatar-circle" style={{ width: sizeVar, height: sizeVar, fontSize }}>
      {initials}
    </div>
  )
}
