import * as React from "react"
import { Link } from 'react-router-dom';
import { Home, MessageSquare, GraduationCap } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

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

export function AppSidebar() {
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
                  <SidebarMenuButton asChild>
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
      </SidebarContent>
      <SidebarRail />
    </Sidebar >
  );
}
