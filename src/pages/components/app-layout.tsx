import { isBrowser } from 'es-toolkit'
import { Provider } from 'jotai'
import { HydrationBoundary } from 'jotai-ssr'
import { ThemeProvider } from 'next-themes'
import { type ReactNode, useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import { Scripts, ScrollRestoration, useLoaderData } from 'react-router'
import type { loader } from '#@/pages/root.tsx'
import { isCDNCacheEnabled } from '#@/utils/isomorphic/cdn.ts'
import { i18n } from '#@/utils/isomorphic/i18n.ts'
import { getGlobalCSSVars } from '#@/utils/isomorphic/misc.ts'
import { preferenceAtom } from '../atoms.ts'
import { Head } from './head.tsx'
import { RadixTheme } from './radix-theme.tsx'

if (isBrowser()) {
  ;(async () => {
    await i18n.changeLanguage(document.documentElement.lang)
  })()
}

export function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { language, preference } = useLoaderData<typeof loader>() || {}
  const hydrateAtom = [preferenceAtom, preference] as const
  const hydrateAtoms = [hydrateAtom]

  useEffect(() => {
    ;(async () => {
      await i18n.changeLanguage(language)
    })()
  }, [language])

  return (
    <html lang={language} prefix='og: https://ogp.me/ns#' suppressHydrationWarning>
      <I18nextProvider i18n={i18n}>
        <Head />
      </I18nextProvider>
      <body className='bg-(--primary) 2xl:bg-none' style={getGlobalCSSVars(preference)}>
        <I18nextProvider i18n={i18n}>
          <RadixTheme>
            <ThemeProvider attribute='class'>
              <Provider>
                <HydrationBoundary hydrateAtoms={hydrateAtoms}>{children}</HydrationBoundary>
              </Provider>
            </ThemeProvider>
          </RadixTheme>
        </I18nextProvider>
        {isCDNCacheEnabled() ? (
          <script dangerouslySetInnerHTML={{ __html: 'globalThis.RETROASSEMBLY_CDN_CACHE=true' }} />
        ) : null}
        <ScrollRestoration getKey={({ pathname, search }) => `${pathname}${search}`} />
        <Scripts />
      </body>
    </html>
  )
}
