import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function PendingApproval() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
            <Clock className="h-6 w-6 text-accent-foreground" />
          </div>
          <CardTitle>Cuenta pendiente de aprobación</CardTitle>
          <CardDescription>
            Tu cuenta ha sido creada correctamente. Un administrador debe aprobar tu acceso antes de que puedas usar la aplicación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={signOut}>
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
