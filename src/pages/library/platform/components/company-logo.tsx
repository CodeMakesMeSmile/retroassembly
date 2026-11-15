import { clsx } from 'clsx'
import type { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'
import { getCompanyLogo } from '#@/consoles/artwork.ts'

export function CompanyLogo({
  className,
  company,
  fallback,
}: Readonly<{
  className?: string
  company: string
  fallback?: ReactNode
}>) {
  const companyLogo = getCompanyLogo(company)
  if (companyLogo) {
    return (
      <img
        alt={company}
        className={clsx(twMerge('object-contain object-center', className))}
        src={companyLogo}
        title={company}
      />
    )
  }
  return fallback
}
