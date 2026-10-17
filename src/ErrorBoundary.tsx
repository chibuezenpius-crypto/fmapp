import { Component, type ErrorInfo, type ReactNode } from 'react'
import { clearAllSaveData } from './state/saveData'

interface State { error: Error | null }

/** Catches a crash anywhere in the app so a bad save never leaves a blank screen. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('The app crashed', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return <div className="app-backdrop"><div className="app-shell"><main className="main-content"><div className="relations-view"><section className="fin-panel" role="alert">
      <span className="eyebrow">SOMETHING WENT WRONG</span>
      <h2 className="text-xl font-bold text-slate-900">The game hit an unexpected error</h2>
      <p className="board-meeting-intro">{this.state.error.message}</p>
      <div className="board-choice-row">
        <button className="board-choice" onClick={() => window.location.reload()} type="button"><strong>Reload</strong><small>Keep your save</small></button>
        <button className="board-meeting-submit danger" onClick={() => { clearAllSaveData(); window.location.reload() }} type="button">Reset save</button>
      </div>
    </section></div></main></div></div>
  }
}
