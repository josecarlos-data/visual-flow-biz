import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-medium">Cargando datos...</p>
      </div>
    </div>
  );
}
