import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Trophy, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

interface TeamStanding {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export default function StandingsPage() {
  const competitions = useQuery(api.competitions.list, {});
  const [selectedComp, setSelectedComp] = useState<string | null>(null);
  const matches = useQuery(
    api.matches.list,
    selectedComp ? { competitionId: selectedComp as any, status: "completed", limit: 500 } : { status: "completed", limit: 500 }
  );

  const standings = useMemo<TeamStanding[]>(() => {
    if (!matches) return [];
    const map = new Map<string, TeamStanding>();

    for (const m of matches.items) {
      if (m.homeScore == null || m.awayScore == null) continue;

      const homeKey = m.homeTeamId;
      const awayKey = m.awayTeamId;
      const homeName = m.homeTeam?.name ?? "Unknown";
      const awayName = m.awayTeam?.name ?? "Unknown";

      if (!map.has(homeKey)) map.set(homeKey, { teamId: homeKey, teamName: homeName, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 });
      if (!map.has(awayKey)) map.set(awayKey, { teamId: awayKey, teamName: awayName, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 });

      const home = map.get(homeKey)!;
      const away = map.get(awayKey)!;

      home.played++;
      away.played++;
      home.goalsFor += m.homeScore;
      home.goalsAgainst += m.awayScore;
      away.goalsFor += m.awayScore;
      away.goalsAgainst += m.homeScore;

      if (m.homeScore > m.awayScore) { home.won++; home.points += 3; away.lost++; }
      else if (m.homeScore < m.awayScore) { away.won++; away.points += 3; home.lost++; }
      else { home.drawn++; away.drawn++; home.points += 1; away.points += 1; }
    }

    return Array.from(map.values())
      .map((t) => ({ ...t, goalDifference: t.goalsFor - t.goalsAgainst }))
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
  }, [matches]);

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <h1 className="text-2xl font-bold tracking-tight">Standings</h1>
          <p className="text-sm text-muted-foreground mt-1">League tables computed from match results</p>
        </motion.div>

        <motion.div variants={item}>
          <Select value={selectedComp ?? "all"} onValueChange={(v) => setSelectedComp(v === "all" ? null : v)}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select competition" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Competitions</SelectItem>
              {competitions?.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </motion.div>

        <motion.div variants={item}>
          <Card className="ff-shadow-card border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">League Table</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!matches ? <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
              : standings.length === 0 ? <div className="p-12 text-center"><p className="text-sm text-muted-foreground">No completed matches to compute standings</p></div>
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-center">P</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">W</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">D</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">L</TableHead>
                    <TableHead className="text-center">GF</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">GA</TableHead>
                    <TableHead className="text-center">GD</TableHead>
                    <TableHead className="text-center font-bold">Pts</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {standings.map((s, i) => (
                      <TableRow key={s.teamId} className={i < 3 ? "bg-emerald-500/[0.03]" : ""}>
                        <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{s.teamName}</TableCell>
                        <TableCell className="text-center">{s.played}</TableCell>
                        <TableCell className="text-center hidden sm:table-cell">{s.won}</TableCell>
                        <TableCell className="text-center hidden sm:table-cell">{s.drawn}</TableCell>
                        <TableCell className="text-center hidden sm:table-cell">{s.lost}</TableCell>
                        <TableCell className="text-center">{s.goalsFor}</TableCell>
                        <TableCell className="text-center hidden sm:table-cell">{s.goalsAgainst}</TableCell>
                        <TableCell className={`text-center font-medium ${s.goalDifference > 0 ? "text-emerald-600" : s.goalDifference < 0 ? "text-red-600" : ""}`}>{s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</TableCell>
                        <TableCell className="text-center font-bold text-lg">{s.points}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
