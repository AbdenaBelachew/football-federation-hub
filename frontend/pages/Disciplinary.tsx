import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { DisciplinaryCase, Player } from "@/lib/types";
import {
  ShieldAlert,
  Plus,
  RefreshCw,
  AlertTriangle,
  Calendar,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export default function DisciplinaryPage() {
  const [cases, setCases] = useState<DisciplinaryCase[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    entityType: "player" as const,
    entityId: "",
    entityName: "",
    reason: "Serious foul play / Red card offense",
    incidentDate: new Date().toISOString().split("T")[0],
    cardType: "red" as const,
    sanctionType: "suspension" as const,
    suspensionMatches: 2,
    fineAmount: 25000,
    status: "open" as const,
    notes: "Automatic 2-match ban pending committee review",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [dRes, pRes] = await Promise.all([
        api.disciplinary.list(),
        api.players.list(),
      ]);
      if (dRes?.cases) setCases(dRes.cases);
      if (pRes?.players) setPlayers(pRes.players);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load disciplinary cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      await api.disciplinary.updateStatus(id, "served", "Sanction served in full");
      toast.success("Disciplinary case resolved!");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.disciplinary.create({
        ...formData,
        issuedBy: "Disciplinary Committee",
      });
      toast.success("Disciplinary action recorded!");
      setCreateDialog(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record case");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Disciplinary Committee Registry</h1>
              <Badge variant="destructive" className="font-mono text-xs">
                {cases.filter((c) => c.status === "open").length} Active Cases
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Official records of card sanctions, suspensions, fines & appeals
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
              size="sm"
              onClick={() => setCreateDialog(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5 h-9 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Record Sanction</span>
            </Button>
          </div>
        </div>

        {/* Case Cards */}
        {loading ? (
          <div className="text-center py-16 text-xs text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Loading disciplinary records...
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card border-dashed">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
            <p className="text-sm font-semibold">Zero active disciplinary cases</p>
            <p className="text-xs text-muted-foreground mt-1">All sanctions have been served or resolved.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cases.map((cs) => {
              const isOpen = cs.status === "open";
              return (
                <Card
                  key={cs.id}
                  className="border-border/70 hover:border-rose-500/40 hover:shadow-md transition-all overflow-hidden"
                >
                  <div className={`h-2 ${isOpen ? "bg-rose-600" : "bg-emerald-500"}`} />
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-3 w-2 rounded-xs inline-block ${
                              cs.cardType === "red"
                                ? "bg-rose-600"
                                : cs.cardType === "second_yellow"
                                ? "bg-amber-500"
                                : "bg-yellow-400"
                            }`}
                          />
                          <h3 className="text-base font-bold text-foreground">
                            {cs.entityName || "Regulated Official"}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                          Entity: {cs.entityType} • Date: {cs.incidentDate}
                        </p>
                      </div>

                      <Badge
                        variant={isOpen ? "destructive" : "secondary"}
                        className={`text-[10px] uppercase font-mono ${
                          !isOpen ? "bg-emerald-500/10 text-emerald-600" : ""
                        }`}
                      >
                        {cs.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-foreground/90 font-medium p-2.5 rounded-lg bg-muted/30 border border-border/50">
                      Reason: {cs.reason}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="font-semibold text-rose-600">
                        Suspension: {cs.suspensionMatches ? `${cs.suspensionMatches} Matches` : "Warning"}
                      </div>
                      <div className="text-right font-mono font-semibold text-foreground">
                        Fine: {cs.fineAmount ? `${cs.fineAmount.toLocaleString()} ETB` : "None"}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="pt-2 border-t border-border/40">
                        <Button
                          size="sm"
                          onClick={() => handleResolve(cs.id)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 cursor-pointer"
                        >
                          Mark Sanction Served
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Record Sanction Modal */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Disciplinary Sanction</DialogTitle>
              <DialogDescription className="text-xs">
                Log referee match report offense or disciplinary committee ruling
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Select Player</Label>
                <select
                  required
                  value={formData.entityId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const p = players.find((x) => x.id === pid);
                    setFormData({
                      ...formData,
                      entityId: pid,
                      entityName: p ? `${p.firstName} ${p.lastName}` : "",
                    });
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">Select Player</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.currentClubName || "No Club"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Infraction Reason</Label>
                <Input
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Card Type</Label>
                  <select
                    value={formData.cardType}
                    onChange={(e) => setFormData({ ...formData, cardType: e.target.value as any })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  >
                    <option value="red">Direct Red Card</option>
                    <option value="second_yellow">Second Yellow</option>
                    <option value="yellow">Yellow Card (Accumulation)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Matches Suspended</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.suspensionMatches}
                    onChange={(e) => setFormData({ ...formData, suspensionMatches: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Fine Amount (ETB)</Label>
                  <Input
                    type="number"
                    value={formData.fineAmount}
                    onChange={(e) => setFormData({ ...formData, fineAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Incident Date</Label>
                  <Input
                    type="date"
                    required
                    value={formData.incidentDate}
                    onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-rose-600 hover:bg-rose-700 text-white">
                  {submitting ? "Recording..." : "Record Sanction"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
