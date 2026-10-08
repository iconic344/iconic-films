'use client';

import {createElement, useEffect, useRef, useState} from 'react';
import type {Config} from './defaults';
import {defaultModelLighting} from './logo-settings';
import {modelSource} from './model-source';
import {frameModelViewer,type FramingViewer} from './model-framing';
import {createModelReturn, type ReturnViewer} from './model-return';

type Viewer = FramingViewer &
  ReturnViewer & {
    loaded: boolean;
    availableAnimations: string[];
    animationName: string;
    play: () => void;
    pause: () => void;
    updateFraming: () => Promise<void>;
    jumpCameraToGoal: () => void;
  };

export default function ModelScene({
  config: c,
  onAnimations,
  outerScale = 1,
}: {
  config: Config;
  onAnimations?: (animations: string[]) => void;
  outerScale?: number;
}) {
  const ref = useRef<Viewer | null>(null);
  const dragging = useRef(false);
  const spring = useRef<ReturnType<typeof createModelReturn> | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  const source = modelSource(c.aboutModel, retry);

  useEffect(() => {
    let live = true;
    void import('@google/model-viewer')
      .then(({ModelViewerElement}) => {
        ModelViewerElement.dracoDecoderLocation = '/decoders/draco/';
        ModelViewerElement.ktx2TranscoderLocation = '/decoders/basis/';
        ModelViewerElement.meshoptDecoderLocation = '/decoders/meshopt_decoder.js';
        if (live) setReady(true);
      })
      .catch(() => {
        if (live) setError('3D 뷰어를 불러올 수 없습니다.');
      });

    return () => {
      live = false;
    };
  }, [retry]);

  useEffect(() => {
    const v = ref.current;
    if (!ready || !v) return;

    setError('');
    setLoading(true);

    let live = true;
    const loaded = () => {
      setLoading(false);
      v.setAttribute('camera-target', 'auto auto auto');
      void v.updateFraming().then(() => {
        if (live) {
          frameModelViewer(v, {scale: c.modelScale, outerScale, offsetX: c.modelOffsetX, offsetY: c.modelOffsetY, resetDistance: true});
          v.jumpCameraToGoal();
        }
      }).catch(() => {});

      const names = v.availableAnimations || [];
      onAnimations?.(names);
      v.animationName = c.modelAnimation === 'auto' ? names[0] || '' : c.modelAnimation;

      if (c.modelAnimate && c.motion > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        v.play();
      } else {
        v.pause();
      }
    };

    const failed = (event: Event) => {
      setLoading(false);
      const detail = (event as CustomEvent<{type?: string}>).detail;
      setError(
        detail?.type === 'webglcontextlost'
          ? '3D 그래픽 연결이 끊겼습니다. 다시 불러와 주세요.'
          : '3D 로고를 불러오지 못했습니다. 다시 불러오기를 눌러 주세요.'
      );
    };

    v.addEventListener('load', loaded);
    v.addEventListener('error', failed);
    if (v.loaded) loaded();

    return () => {
      live = false;
      v.removeEventListener('load', loaded);
      v.removeEventListener('error', failed);
    };
  }, [ready, source, c.modelAnimate, c.modelAnimation, c.motion, onAnimations]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const a = v.availableAnimations || [];
    v.animationName = c.modelAnimation === 'auto' ? a[0] || '' : c.modelAnimation;

    if (c.modelAnimate && c.motion > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.play();
    } else {
      v.pause();
    }
  }, [ready, c.modelAnimate, c.modelAnimation, c.motion]);

  useEffect(() => {
    const v = ref.current;
    if (!ready || !v) return;

    const controller = createModelReturn(v, () => ({
      enabled: c.modelReturnToCenter !== false,
      bounce: c.modelReturnBounce ?? 0.55,
      animated: c.motion > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches,
      autoRotate: c.modelAutoRotate,
      orientation: [c.modelRotateX, c.modelRotateY, c.modelRotateZ],
    }));
    spring.current = controller;

    const down = (e: PointerEvent) => {
      if (!c.modelDrag || !v.loaded || (e.pointerType === 'mouse' && e.button !== 0)) return;
      controller.begin(e.pointerId);
      dragging.current = true;
    };
    const up = (e: PointerEvent) => {
      controller.end(e.pointerId);
      dragging.current = false;
    };
    const leave = () => controller.leave();
    const wheel = () => {
      if (c.modelZoom && v.loaded) controller.wheel();
    };

    v.addEventListener('pointerdown', down, true);
    v.addEventListener('pointerleave', leave);
    v.addEventListener('lostpointercapture', up);
    v.addEventListener('wheel', wheel, {passive: true});
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);

    return () => {
      v.removeEventListener('pointerdown', down, true);
      v.removeEventListener('pointerleave', leave);
      v.removeEventListener('lostpointercapture', up);
      v.removeEventListener('wheel', wheel);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
      controller.dispose();
      spring.current = null;
      dragging.current = false;
    };
  }, [ready, source, c.modelDrag, c.modelReturnToCenter, c.modelReturnBounce, c.modelAutoRotate, c.modelZoom, c.modelRotateX, c.modelRotateY, c.modelRotateZ, c.motion]);

  useEffect(() => {
    const v = ref.current;
    if (!ready || !v) return;
    if (c.modelDrag) v.setAttribute('camera-controls', '');
    else v.removeAttribute('camera-controls');
    if (c.modelZoom) v.removeAttribute('disable-zoom');
    else v.setAttribute('disable-zoom', '');
    if (c.modelAutoRotate && c.motion > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches) v.setAttribute('auto-rotate', '');
    else v.removeAttribute('auto-rotate');
    v.setAttribute('rotation-per-second', `${c.modelSpeed}deg`);
    v.style.touchAction = c.modelDrag ? 'none' : 'pan-y';
  }, [ready, c.modelDrag, c.modelZoom, c.modelAutoRotate, c.modelSpeed, c.motion]);


  // Model size, aspect ratio, screen rotation and editor zoom may change after
  // the initial load. Keep an absolute camera-distance safety floor in meters.
  // During regular drag we only prevent clipping; we never reset the angles.
  useEffect(() => {
    const v = ref.current;
    if (!ready || !v) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        frameModelViewer(v, {
          scale: c.modelScale,
          outerScale,
          offsetX: c.modelOffsetX,
          offsetY: c.modelOffsetY,
          resetDistance: true,
        });
      });
    };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(v);
    v.addEventListener('load', update);
    if (v.loaded) update();
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      v.removeEventListener('load', update);
    };
  }, [ready, source, c.modelScale, c.modelOffsetX, c.modelOffsetY, outerScale]);

  const reduced = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function react(e: React.PointerEvent) {
    if (!c.modelReact || dragging.current || reduced) return;
    const b = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width - 0.5;
    const y = (e.clientY - b.top) / b.height - 0.5;
    spring.current?.hover(-y * c.modelSensitivity, x * c.modelSensitivity);
  }

  const lighting = c.aboutLighting || defaultModelLighting;

  return (
    <div className="model-stage" style={{touchAction: c.modelDrag ? 'none' : 'pan-y'}} onPointerMove={react} onPointerLeave={() => spring.current?.leave()}>
      {ready && createElement('model-viewer', {
        key: source,
        ref,
        src: source,
        loading: 'eager',
        alt: 'ICONIC interactive 3D model',
        'camera-controls': c.modelDrag ? '' : undefined,
        'disable-zoom': c.modelZoom ? undefined : '',
        'disable-pan': '',
        'disable-tap': '',
        'auto-rotate': c.modelAutoRotate && c.motion > 0 && !reduced ? '' : undefined,
        'auto-rotate-delay': '0',
        'rotation-per-second': `${c.modelSpeed}deg`,
        'camera-target': 'auto auto auto',
        'camera-orbit': `0deg 75deg ${Math.max(120, 145 / Math.max(0.05, c.modelScale))}%`,
        'min-camera-orbit': 'auto auto 100%',
        'max-camera-orbit': 'auto auto 3000%',
        orientation: `${c.modelRotateX}deg ${c.modelRotateY}deg ${c.modelRotateZ}deg`,
        'shadow-intensity': lighting.enabled ? lighting.shadowIntensity : 0,
        'shadow-softness': lighting.shadowSoftness,
        'environment-image': lighting.enabled ? lighting.environment : undefined,
        exposure: lighting.exposure,
        'tone-mapping': lighting.toneMapping,
        'animation-crossfade-duration': '500',
        'interaction-prompt': 'none',
        'touch-action': c.modelDrag ? 'none' : 'pan-y',
        style: {
          width: '100%',
          height: '100%',
          transform: `translate(${Math.max(-30,Math.min(30,c.modelOffsetX))}%, ${Math.max(-30,Math.min(30,c.modelOffsetY))}%)`,
        },
      })}
      {loading && !error && <div className="model-status">Loading 3D…</div>}
      {error && (
        <div className="model-status error" role="status">
          <span>{error}</span>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setError('');
              setLoading(true);
              setRetry((value) => value + 1);
            }}
          >
            다시 불러오기
          </button>
        </div>
      )}
    </div>
  );
}
