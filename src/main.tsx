import React from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register Service Worker with immediate update checks so mobile refresh always loads the latest live version
try {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true).catch(() => {});
    },
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        registration.update().catch(() => {});
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        });
      }
    },
    onOfflineReady() {
      // App ready to work 100% offline
    },
  });
} catch {
  // ignore in restricted environments
}

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

