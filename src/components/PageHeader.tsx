'use client'

import Link from 'next/link'

type PageHeaderProps = {
  title: string
  accentColor: string
  backHref?: string
}

export default function PageHeader({ title, accentColor, backHref }: PageHeaderProps) {
  return (
    <div className={`${accentColor} px-6 py-4 flex items-center justify-between`}>
      <div className="flex items-center gap-4">
        {backHref && (
          <Link href={backHref} className="text-sm text-white/80 hover:text-white">
            ← Back
          </Link>
        )}
        <h1 className="text-white font-semibold text-lg">{title}</h1>
      </div>
      <Link
        href="/dashboard"
        className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
      >
        Dashboard
      </Link>
    </div>
  )
}