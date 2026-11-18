import { DateTime } from 'luxon'
import { useTranslation } from 'react-i18next'

/** How long ago a date was, short and in the page's language: "2 hr. ago" */
export function useAgo() {
  const { i18n } = useTranslation()
  return (date: Date | string) =>
    DateTime.fromJSDate(new Date(date)).toRelative({ locale: i18n.language, style: 'short' }) ?? ''
}
