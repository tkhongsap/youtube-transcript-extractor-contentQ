import { useLocation } from "wouter";
import { type User } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
}

const MobileMenu = ({ isOpen, onClose, user }: MobileMenuProps) => {
  const [location] = useLocation();

  // Navigation items - same as in Sidebar
  const navItems = [
    { icon: "dashboard", label: "Dashboard", path: "/" },
    { icon: "video_library", label: "My Videos", path: "/videos" },
    { icon: "description", label: "My Reports", path: "/reports" },
    { icon: "style", label: "My Flashcards", path: "/flashcards" },
    { icon: "lightbulb", label: "Ideas", path: "/ideas" },
  ];

  if (!isOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50 bg-gray-900 bg-opacity-50">
      <div className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-lg">
        <div className="p-4 border-b border-gray-200 flex justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 focus:outline-none"
            aria-label="Close menu"
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                location === item.path
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              onClick={onClose}
            >
              <span className={`material-icons mr-3 ${
                location === item.path ? "text-primary-500" : "text-gray-400"
              }`}>
                {item.icon}
              </span>
              {item.label}
            </a>
          ))}
        </nav>
        {user && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.profileImageUrl || ""} alt={user.firstName || "User"} />
                <AvatarFallback>{(user.firstName?.[0] || "U") + (user.lastName?.[0] || "")}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {user.firstName ? `${user.firstName} ${user.lastName || ""}` : user.email || "User"}
                </p>
                <a
                  href="/api/logout"
                  className="text-xs text-gray-500 hover:text-primary-500"
                >
                  Sign out
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileMenu;
