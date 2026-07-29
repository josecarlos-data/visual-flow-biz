import { maestroIsiDataset } from "./maestroIsi";
import { comprasDataset } from "./compras";
import type { DatasetModule } from "./types";

// Lista de fuentes de datos disponibles. Para añadir una nueva:
// 1. Crear un módulo en src/lib/datasets/<key>.ts que exporte un DatasetModule
// 2. Importarlo y añadirlo aquí.
export const DATASETS: DatasetModule<any>[] = [maestroIsiDataset, comprasDataset];

export type { DatasetModule, UploadResult, UploadStageResult } from "./types";
