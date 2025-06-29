import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Home, 
  CheckSquare, 
  Heart, 
  Mic, 
  Video,
  Settings,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import toast from 'react-hot-toast';

export function Layout() {
  const { user, signOut } = useAuth();
  const { isOnline, isConnectedToSupabase, retryConnection } = useNetworkStatus();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      toast.success('Signed out successfully');
    }
  };

  const handleRetryConnection = async () => {
    toast.loading('Checking connection...', { id: 'retry-connection' });
    const status = await retryConnection();
    
    if (status.isOnline && status.isConnectedToSupabase) {
      toast.success('Connection restored!', { id: 'retry-connection' });
    } else {
      toast.error('Still having connection issues', { id: 'retry-connection' });
    }
  };

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard', color: 'from-blue-500 to-cyan-500' },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks', color: 'from-green-500 to-emerald-500' },
    { icon: Heart, label: 'Mood', path: '/mood', color: 'from-pink-500 to-rose-500' },
    { icon: Mic, label: 'Voice AI', path: '/voice', color: 'from-purple-500 to-violet-500' },
    { icon: Video, label: 'Video', path: '/video', color: 'from-indigo-500 to-blue-500' },
    { icon: Settings, label: 'Settings', path: '/settings', color: 'from-gray-500 to-slate-500' },
  ];

  const showNetworkBanner = !isOnline || !isConnectedToSupabase;

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Network Status Banner */}
      <AnimatePresence>
        {showNetworkBanner && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`${
              !isOnline 
                ? 'bg-gradient-to-r from-red-500 to-red-600' 
                : 'bg-gradient-to-r from-yellow-500 to-orange-500'
            } text-white px-4 py-3 text-center text-sm font-medium shadow-lg`}
          >
            <div className="flex items-center justify-center space-x-3">
              {!isOnline ? (
                <WifiOff className="h-4 w-4" />
              ) : (
                <Wifi className="h-4 w-4" />
              )}
              <span>
                {!isOnline 
                  ? 'No internet connection - Some features may not work'
                  : 'Connection issues with server - Data may not sync properly'
                }
              </span>
              <button
                onClick={handleRetryConnection}
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs transition-all duration-200 flex items-center space-x-1 hover:scale-105"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Retry</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong border-b border-white/20 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                MindPal
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 group ${
                      isActive
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className={`h-4 w-4 transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-sm text-white/80">
                Welcome, <span className="font-semibold text-white">{user?.email?.split('@')[0]}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-110"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
              
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white/10 backdrop-blur-xl border-t border-white/20"
            >
              <nav className="px-4 py-4 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Floating Action Button for Mobile */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
        className="fixed bottom-6 right-6 md:hidden z-40"
      >
        <Link
          to="/voice"
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
        >
          <Mic className="h-6 w-6" />
        </Link>
      </motion.div>
    </div>
  );
}