import type { QueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";

export interface PreviewColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  format?: (v: unknown) => string;
}

export interface UploadStageResult {
  name: string;
  success: number;
  errors: number;
  message?: string;
}

export interface UploadResult {
  success: number;
  errors: number;
  stages?: UploadStageResult[];
  message?: string;
}

export interface DatasetModule<TParsed> {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  expectedColumns: string[];
  parse: (buffer: ArrayBuffer) => TParsed;
  countLabel: (data: TParsed) => string;
  rowCount: (data: TParsed) => number;
  previewColumns: PreviewColumn[];
  previewRows: (data: TParsed, limit: number) => Record<string, unknown>[];
  upload: (data: TParsed) => Promise<UploadResult>;
  invalidate: (qc: QueryClient) => void;
}
