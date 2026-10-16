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
import type { Competition, Season, Club } from "@/lib/types";
import {
  Trophy,
  Plus,
  RefreshCw,
  Calendar,
  Layers,
  CheckCircle2,
  Award,
  Building2,
  Download,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";
import { downloadCsv, parseCsv } from "@/lib/csv";

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Add Single Club state
  const [enrollDialog, setEnrollDialog] = useState(false);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  // Bulk CSV Import Clubs to Competition State
  const [importCompClubsModalOpen, setImportCompClubsModalOpen] = useState(false);
  const [importTargetCompId, setImportTargetCompId] = useState("");
  const [matchedClubsToEnroll, setMatchedClubsToEnroll] = useState<Club[]>([]);
  const [unmatchedNames, setUnmatchedNames] = useState<string[]>([]);
  const [importingCompClubs, setImportingCompClubs] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "league" as const,
    seasonId: "season-2025-2026",
    description: "Official federation championship",
    rules: "Standard FIFA 90-min rules, 3 points for win",
    isActive: true,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [compRes, sRes, cRes] = await Promise.all([
        api.competitions.list(),
        api.seasons.list(),
        api.clubs.list(),
      ]);
      if (compRes?.competitions) setCompetitions(compRes.competitions);
      if (sRes?.seasons) setSeasons(sRes.seasons);
      if (cRes?.clubs) setClubs(cRes.clubs);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load competitions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComp || !selectedClubId) {
      toast.error("Please select a club to add");
      return;
    }
    try {
      setEnrolling(true);
      const club = clubs.find((c) => c.id === selectedClubId);
      await api.teams.create({
        clubId: selectedClubId,
        competitionId: selectedComp.id,
        name: `${club?.name || "Club"} Squad`,
      });
      toast.success(`'${club?.name}' added to ${selectedComp.name}!`);
      setEnrollDialog(false);
      setSelectedClubId("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add club to competition");
    } finally {
      setEnrolling(false);
    }
  };

  const handleExportCompClubs = (comp: Competition) => {
    if (!comp.clubs || comp.clubs.length === 0) {
      toast.error(`No clubs currently enrolled in ${comp.name}`);
      return;
    }
    const headers = [
      "Club Name",
      "Registration Number",
      "City",
      "Country",
      "Stadium",
      "Competition",
      "Type",
      "Season",
    ];
    const rows = comp.clubs.map((c) => [
      c.name,
      c.registrationNumber || "",
      c.city || "",
      c.country || "Ethiopia",
      c.stadium || "",
      comp.name,
      comp.type.toUpperCase(),
      comp.seasonName || "2025/2026",
    ]);
    downloadCsv(`${comp.name.replace(/\s+/g, "_")}_clubs`, headers, rows);
    toast.success(`Exported ${comp.clubs.length} clubs from ${comp.name}!`);
  };

  const handleDownloadCompClubsTemplate = () => {
    const headers = ["Club Name", "Registration Number"];
    const sampleRows = [
      ["Saint George SC", "FED-CLB-001"],
      ["Ethiopian Coffee SC", "FED-CLB-002"],
      ["Fasil Kenema SC", "FED-CLB-003"],
    ];
    downloadCsv("competition_clubs_template", headers, sampleRows);
    toast.success("Competition clubs sample CSV template downloaded!");
  };

  const handleCompCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const rows = parseCsv(content);
        if (rows.length < 2) {
          toast.error("CSV file must have a header row and at least one data row");
          return;
        }

        const headers = rows[0].map((h) => h.toLowerCase().trim().replace(/[\s_]+/g, ""));
        const nameIdx = headers.findIndex((h) => h === "name" || h === "clubname" || h.includes("club"));
        const regIdx = headers.findIndex((h) => h.includes("reg") || h.includes("id"));

        if (nameIdx === -1 && regIdx === -1) {
          toast.error("CSV must contain a 'Club Name' or 'Registration Number' column");
          return;
        }

        const matched: Club[] = [];
        const unmatched: string[] = [];
        const seenIds = new Set<string>();

        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const nameVal = nameIdx !== -1 ? r[nameIdx]?.trim().toLowerCase() : "";
          const regVal = regIdx !== -1 ? r[regIdx]?.trim().toLowerCase() : "";
          if (!nameVal && !regVal) continue;

          // Find club in database
          const found = clubs.find((c) => {
            if (nameVal && c.name.toLowerCase() === nameVal) return true;
            if (nameVal && c.shortName && c.shortName.toLowerCase() === nameVal) return true;
            if (regVal && c.registrationNumber && c.registrationNumber.toLowerCase() === regVal) return true;
            if (regVal && c.id.toLowerCase() === regVal) return true;
            return false;
          });

          if (found && !seenIds.has(found.id)) {
            seenIds.add(found.id);
            matched.push(found);
          } else if (!found) {
            unmatched.push(r[nameIdx] || r[regIdx] || `Row ${i + 1}`);
          }
        }

        setMatchedClubsToEnroll(matched);
        setUnmatchedNames(unmatched);

        if (matched.length === 0) {
          toast.error("None of the clubs in the CSV matched existing affiliated clubs");
        } else {
          toast.success(`Matched ${matched.length} club(s) from database!`);
        }
      } catch (err: any) {
        toast.error("Failed to parse CSV: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmCompClubsImport = async () => {
    if (!importTargetCompId || matchedClubsToEnroll.length === 0) {
      toast.error("Select a competition and upload a CSV with matched clubs");
      return;
    }

    const comp = competitions.find((c) => c.id === importTargetCompId);
    try {
      setImportingCompClubs(true);
      let successCount = 0;
      let skippedCount = 0;

      for (const club of matchedClubsToEnroll) {
        try {
          await api.teams.create({
            clubId: club.id,
            competitionId: importTargetCompId,
            name: `${club.name} Squad`,
          });
          successCount++;
        } catch {
          skippedCount++;
        }
      }

      toast.success(
        `Enrolled ${successCount} clubs to ${comp?.name || "competition"}${
          skippedCount ? ` (${skippedCount} already in competition)` : ""
        }!`
      );
      setImportCompClubsModalOpen(false);
      setMatchedClubsToEnroll([]);
      setUnmatchedNames([]);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to enroll clubs");
    } finally {
      setImportingCompClubs(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.competitions.create(formData);
      toast.success("Competition created!");
      setCreateDialog(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create competition");
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
              <h1 className="text-2xl font-bold tracking-tight">Competitions & Tournaments</h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {competitions.length} Tournaments
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              National leagues, knockout cups & youth championship governance
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImportTargetCompId(competitions[0]?.id || "");
                setMatchedClubsToEnroll([]);
                setUnmatchedNames([]);
                setImportCompClubsModalOpen(true);
              }}
              disabled={loading || competitions.length === 0}
              className="text-xs gap-1.5 h-9 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-blue-600" />
              <span>Import Clubs CSV</span>
            </Button>
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
              <span>Create Competition</span>
            </Button>
          </div>
        </div>

        {/* Competitions Grid */}
        {loading ? (
          <div className="text-center py-16 text-xs text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Loading competitions...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {competitions.map((comp) => (
              <Card
                key={comp.id}
                className="border-border/70 hover:border-emerald-500/50 hover:shadow-md transition-all overflow-hidden group"
              >
                <div className="h-2 bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500" />
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <Trophy className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                          {comp.name}
                        </h3>
                        <p className="text-xs text-muted-foreground capitalize">{comp.type} Competition</p>
                      </div>
                    </div>

                    <Badge
                      className={`text-[10px] uppercase font-mono ${
                        comp.isActive
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {comp.isActive ? "Active" : "Archived"}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {comp.description || "Official tournament sanctioned under federation statutes."}
                  </p>

                  {/* Enrolled Clubs */}
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Participating Clubs ({comp.clubs?.length || 0})</span>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 cursor-pointer"
                        onClick={() => {
                          setSelectedComp(comp);
                          setSelectedClubId("");
                          setEnrollDialog(true);
                        }}
                      >
                        <Plus className="h-3 w-3" /> Add Club
                      </Button>
                    </div>

                    {comp.clubs && comp.clubs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {comp.clubs.map((club) => (
                          <Badge
                            key={club.id}
                            variant="secondary"
                            className="text-[11px] font-normal py-0.5 px-2 bg-muted/60 hover:bg-muted"
                          >
                            {club.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">No clubs added yet</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExportCompClubs(comp)}
                      disabled={!comp.clubs || comp.clubs.length === 0}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-1.5 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Export Clubs</span>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-emerald-600">
                      <Link to="/dashboard/standings">View Table</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Competition</DialogTitle>
              <DialogDescription className="text-xs">
                Configure tournament format and season schedule
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Competition Title</Label>
                <Input
                  required
                  placeholder="e.g. Ethiopian Super Cup"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  >
                    <option value="league">League</option>
                    <option value="cup">Cup / Knockout</option>
                    <option value="youth">Youth Championship</option>
                    <option value="friendly">Super Cup</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Season</Label>
                  <select
                    value={formData.seasonId}
                    onChange={(e) => setFormData({ ...formData, seasonId: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  >
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
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
                  {submitting ? "Creating..." : "Create Competition"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Club to Competition Modal */}
        <Dialog open={enrollDialog} onOpenChange={setEnrollDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Club to {selectedComp?.name}</DialogTitle>
              <DialogDescription className="text-xs">
                Enroll an affiliated club to compete in this competition
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddClub} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Select Club *</Label>
                <select
                  required
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">-- Choose Affiliated Club --</option>
                  {clubs.map((c) => {
                    const alreadyInComp = selectedComp?.clubs?.some((cc) => cc.id === c.id);
                    return (
                      <option key={c.id} value={c.id} disabled={alreadyInComp}>
                        {c.name} ({c.city || c.country}){alreadyInComp ? " (Already in Competition)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedComp && (
                <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1 border border-border/50">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tournament Type:</span>
                    <span className="font-semibold text-foreground uppercase">{selectedComp.type}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Current Participating Clubs:</span>
                    <span className="font-semibold text-foreground">{selectedComp.clubs?.length || 0} Clubs</span>
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEnrollDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={enrolling} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {enrolling ? "Enrolling..." : "Add Club to Competition"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Clubs to Competition Modal */}
        <Dialog open={importCompClubsModalOpen} onOpenChange={setImportCompClubsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <span>Import Clubs to Competition from CSV</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Upload a CSV spreadsheet with club names or registration numbers to bulk enroll clubs into a tournament
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Target Competition *</Label>
                <select
                  value={importTargetCompId}
                  onChange={(e) => setImportTargetCompId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type.toUpperCase()}) — Currently has {c.clubs?.length || 0} clubs
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Need a sample format?</p>
                  <p className="text-muted-foreground text-[11px]">Download our pre-formatted Competition Clubs CSV template</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCompClubsTemplate}
                  className="text-xs gap-1.5 h-8 text-emerald-600 border-emerald-500/30"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Sample Template</span>
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="compCsvFileInput" className="text-xs">Choose CSV File (.csv)</Label>
                <Input
                  id="compCsvFileInput"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCompCsvFileSelect}
                  className="text-xs cursor-pointer"
                />
              </div>

              {matchedClubsToEnroll.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Matched Affiliated Clubs ({matchedClubsToEnroll.length} Ready to Enroll)</span>
                    <Badge variant="secondary" className="font-mono text-[10px] text-emerald-600">
                      Matched
                    </Badge>
                  </div>
                  <div className="max-h-52 overflow-auto rounded-md border border-border/60">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/60 sticky top-0 font-semibold border-b border-border/60">
                        <tr>
                          <th className="p-2">Club Name</th>
                          <th className="p-2">Reg #</th>
                          <th className="p-2">City</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {matchedClubsToEnroll.map((c) => (
                          <tr key={c.id} className="hover:bg-muted/30">
                            <td className="p-2 font-medium">{c.name}</td>
                            <td className="p-2 font-mono text-[11px] text-muted-foreground">{c.registrationNumber || "—"}</td>
                            <td className="p-2 text-muted-foreground">{c.city || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {unmatchedNames.length > 0 && (
                <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                  <p className="font-semibold">Notice: {unmatchedNames.length} row(s) in CSV did not match any existing club:</p>
                  <p className="text-[11px] text-muted-foreground truncate">{unmatchedNames.join(", ")}</p>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setImportCompClubsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={importingCompClubs || matchedClubsToEnroll.length === 0}
                onClick={handleConfirmCompClubsImport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Upload className="h-4 w-4" />
                <span>{importingCompClubs ? "Enrolling Clubs..." : `Enroll ${matchedClubsToEnroll.length} Clubs`}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
