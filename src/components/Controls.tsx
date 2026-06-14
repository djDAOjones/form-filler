/** Generation controls — all tuneable settings for the placement algorithm. */
import { useId } from 'react';
import type { AngleVariation, Settings } from '../lib/types';

interface ControlsProps {
  settings: Settings;
  disabled: boolean;
  onChange: (patch: Partial<Settings>) => void;
}

interface RangeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  format: (v: number) => string;
  onChange: (v: number) => void;
  helper?: string;
}

function LabeledRange({ label, value, min, max, step, disabled, format, onChange, helper }: RangeProps) {
  const id = useId();
  return (
    <div className="aff-field">
      <label className="aff-label" htmlFor={id}>
        {label} <span className="aff-value">{format(value)}</span>
      </label>
      <input
        id={id}
        className="aff-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {helper ? <span className="aff-helper">{helper}</span> : null}
    </div>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const px = (v: number) => `${Math.round(v)} px`;

const ANGLE_OPTIONS: { value: AngleVariation; label: string }[] = [
  { value: 'none', label: 'None (0°)' },
  { value: 'pm10', label: '±10°' },
  { value: 'pm30', label: '±30°' },
  { value: 'pm90', label: '±90°' },
  { value: 'random360', label: 'Random 360°' },
];

export default function Controls({ settings, disabled, onChange }: ControlsProps) {
  const angleId = useId();
  const seedId = useId();
  const attemptsId = useId();

  return (
    <fieldset className="aff-section">
      <legend className="aff-section__legend">Layout settings</legend>

      <LabeledRange
        label="Density"
        value={settings.density}
        min={0.1}
        max={1}
        step={0.05}
        disabled={disabled}
        format={pct}
        onChange={(v) => onChange({ density: v })}
        helper="How much of the target to fill."
      />

      <LabeledRange
        label="Minimum size"
        value={settings.minSize}
        min={0.02}
        max={0.6}
        step={0.01}
        disabled={disabled}
        format={pct}
        onChange={(v) => onChange({ minSize: Math.min(v, settings.maxSize) })}
      />
      <LabeledRange
        label="Maximum size"
        value={settings.maxSize}
        min={0.02}
        max={0.6}
        step={0.01}
        disabled={disabled}
        format={pct}
        onChange={(v) => onChange({ maxSize: Math.max(v, settings.minSize) })}
        helper="Size relative to the target's longest side."
      />

      <LabeledRange
        label="Spacing"
        value={settings.spacing}
        min={0}
        max={40}
        step={1}
        disabled={disabled}
        format={px}
        onChange={(v) => onChange({ spacing: v })}
        helper="Gap kept between silhouettes."
      />
      <LabeledRange
        label="Edge padding"
        value={settings.edgePadding}
        min={0}
        max={40}
        step={1}
        disabled={disabled}
        format={px}
        onChange={(v) => onChange({ edgePadding: v })}
        helper="Gap kept from the target edge."
      />

      <div className="aff-field">
        <label className="aff-label" htmlFor={angleId}>
          Angle variation
        </label>
        <select
          id={angleId}
          className="aff-select"
          value={settings.angleVariation}
          disabled={disabled}
          onChange={(e) => onChange({ angleVariation: e.target.value as AngleVariation })}
        >
          {ANGLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <LabeledRange
        label="Size variation"
        value={settings.sizeVariation}
        min={0}
        max={1}
        step={0.05}
        disabled={disabled}
        format={pct}
        onChange={(v) => onChange({ sizeVariation: v })}
        helper="Random size jitter (used most in use-each-once mode)."
      />

      <div className="aff-field">
        <span className="aff-label">Source usage</span>
        <div className="aff-radio-group" role="radiogroup" aria-label="Source usage">
          <label className="aff-radio">
            <input
              type="radio"
              name="reuse"
              checked={settings.allowReuse}
              disabled={disabled}
              onChange={() => onChange({ allowReuse: true })}
            />
            <span className="aff-check__text">Allow reuse of source images</span>
          </label>
          <label className="aff-radio">
            <input
              type="radio"
              name="reuse"
              checked={!settings.allowReuse}
              disabled={disabled}
              onChange={() => onChange({ allowReuse: false })}
            />
            <span className="aff-check__text">Use each source file once</span>
          </label>
        </div>
      </div>

      <div className="aff-row">
        <div className="aff-field">
          <label className="aff-label" htmlFor={seedId}>
            Seed
          </label>
          <input
            id={seedId}
            className="aff-input"
            type="number"
            min={0}
            step={1}
            value={settings.seed}
            disabled={disabled}
            onChange={(e) => onChange({ seed: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
          />
        </div>
        <div className="aff-field">
          <label className="aff-label" htmlFor={attemptsId}>
            Max attempts
          </label>
          <input
            id={attemptsId}
            className="aff-input"
            type="number"
            min={100}
            step={100}
            value={settings.maxAttempts}
            disabled={disabled}
            onChange={(e) =>
              onChange({ maxAttempts: Math.max(100, Math.floor(Number(e.target.value) || 100)) })
            }
          />
        </div>
      </div>
    </fieldset>
  );
}
