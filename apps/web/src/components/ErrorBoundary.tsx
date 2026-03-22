import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900 text-white p-8">
          <h2 className="text-xl font-bold mb-4">3D Scene Error</h2>
          <p className="text-gray-400 mb-4">
            Something went wrong rendering the 3D scene.
          </p>
          <p className="text-sm text-gray-500 font-mono mb-6">
            {this.state.error?.message}
          </p>
          <button
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
