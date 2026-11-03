"use client";

import { useState } from "react";
import {
  PreviewDeviceToggle,
  TemplateLivePreview,
  previewAspect,
  type PreviewDevice,
} from "./template-live-preview";

export function TemplateDetailPreview({ code }: { code: string }) {
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  return (
    <div className="flex justify-center">
      <div
        className="relative overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-[width,aspect-ratio] duration-200"
        style={{
          width:
            device === "mobile"
              ? "min(390px, 100%)"
              : device === "tablet"
                ? "min(834px, 100%)"
                : "100%",
          aspectRatio: previewAspect(device),
        }}
      >
        <TemplateLivePreview code={code} device={device} />
        <PreviewDeviceToggle
          device={device}
          onChange={setDevice}
          overlay
        />
      </div>
    </div>
  );
}
