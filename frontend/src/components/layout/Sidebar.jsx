import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  X,
  Home,
  Scan,
  FileText,
  BarChart3,
  Users,
  Settings,
  Shield,
  Package,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const Sidebar = ({ isOpen, onClose }) => {
  const { user, hasRole, hasAnyRole } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navigationItems = [
    {
      path: "/",
      label: "Home",
      icon: Home,
      roles: [
        "user",
        "pharmacist",
        "admin",
        "manufacturer",
        "distributor",
        "retailer",
      ],
    },
    {
      path: "/scan",
      label: "Scan Drug",
      icon: Scan,
      roles: [
        "user",
        "pharmacist",
        "admin",
        "manufacturer",
        "distributor",
        "retailer",
      ],
    },
    {
      path: "/verify",
      label: "Verify",
      icon: Shield,
      roles: [
        "user",
        "pharmacist",
        "admin",
        "manufacturer",
        "distributor",
        "retailer",
      ],
    },
    {
      path: "/reports",
      label: "My Reports",
      icon: FileText,
      roles: [
        "user",
        "pharmacist",
        "admin",
        "manufacturer",
        "distributor",
        "retailer",
      ],
    },
    {
      path: "/supply-chain",
      label: "Supply Chain",
      icon: Package,
      roles: ["pharmacist", "admin", "manufacturer", "distributor", "retailer"],
    },
  ];

  const adminItems = [
    {
      path: "/admin",
      label: "Dashboard",
      icon: BarChart3,
      roles: ["admin"],
    },
    {
      path: "/admin/users",
      label: "User Management",
      icon: Users,
      roles: ["admin"],
    },
    {
      path: "/admin/drugs",
      label: "Drug Management",
      icon: Package,
      roles: ["admin"],
    },
    {
      path: "/admin/batches",
      label: "Batch Management",
      icon: Package,
      roles: ["admin"],
    },
    {
      path: "/admin/settings",
      label: "System Settings",
      icon: Settings,
      roles: ["admin"],
    },
  ];

  const canAccess = (item) => {
    return item.roles.includes(user?.role);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={{ x: -320 }}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-200">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-bold text-neutral-900">
                  DrugVerify
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-neutral-200">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-semibold text-sm">
                  {user?.first_name?.charAt(0) ||
                    user?.username?.charAt(0) ||
                    "U"}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-neutral-900">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-neutral-500">{user?.email}</p>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mt-1">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 overflow-y-auto">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                if (!canAccess(item)) return null;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive(item.path)
                        ? "bg-primary-100 text-primary-700 border-r-2 border-primary-600"
                        : "text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100"
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Admin Section */}
            {hasRole("admin") && (
              <div className="mt-8">
                <div className="px-3 py-2">
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Administration
                  </h3>
                </div>
                <div className="space-y-1">
                  {adminItems.map((item) => {
                    if (!canAccess(item)) return null;

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive(item.path)
                            ? "bg-primary-100 text-primary-700 border-r-2 border-primary-600"
                            : "text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100"
                        }`}
                      >
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Alerts Section */}
            <div className="mt-8">
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  System Status
                </h3>
              </div>
              <div className="space-y-2">
                <div className="px-3 py-2 bg-green-50 rounded-md">
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-xs text-green-700">
                      System Online
                    </span>
                  </div>
                </div>
                <div className="px-3 py-2 bg-blue-50 rounded-md">
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-xs text-blue-700">
                      Blockchain Synced
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-neutral-200">
            <div className="text-xs text-neutral-500 text-center">
              <p>© 2024 DrugVerify</p>
              <p>Version 1.0.0</p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;
