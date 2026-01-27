import * as React from "react"
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Home, 
  LogOut, 
  Users as UsersIcon, 
  Sparkles, 
  FileText,
  BarChart3,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { GlobalContext } from '@/services/contexts/global-context';

const menuItems = [
  {
    title: 'Home',
    icon: Home,
    url: '/dashboard',
  },
];

const questionBankItems = [
  {
    title: 'Dashboard',
    icon: BarChart3,
    url: '/dashboard/question-bank/dashboard',
  },
  {
    title: 'Question Banks',
    icon: FileText,
    url: '/dashboard/question-bank',
  },
];

export function AppSidebar({ user }) {
  const { setUser } = GlobalContext();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = React.useCallback(() => {
    // Clear all cookies (including those with different paths)
    document.cookie.split(';').forEach((cookie) => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

      // Remove cookie for current path
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;

      // Attempt to remove cookie for root and current path
      const pathParts = location.pathname.split('/');
      let path = '';
      for (let i = 0; i < pathParts.length; i++) {
        path = path + (path.endsWith('/') ? '' : '/') + pathParts[i];
        if (path) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}`;
        }
      }
    });

    // Clear storage and global state
    localStorage.removeItem('user');
    sessionStorage.clear();
    setUser(null);

    navigate('/login');
  }, [navigate, setUser, location.pathname]);

  const isActivePath = React.useCallback(
    (path) => location.pathname === path || location.pathname.startsWith(path + '/'),
    [location.pathname]
  );

  return (
    <Sidebar collapsible="icon" className="w-[200px]" >
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
                  <SidebarMenuButton asChild isActive={isActivePath(item.url)}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Question Bank</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {questionBankItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActivePath(item.url)}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActivePath('/dashboard/prompts')}>
                    <Link to="/dashboard/prompts">
                      <Sparkles className="h-4 w-4" />
                      <span>Prompts</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActivePath('/dashboard/users')}>
                    <Link to="/dashboard/users">
                      <UsersIcon className="h-4 w-4" />
                      <span>Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="mt-auto">
        <Button
          variant="ghost"
          className="justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar >
  );
}
