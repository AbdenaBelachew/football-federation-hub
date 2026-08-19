import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const statusColor = (s: string) => {
  if (s === "active") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (s === "pending") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  if (s === "rejected") return "bg-red-500/10 text-red-600 border-red-500/20";
  if (s === "expired") return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  if (s === "transferred") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  return "bg-gray-500/10 text-gray-600 border-gray-500/20";
};

export default function RegistrationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const [detailReg, setDetailReg] = useState<any>(null);
  const [approveDialog, setApproveDialog] = useState<any>(null);
  const [rejectDialog, setRejectDialog] = useState<any>(null);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const limit = 20;

  const regs = useQuery(api.registrations.list, {
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    limit,
    offset,
  });

  const approveMutation = useMutation(api.registrations.approve);
  const rejectMutation = useMutation(api.registrations.reject);

  const handleApprove = async () => {
    if (!approveDialog) return;
    setProcessing(true);
    try {
      await approveMutation({
        registrationId: approveDialog._id,
        licenseNumber: licenseNumber || undefined,
      });
      toast.success("Registration approved");
      setApproveDialog(null);
      setLicenseNumber("");
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog || !rejectReason) {
      toast.error("Please provide a reason");
      return;
    }
    setProcessing(true);
    try {
      await rejectMutation({
        registrationId: rejectDialog._id,
        reason: rejectReason,
      });
      toast.success("Registration rejected");
      setRejectDialog(null);
      setRejectReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reject");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <h1 className="text-2xl font-bold tracking-tight">Player Registrations</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and manage player registration requests</p>
        </motion.div>

        <motion.div variants={item}>
          <div className="flex gap-2 flex-wrap">
            {["all", "pending", "active", "expired", "transferred", "rejected"].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                className="capitalize"
                onClick={() => { setStatusFilter(s); setOffset(0); }}
              >
                {s}
              </Button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={item}>
          <Card className="ff-shadow-card border-border/60">
            <CardContent className="p-0">
              {!regs ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : regs.items.length === 0 ? (
                <div className="p-12 text-center">
                  <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No registrations found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead className="hidden sm:table-cell">Club</TableHead>
                      <TableHead className="hidden md:table-cell">Season</TableHead>
                      <TableHead className="hidden lg:table-cell">Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regs.items.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell className="font-medium">
                          {r.player?.firstName} {r.player?.lastName}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {r.club?.name ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {r.season?.name ?? "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                          {r.registrationDate}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-semibold ${statusColor(r.status)}`}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setDetailReg(r)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {r.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                  onClick={() => setApproveDialog(r)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                  onClick={() => setRejectDialog(r)}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {regs && regs.total > limit && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-xs text-muted-foreground">
                Showing {offset + 1}–{Math.min(offset + limit, regs.total)} of {regs.total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" disabled={offset + limit >= regs.total} onClick={() => setOffset(offset + limit)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Detail Dialog */}
      <Dialog open={!!detailReg} onOpenChange={() => setDetailReg(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Registration Details</DialogTitle>
          </DialogHeader>
          {detailReg && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Player:</span> <span className="font-medium">{detailReg.player?.firstName} {detailReg.player?.lastName}</span></div>
                <div><span className="text-muted-foreground">Club:</span> <span className="font-medium">{detailReg.club?.name}</span></div>
                <div><span className="text-muted-foreground">Season:</span> <span className="font-medium">{detailReg.season?.name}</span></div>
                <div><span className="text-muted-foreground">Competition:</span> <span className="font-medium">{detailReg.competition?.name}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span>{detailReg.registrationDate}</span></div>
                <div><span className="text-muted-foreground">License:</span> <span>{detailReg.licenseNumber ?? "—"}</span></div>
              </div>
              <div>
                <span className="text-muted-foreground">Status: </span>
                <Badge variant="outline" className={`text-[10px] font-semibold ${statusColor(detailReg.status)}`}>
                  {detailReg.status}
                </Badge>
              </div>
              {detailReg.notes && (
                <div><span className="text-muted-foreground">Notes:</span> <span>{detailReg.notes}</span></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Approve Registration</DialogTitle>
            <DialogDescription>
              Approve the registration for {approveDialog?.player?.firstName} {approveDialog?.player?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>License Number (optional)</Label>
              <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="e.g. LIC-2025-00123" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={processing} className="bg-emerald-600 hover:bg-emerald-700">
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>
              Reject the registration for {rejectDialog?.player?.firstName} {rejectDialog?.player?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Provide a reason for rejection" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
