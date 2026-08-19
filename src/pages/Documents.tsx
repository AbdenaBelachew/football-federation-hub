import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { FileText, Loader2, CheckCircle2, XCircle, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const statusColor = (s: string) => {
  if (s === "verified") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (s === "pending") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  if (s === "rejected") return "bg-red-500/10 text-red-600 border-red-500/20";
  return "bg-gray-500/10 text-gray-600 border-gray-500/20";
};
const docTypeLabel: Record<string, string> = {
  passport: "Passport", national_id: "National ID", birth_certificate: "Birth Certificate",
  medical_certificate: "Medical", transfer_agreement: "Transfer Agreement",
  license: "License", photo: "Photo", other: "Other",
};

export default function DocumentsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fileName: "", documentType: "passport", ownerType: "player", ownerId: "", expiryDate: "" });
  const [creating, setCreating] = useState(false);
  const limit = 20;

  const docs = useQuery(api.documents.list, {
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    limit, offset,
  });
  const createDoc = useMutation(api.documents.create);
  const verifyDoc = useMutation(api.documents.verify);

  const handleCreate = async () => {
    if (!form.fileName || !form.ownerId) { toast.error("File name and owner ID required"); return; }
    setCreating(true);
    try {
      await createDoc({
        fileName: form.fileName, fileType: "application/octet-stream", fileSize: 0,
        documentType: form.documentType as any, ownerType: form.ownerType as any,
        ownerId: form.ownerId, expiryDate: form.expiryDate || undefined,
      });
      toast.success("Document record created"); setOpen(false);
      setForm({ fileName: "", documentType: "passport", ownerType: "player", ownerId: "", expiryDate: "" });
    } catch (e: any) { toast.error(e.message); } finally { setCreating(false); }
  };

  const handleVerify = async (docId: string, status: "verified" | "rejected") => {
    try { await verifyDoc({ documentId: docId as any, status }); toast.success(`Document ${status}`); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold tracking-tight">Documents</h1><p className="text-sm text-muted-foreground mt-1">Manage uploaded documents and verification</p></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Upload className="h-4 w-4" /> Upload Document</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
              <DialogHeader><DialogTitle>Upload Document</DialogTitle><DialogDescription>Register a new document</DialogDescription></DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-1.5"><Label>File Name *</Label><Input value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Document Type</Label>
                    <Select value={form.documentType} onValueChange={(v) => setForm({ ...form, documentType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(docTypeLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Owner Type</Label>
                    <Select value={form.ownerType} onValueChange={(v) => setForm({ ...form, ownerType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="player">Player</SelectItem><SelectItem value="club">Club</SelectItem><SelectItem value="registration">Registration</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5"><Label>Owner ID *</Label><Input value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} placeholder="Convex document ID" /></div>
                <div className="space-y-1.5"><Label>Expiry Date</Label><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating}>{creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        <motion.div variants={item}>
          <div className="flex gap-2 flex-wrap">
            {["all", "pending", "verified", "rejected"].map((s) => (
              <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" className="capitalize"
                onClick={() => { setStatusFilter(s); setOffset(0); }}>{s}</Button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={item}>
          <Card className="ff-shadow-card border-border/60">
            <CardContent className="p-0">
              {!docs ? <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
              : docs.items.length === 0 ? <div className="p-12 text-center"><FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" /><p className="text-sm text-muted-foreground">No documents</p></div>
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {docs.items.map((d) => (
                      <TableRow key={d._id}>
                        <TableCell className="font-medium">{d.fileName}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{docTypeLabel[d.documentType] ?? d.documentType}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm capitalize">{d.ownerType}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[10px] font-semibold ${statusColor(d.status)}`}>{d.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {d.status === "pending" && (
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10" onClick={() => handleVerify(d._id, "verified")}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-500/10" onClick={() => handleVerify(d._id, "rejected")}><XCircle className="h-3.5 w-3.5" /></Button>
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
          {docs && docs.total > limit && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-xs text-muted-foreground">Showing {offset + 1}–{Math.min(offset + limit, docs.total)} of {docs.total}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" disabled={offset + limit >= docs.total} onClick={() => setOffset(offset + limit)}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
