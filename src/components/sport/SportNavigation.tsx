import { Link, useLocation } from "@tanstack/react-router";

export function SportNavigation() {
  const location = useLocation();

  const navItems = [
    { to: "/sport/schedule", label: "Schedule", icon: "📅" },
    { to: "/sport/clubs", label: "Clubs", icon: "🏃" },
    { to: "/sport/history", label: "History", icon: "📊" },
    { to: "/sport/fitness-test", label: "Fitness Test", icon: "💪" },
    { to: "/sport/faq", label: "FAQ", icon: "❓" },
  ];

  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {navItems.map((item) => {
        const isActive = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
              isActive
                ? "bg-primary text-contrast"
                : "bg-secondary text-contrast/70 hover:bg-primary hover:text-contrast"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
