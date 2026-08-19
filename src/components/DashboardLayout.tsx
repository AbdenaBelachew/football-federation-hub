import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  Trophy,
  ClipboardList,
  ShieldCheck,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  ArrowRightLeft,
  Swords,
  ShieldAlert,
  Layers,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Players", href: "/dashboard/players", icon: Users },
  { label: "Clubs", href: "/dashboard/clubs", icon: Building2 },
  { label: "Seasons", href: "/dashboard/seasons", icon: Calendar },
  { label: "Divisions", href: "/dashboard/divisions", icon: Layers },
  { label: "Competitions", href: "/dashboard/competitions", icon: Trophy },
  { label: "Registrations", href: "/dashboard/registrations", icon: ClipboardList },
  { label: "Transfers", href: "/dashboard/transfers", icon: ArrowRightLeft },
  { label: "Documents", href: "/dashboard/documents", icon: FileText },
  { label: "Matches", href: "/dashboard/matches", icon: Swords },
  { label: "Standings", href: "/dashboard/standings", icon: BarChart3 },
  { label: "Disciplinary", href: "/dashboard/disciplinary", icon: ShieldAlert },
  { label: "Audit Log", href: "/dashboard/audit", icon: ShieldCheck },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div className="flex h-full flex-col ff-gradient-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
          <Trophy className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white tracking-tight">FFMS</span>
          <span className="text-[10px] text-emerald-400/60 font-medium uppercase tracking-widest">
            Federation
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? location.pathname === "/dashboard"
              : location.pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary/15 text-emerald-400"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-emerald-400")} />
              {item.label}
              {isActive && (
                <ChevronRight className="ml-auto h-3.5 w-3.5 text-emerald-400/50" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-white/[0.06] px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-emerald-400 text-xs font-semibold">
              {user?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name ?? "User"}</p>
            <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "U";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[240px] shrink-0 border-r border-border/60">
        <SidebarContent />
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-sm px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] p-0 bg-transparent border-0">
                <div className="relative h-full">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 z-10 text-white hover:text-white"
                    onClick={() => setOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <SidebarContent onNavigate={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              Federation Admin
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium">{user?.name ?? "User"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
