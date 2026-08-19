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
  Plus,
  Trophy,
  Loader2,
  Swords,
  Shield,
  Users,
  Smile,
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

const typeIcons: Record<string, React.ElementType> = {
  league: Swords,
  cup: Shield,
  youth: Users,
  friendly: Smile,
};
const typeColors: Record<string, string> = {
  league: "bg-emerald-500/10 text-emerald-600",
  cup: "bg-amber-500/10 text-amber-600",
  youth: "bg-blue-500/10 text-blue-600",
  friendly: "bg-violet-500/10 text-violet-600",
};

export default function CompetitionsPage() {
  const seasons = useQuery(api.seasons.list);
  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  const competitions = useQuery(api.competitions.list, {
    seasonId: selectedSeason !== "all" ? (selectedSeason as any) : undefined,
  });
  const createCompetition = useMutation(api.competitions.create);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "league" as string,
    seasonId: "",
    description: "",
    registrationDeadline: "",
  });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!form.name || !form.seasonId) {
      toast.error("Name and season are required");
      return;
    }
    setCreating(true);
    try {
      await createCompetition({
        name: form.name,
        type: form.type as any,
        seasonId: form.seasonId as any,
        description: form.description || undefined,
        registrationDeadline: form.registrationDeadline || undefined,
      });
      toast.success("Competition created");
      setOpen(false);
      setForm({ name: "", type: "league", seasonId: "", description: "", registrationDeadline: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to create competition");
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Competitions</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage leagues, cups, and tournaments</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Competition</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>New Competition</DialogTitle>
                <DialogDescription>Create a new competition or tournament</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-1.5">
                  <Label>Competition Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Type *</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="league">League</SelectItem>
                        <SelectItem value="cup">Cup</SelectItem>
                        <SelectItem value="youth">Youth</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Season *</Label>
                    <Select value={form.seasonId} onValueChange={(v) => setForm({ ...form, seasonId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                      <SelectContent>
                        {seasons?.map((s) => (
                          <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Registration Deadline</Label>
                  <Input type="date" value={form.registrationDeadline} onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        <motion.div variants={item}>
          {seasons && seasons.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedSeason === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSeason("all")}
              >
                All Seasons
              </Button>
              {seasons.map((s) => (
                <Button
                  key={s._id}
                  variant={selectedSeason === s._id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSeason(s._id)}
                >
                  {s.name}
                </Button>
              ))}
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!competitions ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="ff-shadow-card border-border/60">
                <CardContent className="p-6">
                  <div className="space-y-3 animate-pulse">
                    <div className="h-5 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : competitions.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Trophy className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No competitions found</p>
            </div>
          ) : (
            competitions.map((c) => {
              const Icon = typeIcons[c.type] ?? Trophy;
              const color = typeColors[c.type] ?? "bg-gray-500/10 text-gray-600";
              return (
                <motion.div key={c._id} variants={item}>
                  <Card className="ff-shadow-card border-border/60 hover:ff-shadow-elevated transition-shadow duration-200">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold">{c.name}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{c.seasonName}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize font-semibold">
                          {c.type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                      {c.registrationDeadline && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Registration closes: {c.registrationDeadline}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
