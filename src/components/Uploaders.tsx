/** Target and source uploaders, with drag/drop, click, and keyboard support. */
import { useId, useState } from 'react';
import type { MaskMode, SourceItem } from '../lib/types';
import type { TargetData } from '../lib/imageLoading';
import { UploadIcon, CloseIcon } from './icons';

interface DropzoneProps {
  label: string;
  hint: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}

function Dropzone({ label, hint, multiple, onFiles }: DropzoneProps) {
  const [over, setOver] = useState(false);

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (files.length) onFiles(files);
  };

  return (
    <label
      className={`aff-drop${over ? ' aff-drop--over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <UploadIcon className="aff-btn__icon" />
      <span>{label}</span>
      <span className="aff-drop__hint">{hint}</span>
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </label>
  );
}

interface UploadersProps {
  target: TargetData | null;
  maskMode: MaskMode;
  invertMask: boolean;
  sources: SourceItem[];
  onTargetFile: (file: File) => void;
  onTargetClear: () => void;
  onMaskModeChange: (mode: MaskMode) => void;
  onInvertChange: (invert: boolean) => void;
  onSourcesAdd: (files: File[]) => void;
  onSourceRemove: (id: string) => void;
  onSourcesClear: () => void;
}

export default function Uploaders(props: UploadersProps) {
  const maskModeId = useId();

  return (
    <>
      <fieldset className="aff-section">
        <legend className="aff-section__legend">Target shape</legend>

        {props.target ? (
          <ul className="aff-thumbs">
            <li className="aff-thumb aff-thumb--target">
              <img src={props.target.url} alt="Target shape preview" />
              <button
                type="button"
                className="aff-thumb__remove"
                onClick={props.onTargetClear}
                aria-label="Remove target shape"
              >
                <CloseIcon className="aff-btn__icon" />
              </button>
            </li>
          </ul>
        ) : (
          <Dropzone
            label="Add target shape"
            hint="Black/white, transparent PNG, or silhouette"
            onFiles={(files) => props.onTargetFile(files[0])}
          />
        )}

        <div className="aff-field" style={{ marginTop: 'var(--aff-sp-5)' }}>
          <label className="aff-label" htmlFor={maskModeId}>
            Inside region
          </label>
          <select
            id={maskModeId}
            className="aff-select"
            value={props.maskMode}
            onChange={(e) => props.onMaskModeChange(e.target.value as MaskMode)}
          >
            <option value="auto">Auto detect</option>
            <option value="alpha">Transparency (alpha)</option>
            <option value="dark">Dark is inside</option>
            <option value="light">Light is inside</option>
          </select>
          <span className="aff-helper">How the allowed area is read from the target.</span>
        </div>

        <label className="aff-check">
          <input
            type="checkbox"
            checked={props.invertMask}
            onChange={(e) => props.onInvertChange(e.target.checked)}
          />
          <span className="aff-check__text">Invert mask</span>
        </label>
      </fieldset>

      <fieldset className="aff-section">
        <legend className="aff-section__legend">
          Source silhouettes{props.sources.length > 0 ? ` (${props.sources.length})` : ''}
        </legend>

        <Dropzone
          label="Add source silhouettes"
          hint="Transparent PNGs work best — you can add many"
          multiple
          onFiles={props.onSourcesAdd}
        />

        {props.sources.length === 0 ? (
          <p className="aff-helper" style={{ marginTop: 'var(--aff-sp-4)' }}>
            No sources yet. These are the shapes that fill the target.
          </p>
        ) : (
          <>
            <ul className="aff-thumbs">
              {props.sources.map((s) => (
                <li className="aff-thumb" key={s.id}>
                  <img src={s.url} alt={s.name} title={s.name} />
                  <button
                    type="button"
                    className="aff-thumb__remove"
                    onClick={() => props.onSourceRemove(s.id)}
                    aria-label={`Remove ${s.name}`}
                  >
                    <CloseIcon className="aff-btn__icon" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="aff-btn aff-btn--ghost"
              style={{ marginTop: 'var(--aff-sp-4)' }}
              onClick={props.onSourcesClear}
            >
              Clear all sources
            </button>
          </>
        )}
      </fieldset>
    </>
  );
}
