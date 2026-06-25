import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import TraitorsOdds from './TraitorsOdds.jsx'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#0d0d0d', minHeight: '100vh', color: '#e05555', fontFamily: 'monospace', padding: '40px', fontSize: '14px' }}>
          <div style={{ color: '#e8b84b', marginBottom: '16px' }}>RENDER ERROR</div>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#ccc' }}>{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <TraitorsOdds />
    </ErrorBoundary>
  </StrictMode>,
)
