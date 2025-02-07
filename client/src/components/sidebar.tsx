import { FC, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Home,
  Search,
  History as HistoryIcon,
  BookmarkMinus,
  FileText,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: any;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Search, label: "Search", href: "/search" },
  { icon: FileText, label: "Your Extractions", href: "/extractions" },
  { icon: HistoryIcon, label: "History", href: "/history" },
  { icon: BookmarkMinus, label: "Saved Content", href: "/saved-content" }
];

const Sidebar: FC = () => {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={cn(
      "min-h-screen bg-muted/50 border-r transition-all duration-300",
      isCollapsed ? "w-[60px]" : "w-[240px]"
    )}>
      <div className="flex items-center justify-between p-4">
        {!isCollapsed && <h1 className="text-lg font-semibold">Content IQ</h1>}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>
      
      <nav className="space-y-2 p-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a className={cn(
              "flex items-center space-x-2 px-3 py-2 rounded-md transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              location === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
              isCollapsed && "justify-center"
            )}>
              <item.icon size={20} />
              {!isCollapsed && <span>{item.label}</span>}
            </a>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
