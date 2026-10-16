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
import type { Document, Player } from "@/lib/types";
import {
  FileText,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileCheck2,
  ShieldCheck,
  Search,
} from "lucide-react";
import { toast } from "sonner";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fileName: "Medical_Clearance_2026.pdf",
    fileType: "application/pdf",
    fileSize: 1048576,
    documentType: "medical_certificate" as const,
    ownerType: "player" as const,
    ownerId: "",
    status: "pending" as const,
    uploadedBy: "Club Medical Staff",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [docRes, pRes] = await Promise.all([
        api.documents.list(),
        api.players.list(),
      ]);
      if (docRes?.documents) setDocuments(docRes.documents);
      if (pRes?.players) setPlayers(pRes.players);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerify = async (id: string, status: "verified" | "rejected") => {
    try {
      await api.documents.verify(id, status);
      toast.success(`Document marked as ${status}!`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify document");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.documents.create(formData);
      toast.success("Document uploaded & submitted for verification!");
      setCreateDialog(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
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
              <h1 className="text-2xl font-bold tracking-tight">Digital Document Compliance Vault</h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {documents.length} Files
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Player IDs, medical certificates, club licenses & FIFA transfer agreements
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
              <span>Upload Document</span>
            </Button>
          </div>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="text-center py-16 text-xs text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card border-dashed">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-semibold">No compliance documents uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => {
              const isVerified = doc.status === "verified";
              const isPending = doc.status === "pending";

              return (
                <Card
                  key={doc.id}
                  className="border-border/70 hover:border-emerald-500/50 hover:shadow-md transition-all overflow-hidden"
                >
                  <div
                    className={`h-2 ${
                      isVerified
                        ? "bg-emerald-500"
                        : isPending
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                  />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-foreground truncate max-w-[170px]">
                            {doc.fileName}
                          </h3>
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {doc.documentType.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={isVerified ? "default" : isPending ? "secondary" : "destructive"}
                        className={`text-[10px] uppercase font-mono ${
                          isVerified
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            : isPending
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : ""
                        }`}
                      >
                        {doc.status}
                      </Badge>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Owner Type:</span>
                        <span className="font-semibold capitalize">{doc.ownerType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">File Size:</span>
                        <span className="font-mono">{(doc.fileSize / 1024).toFixed(1)} KB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Uploaded By:</span>
                        <span className="truncate max-w-[120px]">{doc.uploadedBy}</span>
                      </div>
                    </div>

                    {isPending ? (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                        <Button
                          size="sm"
                          onClick={() => handleVerify(doc.id, "verified")}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Verify</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerify(doc.id, "rejected")}
                          className="flex-1 text-rose-600 border-rose-500/30 text-xs h-7 gap-1 cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Verified & Archived</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Upload Document Modal */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Compliance Document</DialogTitle>
              <DialogDescription className="text-xs">
                Submit certified copy for official registry validation
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Document Name</Label>
                <Input
                  required
                  value={formData.fileName}
                  onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Document Type</Label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value as any })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  >
                    <option value="medical_certificate">Medical Certificate</option>
                    <option value="passport">Passport / National ID</option>
                    <option value="transfer_agreement">Transfer Agreement</option>
                    <option value="license">Club License</option>
                    <option value="birth_certificate">Birth Certificate</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Owner Type</Label>
                  <select
                    value={formData.ownerType}
                    onChange={(e) => setFormData({ ...formData, ownerType: e.target.value as any })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  >
                    <option value="player">Player</option>
                    <option value="club">Club</option>
                    <option value="registration">Registration</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Assign to Player (Optional)</Label>
                <select
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">Select Player</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {submitting ? "Uploading..." : "Submit File"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
