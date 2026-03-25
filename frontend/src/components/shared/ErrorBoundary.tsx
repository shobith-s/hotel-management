import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface p-8">
          <div className="max-w-md text-center">
            <span className="material-symbols-outlined text-6xl text-error/50 block mb-4">error</span>
            <h1 className="font-headline text-2xl font-bold text-primary mb-2">Something went wrong</h1>
            <p className="text-sm text-on-surface-variant mb-6">
              An unexpected error occurred. Please refresh the page to continue.
            </p>
            <p className="text-xs text-on-surface-variant/50 font-mono bg-surface-container rounded-lg p-3 text-left mb-6 break-all">
              {this.state.error.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary px-8 py-3"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
