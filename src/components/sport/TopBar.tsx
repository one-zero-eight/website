import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  User,
  LogOut,
  Calendar,
  HelpCircle,
  Users,
  BarChart3,
  Sun,
  Moon,
} from "lucide-react";
import { useAppStore } from "./store/useAppStore";
import { useTheme } from "./hooks/useTheme";
import { studentService } from "./services/studentService";

const TopBar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAppStore();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  // Check user permissions
  const isAdmin = user
    ? studentService.isSuperuser(user) || studentService.isStaff(user)
    : false;
  const isStudent = user ? studentService.isStudent(user) : false;

  return (
    <>
      {/* Top Bar for Desktop */}
      <header className="sticky top-0 z-50 border-b border-secondary bg-floating">
        <div className="mx-auto max-w-7xl">
          <div className="flex h-16 items-center justify-between px-4 sm:px-0">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{
                    background:
                      "linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)",
                  }}
                >
                  <span className="text-sm font-bold text-white">IH</span>
                </div>
                <div className="text-lg font-semibold text-contrast">
                  InNoHassle <span className="selected">Sport</span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden items-center space-x-1 md:flex">
              <Link
                to="/sport/schedule"
                className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === "/sport/schedule" ||
                  location.pathname === "/sport"
                    ? "text-white"
                    : "text-inactive hover:bg-secondary hover:text-contrast"
                }`}
                style={
                  location.pathname === "/sport/schedule" ||
                  location.pathname === "/sport"
                    ? {
                        background:
                          "linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)",
                      }
                    : {}
                }
              >
                <Calendar size={16} />
                <span>Schedule</span>
              </Link>
              <Link
                to="/sport/history"
                className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === "/sport/history"
                    ? "text-white"
                    : "text-inactive hover:bg-secondary hover:text-contrast"
                }`}
                style={
                  location.pathname === "/sport/history"
                    ? {
                        background:
                          "linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)",
                      }
                    : {}
                }
              >
                <BarChart3 size={16} />
                <span>History</span>
              </Link>
              <Link
                to="/sport/clubs"
                className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === "/sport/clubs"
                    ? "text-white"
                    : "text-inactive hover:bg-secondary hover:text-contrast"
                }`}
                style={
                  location.pathname === "/sport/clubs"
                    ? {
                        background:
                          "linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)",
                      }
                    : {}
                }
              >
                <Users size={16} />
                <span>Clubs</span>
              </Link>

              <Link
                to="/sport/faq"
                className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === "/sport/faq"
                    ? "text-white"
                    : "text-inactive hover:bg-secondary hover:text-contrast"
                }`}
                style={
                  location.pathname === "/sport/faq"
                    ? {
                        background:
                          "linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)",
                      }
                    : {}
                }
              >
                <HelpCircle size={16} />
                <span>FAQ</span>
              </Link>
            </nav>

            {/* User section */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary-hover bg-secondary transition-colors hover:bg-secondary-hover"
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? (
                  <Sun size={16} className="text-warning-500" />
                ) : (
                  <Moon size={16} className="text-brand-violet" />
                )}
              </button>

              {isAuthenticated && user ? (
                <>
                  <div className="hidden items-center space-x-3 sm:flex">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                      <User size={16} className="text-inactive" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-contrast">
                        {user.student_info?.name || user.name || "User"}
                      </div>
                      <div className="text-xs text-inactive">
                        {user.student_info?.email ||
                          user.email ||
                          "user@example.com"}
                      </div>
                      {/* User statuses badges */}
                      <div className="mt-1 flex items-center space-x-1">
                        {user.user_statuses?.map((status) => (
                          <span
                            key={status}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              status === "superuser"
                                ? "bg-red-500/20 text-red-500"
                                : status === "staff"
                                  ? "bg-orange-500/20 text-orange-500"
                                  : status === "trainer"
                                    ? "bg-blue-500/20 text-blue-500"
                                    : "bg-brand-violet/20 text-brand-violet"
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
                    className="flex items-center space-x-2 rounded-lg px-3 py-2 text-inactive transition-colors hover:bg-secondary hover:text-contrast"
                  >
                    <LogOut size={16} />
                    <span className="hidden text-sm sm:inline">Logout</span>
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
      <nav className="safe-area-inset-bottom mobile-navbar fixed bottom-0 left-0 right-0 z-50 border-t border-secondary bg-floating md:hidden">
        <div
          className={`grid gap-1 px-2 py-2 ${isStudent && isAdmin ? "grid-cols-6" : isStudent || isAdmin ? "grid-cols-5" : "grid-cols-4"}`}
        >
          <Link
            to="/sport/schedule"
            className={`flex flex-col items-center space-y-1 rounded-lg px-1 py-3 text-xs font-medium transition-all duration-200 ${
              location.pathname === "/sport/schedule" ||
              location.pathname === "/sport"
                ? "scale-105 text-white"
                : "text-inactive hover:scale-105 hover:bg-secondary hover:text-contrast"
            }`}
            style={
              location.pathname === "/sport/schedule" ||
              location.pathname === "/sport"
                ? {
                    background:
                      "linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)",
                  }
                : {}
            }
          >
            <Calendar size={16} />
            <span>Schedule</span>
          </Link>
          <Link
            to="/sport/history"
            className={`flex flex-col items-center space-y-1 rounded-lg px-1 py-3 text-xs font-medium transition-all duration-200 ${
              location.pathname === "/sport/history"
                ? "scale-105 text-white"
                : "text-inactive hover:scale-105 hover:bg-secondary hover:text-contrast"
            }`}
            style={
              location.pathname === "/sport/history"
                ? {
                    background:
                      "linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)",
                  }
                : {}
            }
          >
            <BarChart3 size={16} />
            <span>History</span>
          </Link>
          <Link
            to="/sport/clubs"
            className={`flex flex-col items-center space-y-1 rounded-lg px-1 py-3 text-xs font-medium transition-all duration-200 ${
              location.pathname === "/sport/clubs"
                ? "scale-105 text-white"
                : "text-inactive hover:scale-105 hover:bg-secondary hover:text-contrast"
            }`}
            style={
              location.pathname === "/sport/clubs"
                ? {
                    background:
                      "linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)",
                  }
                : {}
            }
          >
            <Users size={16} />
            <span>Clubs</span>
          </Link>

          <Link
            to="/sport/faq"
            className={`flex flex-col items-center space-y-1 rounded-lg px-1 py-3 text-xs font-medium transition-all duration-200 ${
              location.pathname === "/sport/faq"
                ? "scale-105 text-white"
                : "text-inactive hover:scale-105 hover:bg-secondary hover:text-contrast"
            }`}
            style={
              location.pathname === "/sport/faq"
                ? {
                    background:
                      "linear-gradient(90deg, #9A2EFF 0%, #9747FF 100%)",
                  }
                : {}
            }
          >
            <HelpCircle size={16} />
            <span>FAQ</span>
          </Link>
        </div>
      </nav>
    </>
  );
};

export default TopBar;
