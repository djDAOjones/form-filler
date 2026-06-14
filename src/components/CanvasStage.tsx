/** Composition preview: toolbar, progress, report, canvas, and empty states. */
import React from 'react';
import type { PlacementReport } from '../lib/types';
import Report from './Report';
import { StopIcon } from './icons';

interface CanvasStageProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  hasTarget: boolean;
  hasSources: boolean;
  hasResult: boolean;
  isGenerating: boolean;
  progress: number;
  report: PlacementReport | null;
  onCancel: () => void;
}

function EmptyState({ hasTarget, hasSources }: { hasTarget: boolean; hasSources: boolean }) {
  let title = 'Press Generate';
  let body = 'Adjust the settings on the left, then press Generate to fill the shape.';
  if (!hasTarget) {
    title = 'Add a target shape';
    body = 'Upload a target mask on the left. Its opaque (or dark) area is where silhouettes go.';
  } else if (!hasSources) {
    title = 'Add source silhouettes';
    body = 'Upload one or more silhouettes — ideally transparent PNGs — to fill the target shape.';
  }
  return (
    <div className="aff-empty">
      <p className="aff-empty__title">{title}</p>
      <p className="aff-empty__body">{body}</p>
    </div>
  );
}

export default function CanvasStage(props: CanvasStageProps) {
  const status = props.isGenerating
    ? `Generating… ${Math.round(props.progress * 100)}%`
    : props.hasResult
      ? 'Done'
      : 'Ready';

  return (
    <section className="aff-stage" aria-label="Composition preview">
      <div className="aff-stage__toolbar">
        <span className="aff-stage__status" role="status" aria-live="polite">
          {status}
        </span>
        {props.isGenerating ? (
          <button type="button" className="aff-btn aff-btn--ghost" onClick={props.onCancel}>
            <StopIcon className="aff-btn__icon" />
            Cancel
          </button>
        ) : null}
      </div>

      {props.isGenerating ? (
        <div
          className="aff-progress"
          role="progressbar"
          aria-label="Generation progress"
          aria-valuenow={Math.round(props.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="aff-progress__track">
            <div className="aff-progress__bar" style={{ width: `${props.progress * 100}%` }} />
          </div>
        </div>
      ) : null}

      {props.report ? <Report report={props.report} /> : null}

      <div className="aff-canvas-wrap">
        <canvas
          ref={props.canvasRef}
          className="aff-canvas"
          role="img"
          aria-label="Generated composition"
          style={{ display: props.hasResult ? 'block' : 'none' }}
        />
        {!props.hasResult ? (
          <EmptyState hasTarget={props.hasTarget} hasSources={props.hasSources} />
        ) : null}
      </div>
    </section>
  );
}
