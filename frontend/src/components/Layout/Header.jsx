import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { Moon, Sun, BarChart3, User, ChevronDown, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { logout } from '../../auth/logout';

// Import logos
import logoLight from '../../assets/images/logo-light.jpg';
import logoDark from '../../assets/images/logo-dark.jpg';

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [logoError, setLogoError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef(null);

  const isActive = (path) => location.pathname.startsWith(path);

  // Select logo based on theme
  const logo = theme === 'dark' ? logoDark : logoLight;
  const showLogo = logo && !logoError;

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    setLoggingOut(true);
    await logout();
  };

  return (
    <header className="bg-white dark:bg-neutral-900 shadow-sm fixed w-full top-0 z-fixed border-b border-neutral-200 dark:border-neutral-700 h-20">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2">
              {showLogo ? (
                <img 
                  src={logo} 
                  alt="Management Reporting Logo" 
                  className="h-20 w-auto"
                  onError={() => {
                    // If image fails to load, show fallback icon
                    setLogoError(true);
                  }}
                />
              ) : (
                <BarChart3 className="h-8 w-8 text-primary-700 dark:text-primary-400" />
              )}
              <span className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                Management reporting
              </span>
            </Link>
            
            <nav className="hidden md:flex gap-4">
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-fast ${
                  isActive('/dashboard')
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/reports"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-fast ${
                  isActive('/reports')
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
              >
                Reports
              </Link>
              <Link
                to="/ai-custom"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-fast ${
                  isActive('/ai-custom')
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
              >
                AI custom
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-fast"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                disabled={loggingOut}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-fast disabled:opacity-60"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
              >
                <User className="h-4 w-4" />
                <span>Account</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-md z-fixed">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
