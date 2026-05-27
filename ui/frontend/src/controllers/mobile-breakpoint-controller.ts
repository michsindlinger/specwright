import type { ReactiveController, ReactiveControllerHost } from 'lit';

const MOBILE_QUERY = '(max-width: 767px)';

export class MobileBreakpointController implements ReactiveController {
  private readonly _host: ReactiveControllerHost;
  private readonly _mql: MediaQueryList;
  private _changeCallback: ((isMobile: boolean) => void) | null = null;

  isMobile: boolean;

  constructor(host: ReactiveControllerHost) {
    this._host = host;
    this._mql = window.matchMedia(MOBILE_QUERY);
    this.isMobile = this._mql.matches;
    host.addController(this);
  }

  onChange(callback: (isMobile: boolean) => void): void {
    this._changeCallback = callback;
  }

  private readonly _handleChange = (e: MediaQueryListEvent): void => {
    this.isMobile = e.matches;
    this._changeCallback?.(this.isMobile);
    this._host.requestUpdate();
  };

  hostConnected(): void {
    this._mql.addEventListener('change', this._handleChange);
  }

  hostDisconnected(): void {
    this._mql.removeEventListener('change', this._handleChange);
    this._changeCallback = null;
  }
}
