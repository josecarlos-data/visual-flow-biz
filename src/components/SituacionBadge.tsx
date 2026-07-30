import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { etiquetaCategoria, etiquetaEfecto, type SituacionCliente } from "@/hooks/useCrm";

interface Props {
  situacion: Pick<SituacionCliente, "etiqueta" | "categoria" | "nota"> & { efecto?: string | null };
  className?: string;
}

const COLORES: Record<string, string> = {
  ocultar: "border-amber-500/50 text-amber-700 dark:text-amber-400",
  justificada: "border-sky-500/50 text-sky-700 dark:text-sky-400",
  informativa: "border-muted-foreground/40 text-muted-foreground",
};

/** Etiqueta corta que avisa de una situación conocida del cliente. */
export function SituacionBadge({ situacion, className }: Props) {
  const efecto = situacion.efecto ?? "ocultar";
  const detalle = [etiquetaCategoria(situacion.categoria), etiquetaEfecto(efecto), situacion.nota]
    .filter(Boolean)
    .join(" · ");
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 ${COLORES[efecto] ?? COLORES.ocultar} ${className ?? ""}`}>
            <Info className="h-3 w-3" />
            {situacion.etiqueta}
          </Badge>
        </TooltipTrigger>
        {detalle && <TooltipContent className="max-w-xs text-xs">{detalle}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}

export default SituacionBadge;
