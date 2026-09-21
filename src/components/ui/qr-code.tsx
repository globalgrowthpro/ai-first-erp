import { useMemo } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

export interface QrCodeProps {
  value: string;
  size?: number;
  level?: "L" | "M" | "Q" | "H";
  color?: string;
  bgColor?: string;
  margin?: number;
  className?: string;
  bordered?: boolean;
  title?: string;
}

/**
 * RealQrCode renders a genuine, 100% standard scannable QR Code as high-precision vector SVG.
 * Scannable by any smartphone camera or QR reader.
 */
export function RealQrCode({
  value,
  size = 64,
  level = "M",
  color = "#0f172a",
  bgColor = "#ffffff",
  margin = 2,
  className,
  bordered = true,
  title,
}: QrCodeProps) {
  const { pathData, viewBoxSize } = useMemo(() => {
    try {
      const qr = QRCode.create(value || " ", { errorCorrectionLevel: level });
      const n = qr.modules.size;
      let d = "";
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (qr.modules.get(r, c)) {
            d += `M${c + margin} ${r + margin}h1v1h-1z `;
          }
        }
      }
      return {
        pathData: d,
        viewBoxSize: n + margin * 2,
      };
    } catch (e) {
      console.error("Failed to generate QR Code", e);
      return { pathData: "", viewBoxSize: 25 };
    }
  }, [value, level, margin]);

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center p-1.5 bg-white rounded-xl select-none",
        bordered && "border border-border/80 shadow-xs",
        className
      )}
      title={title || `QR Code: ${value}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        shapeRendering="crispEdges"
        className="block"
      >
        <rect width={viewBoxSize} height={viewBoxSize} fill={bgColor} />
        {pathData && <path d={pathData} fill={color} />}
      </svg>
    </div>
  );
}
