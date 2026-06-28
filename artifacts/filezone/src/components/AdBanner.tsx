import { useEffect, useRef, useState } from "react";

interface AdConfig {
  adsense_enabled?: string;
  adsense_client?: string;
  adsense_slot_leaderboard?: string;
  adsense_slot_rectangle?: string;
  adsense_slot_responsive?: string;
}

let _cache: AdConfig | null = null;
let _fetching: Promise<AdConfig> | null = null;

async function fetchAdConfig(): Promise<AdConfig> {
  if (_cache) return _cache;
  if (_fetching) return _fetching;
  _fetching = fetch("/api/public-settings")
    .then(r => r.json())
    .then(d => { _cache = d; return d; })
    .catch(() => ({}));
  return _fetching;
}

export type AdSlot = "leaderboard" | "rectangle" | "responsive";

interface AdBannerProps {
  slot?: AdSlot;
  className?: string;
}

declare global {
  interface Window { adsbygoogle: unknown[]; }
}

const IS_DEV = import.meta.env.DEV;

const SIZES: Record<AdSlot, string> = {
  leaderboard: "h-[90px] max-w-[728px]",
  rectangle:   "h-[280px] max-w-[336px]",
  responsive:  "h-[90px] w-full",
};

const STYLES: Record<AdSlot, React.CSSProperties> = {
  leaderboard: { display: "inline-block", width: "728px", height: "90px" },
  rectangle:   { display: "inline-block", width: "336px", height: "280px" },
  responsive:  { display: "block" },
};

const MIN_HEIGHTS: Record<AdSlot, string> = {
  leaderboard: "min-h-[90px]",
  rectangle:   "min-h-[280px]",
  responsive:  "min-h-[90px]",
};

export function AdBanner({ slot = "responsive", className = "" }: AdBannerProps) {
  const [cfg, setCfg] = useState<AdConfig | null>(_cache);
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (cfg) return;
    fetchAdConfig().then(c => setCfg(c));
  }, []);

  const isEnabled = cfg?.adsense_enabled === "true";
  const client = cfg?.adsense_client ?? "";
  const slotId = slot === "leaderboard"
    ? cfg?.adsense_slot_leaderboard
    : slot === "rectangle"
    ? cfg?.adsense_slot_rectangle
    : cfg?.adsense_slot_responsive;

  const ready = isEnabled && client && slotId && !IS_DEV;

  useEffect(() => {
    if (!ready || pushed.current || !adRef.current) return;
    try {
      pushed.current = true;
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch { /* ignore */ }
  }, [ready]);

  if (IS_DEV || !cfg) {
    return (
      <div className={`flex items-center justify-center mx-auto rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 ${SIZES[slot]} ${className}`}>
        <div className="text-center px-4">
          <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
            Ad — {slot}
          </p>
          <p className="text-[10px] text-muted-foreground/40 mt-0.5">
            {IS_DEV ? "Dev mode — configure in Admin → Ads" : "Loading…"}
          </p>
        </div>
      </div>
    );
  }

  if (!isEnabled || !client || !slotId) return null;

  return (
    <div className={`flex justify-center overflow-hidden ${MIN_HEIGHTS[slot]} ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={STYLES[slot]}
        data-ad-client={client}
        data-ad-slot={slotId}
        {...(slot === "responsive"
          ? { "data-ad-format": "auto", "data-full-width-responsive": "true" }
          : {})}
      />
    </div>
  );
}
