import { IconButton, TextField } from '@radix-ui/themes'
import { type KeyboardEvent, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useNavigation } from 'react-router'
import { usePlatform } from '../../hooks/use-platform.ts'
import { focus } from '../../utils/spatial-navigation.ts'

/** The sort and order each list had before a search started there, to go back to when it's cleared */
const sortsBeforeSearch = new Map<string, { direction: null | string; sort: null | string }>()

function normalize(text: string) {
  return text.trim().replaceAll(/\s+/gu, ' ')
}

// The list's search box. What's typed goes into the address a moment after typing stops, and the list shows only the
// matching games, best match first, until another sort is picked
export function GameListSearch() {
  const { t } = useTranslation()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const navigation = useNavigation()
  const platform = usePlatform()

  const addressQuery = new URLSearchParams(search).get('q') ?? ''
  const [text, setText] = useState(addressQuery)
  // The search last sent to the address, so a slower answer doesn't overwrite what's being typed
  const [sent, setSent] = useState(addressQuery)
  const [shownQuery, setShownQuery] = useState(addressQuery)
  // The address changed some other way (Back, or "See all" in the quick search): show its search
  if (addressQuery !== shownQuery) {
    setShownQuery(addressQuery)
    if (addressQuery !== sent) {
      setSent(addressQuery)
      setText(addressQuery)
    }
  }

  async function apply(value: string) {
    const query = normalize(value)
    if (query === addressQuery) {
      return
    }
    const params = new URLSearchParams(search)
    params.delete('page')
    if (query) {
      if (!addressQuery) {
        sortsBeforeSearch.set(pathname, { direction: params.get('direction'), sort: params.get('sort') })
        params.delete('sort')
        params.delete('direction')
      }
      params.set('q', query)
    } else {
      params.delete('q')
      params.delete('sort')
      params.delete('direction')
      const before = sortsBeforeSearch.get(pathname)
      if (before?.sort) {
        params.set('sort', before.sort)
      }
      if (before?.direction) {
        params.set('direction', before.direction)
      }
      sortsBeforeSearch.delete(pathname)
    }
    setSent(query)
    // Typing more replaces the search in the history, so Back leaves the search rather than undoing a letter
    await navigate(params.size > 0 ? `${pathname}?${params}` : pathname, {
      preventScrollReset: true,
      replace: Boolean(addressQuery && query),
    })
  }

  const focusFirstGame = useRef(false)
  useEffect(() => {
    if (focusFirstGame.current && navigation.state === 'idle') {
      focusFirstGame.current = false
      focus('.game-entry')
    }
  }, [navigation.state])

  const applyTyped = useEffectEvent((value: string) => apply(value))
  useEffect(() => {
    const timer = setTimeout(() => applyTyped(text), 300)
    return () => clearTimeout(timer)
  }, [text])

  async function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || (event.key === 'ArrowDown' && text)) {
      // Into the first game, once the list has caught up with what's typed
      event.preventDefault()
      if (normalize(text) === addressQuery) {
        focus('.game-entry')
      } else {
        focusFirstGame.current = true
        await apply(text)
      }
    } else if (event.key === 'Escape' && text) {
      event.preventDefault()
      event.stopPropagation()
      setText('')
    }
  }

  async function clear() {
    setText('')
    await apply('')
    focus('input[name="list-search"]')
  }

  const searching = navigation.state === 'loading' && new URLSearchParams(navigation.location?.search).has('q')
  const placeholder = platform
    ? t('search.searchPlatform', { platform: t(platform.displayNameI18nKey) })
    : t('search.searchGames')

  return (
    <TextField.Root
      aria-label={placeholder}
      autoComplete='off'
      className='w-full lg:w-80'
      data-sn-enabled
      name='list-search'
      onChange={(event) => setText(event.currentTarget.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      size='2'
      spellCheck={false}
      type='text'
      value={text}
    >
      <TextField.Slot>
        {searching ? (
          <span className='icon-[svg-spinners--180-ring] size-4' />
        ) : (
          <span className='icon-[mdi--magnify] size-4' />
        )}
      </TextField.Slot>
      {text ? (
        <TextField.Slot>
          <IconButton aria-label={t('common.clear')} onClick={clear} size='1' title={t('common.clear')} variant='ghost'>
            <span className='icon-[mdi--close] size-4' />
          </IconButton>
        </TextField.Slot>
      ) : null}
    </TextField.Root>
  )
}
