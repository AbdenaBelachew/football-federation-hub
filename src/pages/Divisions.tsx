import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Plus, Layers, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function DivisionsPage() {
  const seasons = useQuery(api.seasons.list);
  const [selectedSeason, setSelectedSeason] = useState("all");
  const divisions = useQuery(api.divisions.list, {
    seasonId: selectedSeason !== "all" ? (selectedSeason as any) : undefined,
  });
  const createDivision = useMutation(api.divisions.create);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", tier: "1", seasonId: "", description: "", maxClubs: "", promotionSlots: "", relegationSlots: "" });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!form.name || !form.seasonId) { toast.error("Name and season required"); return; }
    setCreating(true);
    try {
      await createDivision({
        name: form.name, tier: parseInt(form.tier), seasonId: form.seasonId as any,
        description: form.description || undefined,
        maxClubs: form.maxClubs ? parseInt(form.maxClubs) : undefined,
        promotionSlots: form.promotionSlots ? parseInt(form.promotionSlots) : undefined,
        relegationSlots: form.relegationSlots ? parseInt(form.relegationSlots) : undefined,
      });
      toast.success("Division created");
      setOpen(false);
      setForm({ name: "", tier: "1", seasonId: "", description: "", maxClubs: "", promotionSlots: "", relegationSlots: "" });
    } catch (e: any) { toast.error(e.message); } finally { setCreating(false); }
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Divisions</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage competition tiers and division structure</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add Division</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
              <DialogHeader><DialogTitle>New Division</DialogTitle><DialogDescription>Create a competition tier</DialogDescription></DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Tier *</Label><Input type="number" min="1" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} /></div>
                </div>
                <div className="space-y-1.5"><Label>Season *</Label>
                  <Select value={form.seasonId} onValueChange={(v) => setForm({ ...form, seasonId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                    <SelectContent>{seasons?.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label>Max Clubs</Label><Input type="number" value={form.maxClubs} onChange={(e) => setForm({ ...form, maxClubs: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Promotion</Label><Input type="number" value={form.promotionSlots} onChange={(e) => setForm({ ...form, promotionSlots: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Relegation</Label><Input type="number" value={form.relegationSlots} onChange={(e) => setForm({ ...form, relegationSlots: e.target.value })} /></div>
                </div>
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
            <Button variant={selectedSeason === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedSeason("all")}>All Seasons</Button>
            {seasons?.map((s) => <Button key={s._id} variant={selectedSeason === s._id ? "default" : "outline"} size="sm" onClick={() => setSelectedSeason(s._id)}>{s.name}</Button>)}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!divisions ? Array.from({ length: 3 }).map((_, i) => <Card key={i} className="ff-shadow-card border-border/60"><CardContent className="p-6"><div className="h-5 bg-muted rounded w-1/2 animate-pulse" /></CardContent></Card>)
           : divisions.length === 0 ? <div className="col-span-full text-center py-12"><Layers className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" /><p className="text-sm text-muted-foreground">No divisions yet</p></div>
           : divisions.map((d) => (
            <motion.div key={d._id} variants={item}>
              <Card className="ff-shadow-card border-border/60 hover:ff-shadow-elevated transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <span className="text-sm font-bold text-primary">T{d.tier}</span>
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">{d.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{d.seasonName}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Tier {d.tier}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  {d.description && <p>{d.description}</p>}
                  <div className="flex gap-4">
                    {d.maxClubs && <span>Max: {d.maxClubs}</span>}
                    {d.promotionSlots && <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3 text-emerald-500" />{d.promotionSlots}</span>}
                    {d.relegationSlots && <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3 text-red-500" />{d.relegationSlots}</span>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
