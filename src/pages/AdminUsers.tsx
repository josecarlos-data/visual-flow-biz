import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Check, X, Pencil, Save } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  employee_code: string | null;
  is_approved: boolean;
  zone_id: string | null;
  role: AppRole | null;
  zone_name: string | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<{ userId: string; field: "full_name" | "employee_code" } | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, zonesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email, employee_code, is_approved, zone_id"),
      supabase.from("zones").select("id, name"),
    ]);

    const profiles = profilesRes.data ?? [];
    const zonesList = zonesRes.data ?? [];
    setZones(zonesList);

    const userIds = profiles.map((p) => p.user_id);
    const rolesRes = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
    const rolesMap = new Map<string, AppRole>();
    (rolesRes.data ?? []).forEach((r) => rolesMap.set(r.user_id, r.role as AppRole));

    const zonesMap = new Map(zonesList.map((z) => [z.id, z.name]));

    setUsers(
      profiles.map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: (p as any).email ?? null,
        employee_code: (p as any).employee_code ?? null,
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
    const { error } = await supabase.from("profiles").update({ is_approved: true }).eq("user_id", userId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Usuario aprobado" }); fetchData(); }
  };

  const rejectUser = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ is_approved: false }).eq("user_id", userId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Acceso revocado" }); fetchData(); }
  };

  const assignRole = async (userId: string, role: AppRole) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Rol asignado" }); fetchData(); }
  };

  const assignZone = async (userId: string, zoneId: string) => {
    const { error } = await supabase.from("profiles").update({ zone_id: zoneId } as any).eq("user_id", userId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Zona asignada" }); fetchData(); }
  };

  const startEdit = (userId: string, field: "full_name" | "employee_code", currentValue: string | null) => {
    setEditingField({ userId, field });
    setEditValue(currentValue ?? "");
  };

  const saveEdit = async () => {
    if (!editingField) return;
    const { userId, field } = editingField;
    const updateData = { [field]: editValue || null } as any;
    const { error } = await supabase.from("profiles").update(updateData).eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Guardado" });
      setEditingField(null);
      fetchData();
    }
  };

  const cancelEdit = () => setEditingField(null);

  const pendingUsers = users.filter((u) => !u.is_approved);
  const approvedUsers = users.filter((u) => u.is_approved);

  const renderEditableCell = (user: UserRow, field: "full_name" | "employee_code", displayValue: string) => {
    const isEditing = editingField?.userId === user.user_id && editingField?.field === field;
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
            className="h-8 w-[140px]"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEdit}><Save className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}><X className="h-3.5 w-3.5" /></Button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 group">
        <span>{displayValue}</span>
        <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEdit(user.user_id, field, field === "full_name" ? user.full_name : user.employee_code)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
        <p className="text-muted-foreground">Aprueba usuarios y asigna roles, zonas y códigos</p>
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
                  <TableHead>Email</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell>{u.full_name || "Sin nombre"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email || "—"}</TableCell>
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
                  <TableHead>Email</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Zona</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedUsers.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell>{renderEditableCell(u, "full_name", u.full_name || "Sin nombre")}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email || "—"}</TableCell>
                    <TableCell>{renderEditableCell(u, "employee_code", u.employee_code || "—")}</TableCell>
                    <TableCell>
                      <Select value={u.role ?? ""} onValueChange={(val) => assignRole(u.user_id, val as AppRole)}>
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
                      <Select value={u.zone_id ?? ""} onValueChange={(val) => assignZone(u.user_id, val)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Asignar zona" />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.map((z) => (
                            <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
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
