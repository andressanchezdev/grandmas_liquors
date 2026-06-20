import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import { Toaster, toast } from './components/AlertDialog';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthProvider, useAuth } from './components/AuthContext';
import { api } from './services/api';
import { firstPermittedStaffPath } from './services/routePermissions';
import { SessionIdleWatcher } from './components/SessionIdleWatcher';
import { requestLandingScroll } from './components/hooks/landingShared';

// Lazy loading de páginas para reducir el bundle inicial
const LandingPage = lazy(() => import('./components/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const NosotrosPage = lazy(() => import('./components/pages/NosotrosPage').then(m => ({ default: m.NosotrosPage })));
const Login = lazy(() => import('./components/pages/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./components/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Roles = lazy(() => import('./components/pages/usuarios/Roles').then(m => ({ default: m.Roles })));
const Usuarios = lazy(() => import('./components/pages/usuarios/Usuarios').then(m => ({ default: m.Usuarios })));
const Accesos = lazy(() => import('./components/pages/usuarios/Accesos').then(m => ({ default: m.Accesos })));
const Proveedores = lazy(() => import('./components/pages/compras/Proveedores').then(m => ({ default: m.Proveedores })));
const Compras = lazy(() => import('./components/pages/compras/Compras').then(m => ({ default: m.Compras })));
const Productos = lazy(() => import('./components/pages/compras/Productos').then(m => ({ default: m.Productos })));
const Categorias = lazy(() => import('./components/pages/compras/Categorias').then(m => ({ default: m.Categorias })));
const Insumos = lazy(() => import('./components/pages/produccion/Insumos').then(m => ({ default: m.Insumos })));
const EntregaInsumos = lazy(() => import('./components/pages/produccion/EntregaInsumos').then(m => ({ default: m.EntregaInsumos })));
const Produccion = lazy(() => import('./components/pages/produccion/Produccion').then(m => ({ default: m.Produccion })));
const Clientes = lazy(() => import('./components/pages/ventas/Clientes').then(m => ({ default: m.Clientes })));
const Ventas = lazy(() => import('./components/pages/ventas/Ventas').then(m => ({ default: m.Ventas })));
const Abonos = lazy(() => import('./components/pages/ventas/Abonos').then(m => ({ default: m.Abonos })));
const Pedidos = lazy(() => import('./components/pages/ventas/Pedidos').then(m => ({ default: m.Pedidos })));
const Domicilios = lazy(() => import('./components/pages/ventas/Domicilios').then(m => ({ default: m.Domicilios })));

// Componente de carga para Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/medicion': 'Dashboard',
  '/usuarios/roles': 'Gestión de Roles',
  '/usuarios/usuarios': 'Gestión de Usuarios',
  '/usuarios/accesos': 'Gestión de Accesos',
  '/compras/proveedores': 'Proveedores',
  '/compras/compras': 'Compras',
  '/compras/productos': 'Productos',
  '/compras/categorias': 'Categorías de Producto',
  '/produccion/produccion': 'Producción',
  '/produccion/entrega-insumos': 'Entrega de Insumos',
  '/produccion/insumos': 'Insumos',
  '/ventas/clientes': 'Clientes',
  '/ventas/ventas': 'Ventas',
  '/ventas/abonos': 'Abonos',
  '/ventas/pedidos': 'Pedidos',
  '/ventas/domicilios': 'Domicilios',
  '/configuracion/roles': 'Gestión de Roles',
};

function RequireRouteAccess({ children }: { children: React.ReactNode }) {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const routeKey = location.pathname.replace(/^\//, '');
  if (!user) return null;
  if (!hasPermission(routeKey)) {
    const fallback =
      user.rol === 'Cliente' ? '/' : firstPermittedStaffPath(user.permisos || [], user.rol);
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}

function StaffLayout({ onLogout }: { onLogout: () => void | Promise<void> }) {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  if (!user) return null;

  const pageTitle = pageTitles[location.pathname] || "Grandma's Liqueurs";
  const staffHome = firstPermittedStaffPath(user.permisos || [], user.rol);

  const handleNavigate = (path: string) => {
    const routeKey = path.replace(/^\//, '');
    if (hasPermission(routeKey)) navigate(path);
    else navigate(staffHome);
  };

  return (
    <div className="flex min-h-screen h-full bg-background">
      <Sidebar currentPath={location.pathname} onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header
          title={pageTitle}
          currentPath={location.pathname}
          userName={`${user.nombre} ${user.apellido}`}
          userRole={user.rol}
          userData={user}
          onLogout={() => void onLogout()}
        />
        <main key={user.id} className="main-content-scroll flex-1 overflow-y-auto bg-background p-3 sm:p-4 md:p-6">
          <RequireRouteAccess>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to={staffHome} replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/medicion" element={<Dashboard />} />
                <Route path="/configuracion/roles" element={<Roles />} />
                <Route path="/usuarios/roles" element={<Roles />} />
                <Route path="/usuarios/usuarios" element={<Usuarios />} />
                <Route path="/usuarios/accesos" element={<Accesos />} />
                <Route path="/compras/proveedores" element={<Proveedores />} />
                <Route path="/compras/compras" element={<Compras />} />
                <Route path="/compras/productos" element={<Productos />} />
                <Route path="/compras/categorias" element={<Categorias />} />
                <Route path="/produccion/produccion" element={<Produccion />} />
                <Route path="/produccion/entrega-insumos" element={<EntregaInsumos />} />
                <Route path="/produccion/insumos" element={<Insumos />} />
                <Route path="/ventas/clientes" element={<Clientes />} />
                <Route path="/ventas/ventas" element={<Ventas />} />
                <Route path="/ventas/abonos" element={<Abonos />} />
                <Route path="/ventas/pedidos" element={<Pedidos />} />
                <Route path="/ventas/domicilios" element={<Domicilios />} />
                <Route path="*" element={<Navigate to={staffHome} replace />} />
              </Routes>
            </Suspense>
          </RequireRouteAccess>
        </main>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAuth, setShowAuth] = useState<'landing' | 'login' | 'register' | 'nosotros'>('landing');

  const handleLogoutToLanding = async () => {
    await logout();
    setShowAuth('landing');
    navigate('/', { replace: true });
    toast.success('Sesión cerrada exitosamente');
  };

  useEffect(() => {
    if (!user) return;
    if (user.rol === 'Cliente') {
      if (location.pathname.startsWith('/cliente')) {
        navigate('/', { replace: true });
      }
      return;
    }
    const home = firstPermittedStaffPath(user.permisos || [], user.rol);
    if (location.pathname === '/' || location.pathname === '') {
      navigate(home, { replace: true });
    }
  }, [user, navigate, location.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleSessionInvalidated = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      setShowAuth('landing');
      navigate('/', { replace: true });
      toast.error(
        customEvent.detail?.message || 'Tu sesión fue cerrada porque la cuenta ya no está activa.'
      );
    };

    window.addEventListener('grandmas:session-invalidated', handleSessionInvalidated as EventListener);
    return () => {
      window.removeEventListener('grandmas:session-invalidated', handleSessionInvalidated as EventListener);
    };
  }, [navigate]);

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    setShowAuth('landing');
    const me = await api.auth.me();
    if (me.rol !== 'Cliente') {
      navigate(firstPermittedStaffPath(me.permisos || [], me.rol), { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  if (user?.rol === 'Cliente') {
    if (showAuth === 'nosotros') {
      return (
        <Suspense fallback={<PageLoader />}>
          <NosotrosPage
            onNavigateToRegister={() => setShowAuth('register')}
            onBackToHome={() => setShowAuth('landing')}
            onViewCatalog={() => {
              requestLandingScroll('productos');
              setShowAuth('landing');
            }}
          />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<PageLoader />}>
        <LandingPage
          onNavigateToLogin={() => setShowAuth('login')}
          onNavigateToRegister={() => setShowAuth('register')}
          onNavigateToNosotros={() => setShowAuth('nosotros')}
          user={user}
          onLogout={handleLogoutToLanding}
        />
      </Suspense>
    );
  }

  if (user) {
    return <StaffLayout onLogout={handleLogoutToLanding} />;
  }

  if (showAuth === 'landing') {
    return (
      <Suspense fallback={<PageLoader />}>
        <LandingPage
          onNavigateToLogin={() => setShowAuth('login')}
          onNavigateToRegister={() => setShowAuth('register')}
          onNavigateToNosotros={() => setShowAuth('nosotros')}
        />
      </Suspense>
    );
  }

  if (showAuth === 'nosotros') {
    return (
      <Suspense fallback={<PageLoader />}>
        <NosotrosPage
          onNavigateToRegister={() => setShowAuth('register')}
          onBackToHome={() => setShowAuth('landing')}
          onViewCatalog={() => {
            requestLandingScroll('productos');
            setShowAuth('landing');
          }}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Login
        onLogin={handleLogin}
        initialTab={showAuth === 'register' ? 'register' : 'login'}
        onBackToLanding={() => setShowAuth('landing')}
      />
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SessionIdleWatcher />
        <Toaster richColors position="top-center" closeButton />
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
