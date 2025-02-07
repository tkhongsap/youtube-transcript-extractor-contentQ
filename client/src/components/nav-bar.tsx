import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Search, Clock } from "lucide-react";

export default function NavBar() {
  const [location] = useLocation();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="font-semibold text-lg">
            Content IQ
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant={location === "/" ? "default" : "ghost"} size="sm">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
            <Link href="/search">
              <Button variant={location === "/search" ? "default" : "ghost"} size="sm">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
