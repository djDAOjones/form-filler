/**
 * App — owns all state and orchestrates generation.
 *
 * State is lifted here and passed down via props (no event bus / store).
 * Generation runs as an async, chunked routine that reports progress through
 * a callback, so the UI never freezes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, DEFAULT_EXPORT_DIM, PREVIEW_MAX_DIM } from '../lib/types';
import type { Placement, PlacementReport, Settings, SourceItem } from '../lib/types';
import { loadSource, loadTarget, loadSourceFromUrl, loadTargetFromUrl } from '../lib/imageLoading';
import type { TargetData } from '../lib/imageLoading';
import { PRESET_FILLERS, PRESET_SHAPES, DEFAULT_DEMO_SHAPE } from '../lib/presets';
import type { PresetItem } from '../lib/presets';
import { buildTargetMask } from '../lib/mask';
import { generate } from '../lib/placement';
import { exportComposition, renderToCanvas } from '../lib/render';
import type { RenderParams } from '../lib/render';
import { randomSeed } from '../lib/rng';
import Uploaders from './Uploaders';
import Controls from './Controls';
import CanvasStage from './CanvasStage';
import { PlayIcon, RefreshIcon, DiceIcon, DownloadIcon } from './icons';

export default function App() {
  // Seed starts at a fresh random value once per load; DEFAULT_SETTINGS.seed
  // stays deterministic so defaults/tests are pure.
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    seed: randomSeed(),
  }));
  const [target, setTarget] = useState<TargetData | null>(null);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [placements, setPlacements] = useState<Placement[] | null>(null);
  const [report, setReport] = useState<PlacementReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [targetPresetId, setTargetPresetId] = useState<string | null>(null);
  const [autoGenPending, setAutoGenPending] = useState(false);
  const [exportLongSide, setExportLongSide] = useState<number>(DEFAULT_EXPORT_DIM);
  const [showBackdrop, setShowBackdrop] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const didBootstrap = useRef(false);

  const hasResult = !!placements && placements.length > 0;
  const canGenerate = !!target && sources.length > 0 && !isGenerating;

  const buildRenderParams = useCallback((): RenderParams | null => {
    if (!placements || !target) return null;
    return {
      placements,
      sources,
      placementWidth: target.imageData.width,
      placementHeight: target.imageData.height,
      targetWidth: target.naturalWidth,
      targetHeight: target.naturalHeight,
    };
  }, [placements, target, sources]);

  // Re-render the (light) preview canvas whenever the composition, target, or
  // backdrop toggle changes. Renders the faint target shape even before a
  // result so the shape is visible pre-generation (preview only — never exported).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !target) return;
    const previewLong = Math.min(
      Math.max(target.naturalWidth, target.naturalHeight),
      PREVIEW_MAX_DIM,
    );
    renderToCanvas(
      canvas,
      {
        placements: placements ?? [],
        sources,
        placementWidth: target.imageData.width,
        placementHeight: target.imageData.height,
        targetWidth: target.naturalWidth,
        targetHeight: target.naturalHeight,
      },
      previewLong,
      { backdrop: showBackdrop ? target.image : undefined },
    );
  }, [placements, target, sources, showBackdrop]);

  // Resulting export dimensions for the chosen size (toolbar readout).
  const exportDims = useMemo(() => {
    if (!target) return null;
    const placementLong = Math.max(1, target.imageData.width, target.imageData.height);
    const ratio = exportLongSide / placementLong;
    return {
      w: Math.round(target.imageData.width * ratio),
      h: Math.round(target.imageData.height * ratio),
    };
  }, [target, exportLongSide]);

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
      setTargetPresetId(null);
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
    setTargetPresetId(null);
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

  const handleTargetPreset = useCallback(async (preset: PresetItem) => {
    setLoadError(null);
    try {
      const data = await loadTargetFromUrl(preset.url, `${preset.label}.png`);
      setTarget((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return data;
      });
      setTargetPresetId(preset.id);
      setPlacements(null);
      setReport(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load the example shape.');
    }
  }, []);

  const handleLoadExampleSources = useCallback(async () => {
    setLoadError(null);
    try {
      const loaded = await Promise.all(
        PRESET_FILLERS.map((p) => loadSourceFromUrl(p.url, `${p.label}.png`)),
      );
      setSources((prev) => [...prev, ...loaded]);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load the example silhouettes.');
    }
  }, []);

  // First-run demo: auto-load a shape + the filler set once, when empty.
  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;
    if (target || sources.length > 0) return;
    try {
      if (localStorage.getItem('aff-demo-loaded')) return;
    } catch {
      /* storage unavailable — fall through and load the demo */
    }
    const shape = DEFAULT_DEMO_SHAPE;
    if (!shape) return;
    (async () => {
      try {
        const [targetData, sourceItems] = await Promise.all([
          loadTargetFromUrl(shape.url, `${shape.label}.png`),
          Promise.all(PRESET_FILLERS.map((p) => loadSourceFromUrl(p.url, `${p.label}.png`))),
        ]);
        setTarget(targetData);
        setTargetPresetId(shape.id);
        setSources(sourceItems);
        setAutoGenPending(true);
        try {
          localStorage.setItem('aff-demo-loaded', '1');
        } catch {
          /* ignore storage write errors */
        }
      } catch {
        /* demo content is best-effort; ignore load failures */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Run the initial generation once first-run demo content is in place.
  useEffect(() => {
    if (!autoGenPending) return;
    if (!target || sources.length === 0) return;
    setAutoGenPending(false);
    runGeneration(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenPending, target, sources]);

  const handleRandomiseSeed = useCallback(() => {
    const next = { ...settings, seed: randomSeed() };
    setSettings(next);
    runGeneration(next);
  }, [settings, runGeneration]);

  const handleCancel = useCallback(() => abortRef.current?.abort(), []);

  const handleExport = useCallback(async () => {
    const params = buildRenderParams();
    if (!params) return;
    try {
      await exportComposition(
        params,
        exportLongSide,
        `artwork-${settings.seed}-${exportLongSide}px.png`,
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not export the image.');
    }
  }, [buildRenderParams, exportLongSide, settings.seed]);

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
            shapePresets={PRESET_SHAPES}
            targetPresetId={targetPresetId}
            onTargetFile={handleTargetFile}
            onTargetClear={handleTargetClear}
            onTargetPreset={handleTargetPreset}
            onMaskModeChange={(maskMode) => updateSettings({ maskMode })}
            onInvertChange={(invertMask) => updateSettings({ invertMask })}
            onSourcesAdd={handleSourcesAdd}
            onSourceRemove={handleSourceRemove}
            onSourcesClear={handleSourcesClear}
            onLoadExampleSources={handleLoadExampleSources}
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
          exportLongSide={exportLongSide}
          exportDims={exportDims}
          showBackdrop={showBackdrop}
          onExportLongSideChange={setExportLongSide}
          onShowBackdropChange={setShowBackdrop}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
