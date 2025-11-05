import { useAuth } from "@/hooks/useAuth";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Sidebar } from "./Sidebar";

export function Topbar() {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <div className="flex items-center">
        <Button onClick={() => setSidebarOpen(!isSidebarOpen)} size="icon" variant="ghost" className="md:hidden mr-2">
          <Menu className="h-6 w-6" />
        </Button>
        <Link to="/" className="text-xl font-bold">BIBLIO V4</Link>
      </div>
      <div className="flex items-center space-x-4">
        <span className="hidden sm:inline">{user?.username}</span>
        <LanguageSwitcher />
        <ThemeToggle />
        <Button onClick={logout} variant="destructive">Logout</Button>
      </div>
      
      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 z-50 md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative bg-gray-800 w-64 h-full p-4">
          <Sidebar />
        </div>
      </div>
    </header>
  );
}
