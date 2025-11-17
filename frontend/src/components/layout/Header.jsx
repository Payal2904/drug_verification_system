import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, User, LogOut, Settings, Shield, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Header = ({ onMenuClick }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsProfileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const navigationItems = [
    { path: '/', label: 'Home', public: true },
    { path: '/scan', label: 'Scan Drug', public: true },
    { path: '/verify', label: 'Verify', public: true },
    { path: '/reports', label: 'Reports', auth: true },
    { path: '/supply-chain', label: 'Supply Chain', auth: true },
  ];

  const adminItems = [
    { path: '/admin', label: 'Dashboard', roles: ['admin'] },
    { path: '/admin/users', label: 'Users', roles: ['admin'] },
    { path: '/admin/drugs', label: 'Drugs', roles: ['admin'] },
  ];

  const mockNotifications = [
    {
      id: 1,
      type: 'alert',
      title: 'Counterfeit Alert',
      message: 'New counterfeit report for Paracetamol batch #001',
      time: '5 min ago',
      unread: true,
    },
    {
      id: 2,
      type: 'success',
      title: 'Verification Complete',
      message: 'Drug batch verified successfully',
      time: '1 hour ago',
      unread: false,
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-neutral-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Mobile Menu Button */}
          <div className="flex items-center">
            {isAuthenticated() && (
              <button
                onClick={onMenuClick}
                className="lg:hidden p-2 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <Menu className="h-6 w-6" />
              </button>
            )}

            <Link to="/" className="flex items-center ml-4 lg:ml-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-bold text-neutral-900">
                    DrugVerify
                  </h1>
                  <p className="text-xs text-neutral-500 hidden sm:block">
                    Authenticity System
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-8">
            {navigationItems.map((item) => {
              if (item.auth && !isAuthenticated()) return null;
              if (item.public || isAuthenticated()) {
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              }
              return null;
            })}

            {/* Admin Navigation */}
            {user?.role === 'admin' && (
              <div className="relative group">
                <button className="px-3 py-2 rounded-md text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 flex items-center">
                  Admin
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  {adminItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* Right Side Items */}
          <div className="flex items-center space-x-4">
            {/* Search Button */}
            <button className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md">
              <Search className="h-5 w-5" />
            </button>

            {isAuthenticated() ? (
              <>
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="relative p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md"
                  >
                    <Bell className="h-5 w-5" />
                    {mockNotifications.some(n => n.unread) && (
                      <span className="absolute top-1 right-1 h-2 w-2 bg-error-500 rounded-full"></span>
                    )}
                  </button>

                  <AnimatePresence>
                    {isNotificationOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-50"
                      >
                        <div className="px-4 py-2 border-b border-neutral-200">
                          <h3 className="text-sm font-semibold text-neutral-900">Notifications</h3>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {mockNotifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`px-4 py-3 hover:bg-neutral-50 ${
                                notification.unread ? 'bg-primary-25' : ''
                              }`}
                            >
                              <div className="flex items-start">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-neutral-900">
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-neutral-600">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-neutral-500 mt-1">
                                    {notification.time}
                                  </p>
                                </div>
                                {notification.unread && (
                                  <span className="ml-2 h-2 w-2 bg-primary-500 rounded-full flex-shrink-0"></span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="px-4 py-2 border-t border-neutral-200">
                          <button className="text-sm text-primary-600 hover:text-primary-700">
                            View all notifications
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center space-x-2 p-2 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-md"
                  >
                    <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-600" />
                    </div>
                    <span className="hidden md:block text-sm font-medium">
                      {user?.first_name || user?.username}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isProfileMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
                      >
                        <div className="px-4 py-2 border-b border-neutral-200">
                          <p className="text-sm font-semibold text-neutral-900">
                            {user?.first_name} {user?.last_name}
                          </p>
                          <p className="text-xs text-neutral-500">{user?.email}</p>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mt-1">
                            {user?.role}
                          </span>
                        </div>

                        <Link
                          to="/profile"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Link>

                        <Link
                          to="/settings"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Link>

                        <div className="border-t border-neutral-200 my-1"></div>

                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-error-700 hover:bg-error-50"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              /* Auth Buttons */
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="btn btn-ghost btn-sm"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn btn-primary btn-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close menus */}
      {(isProfileMenuOpen || isNotificationOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsProfileMenuOpen(false);
            setIsNotificationOpen(false);
          }}
        />
      )}
    </header>
  );
};

export default Header;
