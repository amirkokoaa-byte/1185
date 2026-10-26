import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ApkResilientErrorBoundary extends React.Component<
  {children: React.ReactNode},
  {hasError: boolean; retryKey: number}
> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = {hasError: false, retryKey: 0};
  }

  static getDerivedStateFromError() {
    return {hasError: true};
  }

  componentDidCatch(error: unknown) {
    console.warn('Recovered from transient WebView/APK render error:', error);
    setTimeout(() => {
      this.setState((prev) => ({
        hasError: false,
        retryKey: prev.retryKey + 1,
      }));
    }, 80);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <ApkResilientErrorBoundary>
      <App />
    </ApkResilientErrorBoundary>
  );
}

