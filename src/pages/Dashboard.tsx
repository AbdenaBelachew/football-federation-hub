import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import {
  Users,
  Building2,
  ClipboardList,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Trophy,
} from "lucide-react";
import { Link } from "react-router";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Dashboard() {
  const playerStats = useQuery(api.players.stats);
  const clubStats = useQuery(api.clubs.stats);
  const regStats = useQuery(api.registrations.stats);

  const stats = [
    {
      label: "Total Players",
      value: playerStats?.totalPlayers ?? "—",
      sub: `${playerStats?.activePlayers ?? 0} active`,
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Clubs",
      value: clubStats?.totalClubs ?? "—",
      sub: `${clubStats?.activeClubs ?? 0} active`,
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
    },
    {
      label: "Registrations",
      value: regStats?.total ?? "—",
      sub: `${regStats?.active ?? 0} active`,
      icon: ClipboardList,
      color: "text-violet-600",
      bg: "bg-violet-500/10",
    },
    {
      label: "Pending Approvals",
      value: regStats?.pending ?? "—",
      sub: "Awaiting review",
      icon: AlertCircle,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item}>
          <h1 className="text-2xl font-bold tracking-tight">Federation Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your football federation management system
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={item}>
              <Card className="ff-shadow-card border-border/60 hover:ff-shadow-elevated transition-shadow duration-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.sub}</p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions + Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pending Registrations */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="ff-shadow-card border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Pending Registrations</CardTitle>
                  <Badge variant="secondary" className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 border-amber-500/20">
                    {regStats?.pending ?? 0} pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <PendingRegistrationsList />
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={item}>
            <Card className="ff-shadow-card border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Register Player", href: "/dashboard/registrations", icon: ClipboardList, color: "text-emerald-600" },
                  { label: "Add Player", href: "/dashboard/players", icon: Users, color: "text-blue-600" },
                  { label: "Add Club", href: "/dashboard/clubs", icon: Building2, color: "text-violet-600" },
                  { label: "View Competitions", href: "/dashboard/competitions", icon: Trophy, color: "text-amber-600" },
                ].map((action) => (
                  <Link
                    key={action.href}
                    to={action.href}
                    className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                  >
                    <action.icon className={`h-4 w-4 ${action.color}`} />
                    {action.label}
                  </Link>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Status Overview */}
        <motion.div variants={item}>
          <Card className="ff-shadow-card border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Active Players", value: playerStats?.activePlayers ?? 0, icon: CheckCircle2, color: "text-emerald-600" },
                  { label: "Active Registrations", value: regStats?.active ?? 0, icon: TrendingUp, color: "text-blue-600" },
                  { label: "Expired", value: regStats?.expired ?? 0, icon: Clock, color: "text-amber-600" },
                  { label: "Rejected", value: regStats?.rejected ?? 0, icon: AlertCircle, color: "text-red-600" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border/40 p-4 text-center">
                    <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}

function PendingRegistrationsList() {
  const regs = useQuery(api.registrations.list, { status: "pending", limit: 5 });

  if (!regs) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (regs.items.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500/50 mb-2" />
        <p className="text-sm text-muted-foreground">No pending registrations</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {regs.items.map((reg) => (
        <Link
          key={reg._id}
          to={`/dashboard/registrations`}
          className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-3 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {reg.player?.firstName} {reg.player?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">
                {reg.club?.name} · {reg.season?.name}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
            Pending
          </Badge>
        </Link>
      ))}
    </div>
  );
}
