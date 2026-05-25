/* eslint-disable react-refresh/only-export-components */

import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, info.componentStack)
    }
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border bg-card p-8 text-center">
          <div className="text-4xl">!</div>
          <h2 className="text-lg font-semibold">Что-то пошло не так</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Произошла непредвиденная ошибка. Попробуйте обновить страницу.
          </p>
          <Button
            variant="outline"
            onClick={() => this.setState({ error: null })}
          >
            Попробовать снова
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
