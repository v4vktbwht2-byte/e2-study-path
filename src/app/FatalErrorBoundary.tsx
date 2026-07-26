import { Component, type ReactNode } from "react";
import { FatalRecovery } from "./FatalRecovery";

interface FatalErrorBoundaryProps {
  readonly children: ReactNode;
}

interface FatalErrorBoundaryState {
  readonly error: Error | null;
}

export class FatalErrorBoundary extends Component<
  FatalErrorBoundaryProps,
  FatalErrorBoundaryState
> {
  state: FatalErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): FatalErrorBoundaryState {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  private readonly resetToHome = () => {
    window.location.hash = "/";
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <FatalRecovery error={this.state.error} onReset={this.resetToHome} />;
    }

    return this.props.children;
  }
}
