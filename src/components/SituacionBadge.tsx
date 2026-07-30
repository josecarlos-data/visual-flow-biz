import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { etiquetaCategoria, type SituacionCliente } from "@/hooks/useCrm";

interface Props {
  situacion: Pick<SituacionCliente, "etiqueta" | "categoria" | "nota">;
  className?: string;
}

/** Etiqueta corta que avisa de una situación conocida del cliente. */
export function SituacionBadge({ situacion, className }: Props) {
  const detalle = [etiquetaCategoria(situacion.categoria), situacion.nota].filter(Boolean).join(" · ");
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 border-amber-500/50 text-amber-700 dark:text-amber-400 ${className ?? ""}`}>
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
