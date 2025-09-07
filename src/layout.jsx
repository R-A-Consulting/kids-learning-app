import { Routes, Route, useLocation } from 'react-router-dom';
import routes from './routes';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Home, MessageSquare, GraduationCap } from 'lucide-react';

// Menu items for the sidebar (currently empty for dashboard)
const menuItems = [
  {
    title: 'Home',
    icon: Home,
    url: '/dashboard',
  },
  {
    title: 'Chats',
    icon: MessageSquare,
    url: '/dashboard/chats',
  },
];

// Menu items for the sidebar (currently empty for dashboard)

function AppLayout() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <div className="h-screen w-screen">
      <SidebarProvider>
        {isDashboard && (
          <Sidebar collapsible="icon" className="w-[200px]">
            <SidebarHeader className="items-start p-0">
              <div className="flex items-center gap-2 px-4 py-4">
                <GraduationCap className="h-6 w-6 text-primary" />
                <span className="font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                  KidsLearn
                </span>
              </div>
            </SidebarHeader>

            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <a href={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarRail />
          </Sidebar>
        )}

        {isDashboard ? (
          <SidebarInset>
            <Routes>
              {routes.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
            </Routes>
          </SidebarInset>
        ) : (
          <Routes>
            {routes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Routes>
        )}
      </SidebarProvider>
    </div>
  );
}

export default function Layout() {
  return <AppLayout />;
}