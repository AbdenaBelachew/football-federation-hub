import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Match, Club, Competition, MatchEvent } from "@/lib/types";
import {
  Swords,
  Plus,
  RefreshCw,
  Calendar,
  Clock,
  MapPin,
  Flame,
  ShieldAlert,
  Edit2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";

export default function MatchesPage() {
  const { user } = useAuth();
  const isSuperOrFedAdmin = user?.role === "super_admin" || user?.role === "federation_admin";
  const isClubAdmin = user?.role === "club_admin";
  const canSchedule = isSuperOrFedAdmin || user?.role === "competition_admin";
  const canUpdateScore = isSuperOrFedAdmin || user?.role === "competition_admin" || user?.role === "referee";
  const userClubId = user?.clubId || (user as any)?.club_id || (user?.email === "club@saintgeorge.org" ? "club-1" : undefined);

  const [matches, setMatches] = useState<Match[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [matchScope, setMatchScope] = useState<"my_club" | "all">(isClubAdmin ? "my_club" : "all");

  // Score dialog
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [matchStatus, setMatchStatus] = useState("completed");

  // Add Fixture dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newFixture, setNewFixture] = useState({
    homeTeamId: "",
    awayTeamId: "",
    competitionId: "",
    matchDate: new Date().toISOString().split("T")[0],
    venue: "Addis Ababa Stadium",
    gameweek: 1,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [mRes, cRes, compRes] = await Promise.all([
        api.matches.list(),
        api.clubs.list(),
        api.competitions.list(),
      ]);

      if (mRes?.matches) setMatches(mRes.matches);
      if (cRes?.clubs) setClubs(cRes.clubs);
      if (compRes?.competitions) setCompetitions(compRes.competitions);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load match fixtures");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openScoreModal = (m: Match) => {
    setActiveMatch(m);
    setHomeScore(m.homeScore ?? 0);
    setAwayScore(m.awayScore ?? 0);
    setMatchStatus(m.status === "completed" ? "completed" : "completed");
    setScoreDialogOpen(true);
  };

  const handleSaveScore = async () => {
    if (!activeMatch) return;
    try {
      await api.matches.updateScore(activeMatch.id, homeScore, awayScore, matchStatus);
      toast.success("Match score updated & standings recalculated!");
      setScoreDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update score");
    }
  };

  const handleCreateFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (newFixture.homeTeamId === newFixture.awayTeamId) {
        toast.error("Home and away team cannot be the same club");
        return;
      }
      await api.matches.create({
        ...newFixture,
        seasonId: "season-2025-2026",
        status: "scheduled",
      });
      toast.success("Fixture scheduled successfully!");
      setCreateDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create fixture");
    }
  };

  const userClub = clubs.find((c) => c.id === userClubId);

  const filteredMatches = matches.filter((m) => {
    if (matchScope === "my_club" && userClubId) {
      const isHome = m.homeClubId === userClubId || m.homeClubName?.toLowerCase().includes("saint george");
      const isAway = m.awayClubId === userClubId || m.awayClubName?.toLowerCase().includes("saint george");
      if (!isHome && !isAway) return false;
    }
    if (statusFilter === "all") return true;
    return m.status === statusFilter;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {isClubAdmin && userClub ? `${userClub.name} — Schedule & Match Results` : "Matches & Official Fixtures"}
              </h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {filteredMatches.length} Matches
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Official gameweek schedule, verified scores, and matchday operations
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
            {canSchedule && (
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Schedule Fixture</span>
              </Button>
            )}
          </div>
        </div>

        {/* Club Admin Dedicated Schedule & Results Banner */}
        {isClubAdmin && userClub && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Swords className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground">
                  Official Match Calendar for {userClub.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Home venue: {userClub.stadium || "Addis Ababa Stadium"}. Review upcoming kickoff schedule and finalized scorecards.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-background/80 p-1 rounded-lg border border-border/60 self-start sm:self-auto">
              <Button
                variant={matchScope === "my_club" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMatchScope("my_club")}
                className={`text-xs h-7 px-3 ${matchScope === "my_club" ? "bg-emerald-600 text-white" : ""}`}
              >
                My Club Matches
              </Button>
              <Button
                variant={matchScope === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMatchScope("all")}
                className={`text-xs h-7 px-3 ${matchScope === "all" ? "bg-emerald-600 text-white" : ""}`}
              >
                All Federation Matches
              </Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2">
          {["all", "scheduled", "completed"].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(st)}
              className={`text-xs capitalize h-8 ${
                statusFilter === st ? "bg-emerald-600 text-white" : ""
              }`}
            >
              {st === "all" ? "All Fixtures" : st === "scheduled" ? "Upcoming Schedule" : "Final Results"}
            </Button>
          ))}
        </div>

        {/* Fixtures List */}
        {loading ? (
          <div className="text-center py-16 text-xs text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Loading match schedule...
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card border-dashed">
            <Swords className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-semibold">No matches found for this filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMatches.map((m) => {
              const isDone = m.status === "completed";
              return (
                <Card
                  key={m.id}
                  className="border-border/70 hover:border-emerald-500/50 hover:shadow-md transition-all overflow-hidden"
                >
                  <div
                    className={`h-1.5 ${
                      isDone
                        ? "bg-emerald-500"
                        : "bg-gradient-to-r from-amber-500 to-blue-500"
                    }`}
                  />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        {m.matchDate} • Gameweek {m.gameweek || 1}
                      </span>
                      <Badge
                        variant={isDone ? "default" : "outline"}
                        className={`text-[10px] uppercase font-mono ${
                          isDone
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            : "text-amber-600 border-amber-500/30"
                        }`}
                      >
                        {m.status}
                      </Badge>
                    </div>

                    {/* Match Score Display */}
                    <div className="flex items-center justify-between py-2 px-2 bg-muted/20 rounded-xl border border-border/40">
                      <div className="flex-1 text-center font-bold text-sm text-foreground truncate px-2">
                        {m.homeClubName || "Saint George SC"}
                      </div>

                      <div className="flex flex-col items-center px-4">
                        <span className="font-mono text-xl font-extrabold text-foreground tracking-tight">
                          {isDone ? `${m.homeScore ?? 0} - ${m.awayScore ?? 0}` : "VS"}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                          {isDone ? "FT" : "Scheduled"}
                        </span>
                      </div>

                      <div className="flex-1 text-center font-bold text-sm text-foreground truncate px-2">
                        {m.awayClubName || "Ethiopian Coffee SC"}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {m.venue || "Addis Ababa Stadium"}
                      </span>

                      {canUpdateScore ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openScoreModal(m)}
                          className="h-7 text-xs gap-1.5 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Update Score</span>
                        </Button>
                      ) : (
                        (m.homeClubId === userClubId || m.awayClubId === userClubId) && (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                            {m.homeClubId === userClubId ? "Home Fixture" : "Away Fixture"}
                          </Badge>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Update Score Dialog */}
        {activeMatch && (
          <Dialog open={scoreDialogOpen} onOpenChange={setScoreDialogOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Update Match Score</DialogTitle>
                <DialogDescription className="text-xs">
                  Official scorecard submission for {activeMatch.homeClubName || "Home"} vs{" "}
                  {activeMatch.awayClubName || "Away"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">{activeMatch.homeClubName || "Home"}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={homeScore}
                      onChange={(e) => setHomeScore(Number(e.target.value))}
                      className="text-center font-mono text-xl font-bold h-12"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">{activeMatch.awayClubName || "Away"}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={awayScore}
                      onChange={(e) => setAwayScore(Number(e.target.value))}
                      className="text-center font-mono text-xl font-bold h-12"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Match Status</Label>
                  <select
                    value={matchStatus}
                    onChange={(e) => setMatchStatus(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  >
                    <option value="completed">Completed (Full Time)</option>
                    <option value="in_progress">In Progress (Live)</option>
                    <option value="postponed">Postponed</option>
                  </select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setScoreDialogOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveScore} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Submit Result
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Create Fixture Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Official Fixture</DialogTitle>
              <DialogDescription className="text-xs">
                Create new competition match between two licensed clubs
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateFixture} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Competition</Label>
                <select
                  required
                  value={newFixture.competitionId}
                  onChange={(e) => setNewFixture({ ...newFixture, competitionId: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">Select Competition</option>
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Home Club</Label>
                  <select
                    required
                    value={newFixture.homeTeamId}
                    onChange={(e) => setNewFixture({ ...newFixture, homeTeamId: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  >
                    <option value="">Select Club</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Away Club</Label>
                  <select
                    required
                    value={newFixture.awayTeamId}
                    onChange={(e) => setNewFixture({ ...newFixture, awayTeamId: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  >
                    <option value="">Select Club</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Match Date</Label>
                  <Input
                    type="date"
                    required
                    value={newFixture.matchDate}
                    onChange={(e) => setNewFixture({ ...newFixture, matchDate: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Gameweek</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newFixture.gameweek}
                    onChange={(e) => setNewFixture({ ...newFixture, gameweek: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Stadium / Venue</Label>
                <Input
                  required
                  value={newFixture.venue}
                  onChange={(e) => setNewFixture({ ...newFixture, venue: e.target.value })}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Schedule Fixture
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
