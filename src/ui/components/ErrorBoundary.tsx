import { Component, type ReactNode } from 'react';
import { useI18n } from '../../i18n/i18n';
import { useExport } from '../use-export';

interface Props {
  message: string;
  exportLabel: string;
  onExport: () => void;
  children: ReactNode;
}

export class ErrorBoundary extends Component<Props, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="error-box">
        <p>{this.props.message}</p>
        <button type="button" onClick={this.props.onExport}>
          {this.props.exportLabel}
        </button>
      </div>
    );
  }
}

/** Spec §15: an error in one part shows a message and a button to export all data; the rest keeps working. */
export function Section({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { exportBackup } = useExport();
  return (
    <ErrorBoundary message={t('error.section')} exportLabel={t('error.export')} onExport={() => void exportBackup()}>
      {children}
    </ErrorBoundary>
  );
}
