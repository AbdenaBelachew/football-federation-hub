import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Competition, StandingRow } from "@/lib/types";
import { Trophy, RefreshCw, Award, ArrowUp, ArrowDown, Building2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router";

export default function StandingsPage() {
  const { user } = useAuth();
  const isClubAdmin = user?.role === "club_admin";
  const userClubId = user?.clubId || (user as any)?.club_id || (user?.email === "club@saintgeorge.org" ? "club-1" : undefined);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>("");
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCompetitions = async () => {
    try {
      setLoading(true);
      const res = await api.competitions.list();
      if (res?.competitions && res.competitions.length > 0) {
        setCompetitions(res.competitions);
        const initialId = res.competitions[0].id;
        setSelectedCompId(initialId);
        loadStandings(initialId);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load competitions");
    } finally {
      setLoading(false);
    }
  };

  const loadStandings = async (compId: string) => {
    try {
      setLoading(true);
      const res = await api.competitions.getStandings(compId);
      if (res?.standings) {
        setStandings(res.standings);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load league standings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompetitions();
  }, []);

  const handleCompetitionChange = (id: string) => {
    setSelectedCompId(id);
    loadStandings(id);
  };

  const currentComp = competitions.find((c) => c.id === selectedCompId);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Official League Standings</h1>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                Live Calculated
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time table derived from validated match scorecards and goal differentials
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedCompId} onValueChange={handleCompetitionChange}>
              <SelectTrigger className="w-[220px] h-9 text-xs">
                <SelectValue placeholder="Select Competition" />
              </SelectTrigger>
              <SelectContent>
                {competitions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadStandings(selectedCompId)}
              disabled={loading}
              className="text-xs gap-1.5 h-9 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Club Admin Table Standing Focus Banner */}
        {(() => {
          const userStanding = standings.find(
            (s) => s.teamId === userClubId || s.teamName.toLowerCase().includes("saint george")
          );
          if (!userStanding || !isClubAdmin) return null;

          return (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white font-mono text-xl font-bold flex items-center justify-center shrink-0 shadow-sm">
                  #{userStanding.position}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">{userStanding.teamName}</h2>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Your Club</Badge>
                    {userStanding.position === 1 && (
                      <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[10px]">
                        League Leaders
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {userStanding.played} Matches Played • Record: {userStanding.won}W - {userStanding.drawn}D - {userStanding.lost}L • Goal Diff: {userStanding.goalDifference > 0 ? `+${userStanding.goalDifference}` : userStanding.goalDifference}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-emerald-600 font-mono block leading-none">
                    {userStanding.points}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Total Points
                  </span>
                </div>
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-8">
                  <Link to="/dashboard/matches">
                    <span>View Schedule</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Standings Table Card */}
        <Card className="border-border/70 overflow-hidden shadow-sm">
          <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {currentComp?.name || "Ethiopian Premier League"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Official Tier 1 Senior National Championship
                  </CardDescription>
                </div>
              </div>

              {/* Legend */}
              <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-emerald-500" />
                  CAF Champions League
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-blue-500" />
                  Confederation Cup
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-rose-500" />
                  Relegation
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-16 text-xs text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                Calculating league standings...
              </div>
            ) : standings.length === 0 ? (
              <div className="text-center py-16 text-xs text-muted-foreground">
                No match results recorded yet for this competition.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground font-semibold bg-muted/10 text-left">
                      <th className="py-3 px-4 w-12 text-center">Pos</th>
                      <th className="py-3 px-4">Club</th>
                      <th className="py-3 px-3 text-center">P</th>
                      <th className="py-3 px-3 text-center">W</th>
                      <th className="py-3 px-3 text-center">D</th>
                      <th className="py-3 px-3 text-center">L</th>
                      <th className="py-3 px-3 text-center">GF</th>
                      <th className="py-3 px-3 text-center">GA</th>
                      <th className="py-3 px-3 text-center">GD</th>
                      <th className="py-3 px-4 text-center font-bold text-foreground">PTS</th>
                      <th className="py-3 px-4 text-center">Form</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {standings.map((row, index) => {
                      const isChampion = index === 0;
                      const isCafCup = index === 1;
                      const isRelegation = index >= standings.length - 2 && standings.length > 3;
                      const isUserClub = row.teamId === userClubId || row.teamName.toLowerCase().includes("saint george");

                      return (
                        <tr
                          key={row.teamId}
                          className={`hover:bg-muted/30 transition-colors ${
                            isUserClub
                              ? "bg-emerald-500/[0.08] font-semibold border-l-4 border-l-emerald-500"
                              : isChampion
                              ? "bg-emerald-500/[0.04]"
                              : isCafCup
                              ? "bg-blue-500/[0.03]"
                              : isRelegation
                              ? "bg-rose-500/[0.03]"
                              : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center font-mono font-bold">
                            <span
                              className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs ${
                                isUserClub
                                  ? "bg-emerald-600 text-white ring-2 ring-emerald-500/30"
                                  : isChampion
                                  ? "bg-emerald-600 text-white"
                                  : isCafCup
                                  ? "bg-blue-600 text-white"
                                  : isRelegation
                                  ? "bg-rose-600 text-white"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {row.position}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-foreground">
                            <div className="flex items-center gap-2.5">
                              <span className="truncate">{row.teamName}</span>
                              {isUserClub && (
                                <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 h-4">
                                  ★ Your Club
                                </Badge>
                              )}
                              {isChampion && !isUserClub && (
                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] px-1 py-0 h-4">
                                  Leaders
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono">{row.played}</td>
                          <td className="py-3.5 px-3 text-center font-mono text-emerald-600 font-semibold">{row.won}</td>
                          <td className="py-3.5 px-3 text-center font-mono text-muted-foreground">{row.drawn}</td>
                          <td className="py-3.5 px-3 text-center font-mono text-rose-600 font-semibold">{row.lost}</td>
                          <td className="py-3.5 px-3 text-center font-mono text-muted-foreground">{row.goalsFor}</td>
                          <td className="py-3.5 px-3 text-center font-mono text-muted-foreground">{row.goalsAgainst}</td>
                          <td
                            className={`py-3.5 px-3 text-center font-mono font-bold ${
                              row.goalDifference > 0
                                ? "text-emerald-600"
                                : row.goalDifference < 0
                                ? "text-rose-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-extrabold text-sm text-foreground bg-muted/20">
                            {row.points}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {(row.form || ["W", "W", "D", "L"]).map((f, i) => (
                                <span
                                  key={i}
                                  className={`h-4 w-4 rounded text-[9px] font-bold flex items-center justify-center ${
                                    f === "W"
                                      ? "bg-emerald-500 text-white"
                                      : f === "D"
                                      ? "bg-amber-500 text-white"
                                      : "bg-rose-500 text-white"
                                  }`}
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
