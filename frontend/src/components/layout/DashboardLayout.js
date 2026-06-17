import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Calendar, 
  Users, 
  Scissors, 
  Sparkles,
  Package, 
  Archive, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'admin', 'kasir', 'stylist'] },
  { path: '/kasir', label: 'Kasir', icon: ShoppingCart, roles: ['owner', 'admin', 'kasir'] },
  { path: '/kas-kasir', label: 'Kas Kasir', icon: Wallet, roles: ['owner', 'admin', 'kasir'] },
  { path: '/booking', label: 'Booking', icon: Calendar, roles: ['owner', 'admin', 'kasir'] },
  { path: '/customers', label: 'Pelanggan', icon: Users, roles: ['owner', 'admin', 'kasir'] },
  { path: '/stylists', label: 'Stylist', icon: Scissors, roles: ['owner', 'admin'] },
  { path: '/services', label: 'Layanan', icon: Sparkles, roles: ['owner', 'admin'] },
  { path: '/products', label: 'Produk', icon: Package, roles: ['owner', 'admin'] },
  { path: '/inventory', label: 'Inventori', icon: Archive, roles: ['owner', 'admin'] },
  { path: '/reports', label: 'Laporan', icon: FileText, roles: ['owner', 'admin'] },
  { path: '/settings', label: 'Pengaturan', icon: Settings, roles: ['owner', 'admin'] },
];

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-card px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border">
            <img 
              src="logobaru.jpeg"
              alt="Logo"
              className="h-12 w-12"
              data-testid="sidebar-logo"
            />
            <div>
              <h2 className="font-heading text-lg font-bold tracking-tight">Mulya Salon</h2>
              <p className="text-xs text-muted-foreground">POS System</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="space-y-1">
                  {filteredMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <li key={item.path}>
                        <button
                          onClick={() => {
                            navigate(item.path);
                            setSidebarOpen(false);
                          }}
                          data-testid={`sidebar-${item.label.toLowerCase()}-link`}
                          className={cn(
                            'sidebar-nav-link group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                          {item.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border overflow-y-auto">
            <div className="flex h-16 items-center justify-between px-6 border-b border-border">
              <div className="flex items-center gap-3">
                <img 
                  src="https://static.prod-images.emergentagent.com/jobs/97d7c5c9-1c54-4247-a592-954b0b75281b/images/7e5d433156e378c311ab2f7bd4b1a3d9a06484c2e842faf060962dab26ab8e89.png"
                  alt="Logo"
                  className="h-8 w-8"
                />
                <h1 className="font-heading text-lg font-bold">Mulya Salon</h1>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                data-testid="sidebar-close-button"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="px-4 py-4">
              <ul className="space-y-1">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <li key={item.path}>
                      <button
                        onClick={() => {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }}
                        className={cn(
                          'sidebar-nav-link group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-accent'
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/95 backdrop-blur px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            data-testid="sidebar-open-button"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 items-center justify-between">
            <h2 className="font-heading text-lg font-semibold hidden sm:block">
              {menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
            </h2>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                data-testid="theme-toggle-button"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/20">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium" data-testid="user-name">{user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize" data-testid="user-role">{user?.role}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                data-testid="logout-button"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8" data-testid="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;