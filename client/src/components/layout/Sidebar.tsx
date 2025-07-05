import { useLocation } from "wouter";
import { type User } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarProps {
  user?: User;
}

const Sidebar = ({ user }: SidebarProps) => {
  const [location] = useLocation();

  // Navigation items
  const navItems = [
    { icon: "dashboard", label: "Dashboard", path: "/" },
    { icon: "video_library", label: "My Videos", path: "/videos" },
    { icon: "description", label: "My Reports", path: "/reports" },
    { icon: "style", label: "My Flashcards", path: "/flashcards" },
    { icon: "lightbulb", label: "Ideas", path: "/ideas" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary text-white mr-3">
            <span className="material-icons text-lg">auto_awesome</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Content Spark AI</h1>
        </div>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              location.startsWith(item.path)
                ? "bg-primary-50 text-primary-700"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span className={`material-icons mr-3 ${
              location.startsWith(item.path) ? "text-primary-500" : "text-gray-400"
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
    </aside>
  );
};

export default Sidebar;
