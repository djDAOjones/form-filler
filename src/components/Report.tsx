/** Placement report — communicates how generation went (Nielsen: system status). */
import type { PlacementReport } from '../lib/types';

interface ReportProps {
  report: PlacementReport;
}

export default function Report({ report }: ReportProps) {
  const modifier =
    report.level === 'success'
      ? ''
      : report.level === 'warning'
        ? ' aff-report--warning'
        : ' aff-report--error';

  return (
    <div className={`aff-report${modifier}`} role="status" aria-live="polite">
      <p className="aff-report__headline">{report.headline}</p>
      <p className="aff-report__detail">{report.detail}</p>
    </div>
  );
}
