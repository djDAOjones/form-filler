/**
 * App — owns all state and orchestrates generation.
 *
 * State is lifted here and passed down via props (no event bus / store).
 * Generation runs as an async, chunked routine that reports progress through
 * a callback, so the UI never freezes.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS } from '../lib/types';
import type { Placement, PlacementReport, Settings, SourceItem } from '../lib/types';
import { loadSource, loadTarget } from '../lib/imageLoading';
import type { TargetData } from '../lib/imageLoading';
import { buildTargetMask } from '../lib/mask';
import { generate } from '../lib/placement';
import { exportCanvasPng, renderToCanvas } from '../lib/render';
import { randomSeed } from '../lib/rng';
import Uploaders from './Uploaders';
import Controls from './Controls';
import CanvasStage from './CanvasStage';
import { PlayIcon, RefreshIcon, DiceIcon, DownloadIcon } from './icons';

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [target, setTarget] = useState<TargetData | null>(null);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [placements, setPlacements] = useState<Placement[] | null>(null);
  const [report, setReport] = useState<PlacementReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasResult = !!placements && placements.length > 0;
  const canGenerate = !!target && sources.length > 0 && !isGenerating;

  // Re-render the canvas whenever the result or its inputs change.
  useEffect(() => {
    if (!placements || !target || !canvasRef.current) return;
    renderToCanvas(canvasRef.current, {
      placements,
      sources,
      placementWidth: target.imageData.width,
      placementHeight: target.imageData.height,
      targetWidth: target.naturalWidth,
      targetHeight: target.naturalHeight,
    });
  }, [placements, target, sources]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleTargetFile = useCallback(async (file: File) => {
    setLoadError(null);
    try {
      const data = await loadTarget(file);
      setTarget((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return data;
      });
      setPlacements(null);
      setReport(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load the target image.');
    }
  }, []);

  const handleTargetClear = useCallback(() => {
    setTarget((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setPlacements(null);
    setReport(null);
  }, []);

  const handleSourcesAdd = useCallback(async (files: File[]) => {
    setLoadError(null);
    try {
      const loaded = await Promise.all(files.map((f) => loadSource(f)));
      setSources((prev) => [...prev, ...loaded]);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load a source image.');
    }
  }, []);

  const handleSourceRemove = useCallback((id: string) => {
    setSources((prev) => {
      const found = prev.find((s) => s.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const handleSourcesClear = useCallback(() => {
    setSources((prev) => {
      prev.forEach((s) => URL.revokeObjectURL(s.url));
      return [];
    });
  }, []);

  const runGeneration = useCallback(
    async (settingsToUse: Settings) => {
      if (!target || sources.length === 0) return;
      const controller = new AbortController();
      abortRef.current = controller;
      setIsGenerating(true);
      setProgress(0);
      try {
        const targetMask = buildTargetMask(
          target.imageData,
          settingsToUse.maskMode,
          settingsToUse.invertMask,
        );
        const result = await generate({
          target: targetMask,
          placementScale: target.placementScale,
          sources,
          settings: settingsToUse,
          onProgress: setProgress,
          signal: controller.signal,
        });
        setPlacements(result.placements);
        setReport(result.report);
      } catch (err) {
        setReport({
          level: 'error',
          headline: 'Generation failed',
          detail: err instanceof Error ? err.message : 'Unexpected error during generation.',
          placed: 0,
          total: 0,
          attempts: 0,
          coverage: 0,
        });
      } finally {
        setIsGenerating(false);
        abortRef.current = null;
      }
    },
    [target, sources],
  );

  const handleGenerate = useCallback(() => runGeneration(settings), [runGeneration, settings]);

  const handleRandomiseSeed = useCallback(() => {
    const next = { ...settings, seed: randomSeed() };
    setSettings(next);
    runGeneration(next);
  }, [settings, runGeneration]);

  const handleCancel = useCallback(() => abortRef.current?.abort(), []);

  const handleExport = useCallback(async () => {
    if (!canvasRef.current || !hasResult) return;
    await exportCanvasPng(canvasRef.current, `artwork-${settings.seed}.png`);
  }, [hasResult, settings.seed]);

  return (
    <div className="aff-app">
      <header className="aff-header">
        <h1 className="aff-header__title">Artwork Form Filler</h1>
        <div className="aff-header__actions">
          <button
            type="button"
            className="aff-btn aff-btn--ghost-on-dark"
            onClick={handleRandomiseSeed}
            disabled={!canGenerate}
          >
            <DiceIcon />
            Randomise seed
          </button>
          <button
            type="button"
            className="aff-btn aff-btn--ghost-on-dark"
            onClick={handleGenerate}
            disabled={!canGenerate || !hasResult}
          >
            <RefreshIcon />
            Regenerate
          </button>
          <button
            type="button"
            className="aff-btn aff-btn--primary"
            onClick={handleGenerate}
            disabled={!canGenerate}
          >
            <PlayIcon />
            Generate
          </button>
          <button
            type="button"
            className="aff-btn aff-btn--ghost-on-dark"
            onClick={handleExport}
            disabled={!hasResult || isGenerating}
          >
            <DownloadIcon />
            Export PNG
          </button>
        </div>
      </header>

      <div className="aff-body">
        <aside className="aff-sidebar" aria-label="Settings">
          {loadError ? (
            <div className="aff-report aff-report--error" role="alert">
              <p className="aff-report__headline">Could not load image</p>
              <p className="aff-report__detail">{loadError}</p>
            </div>
          ) : null}

          <Uploaders
            target={target}
            maskMode={settings.maskMode}
            invertMask={settings.invertMask}
            sources={sources}
            onTargetFile={handleTargetFile}
            onTargetClear={handleTargetClear}
            onMaskModeChange={(maskMode) => updateSettings({ maskMode })}
            onInvertChange={(invertMask) => updateSettings({ invertMask })}
            onSourcesAdd={handleSourcesAdd}
            onSourceRemove={handleSourceRemove}
            onSourcesClear={handleSourcesClear}
          />

          <Controls settings={settings} disabled={isGenerating} onChange={updateSettings} />
        </aside>

        <CanvasStage
          canvasRef={canvasRef}
          hasTarget={!!target}
          hasSources={sources.length > 0}
          hasResult={hasResult}
          isGenerating={isGenerating}
          progress={progress}
          report={report}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
