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
import type { Transfer, Player, Club } from "@/lib/types";
import {
  ArrowRightLeft,
  ArrowRight,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  Banknote,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export default function TransfersPage() {
  const { user } = useAuth();
  const isClubAdmin = user?.role === "club_admin";
  const isOfficer = user?.role === "super_admin" || user?.role === "federation_admin" || user?.role === "transfer_officer";
  const userClubId = user?.clubId || (user as any)?.club_id || (user?.email === "club@saintgeorge.org" ? "club-1" : undefined);

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterScope, setFilterScope] = useState<"my_club" | "all">(isClubAdmin ? "my_club" : "all");
  const [transferDirection, setTransferDirection] = useState<"outgoing" | "incoming">("outgoing");

  const userClub = clubs.find((c) => c.id === userClubId);

  const [formData, setFormData] = useState({
    playerId: "",
    fromClubId: "",
    toClubId: "",
    transferFee: 500000,
    transferDate: new Date().toISOString().split("T")[0],
    reason: "Permanent transfer agreement",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, pRes, cRes] = await Promise.all([
        api.transfers.list(),
        api.players.list(),
        api.clubs.list(),
      ]);

      if (tRes?.transfers) setTransfers(tRes.transfers);
      if (pRes?.players) setPlayers(pRes.players);
      if (cRes?.clubs) setClubs(cRes.clubs);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    if (isClubAdmin && userClubId) {
      if (transferDirection === "outgoing") {
        setFormData({
          playerId: "",
          fromClubId: userClubId,
          toClubId: "",
          transferFee: 500000,
          transferDate: new Date().toISOString().split("T")[0],
          reason: "Permanent transfer agreement",
        });
      } else {
        setFormData({
          playerId: "",
          fromClubId: "",
          toClubId: userClubId,
          transferFee: 500000,
          transferDate: new Date().toISOString().split("T")[0],
          reason: "Permanent transfer agreement",
        });
      }
    }
    setCreateDialog(true);
  };

  const handleAction = async (id: string, action: "approve" | "complete") => {
    try {
      await api.transfers.review(id, action, `Action confirmed by Federation Transfer Matching System`);
      toast.success(`Transfer marked as ${action}d!`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Transfer update failed");
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.fromClubId === formData.toClubId) {
      toast.error("Origin and destination club cannot be the same");
      return;
    }
    try {
      setSubmitting(true);
      await api.transfers.request({
        ...formData,
        status: "requested",
      });
      toast.success("Transfer request filed with Federation TMS!");
      setCreateDialog(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const displayedTransfers = transfers.filter((t) => {
    if (filterScope === "my_club" && userClubId) {
      return t.fromClubId === userClubId || t.toClubId === userClubId;
    }
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Transfer Matching System (TMS)</h1>
              <Badge variant="secondary" className="font-mono text-xs">
                Window Open
              </Badge>
              {isClubAdmin && userClub && (
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs">
                  {userClub.name} (Auto-Linked)
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Domestic & international player transfers, contract agreements & ITC compliance
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Filter Toggle for Club Admins */}
            {userClubId && (
              <div className="flex items-center rounded-lg border border-border p-1 bg-muted/40 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterScope("my_club")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    filterScope === "my_club"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  My Club Transfers
                </button>
                <button
                  type="button"
                  onClick={() => setFilterScope("all")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    filterScope === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All Window
                </button>
              </div>
            )}

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
              onClick={openCreateModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Initiate Transfer</span>
            </Button>
          </div>
        </div>

        {/* Transfers Grid */}
        {loading ? (
          <div className="text-center py-16 text-xs text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Loading transfer requests...
          </div>
        ) : displayedTransfers.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card border-dashed">
            <ArrowRightLeft className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-semibold">
              {filterScope === "my_club"
                ? `No transfers recorded for ${userClub?.name || "your club"} in this window`
                : "No active transfers in this window"}
            </p>
            {filterScope === "my_club" && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setFilterScope("all")}
                className="text-xs text-emerald-600 mt-1"
              >
                View all federation transfers
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedTransfers.map((t) => {
              const p = players.find((pl) => pl.id === t.playerId);
              const fromC = clubs.find((c) => c.id === t.fromClubId);
              const toC = clubs.find((c) => c.id === t.toClubId);
              const isCompleted = t.status === "completed";
              const isApproved = t.status === "approved";
              const isRequested = t.status === "requested";

              const isUserOrigin = userClubId && t.fromClubId === userClubId;
              const isUserDestination = userClubId && t.toClubId === userClubId;

              return (
                <Card
                  key={t.id}
                  className={`border-border/70 hover:shadow-md transition-all overflow-hidden ${
                    isUserOrigin || isUserDestination ? "border-emerald-500/50 bg-emerald-500/[0.02]" : ""
                  }`}
                >
                  <div
                    className={`h-2 ${
                      isCompleted
                        ? "bg-emerald-500"
                        : isApproved
                        ? "bg-blue-500"
                        : "bg-amber-500"
                    }`}
                  />
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            TMS REF: {t.id.slice(0, 10).toUpperCase()}
                          </span>
                          {isUserOrigin && (
                            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px]">
                              ★ Outgoing
                            </Badge>
                          )}
                          {isUserDestination && (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                              ★ Incoming
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-foreground mt-0.5">
                          {p ? `${p.firstName} ${p.lastName}` : "Professional Player"}
                        </h3>
                        <p className="text-xs text-muted-foreground">{p?.position || "Forward"} • {p?.nationality || "Ethiopia"}</p>
                      </div>

                      <Badge
                        variant={isCompleted ? "default" : "secondary"}
                        className={`text-[10px] uppercase font-mono ${
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            : isApproved
                            ? "bg-blue-500/10 text-blue-700 border-blue-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}
                      >
                        {t.status}
                      </Badge>
                    </div>

                    {/* From Club -> To Club Visual Flow */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 text-xs font-semibold">
                      <div className="flex-1 truncate">
                        <span className="text-[10px] text-muted-foreground block font-normal">Releasing Club</span>
                        <span className={`truncate block ${isUserOrigin ? "text-amber-600 font-bold" : "text-foreground"}`}>
                          {fromC?.name || "Origin Club"}
                        </span>
                      </div>

                      <div className="px-3 flex items-center justify-center text-emerald-600">
                        <ArrowRight className="h-4 w-4" />
                      </div>

                      <div className="flex-1 text-right truncate">
                        <span className="text-[10px] text-muted-foreground block font-normal">Acquiring Club</span>
                        <span className={`truncate block font-bold ${isUserDestination ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                          {toC?.name || "Destination Club"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="font-semibold text-foreground">
                          {t.transferFee ? `${t.transferFee.toLocaleString()} ETB` : "Free Transfer"}
                        </span>
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground">
                        Date: <span className="font-mono text-foreground">{t.transferDate || "2026-02-01"}</span>
                      </div>
                    </div>

                    {/* Action buttons (Restricted to officers; club admins see status only) */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                      {isOfficer ? (
                        <>
                          {isRequested && (
                            <Button
                              size="sm"
                              onClick={() => handleAction(t.id, "approve")}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1.5 cursor-pointer"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Approve Transfer</span>
                            </Button>
                          )}
                          {isApproved && (
                            <Button
                              size="sm"
                              onClick={() => handleAction(t.id, "complete")}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Complete & Issue Clearance</span>
                            </Button>
                          )}
                          {isCompleted && (
                            <div className="w-full text-center text-[11px] text-emerald-600 font-medium py-1 flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Clearance Certificate Issued</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full py-1">
                          {isRequested && (
                            <div className="text-center text-[11px] text-amber-600 font-medium flex items-center justify-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>Awaiting Federation TMS Review & ITC Approval</span>
                            </div>
                          )}
                          {isApproved && (
                            <div className="text-center text-[11px] text-blue-600 font-medium flex items-center justify-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Approved by TMS Officer — Clearance in Process</span>
                            </div>
                          )}
                          {isCompleted && (
                            <div className="text-center text-[11px] text-emerald-600 font-medium flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Clearance Certificate Issued — Registration Finalized</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Initiate Transfer Modal */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Initiate Transfer Request</DialogTitle>
              <DialogDescription className="text-xs">
                Submit player transfer agreement between clubs to Federation TMS
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateTransfer} className="space-y-4 py-2">
              {isClubAdmin && userClub && (
                <div className="space-y-2 p-3 bg-muted/40 rounded-lg border border-border">
                  <Label className="text-xs font-semibold">Transfer Action Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTransferDirection("outgoing");
                        setFormData((prev) => ({
                          ...prev,
                          fromClubId: userClubId || "",
                          toClubId: "",
                        }));
                      }}
                      className={`text-xs py-1.5 px-2 rounded-md font-medium border text-center transition-all ${
                        transferDirection === "outgoing"
                          ? "bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Release Player (Outgoing)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferDirection("incoming");
                        setFormData((prev) => ({
                          ...prev,
                          fromClubId: "",
                          toClubId: userClubId || "",
                        }));
                      }}
                      className={`text-xs py-1.5 px-2 rounded-md font-medium border text-center transition-all ${
                        transferDirection === "incoming"
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Sign Player (Incoming)
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Select Player</Label>
                <select
                  required
                  value={formData.playerId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const p = players.find((x) => x.id === pid);
                    setFormData((prev) => ({
                      ...prev,
                      playerId: pid,
                      ...(isClubAdmin
                        ? transferDirection === "outgoing"
                          ? { fromClubId: userClubId || "" }
                          : { toClubId: userClubId || "" }
                        : { fromClubId: p?.currentClubId || "" }),
                    }));
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">Select Player</option>
                  {players
                    .filter((p) => {
                      if (isClubAdmin && transferDirection === "outgoing" && userClubId) {
                        return p.currentClubId === userClubId;
                      }
                      return true;
                    })
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} ({p.currentClubName || "No Club"})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* From Club */}
                <div className="space-y-1.5">
                  <Label className="text-xs">From (Origin Club)</Label>
                  {isClubAdmin && transferDirection === "outgoing" ? (
                    <div className="h-9 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-900 dark:text-amber-200 truncate">
                        {userClub?.name || "Your Club"}
                      </span>
                      <span className="text-[10px] uppercase font-mono text-amber-700 bg-amber-500/20 px-1.5 py-0.5 rounded">
                        Auto Linked
                      </span>
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.fromClubId}
                      onChange={(e) => setFormData({ ...formData, fromClubId: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                    >
                      <option value="">Select Origin Club</option>
                      {clubs
                        .filter((c) => (isClubAdmin && transferDirection === "incoming" ? c.id !== userClubId : true))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                {/* To Club */}
                <div className="space-y-1.5">
                  <Label className="text-xs">To (Destination Club)</Label>
                  {isClubAdmin && transferDirection === "incoming" ? (
                    <div className="h-9 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-900 dark:text-emerald-200 truncate">
                        {userClub?.name || "Your Club"}
                      </span>
                      <span className="text-[10px] uppercase font-mono text-emerald-700 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                        Auto Linked
                      </span>
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.toClubId}
                      onChange={(e) => setFormData({ ...formData, toClubId: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                    >
                      <option value="">Select Destination</option>
                      {clubs
                        .filter((c) => (isClubAdmin && transferDirection === "outgoing" ? c.id !== userClubId : true))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Transfer Fee (ETB)</Label>
                  <Input
                    type="number"
                    value={formData.transferFee}
                    onChange={(e) => setFormData({ ...formData, transferFee: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Transfer Date</Label>
                  <Input
                    type="date"
                    required
                    value={formData.transferDate}
                    onChange={(e) => setFormData({ ...formData, transferDate: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {submitting ? "Filing..." : "Submit to Federation TMS"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
