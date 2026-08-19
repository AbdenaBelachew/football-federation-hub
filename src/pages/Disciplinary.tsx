import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ShieldAlert, Loader2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const statusColor = (s: string) => {
  if (s === "open") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  if (s === "suspended") return "bg-red-500/10 text-red-600 border-red-500/20";
  if (s === "served") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (s === "appealed") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  return "bg-gray-500/10 text-gray-600 border-gray-500/20";
};
const cardColor = (c: string) => {
  if (c === "red" || c === "second_yellow") return "bg-red-500/10 text-red-600 border-red-500/20";
  return "bg-amber-500/10 text-amber-600 border-amber-500/20";
};

export default function DisciplinaryPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const [updateDialog, setUpdateDialog] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("suspended");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const limit = 20;

  const cases = useQuery(api.disciplinary.list, {
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    limit, offset,
  });
  const stats = useQuery(api.disciplinary.stats);
  const updateStatus = useMutation(api.disciplinary.updateStatus);

  const handleUpdate = async () => {
    if (!updateDialog) return;
    setProcessing(true);
    try {
      await updateStatus({ caseId: updateDialog._id, status: newStatus as any, notes: notes || undefined });
      toast.success("Case updated"); setUpdateDialog(null); setNotes("");
    } catch (e: any) { toast.error(e.message); } finally { setProcessing(false); }
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <h1 className="text-2xl font-bold tracking-tight">Disciplinary</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage cards, suspensions, and disciplinary cases</p>
        </motion.div>

        {/* Stats */}
        {stats && (
          <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Open", value: stats.open, color: "text-amber-600", bg: "bg-amber-500/10" },
              { label: "Suspended", value: stats.suspended, color: "text-red-600", bg: "bg-red-500/10" },
              { label: "Served", value: stats.served, color: "text-emerald-600", bg: "bg-emerald-500/10" },
              { label: "Appealed", value: stats.appealed, color: "text-blue-600", bg: "bg-blue-500/10" },
            ].map((s) => (
              <Card key={s.label} className="ff-shadow-card border-border/60">
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}

        <motion.div variants={item}>
          <div className="flex gap-2 flex-wrap">
            {["all", "open", "suspended", "served", "appealed", "dismissed"].map((s) => (
              <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" className="capitalize"
                onClick={() => { setStatusFilter(s); setOffset(0); }}>{s}</Button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={item}>
          <Card className="ff-shadow-card border-border/60">
            <CardContent className="p-0">
              {!cases ? <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
              : cases.items.length === 0 ? <div className="p-12 text-center"><ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" /><p className="text-sm text-muted-foreground">No disciplinary cases</p></div>
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="hidden sm:table-cell">Club</TableHead>
                    <TableHead>Card</TableHead>
                    <TableHead className="hidden md:table-cell">Offense</TableHead>
                    <TableHead className="text-center">Suspension</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {cases.items.map((c) => (
                      <TableRow key={c._id}>
                        <TableCell className="font-medium">{c.player?.firstName} {c.player?.lastName}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{c.club?.name ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[10px] font-semibold capitalize ${cardColor(c.cardType)}`}>{c.cardType.replace("_", " ")}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[200px] truncate">{c.offense}</TableCell>
                        <TableCell className="text-center text-sm">{c.suspensionMatches} match{c.suspensionMatches !== 1 ? "es" : ""}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[10px] font-semibold ${statusColor(c.status)}`}>{c.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {c.status === "open" && (
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setUpdateDialog(c)}>Update</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {cases && cases.total > limit && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-xs text-muted-foreground">Showing {offset + 1}–{Math.min(offset + limit, cases.total)} of {cases.total}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" disabled={offset + limit >= cases.total} onClick={() => setOffset(offset + limit)}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      <Dialog open={!!updateDialog} onOpenChange={() => setUpdateDialog(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Update Case Status</DialogTitle>
            <DialogDescription>Update disciplinary case for {updateDialog?.player?.firstName} {updateDialog?.player?.lastName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="served">Served</SelectItem>
                  <SelectItem value="appealed">Appealed</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialog(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={processing}>{processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
