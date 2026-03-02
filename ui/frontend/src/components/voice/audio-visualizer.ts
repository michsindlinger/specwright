import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type VisualizerMode = 'idle' | 'user' | 'agent';

@customElement('aos-audio-visualizer')
export class AosAudioVisualizer extends LitElement {
  @property({ type: Boolean }) active = false;
  @property({ type: String }) mode: VisualizerMode = 'idle';

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  /**
   * Connect an AnalyserNode for frequency data visualization.
   * Call with null to disconnect.
   */
  setAnalyser(node: AnalyserNode | null): void {
    this.analyser = node;
    if (node) {
      node.fftSize = 128;
      node.smoothingTimeConstant = 0.8;
      this.dataArray = new Uint8Array(node.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    } else {
      this.dataArray = null;
    }
    if (this.active && node) {
      this.startLoop();
    }
    if (!node) {
      this.stopLoop();
    }
  }

  override firstUpdated(): void {
    this.canvas = this.renderRoot.querySelector('canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.syncSize();
      this.resizeObserver = new ResizeObserver(() => this.syncSize());
      this.resizeObserver.observe(this.canvas);
    }
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('active')) {
      if (this.active) {
        this.startLoop();
      } else {
        this.stopLoop();
      }
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopLoop();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private syncSize(): void {
    if (!this.canvas || !this.ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private startLoop(): void {
    if (this.animationId !== null) return;
    if (!this.active || !this.analyser) return;
    this.draw();
  }

  private stopLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clearCanvas();
  }

  private draw = (): void => {
    if (!this.active || !this.analyser || !this.ctx || !this.canvas || !this.dataArray) {
      this.animationId = null;
      return;
    }

    this.analyser.getByteFrequencyData(this.dataArray);

    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;
    const bins = this.dataArray.length;
    const barW = w / bins;
    const gap = 1;
    const centerY = h / 2;

    this.ctx.clearRect(0, 0, w, h);

    // Subtle center line
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, centerY);
    this.ctx.lineTo(w, centerY);
    this.ctx.stroke();

    // Color: green for agent, purple for user
    const rgb = this.mode === 'agent' ? '74, 222, 128' : '129, 140, 248';

    for (let i = 0; i < bins; i++) {
      const value = this.dataArray[i] / 255;
      const barH = value * centerY * 0.9;
      const x = i * barW + gap;
      const alpha = 0.3 + value * 0.7;

      this.ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
      // Mirrored bars from center
      this.ctx.fillRect(x, centerY - barH, barW - gap * 2, barH);
      this.ctx.fillRect(x, centerY, barW - gap * 2, barH);
    }

    this.animationId = requestAnimationFrame(this.draw);
  };

  private clearCanvas(): void {
    if (!this.ctx || !this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
  }

  override render() {
    return html`<canvas></canvas>`;
  }

  static override styles = css`
    :host {
      display: block;
      width: 100%;
      height: 64px;
    }

    canvas {
      width: 100%;
      height: 100%;
      border-radius: 8px;
      background: var(--color-bg-secondary, #12121f);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'aos-audio-visualizer': AosAudioVisualizer;
  }
}
