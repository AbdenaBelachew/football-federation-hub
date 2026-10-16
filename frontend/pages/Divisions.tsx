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
import type { Division, Season, Club } from "@/lib/types";
import { Layers, Plus, RefreshCw, ArrowUp, ArrowDown, Building2, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function DivisionsPage() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Enroll Club state
  const [enrollDialog, setEnrollDialog] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [allowMove, setAllowMove] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const [formData, setFormData] = useState({
    name: "Ethiopian Higher League",
    tier: 2,
    seasonId: "season-2025-2026",
    maxClubs: 16,
    promotionSlots: 3,
    relegationSlots: 3,
    description: "National second tier championship with promotion to Premier League",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [dRes, sRes, cRes] = await Promise.all([
        api.divisions.list(),
        api.seasons.list(),
        api.clubs.list(),
      ]);
      if (dRes?.divisions) setDivisions(dRes.divisions);
      if (sRes?.seasons) setSeasons(sRes.seasons);
      if (cRes?.clubs) setClubs(cRes.clubs);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load divisions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEnrollClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDivision || !selectedClubId) {
      toast.error("Please select a club to enroll");
      return;
    }
    try {
      setEnrolling(true);
      const club = clubs.find((c) => c.id === selectedClubId);
      const res = await api.teams.create({
        clubId: selectedClubId,
        divisionId: selectedDivision.id,
        name: `${club?.name || "Club"} Senior Team`,
        moveDivision: allowMove,
      });
      toast.success(res.message || `'${club?.name}' enrolled into ${selectedDivision.name}!`);
      setEnrollDialog(false);
      setSelectedClubId("");
      setAllowMove(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to enroll club");
    } finally {
      setEnrolling(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.divisions.create(formData);
      toast.success("Division tier created!");
      setCreateDialog(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create division");
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
              <h1 className="text-2xl font-bold tracking-tight">League Pyramid & Divisions</h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {divisions.length} Tiers
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              National football league pyramid tiers, promotion criteria & relegation quotas
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Division</span>
            </Button>
          </div>
        </div>

        {/* Divisions List */}
        {loading ? (
          <div className="text-center py-16 text-xs text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Loading division tiers...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {divisions.map((div) => (
              <Card
                key={div.id}
                className="border-border/70 hover:border-emerald-500/50 hover:shadow-md transition-all overflow-hidden"
              >
                <div className="h-2 bg-gradient-to-r from-emerald-600 to-teal-500" />
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold text-sm border border-emerald-500/20">
                        T{div.tier}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">{div.name}</h3>
                        <p className="text-xs text-muted-foreground">Tier {div.tier} National Division</p>
                      </div>
                    </div>

                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono text-[10px]">
                      Max {div.maxClubs || 16} Clubs
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {div.description || "Official federation sanctioned league division."}
                  </p>

                  {/* Competitions in this Division */}
                  {div.competitions && div.competitions.length > 0 && (
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                        <Trophy className="h-3.5 w-3.5 text-amber-500" />
                        <span>Active Competition</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {div.competitions.map((comp) => (
                          <Badge key={comp.id} variant="outline" className="text-[11px] font-medium border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
                            {comp.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enrolled Clubs */}
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Enrolled Clubs</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px]">
                          {div.clubs?.length || 0} / {div.maxClubs || 16}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 cursor-pointer"
                          onClick={() => {
                            setSelectedDivision(div);
                            setSelectedClubId("");
                            setEnrollDialog(true);
                          }}
                        >
                          <Plus className="h-3 w-3" /> Enroll Club
                        </Button>
                      </div>
                    </div>

                    {div.clubs && div.clubs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {div.clubs.map((club) => (
                          <Badge
                            key={club.id}
                            variant="secondary"
                            className="text-[11px] font-normal py-0.5 px-2 bg-muted/60 hover:bg-muted"
                          >
                            {club.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">No clubs enrolled yet</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                      <ArrowUp className="h-4 w-4" />
                      <span>{div.promotionSlots ?? 3} Promotion Slots</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-rose-600 font-semibold justify-end">
                      <ArrowDown className="h-4 w-4" />
                      <span>{div.relegationSlots ?? 3} Relegation Slots</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Division Modal */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add League Division</DialogTitle>
              <DialogDescription className="text-xs">
                Configure tier hierarchy and promotion/relegation thresholds
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Division Name</Label>
                <Input
                  required
                  placeholder="e.g. Higher League"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Pyramid Tier</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Clubs</Label>
                  <Input
                    type="number"
                    min={2}
                    value={formData.maxClubs}
                    onChange={(e) => setFormData({ ...formData, maxClubs: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Promotion Slots</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.promotionSlots}
                    onChange={(e) => setFormData({ ...formData, promotionSlots: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Relegation Slots</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.relegationSlots}
                    onChange={(e) => setFormData({ ...formData, relegationSlots: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {submitting ? "Adding..." : "Add Division"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Enroll Club to Division Modal */}
        <Dialog open={enrollDialog} onOpenChange={setEnrollDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enroll Club to {selectedDivision?.name}</DialogTitle>
              <DialogDescription className="text-xs">
                Select an affiliated club to compete in this division tier
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEnrollClub} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Select Club *</Label>
                <select
                  required
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">-- Choose Affiliated Club --</option>
                  {clubs.map((c) => {
                    const assignedDiv = divisions.find((d) => d.clubs?.some((dc) => dc.id === c.id));
                    const isThisDivision = assignedDiv?.id === selectedDivision?.id;
                    const isAnotherDivision = assignedDiv && !isThisDivision;
                    const disabled = isThisDivision || (isAnotherDivision && !allowMove);

                    return (
                      <option key={c.id} value={c.id} disabled={disabled}>
                        {c.name} ({c.city || c.country})
                        {isThisDivision
                          ? " — (Already in this Division)"
                          : isAnotherDivision
                          ? ` — (Currently in ${assignedDiv.name})`
                          : " — (Available)"}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Statute Rule: A club may only compete in one division tier per season.
                </p>
              </div>

              {/* Allow transfer checkbox if user wants to move a club between divisions */}
              <div className="flex items-center gap-2 pt-1 pb-1">
                <input
                  type="checkbox"
                  id="allowMoveCheckbox"
                  checked={allowMove}
                  onChange={(e) => setAllowMove(e.target.checked)}
                  className="rounded border-input h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="allowMoveCheckbox" className="text-xs text-muted-foreground cursor-pointer select-none">
                  Transfer / Move club from its current division (Promotion / Relegation)
                </label>
              </div>

              {selectedDivision && (
                <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1 border border-border/50">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Division Tier:</span>
                    <span className="font-semibold text-foreground">Tier {selectedDivision.tier}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Current Enrollment:</span>
                    <span className="font-semibold text-foreground">
                      {selectedDivision.clubs?.length || 0} / {selectedDivision.maxClubs || 16} Clubs
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Promotion / Relegation:</span>
                    <span className="font-semibold text-foreground">
                      +{selectedDivision.promotionSlots ?? 3} / -{selectedDivision.relegationSlots ?? 3}
                    </span>
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEnrollDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={enrolling} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {enrolling ? "Enrolling..." : "Confirm Enrollment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
