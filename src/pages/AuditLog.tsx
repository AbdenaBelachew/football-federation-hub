import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const actionColor = (action: string) => {
  if (action.includes("create")) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (action.includes("update") || action.includes("approve")) return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  if (action.includes("reject")) return "bg-red-500/10 text-red-600 border-red-500/20";
  if (action.includes("toggle")) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  return "bg-gray-500/10 text-gray-600 border-gray-500/20";
};

const actionLabels: Record<string, string> = {
  "player.create": "Player Created",
  "player.update": "Player Updated",
  "club.create": "Club Created",
  "club.update": "Club Updated",
  "season.create": "Season Created",
  "season.toggle": "Season Toggled",
  "competition.create": "Competition Created",
  "competition.update": "Competition Updated",
  "registration.create": "Registration Submitted",
  "registration.approve": "Registration Approved",
  "registration.reject": "Registration Rejected",
};

export default function AuditLogPage() {
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const limit = 30;

  const logs = useQuery(api.audit.list, {
    action: actionFilter !== "all" ? actionFilter : undefined,
    limit,
    offset,
  });

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
            <p className="text-sm text-muted-foreground mt-1">Complete trail of all system changes</p>
          </div>
        </motion.div>

        <motion.div variants={item}>
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setOffset(0); }}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filter by action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="player.create">Player Created</SelectItem>
              <SelectItem value="player.update">Player Updated</SelectItem>
              <SelectItem value="club.create">Club Created</SelectItem>
              <SelectItem value="registration.create">Registration Submitted</SelectItem>
              <SelectItem value="registration.approve">Registration Approved</SelectItem>
              <SelectItem value="registration.reject">Registration Rejected</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        <motion.div variants={item}>
          <Card className="ff-shadow-card border-border/60">
            <CardContent className="p-0">
              {!logs ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : logs.items.length === 0 ? (
                <div className="p-12 text-center">
                  <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No audit entries yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="hidden sm:table-cell">Entity</TableHead>
                      <TableHead className="hidden md:table-cell">Actor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.items.map((log) => (
                      <TableRow key={log._id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-semibold ${actionColor(log.action)}`}>
                            {actionLabels[log.action] ?? log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {log.entityType}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {log.actorName ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {logs && logs.total > limit && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-xs text-muted-foreground">
                Showing {offset + 1}–{Math.min(offset + limit, logs.total)} of {logs.total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" disabled={offset + limit >= logs.total} onClick={() => setOffset(offset + limit)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
