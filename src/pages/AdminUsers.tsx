import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRow {
  user_id: string;
  full_name: string | null;
  is_approved: boolean;
  zone_id: string | null;
  role: AppRole | null;
  zone_name: string | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, zonesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, is_approved, zone_id"),
      supabase.from("zones").select("id, name"),
    ]);

    const profiles = profilesRes.data ?? [];
    const zonesList = zonesRes.data ?? [];
    setZones(zonesList);

    // Fetch roles for each user
    const userIds = profiles.map((p) => p.user_id);
    const rolesRes = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
    const rolesMap = new Map<string, AppRole>();
    (rolesRes.data ?? []).forEach((r) => rolesMap.set(r.user_id, r.role as AppRole));

    const zonesMap = new Map(zonesList.map((z) => [z.id, z.name]));

    setUsers(
      profiles.map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        is_approved: p.is_approved,
        zone_id: p.zone_id,
        role: rolesMap.get(p.user_id) ?? null,
        zone_name: p.zone_id ? zonesMap.get(p.zone_id) ?? null : null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const approveUser = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: true })
      .eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuario aprobado" });
      fetchData();
    }
  };

  const rejectUser = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: false })
      .eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Acceso revocado" });
      fetchData();
    }
  };

  const assignRole = async (userId: string, role: AppRole) => {
    // Upsert: delete existing then insert
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rol asignado" });
      fetchData();
    }
  };

  const assignZone = async (userId: string, zoneId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ zone_id: zoneId })
      .eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Zona asignada" });
      fetchData();
    }
  };

  const pendingUsers = users.filter((u) => !u.is_approved);
  const approvedUsers = users.filter((u) => u.is_approved);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
        <p className="text-muted-foreground">Aprueba usuarios y asigna roles y zonas</p>
      </div>

      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pendientes de aprobación
              <Badge variant="destructive">{pendingUsers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell>{u.full_name || "Sin nombre"}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" onClick={() => approveUser(u.user_id)}>
                        <Check className="mr-1 h-4 w-4" /> Aprobar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => rejectUser(u.user_id)}>
                        <X className="mr-1 h-4 w-4" /> Rechazar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usuarios aprobados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : approvedUsers.length === 0 ? (
            <p className="text-muted-foreground">No hay usuarios aprobados aún.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Zona</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedUsers.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell>{u.full_name || "Sin nombre"}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role ?? ""}
                        onValueChange={(val) => assignRole(u.user_id, val as AppRole)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Asignar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="comercial">Comercial</SelectItem>
                          <SelectItem value="jefe_de_zona">Jefe de Zona</SelectItem>
                          <SelectItem value="director_comercial">Director Comercial</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.zone_id ?? ""}
                        onValueChange={(val) => assignZone(u.user_id, val)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Asignar zona" />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.map((z) => (
                            <SelectItem key={z.id} value={z.id}>
                              {z.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
