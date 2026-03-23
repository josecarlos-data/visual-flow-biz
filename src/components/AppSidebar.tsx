import { Users, Database, BarChart3, LogOut, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import logoRimosaIcon from "@/assets/logo_rimosa_icon.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { role, user, signOut } = useAuth();
  const isAdmin = role === "admin";

  const mainItems = [
    { title: "Ventas", url: "/", icon: BarChart3 },
  ];

  const adminItems = [
    { title: "Usuarios", url: "/admin/users", icon: Users },
    { title: "Datos", url: "/admin/data", icon: Database },
  ];

  return (
    <Sidebar className="border-r">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <img src={logoRimosaIcon} alt="RIMOSA" className="h-8 w-8 object-contain" />
        <span className="font-semibold text-primary">RIMOSA</span>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end activeClassName="bg-accent text-accent-foreground font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} activeClassName="bg-accent text-accent-foreground font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="mb-2 truncate text-sm text-muted-foreground">
          {user?.email}
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
