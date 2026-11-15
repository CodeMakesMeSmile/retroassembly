import { AccessibilitySettings } from './accessibility-settings.tsx'
import { AccountsSettings } from './accounts-settings.tsx'
import { LanguageSettings } from './language-settings.tsx'

export function GeneralSettings() {
  return (
    <div className='flex flex-col gap-4'>
      <LanguageSettings />
      <AccessibilitySettings />
      <AccountsSettings />
    </div>
  )
}
