import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Club, Player } from "@/lib/types";
import { motion } from "framer-motion";
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  MapPin,
  Calendar,
  Users,
  Shield,
  Eye,
  Trash2,
  CheckCircle2,
  Download,
  Upload,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  X,
  Trophy,
  Landmark,
  Layers,
  LayoutGrid,
  List,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import { downloadCsv, parseCsv } from "@/lib/csv";
import { useAuth } from "@/hooks/use-auth";

export default function ClubsPage() {
  const { user } = useAuth();
  const isSuperOrFedAdmin = user?.role === "super_admin" || user?.role === "federation_admin";
  const isClubAdmin = user?.role === "club_admin";
  const userClubId = user?.clubId || (user as any)?.club_id || (user?.email === "club@saintgeorge.org" ? "club-1" : undefined);

  const [clubs, setClubs] = useState<Club[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Club scope: club admin defaults to their club focus
  const [clubScope, setClubScope] = useState<"my_club" | "all">(isClubAdmin ? "my_club" : "all");

  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit Club Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    shortName: "",
    city: "",
    stadium: "",
    president: "",
    secretary: "",
    contactEmail: "",
    contactPhone: "",
    foundedYear: 1935,
  });

  // CSV Import State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [parsedClubs, setParsedClubs] = useState<Partial<Club>[]>([]);
  const [importing, setImporting] = useState(false);

  const userClub = useMemo(() => clubs.find((c) => c.id === userClubId), [clubs, userClubId]);

  const [formData, setFormData] = useState({
    name: "",
    shortName: "",
    city: "Addis Ababa",
    country: "Ethiopia",
    stadium: "Addis Ababa Stadium",
    president: "",
    foundedYear: 1935,
    status: "active" as const,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, pRes] = await Promise.all([
        api.clubs.list(),
        api.players.list(),
      ]);
      if (cRes?.clubs) setClubs(cRes.clubs);
      if (pRes?.players) setPlayers(pRes.players);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load clubs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperOrFedAdmin) {
      toast.error("Only federation administrators are authorized to affiliate new clubs");
      return;
    }
    try {
      setSubmitting(true);
      await api.clubs.create(formData);
      toast.success("Club affiliated successfully!");
      setAddModalOpen(false);
      setFormData({
        name: "",
        shortName: "",
        city: "Addis Ababa",
        country: "Ethiopia",
        stadium: "Addis Ababa Stadium",
        president: "",
        foundedYear: 1935,
        status: "active",
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create club");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (club: Club) => {
    setEditingClub(club);
    setEditFormData({
      name: club.name || "",
      shortName: club.shortName || "",
      city: club.city || "",
      stadium: club.stadium || "",
      president: club.president || "",
      secretary: club.secretary || "",
      contactEmail: club.contactEmail || "",
      contactPhone: club.contactPhone || "",
      foundedYear: club.foundedYear || 1935,
    });
    setEditModalOpen(true);
  };

  const handleUpdateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClub) return;
    if (!isSuperOrFedAdmin && isClubAdmin && editingClub.id !== userClubId) {
      toast.error("You are only authorized to manage your own club profile");
      return;
    }
    try {
      setSubmitting(true);
      await api.clubs.update(editingClub.id, editFormData);
      toast.success("Club profile updated successfully!");
      setEditModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update club");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClub = async (id: string, name: string) => {
    if (!isSuperOrFedAdmin) {
      toast.error("Only federation administrators have permissions to remove clubs from the national registry.");
      return;
    }
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      await api.clubs.delete(id);
      toast.success("Club removed from federation registry");
      setClubs((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete club");
    }
  };

  const handleExportCsv = () => {
    if (clubs.length === 0) {
      toast.error("No clubs to export");
      return;
    }
    const headers = [
      "Name",
      "Short Name",
      "Registration Number",
      "City",
      "Country",
      "Stadium",
      "Founded Year",
      "President",
      "Secretary",
      "Contact Email",
      "Contact Phone",
      "Status",
    ];
    const rows = clubs.map((c) => [
      c.name,
      c.shortName || "",
      c.registrationNumber || "",
      c.city || "",
      c.country || "Ethiopia",
      c.stadium || "",
      c.foundedYear || "",
      c.president || "",
      c.secretary || "",
      c.contactEmail || "",
      c.contactPhone || "",
      c.status || "active",
    ]);
    downloadCsv("clubs_export", headers, rows);
    toast.success(`Exported ${clubs.length} clubs to CSV!`);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "Name",
      "Short Name",
      "Registration Number",
      "City",
      "Country",
      "Stadium",
      "Founded Year",
      "President",
      "Secretary",
      "Contact Email",
      "Contact Phone",
    ];
    const sampleRows = [
      [
        "Wolaitta Dicha SC",
        "Dicha",
        "FED-CLB-007",
        "Sodo",
        "Ethiopia",
        "Sodo Stadium",
        "2009",
        "Tsegaye Mamo",
        "Abebe Bekele",
        "info@dicha.et",
        "+251 46 111 2233",
      ],
      [
        "Dire Dawa City FC",
        "Dire Dawa",
        "FED-CLB-008",
        "Dire Dawa",
        "Ethiopia",
        "Dire Dawa Stadium",
        "1982",
        "Kassahun Desta",
        "Yared Hailu",
        "contact@diredawacity.et",
        "+251 25 111 4455",
      ],
    ];
    downloadCsv("clubs_template", headers, sampleRows);
    toast.success("Sample clubs template downloaded!");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const nameIdx = headers.findIndex((h) => h === "name" || h === "clubname");
        if (nameIdx === -1) {
          toast.error("CSV must have a 'Name' or 'Club Name' column");
          return;
        }

        const shortNameIdx = headers.findIndex((h) => h.includes("short"));
        const regIdx = headers.findIndex((h) => h.includes("reg"));
        const cityIdx = headers.findIndex((h) => h.includes("city"));
        const countryIdx = headers.findIndex((h) => h.includes("country"));
        const stadiumIdx = headers.findIndex((h) => h.includes("stadium"));
        const yearIdx = headers.findIndex((h) => h.includes("year") || h.includes("founded"));
        const presIdx = headers.findIndex((h) => h.includes("president"));
        const secIdx = headers.findIndex((h) => h.includes("secretary"));
        const emailIdx = headers.findIndex((h) => h.includes("email"));
        const phoneIdx = headers.findIndex((h) => h.includes("phone"));

        const list: Partial<Club>[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const name = r[nameIdx]?.trim();
          if (!name) continue;

          list.push({
            name,
            shortName: shortNameIdx !== -1 ? r[shortNameIdx]?.trim() : undefined,
            registrationNumber: regIdx !== -1 ? r[regIdx]?.trim() : undefined,
            city: cityIdx !== -1 ? r[cityIdx]?.trim() || "Addis Ababa" : "Addis Ababa",
            country: countryIdx !== -1 ? r[countryIdx]?.trim() || "Ethiopia" : "Ethiopia",
            stadium: stadiumIdx !== -1 ? r[stadiumIdx]?.trim() : undefined,
            foundedYear: yearIdx !== -1 && r[yearIdx] ? parseInt(r[yearIdx], 10) : undefined,
            president: presIdx !== -1 ? r[presIdx]?.trim() : undefined,
            secretary: secIdx !== -1 ? r[secIdx]?.trim() : undefined,
            contactEmail: emailIdx !== -1 ? r[emailIdx]?.trim() : undefined,
            contactPhone: phoneIdx !== -1 ? r[phoneIdx]?.trim() : undefined,
            status: "active",
          });
        }

        if (list.length === 0) {
          toast.error("No valid club rows found in CSV");
          return;
        }

        setParsedClubs(list);
        toast.success(`Parsed ${list.length} club(s) from CSV!`);
      } catch (err: any) {
        toast.error("Failed to parse CSV file: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (parsedClubs.length === 0) return;
    try {
      setImporting(true);
      const res = await api.clubs.bulkCreate(parsedClubs);
      toast.success(res.message || `Successfully imported ${res.count} clubs!`);
      setImportModalOpen(false);
      setParsedClubs([]);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to import clubs");
    } finally {
      setImporting(false);
    }
  };

  // Distinct cities list for filter dropdown
  const distinctCities = useMemo(() => {
    const set = new Set<string>();
    clubs.forEach((c) => {
      if (c.city && c.city.trim()) set.add(c.city.trim());
    });
    return Array.from(set).sort();
  }, [clubs]);

  // Sorting handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Filter and sort clubs
  const filteredAndSortedClubs = useMemo(() => {
    const q = search.toLowerCase().trim();
    return clubs
      .filter((c) => {
        const matchesSearch =
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.shortName && c.shortName.toLowerCase().includes(q)) ||
          (c.registrationNumber && c.registrationNumber.toLowerCase().includes(q)) ||
          (c.city && c.city.toLowerCase().includes(q)) ||
          (c.stadium && c.stadium.toLowerCase().includes(q)) ||
          (c.president && c.president.toLowerCase().includes(q));

        const matchesStatus = statusFilter === "all" || c.status === statusFilter;
        const matchesCity = cityFilter === "all" || c.city === cityFilter;
        const matchesScope = clubScope === "all" || !userClubId || c.id === userClubId;

        return matchesSearch && matchesStatus && matchesCity && matchesScope;
      })
      .sort((a, b) => {
        let valA: any = "";
        let valB: any = "";

        if (sortField === "name") {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        } else if (sortField === "city") {
          valA = (a.city || "").toLowerCase();
          valB = (b.city || "").toLowerCase();
        } else if (sortField === "stadium") {
          valA = (a.stadium || "").toLowerCase();
          valB = (b.stadium || "").toLowerCase();
        } else if (sortField === "foundedYear") {
          valA = a.foundedYear || 0;
          valB = b.foundedYear || 0;
        } else if (sortField === "squad") {
          valA = players.filter((p) => p.currentClubId === a.id).length;
          valB = players.filter((p) => p.currentClubId === b.id).length;
        } else if (sortField === "status") {
          valA = a.status || "";
          valB = b.status || "";
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [clubs, players, search, statusFilter, cityFilter, sortField, sortDirection, clubScope, userClubId]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedClubs.length / pageSize));
  const paginatedClubs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedClubs.slice(start, start + pageSize);
  }, [filteredAndSortedClubs, currentPage, pageSize]);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, cityFilter, pageSize]);

  // Statistics
  const activeClubsCount = useMemo(
    () => clubs.filter((c) => c.status === "active").length,
    [clubs]
  );
  const totalPlayersInClubs = useMemo(() => {
    const clubIds = new Set(clubs.map((c) => c.id));
    return players.filter((p) => p.currentClubId && clubIds.has(p.currentClubId)).length;
  }, [clubs, players]);
  const uniqueStadiumsCount = useMemo(() => {
    return new Set(clubs.map((c) => c.stadium).filter(Boolean)).size;
  }, [clubs]);

  // Helper for rendering sort indicator
  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60 ml-1 inline-block" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-emerald-600 ml-1 inline-block" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-emerald-600 ml-1 inline-block" />
    );
  };

  const currentYear = new Date().getFullYear();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Affiliated Clubs</h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {clubs.length} Clubs
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Official football clubs licensed for federation competitions & national leagues
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {isClubAdmin && userClub && (
              <Button
                size="sm"
                onClick={() => openEditModal(userClub)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 cursor-pointer"
              >
                <Edit2 className="h-4 w-4" />
                <span>Edit My Club Profile</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={loading || clubs.length === 0}
              className="text-xs gap-1.5 h-9 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </Button>
            {isSuperOrFedAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setParsedClubs([]);
                  setImportModalOpen(true);
                }}
                className="text-xs gap-1.5 h-9 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 text-blue-600" />
                <span>Import CSV</span>
              </Button>
            )}
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
            {isSuperOrFedAdmin && (
              <Button
                size="sm"
                onClick={() => setAddModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Affiliate New Club</span>
              </Button>
            )}
          </div>
        </div>

        {/* Club Admin Dedicated Authority & Scope Banner */}
        {isClubAdmin && userClub && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">{userClub.name}</h2>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Your Club</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {userClub.city || "Addis Ababa"} • Stadium: {userClub.stadium || "Addis Ababa Stadium"} • President: {userClub.president || "Abinet Gebremeskel"}
                  </p>
                </div>
              </div>

              {/* View Scope Tabs */}
              <div className="flex items-center gap-1.5 bg-background/80 p-1 rounded-lg border border-border/60 self-start sm:self-auto">
                <Button
                  variant={clubScope === "my_club" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setClubScope("my_club")}
                  className={`text-xs h-7 px-3 ${clubScope === "my_club" ? "bg-emerald-600 text-white" : ""}`}
                >
                  My Club Focus
                </Button>
                <Button
                  variant={clubScope === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setClubScope("all")}
                  className={`text-xs h-7 px-3 ${clubScope === "all" ? "bg-emerald-600 text-white" : ""}`}
                >
                  Federation Directory (Directory)
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground/90 border-t border-emerald-500/20 pt-2 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>
                Role Segregation Active: You have administrative access to manage {userClub.name} squad and profile.
                Deleting clubs and affiliating new clubs is reserved exclusively for Federation Executives.
              </span>
            </p>
          </div>
        )}

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Total Affiliated
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold tracking-tight">{clubs.length}</span>
                  <span className="text-[11px] text-emerald-600 font-medium">Clubs</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Active Licensed
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold tracking-tight text-emerald-600">
                    {activeClubsCount}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    ({clubs.length ? Math.round((activeClubsCount / clubs.length) * 100) : 0}%)
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-600 border border-teal-500/20 flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Registered Players
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold tracking-tight">{totalPlayersInClubs}</span>
                  <span className="text-[11px] text-muted-foreground">Athletes</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Home Venues
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold tracking-tight">{uniqueStadiumsCount}</span>
                  <span className="text-[11px] text-muted-foreground">
                    across {distinctCities.length} Cities
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center">
                <Landmark className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Control Bar */}
        <Card className="border-border/60">
          <CardContent className="p-3.5 space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Field */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search club by name, short code, registration #, city, stadium, president..."
                  className="pl-9 pr-8 h-9 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filters & Display Controls */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Status Filter */}
                <div className="flex items-center gap-1.5 min-w-[140px]">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                {/* City Filter */}
                <div className="flex items-center gap-1.5 min-w-[140px]">
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="all">All Cities / Regions</option>
                    {distinctCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters Button */}
                {(search || statusFilter !== "all" || cityFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      setCityFilter("all");
                    }}
                    className="h-9 text-xs text-muted-foreground hover:text-foreground px-2.5 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    <span>Clear</span>
                  </Button>
                )}

                {/* View Mode Switcher (DataTable default) */}
                <div className="flex items-center border rounded-md p-0.5 bg-muted/40 shrink-0">
                  <Button
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="h-7 w-7 p-0 cursor-pointer"
                    title="DataTable View"
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="h-7 w-7 p-0 cursor-pointer"
                    title="Cards Grid View"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Sub-bar with results count & Page Size */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
              <span className="font-mono text-[11px]">
                Showing {filteredAndSortedClubs.length} of {clubs.length} affiliated clubs
                {(statusFilter !== "all" || cityFilter !== "all" || search) && " (filtered)"}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px]">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 rounded border border-input bg-background px-2 text-[11px] cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Display: DataTable View or Grid View */}
        {loading ? (
          <div className="text-center py-20 text-xs text-muted-foreground border rounded-xl bg-card">
            <RefreshCw className="h-7 w-7 animate-spin mx-auto text-emerald-600 mb-2.5" />
            Loading federation club directory...
          </div>
        ) : filteredAndSortedClubs.length === 0 ? (
          <div className="text-center py-20 border rounded-xl bg-card border-dashed">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold">No clubs match the specified criteria</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your search query, status filters, or region selection
            </p>
            {(search || statusFilter !== "all" || cityFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setCityFilter("all");
                }}
                className="mt-4 text-xs cursor-pointer"
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : viewMode === "table" ? (
          /* OFFICIAL FEDERATION DATATABLE */
          <Card className="border-border/70 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table className="w-full text-xs">
                <TableHeader className="bg-muted/50 border-b border-border/70">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 text-center text-[11px] font-mono font-semibold">
                      #
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("name")}
                      className="cursor-pointer select-none font-semibold hover:text-emerald-600 transition-colors"
                    >
                      <span className="flex items-center">
                        Club & Registration
                        {renderSortIcon("name")}
                      </span>
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("city")}
                      className="cursor-pointer select-none font-semibold hover:text-emerald-600 transition-colors"
                    >
                      <span className="flex items-center">
                        City & Region
                        {renderSortIcon("city")}
                      </span>
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("stadium")}
                      className="cursor-pointer select-none font-semibold hover:text-emerald-600 transition-colors"
                    >
                      <span className="flex items-center">
                        Home Venue
                        {renderSortIcon("stadium")}
                      </span>
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("foundedYear")}
                      className="cursor-pointer select-none font-semibold hover:text-emerald-600 transition-colors"
                    >
                      <span className="flex items-center">
                        Founded
                        {renderSortIcon("foundedYear")}
                      </span>
                    </TableHead>
                    <TableHead className="font-semibold">
                      President / Executive
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("squad")}
                      className="cursor-pointer select-none font-semibold hover:text-emerald-600 transition-colors text-center"
                    >
                      <span className="flex items-center justify-center">
                        Squad Size
                        {renderSortIcon("squad")}
                      </span>
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("status")}
                      className="cursor-pointer select-none font-semibold hover:text-emerald-600 transition-colors text-center"
                    >
                      <span className="flex items-center justify-center">
                        Status
                        {renderSortIcon("status")}
                      </span>
                    </TableHead>
                    <TableHead className="text-right font-semibold pr-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {paginatedClubs.map((club, index) => {
                    const rowNumber = (currentPage - 1) * pageSize + index + 1;
                    const squadCount = players.filter((p) => p.currentClubId === club.id).length;
                    const clubAge = club.foundedYear ? currentYear - club.foundedYear : null;

                    return (
                      <TableRow
                        key={club.id}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        {/* Row Index */}
                        <TableCell className="text-center font-mono text-[11px] text-muted-foreground w-12">
                          {rowNumber}
                        </TableCell>

                        {/* Club & Crest */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 font-bold text-xs shadow-xs">
                              {club.shortName || club.name.slice(0, 3).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <button
                                onClick={() => setSelectedClub(club)}
                                className="font-bold text-sm text-foreground hover:text-emerald-600 transition-colors text-left truncate block cursor-pointer"
                              >
                                {club.name}
                              </button>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {club.registrationNumber || `FED-CLB-${club.id.slice(-4).toUpperCase()}`}
                                </span>
                                {club.shortName && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1.5 py-0 font-mono text-muted-foreground border-border/80"
                                  >
                                    {club.shortName}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* City / Country */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{club.city || "Addis Ababa"}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block ml-5">
                            {club.country || "Ethiopia"}
                          </span>
                        </TableCell>

                        {/* Stadium */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <Landmark className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[160px]">
                              {club.stadium || "National Stadium"}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block ml-5">
                            Licensed Venue
                          </span>
                        </TableCell>

                        {/* Founded Year */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{club.foundedYear || "—"}</span>
                          </div>
                          {clubAge && (
                            <span className="text-[10px] text-muted-foreground block ml-5">
                              {clubAge} years active
                            </span>
                          )}
                        </TableCell>

                        {/* President / Secretary */}
                        <TableCell className="py-3">
                          <span className="font-medium text-foreground block truncate max-w-[160px]">
                            {club.president || "Board Executive"}
                          </span>
                          <span className="text-[10px] text-muted-foreground block truncate max-w-[160px]">
                            {club.contactEmail || club.secretary || "Licensed Official"}
                          </span>
                        </TableCell>

                        {/* Registered Squad */}
                        <TableCell className="py-3 text-center">
                          <Badge
                            variant="secondary"
                            onClick={() => setSelectedClub(club)}
                            className="cursor-pointer hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-mono text-xs px-2 py-0.5 gap-1 inline-flex items-center"
                          >
                            <Users className="h-3 w-3" />
                            <span>{squadCount} Players</span>
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3 text-center">
                          <Badge
                            variant={club.status === "active" ? "default" : "secondary"}
                            className={`text-[10px] uppercase font-mono px-2 py-0.5 ${
                              club.status === "active"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                : club.status === "suspended"
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                                : club.status === "pending"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full mr-1.5 inline-block ${
                                club.status === "active"
                                  ? "bg-emerald-500 animate-pulse"
                                  : club.status === "suspended"
                                  ? "bg-rose-500"
                                  : club.status === "pending"
                                  ? "bg-amber-500"
                                  : "bg-muted-foreground"
                              }`}
                            />
                            {club.status}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3 text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedClub(club)}
                              className="h-8 px-2.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer gap-1"
                              title="View Licensing Profile"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Profile</span>
                            </Button>
                            {(isSuperOrFedAdmin || (isClubAdmin && club.id === userClubId)) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(club)}
                                className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer gap-1"
                                title="Edit Club Profile"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            )}
                            {isSuperOrFedAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClub(club.id, club.name)}
                                className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                title="Remove Club"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div className="p-3.5 border-t border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/20 text-xs">
              <div className="text-muted-foreground font-mono text-[11px]">
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, filteredAndSortedClubs.length)} of{" "}
                {filteredAndSortedClubs.length} clubs
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="h-8 w-8 p-0 cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="h-8 w-8 p-0 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                {/* Page number indicators */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      // show first, last, and pages around current
                      return (
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 1
                      );
                    })
                    .map((p, idx, arr) => {
                      const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                      return (
                        <div key={p} className="flex items-center">
                          {showEllipsisBefore && (
                            <span className="px-1 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === p ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(p)}
                            className={`h-8 w-8 p-0 text-xs cursor-pointer ${
                              currentPage === p
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                : ""
                            }`}
                          >
                            {p}
                          </Button>
                        </div>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="h-8 w-8 p-0 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="h-8 w-8 p-0 cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          /* OPTIONAL CARDS GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedClubs.map((club) => {
              const squadCount = players.filter((p) => p.currentClubId === club.id).length;
              return (
                <Card
                  key={club.id}
                  className="border-border/70 hover:border-emerald-500/50 hover:shadow-md transition-all group overflow-hidden"
                >
                  <div className="h-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500" />
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold text-sm">
                          {club.shortName || club.name.slice(0, 3).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                            {club.name}
                          </h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {club.city || "Ethiopia"}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant={club.status === "active" ? "default" : "secondary"}
                        className={`text-[10px] uppercase font-mono ${
                          club.status === "active"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            : ""
                        }`}
                      >
                        {club.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Home Stadium</span>
                        <span className="font-semibold text-foreground truncate block">
                          {club.stadium || "National Stadium"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Founded Year</span>
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {club.foundedYear || 1935}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">President / Official</span>
                        <span className="font-semibold text-foreground truncate block">
                          {club.president || "Board Executive"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Registered Squad</span>
                        <span className="font-semibold text-emerald-600 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {squadCount} Players
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedClub(club)}
                        className="h-8 text-xs px-2.5 gap-1.5 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Club Profile</span>
                      </Button>
                      <div className="flex items-center gap-1">
                        {(isSuperOrFedAdmin || (isClubAdmin && club.id === userClubId)) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(club)}
                            className="h-8 text-xs px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 cursor-pointer gap-1"
                            title="Edit Profile"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Button>
                        )}
                        {isSuperOrFedAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClub(club.id, club.name)}
                            className="h-8 text-xs px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                            title="Remove Club"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Club Details Modal */}
        {selectedClub && (
          <Dialog open={!!selectedClub} onOpenChange={() => setSelectedClub(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedClub.name}</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                    {selectedClub.status.toUpperCase()}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Federation Club Licensing Profile
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Home Stadium</span>
                    <span className="font-semibold">{selectedClub.stadium}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">City / Region</span>
                    <span className="font-semibold">{selectedClub.city}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Founded Year</span>
                    <span className="font-mono">{selectedClub.foundedYear}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">President</span>
                    <span className="font-semibold">{selectedClub.president || "—"}</span>
                  </div>
                </div>

                <div className="border rounded-lg p-3 space-y-2">
                  <h4 className="font-semibold text-xs flex items-center justify-between">
                    <span>Registered Squad ({players.filter((p) => p.currentClubId === selectedClub.id).length})</span>
                  </h4>
                  <div className="max-h-36 overflow-y-auto divide-y divide-border/40">
                    {players
                      .filter((p) => p.currentClubId === selectedClub.id)
                      .map((p) => (
                        <div key={p.id} className="py-1.5 flex items-center justify-between text-xs">
                          <span className="font-medium">{p.firstName} {p.lastName}</span>
                          <span className="text-muted-foreground font-mono">#{p.jerseyNumber || 10} • {p.position}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setSelectedClub(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Add Club Modal */}
        <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Affiliate New Football Club</DialogTitle>
              <DialogDescription className="text-xs">
                Register club credentials and licensing information
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddClub} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="clubName" className="text-xs">Club Name</Label>
                <Input
                  id="clubName"
                  required
                  placeholder="e.g. Dire Dawa City SC"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="shortName" className="text-xs">Short Code</Label>
                  <Input
                    id="shortName"
                    placeholder="e.g. DDC"
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="foundedYear" className="text-xs">Founded Year</Label>
                  <Input
                    id="foundedYear"
                    type="number"
                    value={formData.foundedYear}
                    onChange={(e) => setFormData({ ...formData, foundedYear: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs">City</Label>
                  <Input
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stadium" className="text-xs">Home Stadium</Label>
                  <Input
                    id="stadium"
                    required
                    value={formData.stadium}
                    onChange={(e) => setFormData({ ...formData, stadium: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="president" className="text-xs">President / Secretary</Label>
                <Input
                  id="president"
                  placeholder="Official Representative"
                  value={formData.president}
                  onChange={(e) => setFormData({ ...formData, president: e.target.value })}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting ? "Affiliating..." : "Affiliate Club"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Import Clubs CSV Modal */}
        <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <span>Bulk Import Clubs from CSV</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Upload a CSV spreadsheet to import multiple clubs into the federation database simultaneously
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Need the correct column format?</p>
                  <p className="text-muted-foreground text-[11px]">Download our pre-formatted sample CSV template</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="text-xs gap-1.5 h-8 text-emerald-600 border-emerald-500/30"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Sample Template</span>
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="csvFileInput" className="text-xs">Choose CSV File (.csv)</Label>
                <Input
                  id="csvFileInput"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileSelect}
                  className="text-xs cursor-pointer"
                />
              </div>

              {parsedClubs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Parsed Preview ({parsedClubs.length} Clubs Found)</span>
                    <Badge variant="secondary" className="font-mono text-[10px] text-emerald-600">
                      Ready to Import
                    </Badge>
                  </div>
                  <div className="max-h-56 overflow-auto rounded-md border border-border/60">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/60 sticky top-0 font-semibold border-b border-border/60">
                        <tr>
                          <th className="p-2">Name</th>
                          <th className="p-2">City</th>
                          <th className="p-2">Stadium</th>
                          <th className="p-2">Reg #</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {parsedClubs.slice(0, 10).map((c, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="p-2 font-medium">{c.name}</td>
                            <td className="p-2 text-muted-foreground">{c.city}</td>
                            <td className="p-2 text-muted-foreground">{c.stadium || "—"}</td>
                            <td className="p-2 font-mono text-[11px] text-muted-foreground">{c.registrationNumber || "Auto"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedClubs.length > 10 && (
                      <div className="p-2 text-center text-[11px] text-muted-foreground bg-muted/20">
                        ...and {parsedClubs.length - 10} more clubs
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setImportModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={importing || parsedClubs.length === 0}
                onClick={handleConfirmImport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Upload className="h-4 w-4" />
                <span>{importing ? "Importing Clubs..." : `Import ${parsedClubs.length} Clubs`}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Club Profile Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-emerald-600" />
                <span>Edit Club Profile & Licensing</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update venue, administrative leadership, and official federation contact details.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateClub} className="space-y-3.5 py-1">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs font-semibold">Club Name</Label>
                <Input
                  id="edit-name"
                  required
                  disabled={!isSuperOrFedAdmin}
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
                {!isSuperOrFedAdmin && (
                  <span className="text-[10px] text-muted-foreground block">
                    Official club name changes require Federation Executive Council approval.
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-shortName" className="text-xs font-semibold">Short Name</Label>
                  <Input
                    id="edit-shortName"
                    value={editFormData.shortName}
                    onChange={(e) => setEditFormData({ ...editFormData, shortName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-city" className="text-xs font-semibold">City</Label>
                  <Input
                    id="edit-city"
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-stadium" className="text-xs font-semibold">Home Stadium / Venue</Label>
                <Input
                  id="edit-stadium"
                  required
                  value={editFormData.stadium}
                  onChange={(e) => setEditFormData({ ...editFormData, stadium: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-president" className="text-xs font-semibold">Club President</Label>
                  <Input
                    id="edit-president"
                    value={editFormData.president}
                    onChange={(e) => setEditFormData({ ...editFormData, president: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-secretary" className="text-xs font-semibold">General Secretary</Label>
                  <Input
                    id="edit-secretary"
                    value={editFormData.secretary}
                    onChange={(e) => setEditFormData({ ...editFormData, secretary: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-email" className="text-xs font-semibold">Official Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editFormData.contactEmail}
                    onChange={(e) => setEditFormData({ ...editFormData, contactEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone" className="text-xs font-semibold">Contact Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editFormData.contactPhone}
                    onChange={(e) => setEditFormData({ ...editFormData, contactPhone: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
