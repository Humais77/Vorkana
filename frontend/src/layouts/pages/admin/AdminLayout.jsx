import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminStore } from '../../../store/useAdminStore';
import {
  FiHome,
  FiUsers,
  FiFolder,
  FiShield,
  FiActivity,
  FiSettings,
  FiMenu,
  FiX,
  FiLogOut,
  FiBell,
  FiChevronLeft,
  FiChevronRight,
  FiUser,
  FiSearch,
  FiMessageSquare,
  FiHelpCircle,
  FiPackage,
  FiDollarSign,
  FiBarChart2,
  FiDatabase,
  FiServer,
  FiLock,
  FiGlobe
} from 'react-icons/fi';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedTab, setSelectedTab, sidebarOpen, setSidebarOpen, notifications } = useAdminStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiHome className="h-5 w-5" />, path: '/admin', badge: null },
    { id: 'users', label: 'Users', icon: <FiUsers className="h-5 w-5" />, path: '/admin/users', badge: null },
    { id: 'categories', label: 'Categories', icon: <FiFolder className="h-5 w-5" />, path: '/admin/categories', badge: null },
    { id: 'services', label: 'Services', icon: <FiPackage className="h-5 w-5" />, path: '/admin/services', badge: null },
    { id: 'gigs', label: 'Gigs', icon: <FiDollarSign className="h-5 w-5" />, path: '/admin/gigs', badge: null },
    { id: 'security', label: 'Security', icon: <FiShield className="h-5 w-5" />, path: '/admin/security', badge: null },
    { id: 'activity', label: 'Activity', icon: <FiActivity className="h-5 w-5" />, path: '/admin/activity', badge: null },
    { id: 'settings', label: 'Settings', icon: <FiSettings className="h-5 w-5" />, path: '/admin/settings', badge: null },
  ];

  const handleLogout = () => {
    // Clear admin-specific tokens
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('csrfToken');
    
    // Clear user tokens if they exist
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userToken');
    
    // Clear admin store
    useAdminStore.getState().clearAll();
    
    // Redirect to login
    window.location.href = '/admin/login';
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results or filter users
      navigate(`/admin/users?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
  if (!isMobile || !sidebarOpen) return;

  const handleClickOutside = (e) => {
    if (!e.target.closest('aside')) {
      setSidebarOpen(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [isMobile, sidebarOpen]);


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className={`lg:hidden fixed top-0 left-0 right-0 bg-white z-50 transition-all duration-300 ${
        isScrolled ? 'shadow-md border-b border-gray-200' : ''
      }`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={(e) => {
    e.stopPropagation();   
    setSidebarOpen(!sidebarOpen);
  }}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? <FiX className="h-5 w-5 text-gray-700" /> : <FiMenu className="h-5 w-5 text-gray-700" />}
            </button>
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <FiShield className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">Admin</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => navigate('/admin/activity')}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FiBell className="h-5 w-5 text-gray-600" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
                <FiUser className="h-4 w-4 text-white" />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="px-4 pb-4">
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search in admin panel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </form>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed lg:fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 transition-transform duration-300 ease-out z-40
        w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto flex flex-col
        ${isScrolled ? 'lg:top-0' : 'lg:top-0'}
        ${isMobile && sidebarOpen ? 'shadow-2xl' : 'lg:shadow-sm'}
      `}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
                <FiShield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
                <p className="text-xs text-gray-500 mt-0.5">v2.0.0</p>
              </div>
            </div>
            <button
              onClick={(e) => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FiChevronLeft className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || selectedTab === item.id;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => {
                    setSelectedTab(item.id);
                    if (isMobile) setSidebarOpen(false);
                  }}
                  className={`
                    relative flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-indigo-50 to-indigo-50 text-indigo-700 shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`${isActive ? 'text-indigo-600' : 'text-gray-400'} transition-colors`}>
                      {item.icon}
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  
                  {item.badge && (
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  
                  {isActive && (
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 h-6 w-1 bg-indigo-600 rounded-l-lg"></div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* System Status */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              System Status
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between px-4 py-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm text-gray-700">Database</span>
                </div>
                <FiDatabase className="h-4 w-4 text-gray-400" />
              </div>
              <div className="flex items-center justify-between px-4 py-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm text-gray-700">API</span>
                </div>
                <FiGlobe className="h-4 w-4 text-gray-400" />
              </div>
              <div className="flex items-center justify-between px-4 py-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm text-gray-700">Auth</span>
                </div>
                <FiLock className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 bg-gradient-to-b from-white to-gray-50">
          {/* <div className="p-3 bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl text-white mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-300">Online Users</p>
                <p className="text-lg font-bold mt-1">142</p>
              </div>
              <FiUsers className="h-6 w-6 text-gray-400" />
            </div>
            <div className="mt-3">
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '65%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Active now</span>
                <span>+12 today</span>
              </div>
            </div>
          </div> */}
          
          <div className="flex items-center justify-between">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FiLogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
            <a 
              href="/" 
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/';
              }}
            >
              <FiGlobe className="h-3 w-3 mr-1" />
              Visit Site
            </a>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isMobile && sidebarOpen && (
  <div
    className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
    onClick={() => setSidebarOpen(false)}
  />
)}

      {/* Main Content */}
      <main className={`
        lg:ml-64 transition-all duration-300 min-h-screen
        ${isMobile ? 'pt-24' : 'pt-0 lg:pt-0'}
      `}>
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile User Menu */}
      {userMenuOpen && isMobile && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setUserMenuOpen(false)}
          />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 animate-slide-up">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <FiUser className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Admin User</p>
                  <p className="text-sm text-gray-500">Super Administrator</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <button className="flex items-center w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg">
                  <FiUser className="h-5 w-5 mr-3 text-gray-400" />
                  My Profile
                </button>
                <button className="flex items-center w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg">
                  <FiSettings className="h-5 w-5 mr-3 text-gray-400" />
                  Settings
                </button>
                <button className="flex items-center w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg">
                  <FiMessageSquare className="h-5 w-5 mr-3 text-gray-400" />
                  Support
                </button>
                <div className="border-t border-gray-200 my-2"></div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <FiLogOut className="h-5 w-5 mr-3" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminLayout;