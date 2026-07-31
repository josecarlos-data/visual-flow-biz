import { Copy, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { urlRuta, type Parada } from "@/lib/maps";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bloques: Parada[][];
  sinGeo?: number;
}

/** Diálogo con un enlace real por tramo (Google Maps admite 10 paradas por trayecto). */
export function TramosMapaDialog({ open, onOpenChange, bloques, sinGeo = 0 }: Props) {
  const copiar = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Enlace copiado", description: "Pégalo en el navegador o en Google Maps." });
    } catch {
      toast({ title: "No se ha podido copiar", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ruta por tramos</DialogTitle>
          <DialogDescription>
            Google Maps admite 10 paradas por trayecto. La ruta se divide en {bloques.length}{" "}
            {bloques.length === 1 ? "tramo" : "tramos"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {bloques.map((b, i) => {
            const url = urlRuta(b);
            if (!url) return null;
            return (
              <div key={i} className="flex gap-2">
                <Button asChild variant="outline" className="flex-1 justify-start">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <Navigation className="mr-2 h-4 w-4" />
                    Tramo {i + 1} · {b.length} paradas
                  </a>
                </Button>
                <Button variant="ghost" size="icon" aria-label="Copiar enlace" onClick={() => copiar(url)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          {sinGeo > 0 && (
            <p className="pt-2 text-xs text-muted-foreground">
              {sinGeo} clientes sin ubicación registrada quedan fuera del mapa. Se geolocalizarán
              automáticamente al registrar una visita con GPS.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TramosMapaDialog;
