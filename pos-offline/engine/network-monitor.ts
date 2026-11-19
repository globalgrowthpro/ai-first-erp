/**
 * Hafez ERP — POS Network Health Monitor
 * Real-time detection of connectivity states (Online, Offline, Slow/Degraded).
 * Includes actual ping probing to verify internet access beyond local Wi-Fi association.
 */

export type NetworkState = "online" | "offline" | "slow";

export interface NetworkHealth {
  state: NetworkState;
  isOnline: boolean;
  latencyMs: number;
  lastCheckedAt: string;
  checkCount: number;
}

type NetworkListener = (health: NetworkHealth) => void;

class PosNetworkMonitor {
  private state: NetworkState = typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline";
  private latencyMs: number = 0;
  private lastCheckedAt: string = new Date().toISOString();
  private checkCount: number = 0;
  private listeners: Set<NetworkListener> = new Set();
  private pingIntervalId: any = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleBrowserStateChange(true));
      window.addEventListener("offline", () => this.handleBrowserStateChange(false));
      // Start background heartbeat ping every 5 seconds
      this.startHeartbeat(5000);
    }
  }

  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    // Notify immediately with current state
    listener(this.getHealth());
    return () => this.listeners.delete(listener);
  }

  public getHealth(): NetworkHealth {
    return {
      state: this.state,
      isOnline: this.state === "online",
      latencyMs: this.latencyMs,
      lastCheckedAt: this.lastCheckedAt,
      checkCount: this.checkCount,
    };
  }

  /**
   * Proactively probe actual internet reachability (prevent false-positives from dead Wi-Fi)
   */
  public async probeConnection(): Promise<NetworkHealth> {
    this.checkCount++;
    this.lastCheckedAt = new Date().toISOString();

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.state = "offline";
      this.latencyMs = 0;
      this.notifyListeners();
      return this.getHealth();
    }

    const start = performance.now();
    try {
      // Ping external internet endpoints with cache-busting timestamp & no-cors
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      await Promise.any([
        fetch(`https://www.google.com/favicon.ico?_t=${Date.now()}`, {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-store",
          signal: controller.signal,
        }),
        fetch(`https://cloudflare.com/favicon.ico?_t=${Date.now()}`, {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-store",
          signal: controller.signal,
        }),
      ]);

      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - start);
      this.latencyMs = Math.max(12, elapsed);
      this.state = this.latencyMs > 1200 ? "slow" : "online";
    } catch {
      // If probe times out or network error occurs, consider truly offline
      this.state = "offline";
      this.latencyMs = 0;
    }

    this.notifyListeners();
    return this.getHealth();
  }

  private handleBrowserStateChange(browserOnline: boolean) {
    if (!browserOnline) {
      this.state = "offline";
      this.latencyMs = 0;
      this.lastCheckedAt = new Date().toISOString();
      this.notifyListeners();
    } else {
      // Confirm with a real probe
      this.probeConnection();
    }
  }

  private startHeartbeat(intervalMs: number) {
    if (this.pingIntervalId) clearInterval(this.pingIntervalId);
    this.pingIntervalId = setInterval(() => {
      this.probeConnection().catch(() => {});
    }, intervalMs);
  }

  private notifyListeners() {
    const health = this.getHealth();
    this.listeners.forEach((fn) => {
      try {
        fn(health);
      } catch (err) {
        console.error("[PosNetworkMonitor listener error]:", err);
      }
    });
  }

  public destroy() {
    if (this.pingIntervalId) clearInterval(this.pingIntervalId);
    this.listeners.clear();
  }
}

// Singleton network monitor instance
export const networkMonitor = new PosNetworkMonitor();
