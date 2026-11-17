import { clsx } from 'clsx'

interface HeaderLinkItemProps {
  /** While searching, how many of the link's games match */
  count?: number
  link?: {
    iconClass?: string
    iconUrl?: string
    text: string
  }
}

export function HeaderLinkItem({ count, link }: Readonly<HeaderLinkItemProps>) {
  if (link) {
    return (
      <div className={clsx('flex items-center gap-1', { 'opacity-50': count === 0 })}>
        {link.iconClass ? <span className={clsx('size-5', link.iconClass)} /> : null}
        {link.iconUrl ? <img alt={link.text} className='size-5' src={link.iconUrl} /> : null}
        {link.text}
        {count === undefined ? null : <b className='ml-1 tabular-nums'>{count}</b>}
      </div>
    )
  }
}
