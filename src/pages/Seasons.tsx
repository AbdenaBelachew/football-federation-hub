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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import {
  Plus,
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
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

export default function SeasonsPage() {
  const seasons = useQuery(api.seasons.list);
  const createSeason = useMutation(api.seasons.create);
  const toggleActive = useMutation(api.seasons.toggleActive);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "", description: "" });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!form.name || !form.startDate || !form.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    setCreating(true);
    try {
      await createSeason({
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description || undefined,
      });
      toast.success("Season created");
      setOpen(false);
      setForm({ name: "", startDate: "", endDate: "", description: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to create season");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await toggleActive({ seasonId: id as any, isActive: !current });
      toast.success("Season status updated");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Seasons</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage competition seasons</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Season</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
              <DialogHeader>
                <DialogTitle>New Season</DialogTitle>
                <DialogDescription>Create a new competition season</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-1.5">
                  <Label>Season Name *</Label>
                  <Input placeholder="e.g. 2025-2026" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Start Date *</Label>
                    <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End Date *</Label>
                    <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Season
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!seasons ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="ff-shadow-card border-border/60">
                <CardContent className="p-6">
                  <div className="space-y-3 animate-pulse">
                    <div className="h-5 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : seasons.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No seasons yet</p>
            </div>
          ) : (
            seasons.map((s) => (
              <motion.div key={s._id} variants={item}>
                <Card className="ff-shadow-card border-border/60 hover:ff-shadow-elevated transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">{s.name}</CardTitle>
                      <Badge variant="outline" className={`text-[10px] font-semibold ${s.isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-gray-500/10 text-gray-600 border-gray-500/20"}`}>
                        {s.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Start: {s.startDate}</p>
                      <p>End: {s.endDate}</p>
                      {s.description && <p className="italic">{s.description}</p>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleToggle(s._id, s.isActive)}
                    >
                      {s.isActive ? <XCircle className="h-3.5 w-3.5 mr-2" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-2" />}
                      {s.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
