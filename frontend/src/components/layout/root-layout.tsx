import { Outlet } from 'react-router-dom'

import { SkipNav } from '@/components/ui/skip-nav'
import { Header } from '@/components/layout/header'

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background">
      <SkipNav />
      <Header />
      <main id="main-content" className="mx-auto max-w-6xl p-6">
        <Outlet />
      </main>
    </div>
  )
}
