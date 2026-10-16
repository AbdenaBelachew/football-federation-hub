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
import type { Season } from "@/lib/types";
import { Calendar, Plus, RefreshCw, CheckCircle2, Star } from "lucide-react";
import { toast } from "sonner";

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "2026/2027",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    description: "Upcoming official federation championship season",
    isActive: false,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.seasons.list();
      if (res?.seasons) setSeasons(res.seasons);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load seasons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSetActive = async (id: string) => {
    try {
      await api.seasons.setActive(id);
      toast.success("Active season updated!");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to set active season");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.seasons.create(formData);
      toast.success("Season created!");
      setCreateDialog(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create season");
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
              <h1 className="text-2xl font-bold tracking-tight">Federation Seasons</h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {seasons.length} Seasons
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Official annual competition calendar & active registration window control
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
              <span>Add Season</span>
            </Button>
          </div>
        </div>

        {/* Seasons Grid */}
        {loading ? (
          <div className="text-center py-16 text-xs text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Loading seasons...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {seasons.map((s) => (
              <Card
                key={s.id}
                className="border-border/70 hover:border-emerald-500/50 hover:shadow-md transition-all overflow-hidden"
              >
                <div
                  className={`h-2 ${s.isActive ? "bg-emerald-500" : "bg-muted"}`}
                />
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">Season {s.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {s.startDate} to {s.endDate}
                        </p>
                      </div>
                    </div>

                    <Badge
                      className={`text-[10px] uppercase font-mono ${
                        s.isActive
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.isActive ? "Active Season" : "Inactive"}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {s.description || "Official annual season schedule."}
                  </p>

                  <div className="pt-2 border-t border-border/40">
                    {!s.isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetActive(s.id)}
                        className="w-full text-xs h-8 cursor-pointer"
                      >
                        Set as Current Active Season
                      </Button>
                    ) : (
                      <div className="text-center text-xs text-emerald-600 font-semibold py-1 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Active Competition Season</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Season Modal */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Federation Season</DialogTitle>
              <DialogDescription className="text-xs">
                Define championship calendar dates and registration timeframe
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Season Name</Label>
                <Input
                  required
                  placeholder="e.g. 2026/2027"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {submitting ? "Adding..." : "Add Season"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
