import { useI18n } from '../../i18n/i18n';
import type { Warning } from '../../rules/types';
import { useAppData } from '../data';
import { warningText } from '../warnings';

export function WarningList({ warnings }: { warnings: Warning[] }) {
  const { registry } = useAppData();
  const { t } = useI18n();
  if (warnings.length === 0) return null;
  return (
    <ul className="warnings">
      {warnings.map((w) => (
        <li key={`${w.code}:${w.detail}`}>{warningText(w, t, registry)}</li>
      ))}
    </ul>
  );
}
