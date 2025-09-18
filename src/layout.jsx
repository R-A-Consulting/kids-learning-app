import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import routes from './routes';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { useMe } from '@/services/apis/auth';
import { Loader2 } from 'lucide-react';

function AppLayout() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const { getCurrentUser, isLoading, user } = useMe();

  useEffect(() => {
    getCurrentUser();
  }, []);

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin" />
    </div>
  }

  return (
    <div className="h-screen w-screen">
      <SidebarProvider>
        {isDashboard && <AppSidebar user={user} />}

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