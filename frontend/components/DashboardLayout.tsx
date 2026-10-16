import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
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
  RefreshCw,
  ExternalLink,
  Bell,
  Sparkles,
  ChevronDown,
  Gavel,
  CheckCircle2,
  UserCog,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

export interface NavItem {
  label: string;
  href: string;
  icon: any;
  roles?: string[]; // If undefined, accessible by all; otherwise only if user.role is in this list
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// ─── Role-to-Menu Matrix ────────────────────────────────────────────────────────
//
//  super_admin          → ALL menus
//  federation_admin     → ALL menus
//  competition_admin    → Dashboard · Standings · News · Competitions · Matches ·
//                         Seasons · Divisions · Clubs · Players · Disciplinary · Documents
//  registration_officer → Dashboard · Standings · News · Clubs · Players ·
//                         Registrations · Documents
//  transfer_officer     → Dashboard · Standings · News · Players · Transfers · Documents
//  club_admin           → Dashboard · Standings · News · Matches · My Club ·
//                         Players · Registrations · Transfers
//  referee              → Dashboard · Standings · News · Competitions · Matches · Disciplinary
//  disciplinary_officer → Dashboard · Standings · News · Disciplinary · Documents
// ────────────────────────────────────────────────────────────────────────────────
const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        // ALL roles get the dashboard
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        // All roles can see standings (public league table)
        label: "Standings",
        href: "/dashboard/standings",
        icon: BarChart3,
      },
      {
        // All roles can see official federation bulletins/news
        label: "Bulletins & News",
        href: "/dashboard/news",
        icon: Bell,
      },
    ],
  },
  {
    title: "Competitions & Fixtures",
    items: [
      {
        // competition_admin creates/manages; referee views; super/fed see all
        label: "Competitions",
        href: "/dashboard/competitions",
        icon: Trophy,
        roles: ["super_admin", "federation_admin", "competition_admin", "referee"],
      },
      {
        // club_admin: view-only (no score entry); competition_admin/referee: full
        label: "Matches & Schedule",
        href: "/dashboard/matches",
        icon: Swords,
        roles: ["super_admin", "federation_admin", "competition_admin", "referee", "club_admin"],
      },
      {
        // Only admins who create season frameworks
        label: "Seasons",
        href: "/dashboard/seasons",
        icon: Calendar,
        roles: ["super_admin", "federation_admin", "competition_admin"],
      },
      {
        // Only admins who structure divisions
        label: "Divisions",
        href: "/dashboard/divisions",
        icon: Layers,
        roles: ["super_admin", "federation_admin", "competition_admin"],
      },
    ],
  },
  {
    title: "Clubs & Squads",
    items: [
      {
        // club_admin: own club view/edit only (create/delete blocked in page)
        label: "My Club",
        href: "/dashboard/clubs",
        icon: Building2,
        roles: ["club_admin"],
      },
      {
        // Federation staff: full clubs directory
        label: "Clubs",
        href: "/dashboard/clubs",
        icon: Building2,
        roles: ["super_admin", "federation_admin", "competition_admin", "registration_officer"],
      },
      {
        // club_admin: own squad; officers: all players
        label: "Players",
        href: "/dashboard/players",
        icon: Users,
        roles: ["super_admin", "federation_admin", "registration_officer", "transfer_officer", "club_admin"],
      },
    ],
  },
  {
    title: "Registrations & Transfers",
    items: [
      {
        // club_admin: submit & view own registrations; officer: approve/reject all
        label: "Registrations",
        href: "/dashboard/registrations",
        icon: ClipboardList,
        roles: ["super_admin", "federation_admin", "registration_officer", "club_admin"],
      },
      {
        // club_admin: initiate involving own club; transfer_officer: approve all
        label: "Transfers",
        href: "/dashboard/transfers",
        icon: ArrowRightLeft,
        roles: ["super_admin", "federation_admin", "transfer_officer", "club_admin"],
      },
    ],
  },
  {
    title: "Governance & Compliance",
    items: [
      {
        // referee logs incidents; disciplinary_officer reviews; competition_admin oversees
        label: "Disciplinary",
        href: "/dashboard/disciplinary",
        icon: ShieldAlert,
        roles: ["super_admin", "federation_admin", "disciplinary_officer", "referee", "competition_admin"],
      },
      {
        // Document management for officers (contracts, ITC, etc.)
        label: "Documents",
        href: "/dashboard/documents",
        icon: FileText,
        roles: ["super_admin", "federation_admin", "registration_officer", "transfer_officer", "disciplinary_officer"],
      },
      {
        // Admin-only: manage system users and club assignments
        label: "Users & Roles",
        href: "/dashboard/users",
        icon: UserCog,
        roles: ["super_admin", "federation_admin"],
      },
      {
        // Admin-only: full system audit trail
        label: "Audit Trail",
        href: "/dashboard/audit",
        icon: ShieldCheck,
        roles: ["super_admin", "federation_admin"],
      },
    ],
  },
];

