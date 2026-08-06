import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { Sidebar } from '@/components/layout/sidebar'
import { SkipNav } from '@/components/ui/skip-nav'

export function RootLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <SkipNav />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* на десктопе сайдбар виден всегда, кнопка нужна только узким экранам */}
        <div className="sticky top-0 z-30 flex items-center gap-2 border-b bg-card/80 px-4 py-2 backdrop-blur-sm md:hidden">
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-label="Открыть меню"
            aria-expanded={isSidebarOpen}
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <span className="font-semibold">projectPLATFORM</span>
        </div>

        {/*
          Единственное место, где задаются внешние отступы и ширина контента.
          Страницы отвечают только за внутренний ритм — space-y-6.

          Предел в 110rem, а не 72rem: сайдбар уже забирает 16rem, и на экране
          1920 контент при прежнем пределе оставлял по краям пустые поля.
          Ограничение всё же нужно — на ультрашироких мониторах строки текста
          иначе становятся нечитаемо длинными.

          @container: сетки на страницах считают колонки по ширине ЭТОГО блока,
          а не окна. Обычные брейкпоинты здесь врут — из-за сайдбара контенту
          всегда достаётся на 16rem меньше, чем показывает окно.
        */}
        <main
          id="main-content"
          className="@container mx-auto w-full max-w-[110rem] flex-1 p-4 md:p-6 xl:p-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
