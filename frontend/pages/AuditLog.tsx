import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { AuditEntry } from "@/lib/types";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Clock,
  User,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.audit.list(100);
      if (res?.auditLog) setLogs(res.auditLog);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.entityType.toLowerCase().includes(q) ||
      (l.userName && l.userName.toLowerCase().includes(q)) ||
      (l.role && l.role.toLowerCase().includes(q))
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Federation Immutable Audit Trail</h1>
              <Badge variant="outline" className="font-mono text-xs text-emerald-600 border-emerald-500/20 bg-emerald-500/10">
                100% Traceability
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cryptographically verified audit log of all regulated state changes, approvals & logins
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
          </div>
        </div>

        {/* Search */}
        <Card className="border-border/60">
          <CardContent className="p-3.5">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audit trail by action, entity type, officer name..."
                className="pl-9 h-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Audit Stream */}
        <Card className="border-border/70 overflow-hidden shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-16 text-xs text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                Loading audit trail...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-16 text-xs text-muted-foreground">
                No audit entries found matching filter.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredLogs.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 hover:bg-muted/20 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 mt-0.5 shrink-0">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{entry.action}</span>
                          <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0">
                            {entry.entityType}
                          </Badge>
                          {entry.entityId && (
                            <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                              #{entry.entityId}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span className="font-medium text-foreground/80">
                            By {entry.userName || "System Operator"}
                          </span>
                          <span className="capitalize text-emerald-600">
                            ({entry.role || "Admin"})
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between text-muted-foreground">
                      <span className="font-mono text-[11px]">
                        {new Date(entry.timestamp).toLocaleDateString()} •{" "}
                        {new Date(entry.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground/70">
                        ID: {entry.id.slice(0, 10)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
