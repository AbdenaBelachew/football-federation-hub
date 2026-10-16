import { useState, useEffect } from "react";
import { Link } from "react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { DashboardStats, Match } from "@/lib/types";
import { motion } from "framer-motion";
import {
  Users,
  Building2,
  ClipboardList,
  Trophy,
  Swords,
  ArrowRightLeft,
  ShieldAlert,
  Flame,
  ArrowRight,
  Plus,
  RefreshCw,
  Clock,
  Calendar,
  Star,
  Newspaper,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function Dashboard() {
  const { user } = useAuth();
  const userRole = user?.role || "super_admin";
  const isClubAdmin = userRole === "club_admin";
  const userClubId =
    user?.clubId ||
    (user as any)?.club_id ||
    (user?.email === "club@saintgeorge.org" ? "club-1" : undefined);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, matchesRes, clubsRes] = await Promise.all([
        api.dashboard.getStats().catch(() => null),
        api.matches.list().catch(() => ({ matches: [] })),
        api.clubs.list().catch(() => ({ clubs: [] })),
      ]);

      if (statsRes) setStats(statsRes);
      if (matchesRes?.matches) setRecentMatches(matchesRes.matches.slice(0, 6));
      if (clubsRes?.clubs) setClubs(clubsRes.clubs);
    } catch (err: any) {
      console.error("Dashboard load failed", err);
      toast.error("Could not fetch dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const kpis = stats?.kpis;
  const userClub = clubs.find((c) => c.id === userClubId);

  // Club matches (home or away)
  const clubMatches = isClubAdmin && userClubId
    ? recentMatches.filter((m) => m.homeClubId === userClubId || m.awayClubId === userClubId)
    : recentMatches;

  // ── Club Admin KPI cards ──────────────────────────────────────────
  const clubAdminKpis = [
    {
      label: "My Squad",
      value: kpis?.activePlayers ?? "—",
      sub: "Licensed & registered players",
      icon: Users,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      href: "/dashboard/players",
    },
    {
      label: "League Standing",
      value: "View Table",
      sub: "Current league position & points",
      icon: BarChart3,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
      href: "/dashboard/standings",
    },
    {
      label: "Active Registrations",
      value: kpis?.pendingRegistrations ?? "—",
      sub: "Awaiting officer approval",
      icon: ClipboardList,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      href: "/dashboard/registrations",
      alert: (kpis?.pendingRegistrations ?? 0) > 0,
    },
    {
      label: "Open Transfers",
      value: kpis?.pendingTransfers ?? "—",
      sub: "Transfer window active",
      icon: ArrowRightLeft,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
      href: "/dashboard/transfers",
    },
  ];

  // ── Federation Admin KPI cards ────────────────────────────────────
  const allKpiCards = [
    {
      label: "Registered Players",
      value: kpis?.totalPlayers ?? 8,
      sub: `${kpis?.activePlayers ?? 8} active & licensed`,
      icon: Users,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      href: "/dashboard/players",
      roles: ["super_admin", "federation_admin", "registration_officer", "transfer_officer"],
    },
    {
      label: "Affiliated Clubs",
      value: kpis?.totalClubs ?? 4,
      sub: `${kpis?.activeClubs ?? 4} licensed clubs`,
      icon: Building2,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
      href: "/dashboard/clubs",
      roles: ["super_admin", "federation_admin", "competition_admin", "registration_officer"],
    },
    {
      label: "Pending Approvals",
      value: kpis?.pendingRegistrations ?? 2,
      sub: "Requires officer review",
      icon: ClipboardList,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      href: "/dashboard/registrations",
      alert: (kpis?.pendingRegistrations ?? 0) > 0,
      roles: ["super_admin", "federation_admin", "registration_officer"],
    },
    {
      label: "Active Transfers",
      value: kpis?.pendingTransfers ?? 1,
      sub: "Transfer window open",
      icon: ArrowRightLeft,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
      href: "/dashboard/transfers",
      roles: ["super_admin", "federation_admin", "transfer_officer"],
    },
    {
      label: "Competitions",
      value: kpis?.activeCompetitions ?? 2,
      sub: `${kpis?.totalMatches ?? 4} scheduled matches`,
      icon: Trophy,
      color: "text-amber-500 dark:text-amber-300",
      bg: "bg-amber-500/10 border-amber-500/20",
      href: "/dashboard/competitions",
      roles: ["super_admin", "federation_admin", "competition_admin", "referee"],
    },
    {
      label: "Disciplinary Cases",
      value: kpis?.openDisciplinaryCases ?? 1,
      sub: "Active cards & sanctions",
      icon: ShieldAlert,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
      href: "/dashboard/disciplinary",
      roles: ["super_admin", "federation_admin", "disciplinary_officer", "referee", "competition_admin"],
    },
  ];

  const kpiCards = isClubAdmin
    ? clubAdminKpis
    : allKpiCards.filter((card) => {
        if (userRole === "super_admin" || userRole === "federation_admin") return true;
        return card.roles.includes(userRole);
      });

  const getPrimaryAction = () => {
    switch (userRole) {
      case "competition_admin":
        return { label: "Schedule Fixture", href: "/dashboard/matches", icon: Plus };
      case "referee":
        return { label: "Live Matches", href: "/dashboard/matches", icon: Swords };
      case "transfer_officer":
        return { label: "Review Transfers", href: "/dashboard/transfers", icon: ArrowRightLeft };
      case "disciplinary_officer":
        return { label: "Disciplinary Hearing", href: "/dashboard/disciplinary", icon: ShieldAlert };
      case "club_admin":
        return { label: "Register Player", href: "/dashboard/registrations", icon: Plus };
      case "registration_officer":
      default:
        return { label: "Register Player", href: "/dashboard/players", icon: Plus };
    }
  };

  const primaryAction = getPrimaryAction();
  const ActionIcon = primaryAction.icon;

  // ── Club Admin Dashboard ─────────────────────────────────────────
  if (isClubAdmin) {
    const nextMatch = clubMatches.find((m) => m.status === "scheduled" || m.status === "upcoming");
    const lastMatch = clubMatches.filter((m) => m.status === "completed").at(-1);

    return (
      <DashboardLayout>
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
          {/* Club Header */}
          <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {userClub?.name ?? "My Club"} — Command Center
                </h1>
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs">
                  Season 2025/2026
                </Badge>
                <Badge variant="outline" className="text-xs gap-1">
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                  Club Portal
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your club's squad, schedule, standings, and federation updates — all in one place.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="text-xs gap-1.5 h-9 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 cursor-pointer">
                <Link to={primaryAction.href}>
                  <ActionIcon className="h-4 w-4" />
                  <span>{primaryAction.label}</span>
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Club KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpiCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div key={stat.label} variants={item}>
                  <Link to={stat.href} className="block group">
                    <Card className="border border-border/70 hover:border-emerald-500/50 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className={`p-2 rounded-lg border ${stat.bg} ${stat.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          {(stat as any).alert && (
                            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                          )}
                        </div>
                        <p className="text-2xl font-extrabold tracking-tight text-foreground group-hover:text-emerald-600 transition-colors">
                          {stat.value}
                        </p>
                        <p className="text-xs font-semibold text-muted-foreground mt-0.5 truncate">{stat.label}</p>
                        <p className="text-[10px] text-muted-foreground/80 mt-1 truncate">{stat.sub}</p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Fixtures + News Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Club Fixtures */}
            <motion.div variants={item} className="lg:col-span-2">
              <Card className="h-full border-border/70">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Swords className="h-4 w-4 text-emerald-600" />
                      <span>Fixtures & Results</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {userClub?.name ?? "Your club"}'s upcoming matches & recent results
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="text-xs gap-1 h-7">
                    <Link to="/dashboard/matches">
                      <span>Full Schedule</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  {loading ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-emerald-600" />
                      Loading fixtures...
                    </div>
                  ) : clubMatches.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      No fixtures scheduled for {userClub?.name ?? "your club"} yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {clubMatches.slice(0, 4).map((m) => {
                        const isHome = m.homeClubId === userClubId;
                        const isCompleted = m.status === "completed";
                        return (
                          <div
                            key={m.id}
                            className={`p-3.5 rounded-xl border bg-card flex flex-col justify-between space-y-2 transition-all ${
                              isCompleted ? "border-border/60" : "border-emerald-500/30 bg-emerald-500/[0.02]"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {m.matchDate}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  className={`text-[9px] uppercase font-mono px-1.5 ${
                                    isHome
                                      ? "bg-blue-500/10 text-blue-700 border-blue-500/20"
                                      : "bg-orange-500/10 text-orange-700 border-orange-500/20"
                                  }`}
                                >
                                  {isHome ? "HOME" : "AWAY"}
                                </Badge>
                                <Badge
                                  variant={isCompleted ? "default" : "outline"}
                                  className={`text-[9px] uppercase font-mono px-1.5 ${
                                    isCompleted
                                      ? "bg-emerald-600 text-white"
                                      : "text-amber-600 border-amber-500/30"
                                  }`}
                                >
                                  {m.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className={`flex-1 text-xs font-semibold truncate ${isHome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                                {m.homeClubName ?? "Home Club"}
                              </div>
                              <div className="px-3 py-1 rounded-md bg-muted font-mono font-bold text-sm">
                                {isCompleted ? `${m.homeScore ?? 0} - ${m.awayScore ?? 0}` : "VS"}
                              </div>
                              <div className={`flex-1 text-xs font-semibold text-right truncate ${!isHome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                                {m.awayClubName ?? "Away Club"}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                              <span>Venue: {m.venue ?? "Addis Ababa Stadium"}</span>
                              <span>GW {m.gameweek ?? 1}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick links + Bulletins */}
            <motion.div variants={item} className="space-y-4">
              {/* Federation Bulletins */}
              <Card className="border-border/70">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Newspaper className="h-4 w-4 text-emerald-600" />
                    Federation Bulletins
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild className="text-xs gap-1 h-7">
                    <Link to="/dashboard/news">
                      <span>All</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {[
                      {
                        type: "Fixtures",
                        title: "GW 12 Fixture List Published",
                        time: "2h ago",
                        color: "bg-blue-500/10 text-blue-700 border-blue-500/20",
                      },
                      {
                        type: "Transfer",
                        title: "January Window Opens Jan 1",
                        time: "1d ago",
                        color: "bg-purple-500/10 text-purple-700 border-purple-500/20",
                      },
                      {
                        type: "Disciplinary",
                        title: "Suspension List Updated",
                        time: "3d ago",
                        color: "bg-rose-500/10 text-rose-700 border-rose-500/20",
                      },
                    ].map((b) => (
                      <div key={b.title} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                        <Badge className={`text-[9px] shrink-0 ${b.color}`}>{b.type}</Badge>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{b.title}</p>
                          <p className="text-[10px] text-muted-foreground">{b.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Links */}
              <Card className="border-border/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    Quick Access
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {[
                    { label: "View League Table", href: "/dashboard/standings", icon: BarChart3, color: "text-blue-600" },
                    { label: "My Club Profile", href: "/dashboard/clubs", icon: Building2, color: "text-emerald-600" },
                    { label: "Players & Squad", href: "/dashboard/players", icon: Users, color: "text-purple-600" },
                    { label: "Transfer Requests", href: "/dashboard/transfers", icon: ArrowRightLeft, color: "text-orange-600" },
                  ].map((link) => {
                    const LinkIcon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        className="flex items-center gap-2.5 p-2 rounded-lg border border-border/50 hover:border-emerald-500/40 hover:bg-muted/40 transition-all text-xs font-medium text-foreground"
                      >
                        <LinkIcon className={`h-4 w-4 ${link.color}`} />
                        {link.label}
                        <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </DashboardLayout>
    );
  }

  // ── Federation / Admin Dashboard ─────────────────────────────────
  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Federation Executive Center
              </h1>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                Season 2025/2026
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Live governance metrics, official player licensing, and match operations.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="text-xs gap-1.5 h-9 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 cursor-pointer"
            >
              <Link to={primaryAction.href}>
                <ActionIcon className="h-4 w-4" />
                <span>{primaryAction.label}</span>
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} variants={item}>
                <Link to={stat.href} className="block group">
                  <Card className="border border-border/70 hover:border-emerald-500/50 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-lg border ${stat.bg} ${stat.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {(stat as any).alert && (
                          <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                        )}
                      </div>
                      <p className="text-2xl font-extrabold tracking-tight text-foreground group-hover:text-emerald-600 transition-colors">
                        {stat.value}
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground mt-0.5 truncate">
                        {stat.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground/80 mt-1 truncate">
                        {stat.sub}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Second Row: Top Scorers + Match Fixtures */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Scorers */}
          <motion.div variants={item} className="lg:col-span-1">
            <Card className="h-full border-border/70">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Flame className="h-4 w-4 text-amber-500" />
                    <span>Top Scorers (Golden Boot)</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Premier League official goal tally
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  2025/26
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {stats?.topScorers && stats.topScorers.length > 0 ? (
                    stats.topScorers.map((scorer, idx) => (
                      <div
                        key={scorer.playerId}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              idx === 0
                                ? "bg-amber-500 text-white"
                                : idx === 1
                                ? "bg-slate-300 text-slate-900"
                                : idx === 2
                                ? "bg-amber-700 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{scorer.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {scorer.clubName || "Premier League Club"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          <span>{scorer.goals}</span>
                          <span className="text-[10px] font-normal text-muted-foreground">goals</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No goal events recorded yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent & Upcoming Matches */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="h-full border-border/70">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Swords className="h-4 w-4 text-emerald-600" />
                    <span>League Matches & Fixtures</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Round fixtures, scores & schedule
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild className="text-xs gap-1 h-7">
                  <Link to="/dashboard/matches">
                    <span>All Matches</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {recentMatches.length > 0 ? (
                    recentMatches.map((m) => (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-xl border border-border/60 bg-card hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {m.matchDate}
                          </span>
                          <Badge
                            variant={m.status === "completed" ? "default" : "outline"}
                            className={`text-[10px] uppercase font-mono ${
                              m.status === "completed"
                                ? "bg-emerald-600 text-white"
                                : "text-amber-600 border-amber-500/30"
                            }`}
                          >
                            {m.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <div className="flex-1 text-xs font-semibold text-foreground truncate">
                            {m.homeClubName || "Saint George SC"}
                          </div>
                          <div className="px-3 py-1 rounded-md bg-muted font-mono font-bold text-sm">
                            {m.status === "completed"
                              ? `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`
                              : "VS"}
                          </div>
                          <div className="flex-1 text-xs font-semibold text-foreground text-right truncate">
                            {m.awayClubName || "Ethiopian Coffee SC"}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                          <span>Venue: {m.venue || "Addis Ababa Stadium"}</span>
                          <span>GW {m.gameweek || 1}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8 text-xs text-muted-foreground">
                      No matches scheduled.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Audit Log */}
        <motion.div variants={item}>
          <Card className="border-border/70">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span>Real-Time Federation Audit Activity</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated chronological trace of regulated system actions
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs gap-1 h-7">
                <Link to="/dashboard/audit">
                  <span>View Full Audit Log</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((log) => (
                    <div
                      key={log.id}
                      className="py-2.5 flex items-center justify-between text-xs gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                          ✓
                        </span>
                        <div className="truncate">
                          <p className="font-semibold text-foreground truncate">
                            {log.action}
                            <span className="ml-2 font-normal text-muted-foreground">
                              on {log.entityType} ({log.entityId || "system"})
                            </span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Initiated by {log.userName || "System"} ({log.role || "Admin"})
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No recent audit events logged
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
