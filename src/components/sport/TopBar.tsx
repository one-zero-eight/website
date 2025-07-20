import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { User, LogOut, Calendar, HelpCircle, Users, BarChart3, Sun, Moon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';
import { studentService } from '../services/studentService';


const TopBar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAppStore();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  // Check user permissions
  const isAdmin = user ? (studentService.isSuperuser(user) || studentService.isStaff(user)) : false;
  const isStudent = user ? studentService.isStudent(user) : false;

  return (
    <>
      {/* Top Bar for Desktop */}
      <header className="bg-floating border-b border-secondary sticky top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between h-16 px-4 sm:px-0">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)'}}>
                  <span className="text-white font-bold text-sm">IH</span>
                </div>
                <div className="text-lg font-semibold text-contrast">
                  InNoHassle <span className="selected">Sport</span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <NavLink
                to="/schedule"
                end
                className={({ isActive }) => {
                  const active = isActive || location.pathname === '/';
                  return `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'text-white'
                      : 'text-inactive hover:text-contrast hover:bg-secondary'
                  }`;
                }}
                style={({ isActive }) => (isActive || location.pathname === '/') ? {background: 'linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)'} : {}}
              >
                <Calendar size={16} />
                <span>Schedule</span>
              </NavLink>
              <NavLink
                to="/history"
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-inactive hover:text-contrast hover:bg-secondary'
                  }`
                }
                style={({ isActive }) => isActive ? {background: 'linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)'} : {}}
              >
                <BarChart3 size={16} />
                <span>History</span>
              </NavLink>
              <NavLink
                to="/clubs"
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-inactive hover:text-contrast hover:bg-secondary'
                  }`
                }
                style={({ isActive }) => isActive ? {background: 'linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)'} : {}}
              >
                <Users size={16} />
                <span>Clubs</span>
              </NavLink>
              
              
              <NavLink
                to="/faq"
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-inactive hover:text-contrast hover:bg-secondary'
                  }`
                }
                style={({ isActive }) => isActive ? {background: 'linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)'} : {}}
              >
                <HelpCircle size={16} />
                <span>FAQ</span>
              </NavLink>
            </nav>

            {/* User section */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary hover:bg-secondary-hover transition-colors border border-secondary-hover"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <Sun size={16} className="text-warning-500" />
                ) : (
                  <Moon size={16} className="text-brand-violet" />
                )}
              </button>

              {isAuthenticated && user ? (
                <>
                  <div className="hidden sm:flex items-center space-x-3">
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                      <User size={16} className="text-inactive" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-contrast">
                        {user.student_info?.name || user.name || 'User'}
                      </div>
                      <div className="text-inactive text-xs">
                        {user.student_info?.email || user.email || 'user@example.com'}
                      </div>
                      {/* User statuses badges */}
                      <div className="flex items-center space-x-1 mt-1">
                        {user.user_statuses?.map((status) => (
                          <span 
                            key={status}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              status === 'superuser' 
                                ? 'bg-red-500/20 text-red-500' 
                                : status === 'staff'
                                ? 'bg-orange-500/20 text-orange-500'
                                : status === 'trainer' 
                                ? 'bg-blue-500/20 text-blue-500'
                                : 'bg-brand-violet/20 text-brand-violet'
                            }`}
                          >
                            {status}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-2 text-inactive hover:text-contrast transition-colors px-3 py-2 rounded-lg hover:bg-secondary"
                  >
                    <LogOut size={16} />
                    <span className="hidden sm:inline text-sm">Logout</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-2 text-inactive">
                  <User size={16} />
                  <span className="text-sm">Guest</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-floating border-t border-secondary z-50 safe-area-inset-bottom mobile-navbar">
        <div className={`grid gap-1 px-2 py-2 ${isStudent && isAdmin ? 'grid-cols-6' : isStudent || isAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <NavLink
            to="/schedule"
            end
            className={({ isActive }) => {
              const active = isActive || location.pathname === '/';
              return `flex flex-col items-center space-y-1 py-3 px-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                active
                  ? 'text-white scale-105'
                  : 'text-inactive hover:text-contrast hover:bg-secondary hover:scale-105'
              }`;
            }}
            style={({ isActive }) => (isActive || location.pathname === '/') ? {background: 'linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)'} : {}}
          >
            <Calendar size={16} />
            <span>Schedule</span>
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex flex-col items-center space-y-1 py-3 px-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'text-white scale-105'
                  : 'text-inactive hover:text-contrast hover:bg-secondary hover:scale-105'
              }`
            }
            style={({ isActive }) => isActive ? {background: 'linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)'} : {}}
          >
            <BarChart3 size={16} />
            <span>History</span>
          </NavLink>
          <NavLink
            to="/clubs"
            className={({ isActive }) =>
              `flex flex-col items-center space-y-1 py-3 px-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'text-white scale-105'
                  : 'text-inactive hover:text-contrast hover:bg-secondary hover:scale-105'
              }`
            }
            style={({ isActive }) => isActive ? {background: 'linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)'} : {}}
          >
            <Users size={16} />
            <span>Clubs</span>
          </NavLink>
          
          
          <NavLink
            to="/faq"
            className={({ isActive }) =>
              `flex flex-col items-center space-y-1 py-3 px-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'text-white scale-105'
                  : 'text-inactive hover:text-contrast hover:bg-secondary hover:scale-105'
              }`
            }
            style={({ isActive }) => isActive ? {background: 'linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)'} : {}}
          >
            <HelpCircle size={16} />
            <span>FAQ</span>
          </NavLink>
        </div>
      </nav>
    </>
  );
};

export default TopBar;