// All 8 Demo Accounts for instantaneous role switching and testing
const DEMO_SWITCH_USERS = [
  { email: "admin@federation.org", label: "Super Admin", name: "Solomon Tadesse", role: "super_admin" },
  { email: "fed@federation.org", label: "Federation Admin", name: "Helen Berhanu", role: "federation_admin" },
  { email: "competition@federation.org", label: "Competition Admin", name: "Dawit Kebede", role: "competition_admin" },
  { email: "registration@federation.org", label: "Registration Officer", name: "Almaz Girma", role: "registration_officer" },
  { email: "transfer@federation.org", label: "Transfer Officer", name: "Yared Wolde", role: "transfer_officer" },
  { email: "club@saintgeorge.org", label: "Club Admin", name: "Abebe Bikila", role: "club_admin" },
  { email: "referee@federation.org", label: "Referee", name: "Bamlak Tessema", role: "referee" },
  { email: "disciplinary@federation.org", label: "Disciplinary Officer", name: "Mulugeta Assefa", role: "disciplinary_officer" },
];

function getRoleBadgeStyle(role?: string) {
  switch (role) {
    case "super_admin":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "federation_admin":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    case "competition_admin":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "registration_officer":
      return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
    case "transfer_officer":
      return "bg-purple-500/15 text-purple-300 border-purple-500/30";
    case "club_admin":
      return "bg-orange-500/15 text-orange-300 border-orange-500/30";
    case "referee":
      return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
    case "disciplinary_officer":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { user } = useAuth();
  const userRole = user?.role || "super_admin";
  const isClubAdmin = userRole === "club_admin";
  const userClubId = user?.clubId || (user as any)?.club_id ||
    (user?.email === "club@saintgeorge.org" ? "club-1" : undefined);

  // Filter nav sections and items by current role.
  // Deduplicate items with the same href so "My Club" and "Clubs" don't both
  // appear for super_admin (only "Clubs" does since club_admin-only items are excluded).
  const visibleSections = NAV_SECTIONS.map((section) => {
    const seenHrefs = new Set<string>();
    const visibleItems = section.items.filter((item) => {
      const isSuperOrFed = userRole === "super_admin" || userRole === "federation_admin";

      // Skip club_admin-exclusive items for non-club_admin users
      const isClubAdminExclusive =
        item.roles?.length === 1 && item.roles[0] === "club_admin";
      if (isClubAdminExclusive && !isClubAdmin) return false;

      // Skip non-exclusive duplicate hrefs for superadmin/fed (they already have the
      // broader "Clubs" entry without the "My Club" label restriction)
      if (seenHrefs.has(item.href)) return false;

      const allowed = isSuperOrFed ||
        !item.roles ||
        item.roles.includes(userRole);

      if (allowed) seenHrefs.add(item.href);
      return allowed;
    });

    return { ...section, items: visibleItems };
  }).filter((section) => section.items.length > 0);

  const totalVisibleItems = visibleSections.reduce((acc, sec) => acc + sec.items.length, 0);

  // Role-specific descriptions shown in sidebar
  const roleDescriptions: Record<string, string> = {
    super_admin: "Full system access",
    federation_admin: "Full federation management",
    competition_admin: "Competitions & fixtures",
    registration_officer: "Player licensing & registration",
    transfer_officer: "Transfer window management",
    club_admin: "Club portal access",
    referee: "Match officiating",
    disciplinary_officer: "Disciplinary management",
  };

  return (
    <div className="flex h-full flex-col ff-gradient-sidebar text-slate-100 select-none">
      {/* Logo & Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
        <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white">Oromia</span>
            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest">
              Football Federation
            </span>
          </div>
        </Link>
      </div>

      {/* Role Identity Banner */}
      <div className="px-4 py-2.5 bg-black/20 border-b border-white/[0.05] space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">Role:</span>
            <Badge
              variant="outline"
              className={cn("text-[10px] font-semibold uppercase tracking-wider py-0 px-2", getRoleBadgeStyle(userRole))}
            >
              {userRole.replace(/_/g, " ")}
            </Badge>
          </div>
          <span className="text-[10px] text-slate-500 font-mono" title="Accessible modules">
            {totalVisibleItems} modules
          </span>
        </div>

        {/* Role description */}
        <p className="text-[10px] text-slate-400 leading-tight">
          {roleDescriptions[userRole] ?? "System access"}
        </p>

        {/* Club badge for club_admin */}
        {isClubAdmin && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {user?.name
                ? `${user.name}'s Club`
                : "Your Club (Auto-Linked)"}
            </span>
          </div>
        )}
      </div>

      {/* Segregated Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto">
        {visibleSections.map((section) => (
          <div key={section.title} className="space-y-0.5">
            {/* Section heading */}
            <div className="px-2 pb-1.5 pt-0.5 text-[9px] font-bold tracking-widest uppercase text-slate-500 flex items-center justify-between">
              <span>{section.title}</span>
              <span className="text-[8px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">
                {section.items.length}
              </span>
            </div>

            {section.items.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? location.pathname === "/dashboard"
                  : location.pathname.startsWith(item.href);

              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 group",
                    isActive
                      ? "bg-emerald-500/15 text-emerald-300 font-semibold border-l-2 border-emerald-400"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                      isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-300"
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <Badge className="text-[9px] h-4 px-1 bg-amber-500 text-white">
                      {item.badge}
                    </Badge>
                  )}
                  {isActive && <ChevronRight className="ml-auto h-3 w-3 text-emerald-400/70" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer: status + user card */}
      <div className="px-3 py-2 border-t border-white/[0.08] space-y-2">
        <div className="flex items-center justify-between text-[11px] px-2 text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            REST API Online
          </span>
          <span className="font-mono text-[10px] text-emerald-400/90">:5001</span>
        </div>
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <Avatar className="h-7 w-7 border border-emerald-500/30">
            <AvatarFallback className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
              {user?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "SA"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name || "User"}</p>
            <p className="text-[10px] text-emerald-400/80 truncate font-mono capitalize">
              {userRole.replace(/_/g, " ")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSignOut = () => {
    signOut();
    navigate("/auth");
  };

  const handleResetSeed = async () => {
    try {
      setResetting(true);
      await api.system.resetSeed();
      toast.success("Database restored to initial seed state!");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset seed");
    } finally {
      setResetting(false);
    }
  };

  const handleSwitchRole = async (email: string) => {
    toast.loading("Switching role...");
    await loginAsDemo(email);
    toast.dismiss();
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "SA";

  const userRole = user?.role || "super_admin";

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[250px] shrink-0 border-r border-border/60">
        <SidebarContent />
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-border/60 bg-background/90 backdrop-blur-md px-4 lg:px-6 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[250px] p-0 bg-transparent border-0">
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

            {/* Role indicator & quick switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 gap-1.5 text-xs font-semibold cursor-pointer border transition-colors",
                    getRoleBadgeStyle(userRole)
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  <span className="capitalize">{userRole.replace("_", " ")}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuLabel className="text-xs font-semibold flex items-center justify-between">
                  <span>Switch Role (Instant Preview)</span>
                  <Badge variant="outline" className="text-[10px]">
                    8 Roles
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {DEMO_SWITCH_USERS.map((item) => {
                  const isCurrent = (user?.email || "").toLowerCase() === item.email.toLowerCase();
                  return (
                    <DropdownMenuItem
                      key={item.email}
                      onClick={() => handleSwitchRole(item.email)}
                      className={cn(
                        "text-xs cursor-pointer flex items-center justify-between py-2 px-2.5",
                        isCurrent && "bg-accent/70 font-semibold"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          {item.label}
                          {isCurrent && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground/70 font-mono">{item.email}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("text-[9px] uppercase px-1.5 py-0 shrink-0", getRoleBadgeStyle(item.role))}
                      >
                        {item.role.replace("_", " ")}
                      </Badge>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              to="/"
              className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Public Portal</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetSeed}
              disabled={resetting}
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Reset backend DB to seed data"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", resetting && "animate-spin")} />
              <span className="hidden sm:inline">Reset Seed</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2 h-8">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-xs font-semibold truncate max-w-[120px]">
                    {user?.name?.split(" ")[0] || "User"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs">
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-[10px] text-muted-foreground font-normal truncate">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer text-xs">
                  <User className="mr-2 h-3.5 w-3.5" />
                  Dashboard Home
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-xs text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-background/50">{children}</main>
      </div>
    </div>
  );
}
