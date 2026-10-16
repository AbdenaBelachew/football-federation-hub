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
import type { PlayerRegistration, Player, Club } from "@/lib/types";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  Shield,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export default function RegistrationsPage() {
  const { user } = useAuth();
  const isClubAdmin = user?.role === "club_admin";
  const isOfficer = user?.role === "super_admin" || user?.role === "federation_admin" || user?.role === "registration_officer";
  const userClubId = user?.clubId || (user as any)?.club_id || (user?.email === "club@saintgeorge.org" ? "club-1" : undefined);

  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  // Review modal
  const [reviewDialog, setReviewDialog] = useState(false);
  const [selectedReg, setSelectedReg] = useState<PlayerRegistration | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // New registration modal
  const [createDialog, setCreateDialog] = useState(false);
  const [newReg, setNewReg] = useState({
    playerId: "",
    clubId: "",
    seasonId: "season-2025-2026",
    squadNumber: 10,
    registrationDate: new Date().toISOString().split("T")[0],
    notes: "Regular season senior licensing",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [rRes, pRes, cRes] = await Promise.all([
        api.registrations.list(),
        api.players.list(),
        api.clubs.list(),
      ]);

      if (rRes?.registrations) setRegistrations(rRes.registrations);
      if (pRes?.players) setPlayers(pRes.players);
      if (cRes?.clubs) setClubs(cRes.clubs);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openReviewModal = (reg: PlayerRegistration, action: "approve" | "reject") => {
    setSelectedReg(reg);
    setReviewAction(action);
    setReviewNotes(action === "approve" ? "Verified and approved by Federation Registrar" : "Incomplete medical document");
    setReviewDialog(true);
  };

  const handleReviewSubmit = async () => {
    if (!selectedReg) return;
    try {
      setSubmitting(true);
      await api.registrations.review(selectedReg.id, reviewAction, reviewNotes);
      toast.success(
        reviewAction === "approve"
          ? "Player license approved & issued!"
          : "Registration application rejected."
      );
      setReviewDialog(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.registrations.create(newReg);
      toast.success("Player registration submitted for officer review!");
      setCreateDialog(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit registration");
    } finally {
      setSubmitting(false);
    }
  };

  const userClub = clubs.find((c) => c.id === userClubId);

  const filteredRegistrations = registrations.filter((r) => {
    if (isClubAdmin && userClubId && r.clubId !== userClubId) {
      return false;
    }
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {isClubAdmin && userClub ? `${userClub.name} — Player Registrations` : "Player Licensing & Registrations"}
              </h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {filteredRegistrations.length} Applications
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Official player licenses, document verification & registration approvals
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
              onClick={() => {
                setNewReg({
                  ...newReg,
                  clubId: userClubId || clubs[0]?.id || "",
                  playerId: players.find((p) => p.currentClubId === userClubId)?.id || players[0]?.id || "",
                });
                setCreateDialog(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Submit Registration</span>
            </Button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {["all", "pending", "active", "rejected"].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(st)}
              className={`text-xs capitalize h-8 ${
                statusFilter === st ? "bg-emerald-600 text-white" : ""
              }`}
            >
              {st}
            </Button>
          ))}
        </div>

        {/* Registration Cards */}
        {loading ? (
          <div className="text-center py-16 text-xs text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Loading registrations...
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card border-dashed">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-semibold">No registrations match filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRegistrations.map((reg) => {
              const p = players.find((pl) => pl.id === reg.playerId);
              const c = clubs.find((cl) => cl.id === reg.clubId);
              const playerName = p ? `${p.firstName} ${p.lastName}` : "Registered Player";
              const clubName = c ? c.name : "Football Club";
              const isPending = reg.status === "pending";
              const isActive = reg.status === "active";

              return (
                <Card
                  key={reg.id}
                  className="border-border/70 hover:border-emerald-500/50 hover:shadow-md transition-all overflow-hidden"
                >
                  <div
                    className={`h-2 ${
                      isActive
                        ? "bg-emerald-500"
                        : isPending
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                  />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-muted-foreground block">
                          ID: {reg.licenseNumber || reg.id.slice(0, 12)}
                        </span>
                        <h3 className="text-sm font-bold text-foreground mt-0.5">{playerName}</h3>
                        <p className="text-xs text-muted-foreground">{clubName}</p>
                      </div>

                      <Badge
                        variant={isActive ? "default" : isPending ? "secondary" : "destructive"}
                        className={`text-[10px] uppercase font-mono ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            : isPending
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : ""
                        }`}
                      >
                        {reg.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Registered On</span>
                        <span className="font-mono text-foreground">{reg.registrationDate}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Squad Number</span>
                        <span className="font-mono font-bold text-foreground">#{reg.squadNumber || 10}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground block text-[10px]">Notes / Checklist</span>
                        <span className="text-muted-foreground text-[11px] truncate block">
                          {reg.notes || "Standard professional contract"}
                        </span>
                      </div>
                    </div>

                    {isPending ? (
                      isOfficer ? (
                        <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                          <Button
                            size="sm"
                            onClick={() => openReviewModal(reg, "approve")}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReviewModal(reg, "reject")}
                            className="flex-1 text-rose-600 border-rose-500/30 hover:bg-rose-50 text-xs h-8 gap-1 cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-border/40 text-[11px] text-amber-600 flex items-center gap-1.5 font-medium">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Submitted — Awaiting Federation Officer Approval</span>
                        </div>
                      )
                    ) : (
                      <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Reviewed & processed</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Review Modal */}
        {selectedReg && (
          <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="capitalize">
                  {reviewAction} Player Registration
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Attach official notes for the club and registry log
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div className="space-y-1.5">
                  <Label htmlFor="reviewNotes" className="text-xs">Officer Review Notes</Label>
                  <Input
                    id="reviewNotes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Provide justification or notes..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setReviewDialog(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleReviewSubmit}
                  disabled={submitting}
                  className={
                    reviewAction === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-rose-600 hover:bg-rose-700 text-white"
                  }
                >
                  {submitting ? "Processing..." : `Confirm ${reviewAction}`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Create Registration Modal */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Registration Application</DialogTitle>
              <DialogDescription className="text-xs">
                Enroll player into club squad for season 2025/2026
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateRegistration} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Select Player</Label>
                <select
                  required
                  value={newReg.playerId}
                  onChange={(e) => setNewReg({ ...newReg, playerId: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">Select Player</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.nationality})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Affiliated Club</Label>
                {isClubAdmin && (userClub || userClubId) ? (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground block">{userClub?.name || "Saint George SC"}</span>
                      <span className="text-[10px] text-muted-foreground">Auto-linked to your club license</span>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Your Club</Badge>
                  </div>
                ) : (
                  <select
                    required
                    value={newReg.clubId}
                    onChange={(e) => setNewReg({ ...newReg, clubId: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  >
                    <option value="">Select Club</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Registration Date</Label>
                  <Input
                    type="date"
                    required
                    value={newReg.registrationDate}
                    onChange={(e) => setNewReg({ ...newReg, registrationDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Squad Number</Label>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={newReg.squadNumber}
                    onChange={(e) => setNewReg({ ...newReg, squadNumber: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Contract Notes</Label>
                <Input
                  value={newReg.notes}
                  onChange={(e) => setNewReg({ ...newReg, notes: e.target.value })}
                  placeholder="e.g. 2-year senior professional contract"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {submitting ? "Submitting..." : "Submit Registration"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
