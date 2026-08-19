import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Swords, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const statusColor = (s: string) => {
  if (s === "completed") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (s === "scheduled") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  if (s === "in_progress") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  if (s === "postponed") return "bg-orange-500/10 text-orange-600 border-orange-500/20";
  return "bg-gray-500/10 text-gray-600 border-gray-500/20";
};

export default function MatchesPage() {
  const competitions = useQuery(api.competitions.list, {});
  const [selectedComp, setSelectedComp] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const [scoreDialog, setScoreDialog] = useState<any>(null);
  const [homeScore, setHomeScore] = useState("0");
  const [awayScore, setAwayScore] = useState("0");
  const [processing, setProcessing] = useState(false);
  const limit = 20;

  const matches = useQuery(api.matches.list, {
    competitionId: selectedComp !== "all" ? (selectedComp as any) : undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    limit, offset,
  });
  const updateScore = useMutation(api.matches.updateScore);

  const handleScoreUpdate = async () => {
    if (!scoreDialog) return;
    setProcessing(true);
    try {
      await updateScore({
        matchId: scoreDialog._id,
        homeScore: parseInt(homeScore) || 0,
        awayScore: parseInt(awayScore) || 0,
        status: "completed",
      });
      toast.success("Score updated"); setScoreDialog(null);
    } catch (e: any) { toast.error(e.message); } finally { setProcessing(false); }
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage fixtures, results, and match events</p>
        </motion.div>

        <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedComp} onValueChange={(v) => { setSelectedComp(v); setOffset(0); }}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All competitions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Competitions</SelectItem>
              {competitions?.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2 flex-wrap">
            {["all", "scheduled", "completed", "in_progress", "postponed"].map((s) => (
              <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" className="capitalize text-xs"
                onClick={() => { setStatusFilter(s); setOffset(0); }}>{s.replace("_", " ")}</Button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={item}>
          <Card className="ff-shadow-card border-border/60">
            <CardContent className="p-0">
              {!matches ? <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
              : matches.items.length === 0 ? <div className="p-12 text-center"><Swords className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" /><p className="text-sm text-muted-foreground">No matches found</p></div>
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Home</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead>Away</TableHead>
                    <TableHead className="hidden sm:table-cell">Competition</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {matches.items.map((m) => (
                      <TableRow key={m._id}>
                        <TableCell className="font-medium">{m.homeTeam?.name ?? "—"}</TableCell>
                        <TableCell className="text-center font-mono font-bold text-lg">
                          {m.homeScore != null ? `${m.homeScore} — ${m.awayScore}` : "— : —"}
                        </TableCell>
                        <TableCell className="font-medium">{m.awayTeam?.name ?? "—"}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{m.competition?.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{m.matchDate}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[10px] font-semibold ${statusColor(m.status)}`}>{m.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {m.status !== "completed" && m.status !== "cancelled" && (
                            <Button variant="ghost" size="sm" className="text-xs"
                              onClick={() => { setScoreDialog(m); setHomeScore(String(m.homeScore ?? 0)); setAwayScore(String(m.awayScore ?? 0)); }}>
                              Enter Score
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {matches && matches.total > limit && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-xs text-muted-foreground">Showing {offset + 1}–{Math.min(offset + limit, matches.total)} of {matches.total}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" disabled={offset + limit >= matches.total} onClick={() => setOffset(offset + limit)}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      <Dialog open={!!scoreDialog} onOpenChange={() => setScoreDialog(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader><DialogTitle>Enter Match Score</DialogTitle>
            <DialogDescription>{scoreDialog?.homeTeam?.name} vs {scoreDialog?.awayTeam?.name}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4 py-4 justify-center">
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground font-medium">{scoreDialog?.homeTeam?.name}</p>
              <Input type="number" min="0" className="w-20 text-center text-2xl font-bold" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} />
            </div>
            <span className="text-2xl font-bold text-muted-foreground">—</span>
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground font-medium">{scoreDialog?.awayTeam?.name}</p>
              <Input type="number" min="0" className="w-20 text-center text-2xl font-bold" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScoreDialog(null)}>Cancel</Button>
            <Button onClick={handleScoreUpdate} disabled={processing} className="bg-emerald-600 hover:bg-emerald-700">
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
