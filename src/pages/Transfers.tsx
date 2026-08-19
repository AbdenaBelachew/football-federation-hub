import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { ArrowRightLeft, Loader2, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const statusColor = (s: string) => {
  if (s === "requested") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  if (s === "approved" || s === "completed") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (s === "rejected") return "bg-red-500/10 text-red-600 border-red-500/20";
  return "bg-gray-500/10 text-gray-600 border-gray-500/20";
};

export default function TransfersPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const [approveDialog, setApproveDialog] = useState<any>(null);
  const [rejectDialog, setRejectDialog] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const limit = 20;

  const transfers = useQuery(api.transfers.list, {
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    limit, offset,
  });
  const approveMutation = useMutation(api.transfers.approve);
  const rejectMutation = useMutation(api.transfers.reject);

  const handleApprove = async () => {
    if (!approveDialog) return;
    setProcessing(true);
    try {
      await approveMutation({ transferId: approveDialog._id, reviewNotes: reviewNotes || undefined });
      toast.success("Transfer approved");
      setApproveDialog(null); setReviewNotes("");
    } catch (e: any) { toast.error(e.message); } finally { setProcessing(false); }
  };

  const handleReject = async () => {
    if (!rejectDialog || !reviewNotes) { toast.error("Provide a reason"); return; }
    setProcessing(true);
    try {
      await rejectMutation({ transferId: rejectDialog._id, reviewNotes });
      toast.success("Transfer rejected");
      setRejectDialog(null); setReviewNotes("");
    } catch (e: any) { toast.error(e.message); } finally { setProcessing(false); }
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <h1 className="text-2xl font-bold tracking-tight">Transfers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage player transfer requests between clubs</p>
        </motion.div>

        <motion.div variants={item}>
          <div className="flex gap-2 flex-wrap">
            {["all", "requested", "approved", "rejected", "completed"].map((s) => (
              <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" className="capitalize"
                onClick={() => { setStatusFilter(s); setOffset(0); }}>{s}</Button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={item}>
          <Card className="ff-shadow-card border-border/60">
            <CardContent className="p-0">
              {!transfers ? <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
              : transfers.items.length === 0 ? <div className="p-12 text-center"><ArrowRightLeft className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" /><p className="text-sm text-muted-foreground">No transfers found</p></div>
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="hidden sm:table-cell">From</TableHead>
                    <TableHead className="hidden md:table-cell">To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {transfers.items.map((t) => (
                      <TableRow key={t._id}>
                        <TableCell className="font-medium">{t.player?.firstName} {t.player?.lastName}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{t.fromClub?.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{t.toClub?.name}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[10px] font-semibold ${statusColor(t.status)}`}>{t.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {t.status === "requested" && (
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10" onClick={() => setApproveDialog(t)}>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-500/10" onClick={() => setRejectDialog(t)}>
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {transfers && transfers.total > limit && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-xs text-muted-foreground">Showing {offset + 1}–{Math.min(offset + limit, transfers.total)} of {transfers.total}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" disabled={offset + limit >= transfers.total} onClick={() => setOffset(offset + limit)}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Approve Transfer</DialogTitle>
            <DialogDescription>Approve transfer for {approveDialog?.player?.firstName} {approveDialog?.player?.lastName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2"><Label>Notes (optional)</Label><Input value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={processing} className="bg-emerald-600 hover:bg-emerald-700">
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Reject Transfer</DialogTitle>
            <DialogDescription>Reject transfer for {rejectDialog?.player?.firstName} {rejectDialog?.player?.lastName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2"><Label>Reason *</Label><Input value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Provide a reason" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
