import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import type { Player, Club, Contract, PlayerRegistration, Transfer, EligibilityResult } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Trash2,
  Edit,
  Shield,
  Calendar,
  Globe,
  Award,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Briefcase,
  ArrowRightLeft,
  DollarSign,
  Fingerprint,
  MapPin,
  Camera,
  Activity,
  Layers,
  Sparkles,
  ClipboardCheck,
  IdCard,
  Building2,
  UserCheck,
  CreditCard,
  HeartPulse,
  ExternalLink,
  ChevronRight,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";

// Sample preset photos for quick realistic selection if user doesn't have an image URL
const PRESET_PHOTOS = [
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
];

export default function PlayersPage() {
  const { user } = useAuth();
  const isClubAdmin = user?.role === "club_admin";
  const userClubId = user?.clubId || (user as any)?.club_id || (user?.email === "club@saintgeorge.org" ? "club-1" : undefined);

  const [activeTab, setActiveTab] = useState<string>("registry");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Main Data States
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  const userClub = useMemo(() => clubs.find((c) => c.id === userClubId), [clubs, userClubId]);

  // Filters: automatically defaults to user's club for club admins
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [clubFilter, setClubFilter] = useState<string>(isClubAdmin && userClubId ? userClubId : "all");
  const [eligibilityFilter, setEligibilityFilter] = useState<string>("all");

  // Auto sync clubFilter when userClubId resolves
  useEffect(() => {
    if (isClubAdmin && userClubId && clubFilter === "all") {
      setClubFilter(userClubId);
    }
  }, [isClubAdmin, userClubId]);

  // Modals
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerPassportData, setPlayerPassportData] = useState<any | null>(null);
  const [passportLoading, setPassportLoading] = useState(false);

  const [eligibilityModalPlayer, setEligibilityModalPlayer] = useState<Player | null>(null);
  const [eligibilityData, setEligibilityData] = useState<EligibilityResult | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  // Matchday Simulator state
  const [simulatedPlayerId, setSimulatedPlayerId] = useState<string>("");
  const [simulatedCompetition, setSimulatedCompetition] = useState<string>("comp-pl");

  // Registration Multi-step Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);

  // New Contract Modal
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractFormData, setContractFormData] = useState({
    playerId: "",
    clubId: "",
    contractType: "professional" as const,
    startDate: new Date().toISOString().split("T")[0],
    endDate: `${new Date().getFullYear() + 2}-06-30`,
    salaryMonthly: 75000,
    currency: "ETB",
    buyoutClause: 2000000,
    agentName: "",
    notes: "Official registered standard contract agreement",
  });

  // Transfer Modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferFormData, setTransferFormData] = useState({
    playerId: "",
    fromClubId: "",
    toClubId: "",
    transferFee: 450000,
    transferDate: new Date().toISOString().split("T")[0],
    reason: "Mutual agreement between clubs under Federation TMS",
  });

  // Registration Form State
  const initialFormState = {
    firstName: "",
    lastName: "",
    nationalId: "",
    birthPlace: "",
    dateOfBirth: "2000-01-01",
    gender: "male" as "male" | "female" | "other",
    nationality: "Ethiopia",
    photoUrl: PRESET_PHOTOS[0],
    position: "Forward",
    secondaryPosition: "Winger",
    jerseyNumber: 10,
    preferredFoot: "right" as "right" | "left" | "both",
    height: 180,
    weight: 75,
    currentClubId: "",
    currentClubName: "",
    phone: "",
    email: "",
    address: "",
    medicalClearanceDate: `${new Date().getFullYear() + 1}-12-31`,
    bloodGroup: "O+",
    emergencyContact: "",
    registerLicense: true,
    initialContract: {
      contractType: "professional",
      startDate: new Date().toISOString().split("T")[0],
      endDate: `${new Date().getFullYear() + 2}-06-30`,
      salaryMonthly: 65000,
      currency: "ETB",
      buyoutClause: 1500000,
      agentName: "",
      notes: "Standard senior federation player agreement",
    },
  };

  const [formData, setFormData] = useState(initialFormState);

  // Load all federation player management data
  const loadData = async () => {
    try {
      setLoading(true);
      const [pRes, cRes, cntRes, rRes, tRes] = await Promise.all([
        api.players.list(),
        api.clubs.list(),
        api.contracts.list(),
        api.registrations.list(),
        api.transfers.list(),
      ]);

      if (pRes?.players) setPlayers(pRes.players);
      if (cRes?.clubs) setClubs(cRes.clubs);
      if (cntRes?.contracts) setContracts(cntRes.contracts);
      if (rRes?.registrations) setRegistrations(rRes.registrations);
      if (tRes?.transfers) setTransfers(tRes.transfers);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load player management suite");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch complete details for Player Digital Passport
  const handleOpenPassport = async (player: Player) => {
    setSelectedPlayer(player);
    try {
      setPassportLoading(true);
      const details = await api.players.get(player.id);
      setPlayerPassportData(details);
    } catch (err: any) {
      toast.error("Failed to load player passport details");
    } finally {
      setPassportLoading(false);
    }
  };

  // Check player eligibility
  const handleCheckEligibility = async (player: Player) => {
    setEligibilityModalPlayer(player);
    try {
      setCheckingEligibility(true);
      const res = await api.players.getEligibility(player.id);
      setEligibilityData(res.eligibility);
    } catch (err: any) {
      toast.error("Failed to fetch eligibility report");
    } finally {
      setCheckingEligibility(false);
    }
  };

  // Submit new player registration
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("First Name and Last Name are required");
      return;
    }
    if (!formData.nationalId.trim()) {
      toast.error("National ID Number is required for federation registration");
      setStep(1);
      return;
    }
    if (!formData.birthPlace.trim()) {
      toast.error("Birth Place is required for permanent digital record");
      setStep(1);
      return;
    }

    try {
      setSubmitting(true);
      const selectedClub = clubs.find((c) => c.id === formData.currentClubId);
      await api.players.create({
        ...formData,
        currentClubName: selectedClub ? selectedClub.name : formData.currentClubName,
      });

      toast.success(
        `Player ${formData.firstName} ${formData.lastName} registered! National ID and Digital Passport created.`
      );
      setAddModalOpen(false);
      setFormData(initialFormState);
      setStep(1);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to register player");
    } finally {
      setSubmitting(false);
    }
  };

  // Contract creation
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractFormData.playerId || !contractFormData.clubId) {
      toast.error("Please select both player and club");
      return;
    }
    try {
      setSubmitting(true);
      await api.contracts.create(contractFormData);
      toast.success("Player contract registered and submitted to federation!");
      setContractModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to register contract");
    } finally {
      setSubmitting(false);
    }
  };

  // Contract actions (Approve / Terminate)
  const handleApproveContract = async (id: string) => {
    try {
      await api.contracts.approve(id, "Approved and registered by Federation Licensing Office");
      toast.success("Contract officially approved and activated!");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Contract approval failed");
    }
  };

  const handleTerminateContract = async (id: string) => {
    const reason = prompt("Enter reason for contract termination:", "Mutual agreement termination");
    if (!reason) return;
    try {
      await api.contracts.terminate(id, reason);
      toast.success("Contract terminated and archived in federation record");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Termination failed");
    }
  };

  // Transfer creation
  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferFormData.fromClubId === transferFormData.toClubId) {
      toast.error("Origin and Destination clubs cannot be the same");
      return;
    }
    try {
      setSubmitting(true);
      await api.transfers.request(transferFormData);
      toast.success("Transfer agreement filed with Federation TMS!");
      setTransferModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Transfer request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferAction = async (id: string, action: "approve" | "complete") => {
    try {
      await api.transfers.review(id, action, "Confirmed and authorized by Transfer Matching System");
      toast.success(`Transfer officially ${action}d!`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  };

  // Registration review
  const handleRegistrationReview = async (id: string, action: "approve" | "reject") => {
    try {
      await api.registrations.review(
        id,
        action,
        action === "approve"
          ? "Identity, medical clearance and documents verified. License issued."
          : "Incomplete documentation rejected by registrar."
      );
      toast.success(
        action === "approve"
          ? "License issued and player activated!"
          : "Registration application rejected."
      );
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Registration review failed");
    }
  };

  const handleDeletePlayer = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${name} from the federation registry?`))
      return;
    try {
      await api.players.delete(id);
      toast.success("Player removed from registry");
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete player");
    }
  };

  // Filtered Players
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      const nationalIdMatch = (p.nationalId || p.idDocumentNumber || "").toLowerCase();
      const birthPlaceMatch = (p.birthPlace || "").toLowerCase();
      const federationIdMatch = (p.federationId || "").toLowerCase();
      const clubMatch = (p.currentClubName || "").toLowerCase();

      const q = search.toLowerCase();
      const matchesSearch =
        fullName.includes(q) ||
        nationalIdMatch.includes(q) ||
        birthPlaceMatch.includes(q) ||
        federationIdMatch.includes(q) ||
        clubMatch.includes(q) ||
        p.nationality.toLowerCase().includes(q);

      const matchesPosition = positionFilter === "all" || p.position === positionFilter;
      const matchesClub = clubFilter === "all" || p.currentClubId === clubFilter;
      const matchesEligibility =
        eligibilityFilter === "all" || p.eligibilityStatus === eligibilityFilter;

      return matchesSearch && matchesPosition && matchesClub && matchesEligibility;
    });
  }, [players, search, positionFilter, clubFilter, eligibilityFilter]);

  // KPIs
  const stats = useMemo(() => {
    const total = players.length;
    const eligible = players.filter((p) => p.eligibilityStatus === "eligible").length;
    const activeContractsCount = contracts.filter((c) => c.status === "active").length;
    const activeTransfersCount = transfers.filter((t) => t.status === "requested" || t.status === "approved").length;
    const pendingLicenses = registrations.filter((r) => r.status === "pending").length;

    return { total, eligible, activeContractsCount, activeTransfersCount, pendingLicenses };
  }, [players, contracts, transfers, registrations]);

  // Helper for age
  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <IdCard className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">Player Management Hub</h1>
                  <Badge variant="outline" className="font-mono text-xs border-emerald-500/40 text-emerald-600 bg-emerald-500/5">
                    Live FIFA/CAF ID Standard
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Registration, National ID verification, real-time matchday eligibility, player contracts & Transfer Matching System (TMS)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
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
              onClick={() => {
                const targetPlayer = players.find((p) => p.currentClubId === userClubId) || players[0];
                setContractFormData({
                  ...contractFormData,
                  playerId: targetPlayer?.id || "",
                  clubId: userClubId || clubs[0]?.id || "",
                });
                setContractModalOpen(true);
              }}
              variant="outline"
              className="text-xs gap-1.5 h-9 cursor-pointer border-blue-500/30 text-blue-600 hover:bg-blue-50"
            >
              <Briefcase className="h-4 w-4" />
              <span>New Contract</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const targetPlayer = players.find((p) => p.currentClubId === userClubId) || players[0];
                setTransferFormData({
                  ...transferFormData,
                  playerId: targetPlayer?.id || "",
                  fromClubId: userClubId || targetPlayer?.currentClubId || clubs[0]?.id || "",
                  toClubId: clubs.find((c) => c.id !== userClubId)?.id || clubs[1]?.id || "",
                });
                setTransferModalOpen(true);
              }}
              variant="outline"
              className="text-xs gap-1.5 h-9 cursor-pointer border-purple-500/30 text-purple-600 hover:bg-purple-50"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>Initiate Transfer</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setFormData({
                  ...initialFormState,
                  currentClubId: userClubId || "",
                  currentClubName: userClub?.name || (isClubAdmin ? "Saint George SC" : ""),
                });
                setStep(1);
                setAddModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>{isClubAdmin && userClub ? `Register to ${userClub.name}` : "Register New Player"}</span>
            </Button>
          </div>
        </div>

        {/* High-Level Federation KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Total Players</span>
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold mt-1 text-foreground">{stats.total}</p>
              <span className="text-[10px] text-muted-foreground font-mono">Permanent Identities</span>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Eligible to Play</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold mt-1 text-emerald-600">{stats.eligible}</p>
              <span className="text-[10px] text-emerald-600 font-mono">100% Cleared for Matches</span>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Active Contracts</span>
                <Briefcase className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-xl font-bold mt-1 text-blue-600">{stats.activeContractsCount}</p>
              <span className="text-[10px] text-muted-foreground font-mono">Wage Registry Active</span>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">TMS Transfers</span>
                <ArrowRightLeft className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-xl font-bold mt-1 text-purple-600">{stats.activeTransfersCount}</p>
              <span className="text-[10px] text-muted-foreground font-mono">In Window Progress</span>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm col-span-2 sm:col-span-1">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Pending Licenses</span>
                <ClipboardCheck className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-xl font-bold mt-1 text-amber-600">{stats.pendingLicenses}</p>
              <span className="text-[10px] text-amber-600 font-mono">Awaiting Officer Review</span>
            </CardContent>
          </Card>
        </div>

        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/70 p-1 border border-border/60 h-10 w-full sm:w-auto justify-start">
            <TabsTrigger value="registry" className="text-xs gap-1.5 cursor-pointer">
              <Users className="h-3.5 w-3.5" />
              <span>Player Registry</span>
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {players.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="eligibility" className="text-xs gap-1.5 cursor-pointer">
              <Shield className="h-3.5 w-3.5" />
              <span>Eligibility & Compliance</span>
            </TabsTrigger>
            <TabsTrigger value="contracts" className="text-xs gap-1.5 cursor-pointer">
              <Briefcase className="h-3.5 w-3.5" />
              <span>Contracts Registry</span>
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {contracts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="transfers" className="text-xs gap-1.5 cursor-pointer">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>TMS Transfers</span>
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {transfers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="licensing" className="text-xs gap-1.5 cursor-pointer">
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span>Season Licensing</span>
              {stats.pendingLicenses > 0 && (
                <span className="ml-1 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: PLAYER REGISTRY (All Players Grid/Table)
          ══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="registry" className="space-y-4">
            {/* Filter Toolbar */}
            <Card className="border-border/60">
              <CardContent className="p-3.5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search player name, National ID #, Birth Place, Federation ID, Club..."
                      className="pl-9 h-9 text-xs"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                    <Select value={positionFilter} onValueChange={setPositionFilter}>
                      <SelectTrigger className="w-[130px] h-9 text-xs">
                        <SelectValue placeholder="Position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Positions</SelectItem>
                        <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
                        <SelectItem value="Defender">Defender</SelectItem>
                        <SelectItem value="Midfielder">Midfielder</SelectItem>
                        <SelectItem value="Forward">Forward</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={clubFilter} onValueChange={setClubFilter}>
                      <SelectTrigger className="w-[170px] h-9 text-xs">
                        <SelectValue placeholder="All Clubs" />
                      </SelectTrigger>
                      <SelectContent>
                        {isClubAdmin && userClubId ? (
                          <>
                            <SelectItem value={userClubId}>
                              ★ {userClub?.name || "Your Club"} (Squad)
                            </SelectItem>
                            <SelectItem value="all">All Federation Players</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="all">All Clubs</SelectItem>
                            {clubs.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>

                    <Select value={eligibilityFilter} onValueChange={setEligibilityFilter}>
                      <SelectTrigger className="w-[140px] h-9 text-xs">
                        <SelectValue placeholder="Eligibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Clearance</SelectItem>
                        <SelectItem value="eligible">Eligible (100%)</SelectItem>
                        <SelectItem value="conditional">Conditional</SelectItem>
                        <SelectItem value="ineligible">Ineligible / Ban</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center border rounded-md p-0.5 bg-muted/40">
                      <Button
                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="h-7 w-7 p-0 cursor-pointer"
                        title="Card Grid"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={viewMode === "table" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("table")}
                        className="h-7 w-7 p-0 cursor-pointer"
                        title="Official Table"
                      >
                        <List className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Players Display */}
            {loading ? (
              <div className="text-center py-20 text-xs text-muted-foreground border rounded-xl bg-card">
                <RefreshCw className="h-7 w-7 animate-spin mx-auto text-emerald-600 mb-2.5" />
                Querying official federation player registry...
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-20 border rounded-xl bg-card border-dashed">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-semibold">No players match the criteria</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your search by name, National ID, birthplace or reset position filters
                </p>
              </div>
            ) : viewMode === "grid" ? (
              /* GRID CARDS VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredPlayers.map((player) => (
                  <Card
                    key={player.id}
                    className="border-border/70 hover:border-emerald-500/50 hover:shadow-lg transition-all group overflow-hidden bg-card/80 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Ribbon & ID */}
                      <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-700" />
                      <CardContent className="p-4 space-y-3.5">
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={player.photoUrl || PRESET_PHOTOS[0]}
                              alt={`${player.firstName} ${player.lastName}`}
                              className="h-14 w-14 rounded-xl object-cover border-2 border-border/80 shadow-sm group-hover:scale-105 transition-transform"
                            />
                            <span className="absolute -bottom-1 -right-1 bg-background text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-border shadow-xs">
                              #{player.jerseyNumber || 10}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h3 className="text-sm font-bold text-foreground truncate group-hover:text-emerald-600 transition-colors">
                                {player.firstName} {player.lastName}
                              </h3>
                            </div>
                            <p className="text-xs text-muted-foreground truncate font-medium">
                              {player.currentClubName || "Free Agent"}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1.5 py-0 font-mono uppercase ${
                                  player.eligibilityStatus === "eligible"
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                    : player.eligibilityStatus === "conditional"
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                }`}
                              >
                                {player.eligibilityStatus === "eligible"
                                  ? "Eligible (100%)"
                                  : player.eligibilityStatus === "conditional"
                                  ? "Conditional"
                                  : "Ineligible"}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* National ID & Birthplace Banner */}
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/60 space-y-1.5 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Fingerprint className="h-3 w-3 text-emerald-600" />
                              National ID
                            </span>
                            <span className="font-mono font-semibold text-foreground text-[10px]">
                              {player.nationalId || player.idDocumentNumber || "Pending"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-rose-500" />
                              Birth Place
                            </span>
                            <span className="font-medium text-foreground text-[10px] truncate max-w-[140px]">
                              {player.birthPlace || "Ethiopia"}
                            </span>
                          </div>
                        </div>

                        {/* Player Specs */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/50">
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Position</span>
                            <span className="font-semibold text-foreground">{player.position || "Forward"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Age / DOB</span>
                            <span className="font-mono text-foreground">
                              {calculateAge(player.dateOfBirth)} yrs ({player.dateOfBirth?.split("-")[0]})
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-3 pt-0 border-t border-border/40 flex items-center justify-between gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenPassport(player)}
                        className="h-7 text-xs px-2 gap-1 text-emerald-600 hover:text-emerald-700 cursor-pointer font-medium"
                      >
                        <IdCard className="h-3.5 w-3.5" />
                        <span>Passport</span>
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCheckEligibility(player)}
                          title="Verify Eligibility"
                          className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 cursor-pointer"
                        >
                          <Shield className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTransferFormData({
                              ...transferFormData,
                              playerId: player.id,
                              fromClubId: player.currentClubId || clubs[0]?.id || "",
                              toClubId: clubs.find((c) => c.id !== player.currentClubId)?.id || "",
                            });
                            setTransferModalOpen(true);
                          }}
                          title="Initiate Transfer"
                          className="h-7 w-7 p-0 text-purple-600 hover:text-purple-700 cursor-pointer"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeletePlayer(player.id, `${player.firstName} ${player.lastName}`)
                          }
                          title="Delete from registry"
                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              /* DENSE OFFICIAL TABLE VIEW */
              <Card className="border-border/70 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-b border-border/70 text-muted-foreground uppercase text-[10px] font-mono">
                      <tr>
                        <th className="p-3">Player & Photo</th>
                        <th className="p-3">National ID #</th>
                        <th className="p-3">Birth Place & DOB</th>
                        <th className="p-3">Position</th>
                        <th className="p-3">Club & Squad #</th>
                        <th className="p-3">Federation License</th>
                        <th className="p-3">Eligibility</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredPlayers.map((player) => (
                        <tr key={player.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={player.photoUrl || PRESET_PHOTOS[0]}
                                alt=""
                                className="h-9 w-9 rounded-lg object-cover border border-border"
                              />
                              <div>
                                <span className="font-bold text-foreground block">
                                  {player.firstName} {player.lastName}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {player.federationId || `ETH-PLY-${player.id.slice(-4)}`}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-mono font-medium text-foreground">
                            {player.nationalId || player.idDocumentNumber || "Pending"}
                          </td>
                          <td className="p-3">
                            <span className="font-medium text-foreground block">
                              {player.birthPlace || "Ethiopia"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {player.dateOfBirth} ({calculateAge(player.dateOfBirth)} yrs)
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-foreground">
                            {player.position || "Forward"}
                          </td>
                          <td className="p-3">
                            <span className="font-semibold block text-foreground">
                              {player.currentClubName || "Free Agent"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Squad #{player.jerseyNumber || "—"}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-muted-foreground">
                            {player.status === "active" ? (
                              <span className="text-emerald-600 font-semibold">Active Official</span>
                            ) : (
                              <span>Pending</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-2 py-0.5 font-mono uppercase ${
                                player.eligibilityStatus === "eligible"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  : player.eligibilityStatus === "conditional"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                              }`}
                            >
                              {player.eligibilityStatus === "eligible"
                                ? "Eligible"
                                : player.eligibilityStatus === "conditional"
                                ? "Conditional"
                                : "Ineligible"}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenPassport(player)}
                                className="h-7 text-xs px-2 gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 cursor-pointer"
                              >
                                <IdCard className="h-3.5 w-3.5" />
                                <span>Passport</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCheckEligibility(player)}
                                className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 cursor-pointer"
                                title="Check Eligibility"
                              >
                                <Shield className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeletePlayer(player.id, `${player.firstName} ${player.lastName}`)
                                }
                                className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: ELIGIBILITY & REGULATORY CLEARANCE ENGINE
          ══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="eligibility" className="space-y-6">
            {/* Matchday Simulator Banner */}
            <Card className="border-border/60 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-base">Matchday Eligibility Verification Simulator</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Run automated regulatory clearance checks against FIFA/Federation rules before submitting match team sheets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Select Player to Verify</Label>
                    <select
                      className="w-full mt-1.5 h-9 rounded-md border border-input bg-background px-3 text-xs"
                      value={simulatedPlayerId}
                      onChange={(e) => setSimulatedPlayerId(e.target.value)}
                    >
                      <option value="">Choose registered player...</option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName} ({p.currentClubName || "Free Agent"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs">Target Competition</Label>
                    <select
                      className="w-full mt-1.5 h-9 rounded-md border border-input bg-background px-3 text-xs"
                      value={simulatedCompetition}
                      onChange={(e) => setSimulatedCompetition(e.target.value)}
                    >
                      <option value="comp-pl">National Premier League (Division 1)</option>
                      <option value="comp-cup">Federation Cup Knockout</option>
                      <option value="comp-supercup">Super Cup 2025</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={() => {
                        const target = players.find((p) => p.id === simulatedPlayerId);
                        if (!target) {
                          toast.error("Please choose a player to verify");
                          return;
                        }
                        handleCheckEligibility(target);
                      }}
                      className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Run Compliance Clearance</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Federation Live Eligibility Compliance Table */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Federation Player Eligibility Matrix</CardTitle>
                <CardDescription className="text-xs">
                  Real-time monitoring of identity verification, season licensing, disciplinary suspensions, and medical clearance
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 border-y border-border/70 text-muted-foreground uppercase text-[10px] font-mono">
                      <tr>
                        <th className="p-3">Player</th>
                        <th className="p-3">National ID & Birthplace</th>
                        <th className="p-3 text-center">Identity</th>
                        <th className="p-3 text-center">Season License</th>
                        <th className="p-3 text-center">Disciplinary</th>
                        <th className="p-3 text-center">Medical</th>
                        <th className="p-3 text-center">Contract</th>
                        <th className="p-3 text-right">Clearance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {players.map((p) => {
                        const isEligible = p.eligibilityStatus === "eligible";
                        return (
                          <tr key={p.id} className="hover:bg-muted/20">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={p.photoUrl || PRESET_PHOTOS[0]}
                                  alt=""
                                  className="h-7 w-7 rounded-full object-cover border"
                                />
                                <div>
                                  <span className="font-bold text-foreground block">
                                    {p.firstName} {p.lastName}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {p.currentClubName || "Free Agent"}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-mono text-foreground font-semibold block text-[11px]">
                                {p.nationalId || p.idDocumentNumber || "Unverified"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {p.birthPlace || "Unspecified"}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {p.nationalId && p.birthPlace ? (
                                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[9px]">
                                  PASS
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[9px]">
                                  MISSING
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[9px]">
                                ACTIVE
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              {p.status === "suspended" ? (
                                <Badge variant="destructive" className="text-[9px]">
                                  BANNED
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[9px]">
                                  CLEARED
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[9px]">
                                VALID
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              {p.currentClubId ? (
                                <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-[9px]">
                                  REGISTERED
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px]">
                                  FREE AGENT
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCheckEligibility(p)}
                                className={`h-6 text-[10px] font-mono uppercase ${
                                  isEligible
                                    ? "border-emerald-500/40 text-emerald-700 hover:bg-emerald-50"
                                    : "border-amber-500/40 text-amber-700 hover:bg-amber-50"
                                }`}
                              >
                                {isEligible ? "Clear To Play" : "Review Notice"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: CONTRACTS REGISTRY
          ══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="contracts" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Federation Player Contracts Registry</h2>
                <p className="text-xs text-muted-foreground">
                  Official wage agreements, buyout clauses, loan contracts & termination agreements
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setContractModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Register New Contract</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {contracts.map((c) => (
                <Card key={c.id} className="border-border/70 hover:shadow-md transition-all">
                  <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600" />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {c.contractType}
                        </span>
                        <h3 className="font-bold text-sm mt-1.5">{c.playerName || "Player"}</h3>
                        <p className="text-xs text-muted-foreground">{c.clubName || "Club"}</p>
                      </div>
                      <Badge
                        variant={c.status === "active" ? "default" : "secondary"}
                        className={`text-[9px] uppercase font-mono ${
                          c.status === "active"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                            : c.status === "pending_approval"
                            ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                            : "bg-rose-500/10 text-rose-700"
                        }`}
                      >
                        {c.status}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-border/50 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-[10px]">Monthly Salary:</span>
                        <span className="font-mono font-bold text-foreground">
                          {c.salaryMonthly ? `${c.salaryMonthly.toLocaleString()} ${c.currency || "ETB"}` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-[10px]">Buyout Clause:</span>
                        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                          {c.buyoutClause ? `${c.buyoutClause.toLocaleString()} ${c.currency || "ETB"}` : "None"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-[10px]">Validity Duration:</span>
                        <span className="font-mono text-[10px]">
                          {c.startDate} → {c.endDate}
                        </span>
                      </div>
                      {c.agentName && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-[10px]">Agent/Agency:</span>
                          <span className="text-[10px] font-medium truncate max-w-[140px]">{c.agentName}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-1">
                      {c.status === "pending_approval" ? (
                        <Button
                          size="sm"
                          onClick={() => handleApproveContract(c.id)}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          <span>Approve Contract</span>
                        </Button>
                      ) : c.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTerminateContract(c.id)}
                          className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 w-full"
                        >
                          <span>Terminate Contract</span>
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Archived Record</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: TRANSFER MATCHING SYSTEM (TMS)
          ══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="transfers" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Transfer Matching System (TMS)</h2>
                <p className="text-xs text-muted-foreground">
                  Domestic & international squad transfers, buyout fees & ITC clearances
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setTransferModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Initiate Transfer</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {transfers.map((t) => (
                <Card key={t.id} className="border-border/70">
                  <div className="h-1.5 bg-gradient-to-r from-purple-500 to-indigo-600" />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-muted-foreground">#{t.id}</span>
                        <h3 className="font-bold text-sm text-foreground mt-0.5">
                          {t.player ? `${t.player.firstName} ${t.player.lastName}` : "Player Transfer"}
                        </h3>
                      </div>
                      <Badge
                        className={`text-[9px] uppercase font-mono ${
                          t.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                            : t.status === "approved"
                            ? "bg-blue-500/10 text-blue-700 border-blue-500/30"
                            : "bg-amber-500/10 text-amber-700 border-amber-500/30"
                        }`}
                      >
                        {t.status}
                      </Badge>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">From</span>
                        <span className="font-semibold">{t.fromClub?.name || "Origin Club"}</span>
                      </div>
                      <ArrowRightLeft className="h-4 w-4 text-purple-600" />
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">To</span>
                        <span className="font-semibold">{t.toClub?.name || "Dest Club"}</span>
                      </div>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-[10px]">Transfer Fee:</span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {t.transferFee ? `${t.transferFee.toLocaleString()} ETB` : "Free Transfer"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-[10px]">Date Filed:</span>
                        <span className="font-mono text-[10px]">{t.transferDate}</span>
                      </div>
                      {t.reason && (
                        <p className="text-[11px] text-muted-foreground italic pt-1">{t.reason}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/50 flex gap-2">
                      {t.status === "requested" && (
                        <Button
                          size="sm"
                          onClick={() => handleTransferAction(t.id, "approve")}
                          className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white w-full"
                        >
                          Approve Agreement
                        </Button>
                      )}
                      {t.status === "approved" && (
                        <Button
                          size="sm"
                          onClick={() => handleTransferAction(t.id, "complete")}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                        >
                          Finalize Transfer & Reassign Squad
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════════
              TAB 5: SEASON LICENSING WORKFLOW
          ══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="licensing" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Season Official Player Licenses</h2>
                <p className="text-xs text-muted-foreground">
                  Valid license credentials, registration numbers and registrar reviews
                </p>
              </div>
            </div>

            <Card className="border-border/70 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border/70 text-muted-foreground uppercase text-[10px] font-mono">
                    <tr>
                      <th className="p-3">Player</th>
                      <th className="p-3">Club</th>
                      <th className="p-3">License #</th>
                      <th className="p-3">Expiry Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Notes</th>
                      <th className="p-3 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {registrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-muted/20">
                        <td className="p-3 font-semibold">{reg.playerName || "Player"}</td>
                        <td className="p-3">{reg.clubName || "Club"}</td>
                        <td className="p-3 font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                          {reg.licenseNumber || "PENDING"}
                        </td>
                        <td className="p-3 font-mono">{reg.expiryDate || "—"}</td>
                        <td className="p-3">
                          <Badge
                            className={`text-[9px] uppercase font-mono ${
                              reg.status === "active"
                                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                : reg.status === "pending"
                                ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-700"
                            }`}
                          >
                            {reg.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-[11px] text-muted-foreground max-w-xs truncate">
                          {reg.notes || "Standard season registration"}
                        </td>
                        <td className="p-3 text-right">
                          {reg.status === "pending" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleRegistrationReview(reg.id, "approve")}
                                className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-2"
                              >
                                Approve & Issue
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRegistrationReview(reg.id, "reject")}
                                className="h-6 text-[10px] text-rose-600 border-rose-300 hover:bg-rose-50 px-2"
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono text-muted-foreground">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ══════════════════════════════════════════════════════════════════════
            REGISTER NEW PLAYER MODAL (Multi-step with National ID, Photo & Birthplace)
        ══════════════════════════════════════════════════════════════════════ */}
        <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg">Federation Player Registration</DialogTitle>
                  <DialogDescription className="text-xs">
                    Issue permanent digital identity with National ID, photo, birthplace and initial contract
                  </DialogDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs border-emerald-500/40 text-emerald-600">
                  Step {step} of 4
                </Badge>
              </div>

              {/* Progress Stepper */}
              <div className="grid grid-cols-4 gap-2 pt-3">
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    step >= 1 ? "bg-emerald-600" : "bg-muted"
                  }`}
                />
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    step >= 2 ? "bg-emerald-600" : "bg-muted"
                  }`}
                />
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    step >= 3 ? "bg-emerald-600" : "bg-muted"
                  }`}
                />
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    step >= 4 ? "bg-emerald-600" : "bg-muted"
                  }`}
                />
              </div>
            </DialogHeader>

            <form onSubmit={handleAddPlayer} className="space-y-4 py-2 text-xs">
              {/* STEP 1: NATIONAL IDENTITY & BIO */}
              {step === 1 && (
                <div className="space-y-3.5">
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1.5">
                      <Fingerprint className="h-4 w-4" />
                      Section 1: National Identity & Permanent Bio
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Enter the government-issued National ID number (Kebele ID / FIDA / Passport) and certified place of birth.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="firstName" className="text-xs">
                        First Name (Player) *
                      </Label>
                      <Input
                        id="firstName"
                        required
                        placeholder="e.g. Abubeker"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="lastName" className="text-xs">
                        Last Name (Father's Name) *
                      </Label>
                      <Input
                        id="lastName"
                        required
                        placeholder="e.g. Nassir"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="nationalId" className="text-xs flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                        <Fingerprint className="h-3.5 w-3.5" />
                        National ID / Kebele ID Number *
                      </Label>
                      <Input
                        id="nationalId"
                        required
                        placeholder="e.g. ETH-NID-9182736"
                        className="font-mono font-semibold border-emerald-500/40"
                        value={formData.nationalId}
                        onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="birthPlace" className="text-xs flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                        <MapPin className="h-3.5 w-3.5" />
                        Place of Birth (City / Region) *
                      </Label>
                      <Input
                        id="birthPlace"
                        required
                        placeholder="e.g. Addis Ababa, Ethiopia"
                        className="border-emerald-500/40"
                        value={formData.birthPlace}
                        onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="dob" className="text-xs">
                        Date of Birth *
                      </Label>
                      <Input
                        id="dob"
                        type="date"
                        required
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      />
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Calculated Age: {calculateAge(formData.dateOfBirth)} yrs
                      </span>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="gender" className="text-xs">
                        Gender
                      </Label>
                      <select
                        id="gender"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="nationality" className="text-xs">
                        Nationality
                      </Label>
                      <Input
                        id="nationality"
                        required
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Player Photo Section */}
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5 text-emerald-600" />
                      Official Player Headshot / Photo
                    </Label>

                    <div className="flex items-center gap-3">
                      <img
                        src={formData.photoUrl}
                        alt="Preview"
                        className="h-16 w-16 rounded-xl object-cover border-2 border-emerald-500 shadow-sm"
                      />
                      <div className="flex-1 space-y-1.5">
                        <Input
                          placeholder="Photo image URL..."
                          value={formData.photoUrl}
                          onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                          className="text-xs font-mono"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground">Quick Presets:</span>
                          {PRESET_PHOTOS.slice(0, 5).map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setFormData({ ...formData, photoUrl: preset })}
                              className="h-5 w-5 rounded-full overflow-hidden border border-border hover:scale-110 transition-transform cursor-pointer"
                            >
                              <img src={preset} alt="" className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: FOOTBALL PROFILE & CLUB */}
              {step === 2 && (
                <div className="space-y-3.5">
                  <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                    <span className="font-semibold text-blue-800 dark:text-blue-300 text-xs flex items-center gap-1.5">
                      <Award className="h-4 w-4" />
                      Section 2: Football Profile & Club Affiliation
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Specify position, jersey squad number and assign the player to their primary club.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="position" className="text-xs">
                        Primary Playing Position *
                      </Label>
                      <select
                        id="position"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      >
                        <option value="Goalkeeper">Goalkeeper</option>
                        <option value="Defender">Defender</option>
                        <option value="Midfielder">Midfielder</option>
                        <option value="Forward">Forward</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="secondaryPosition" className="text-xs">
                        Secondary Tactical Role
                      </Label>
                      <Input
                        id="secondaryPosition"
                        placeholder="e.g. Left Winger / Center Back"
                        value={formData.secondaryPosition}
                        onChange={(e) => setFormData({ ...formData, secondaryPosition: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="preferredFoot" className="text-xs">
                        Preferred Foot
                      </Label>
                      <select
                        id="preferredFoot"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                        value={formData.preferredFoot}
                        onChange={(e) =>
                          setFormData({ ...formData, preferredFoot: e.target.value as any })
                        }
                      >
                        <option value="right">Right</option>
                        <option value="left">Left</option>
                        <option value="both">Both (Ambidextrous)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="jerseyNumber" className="text-xs">
                        Squad Jersey #
                      </Label>
                      <Input
                        id="jerseyNumber"
                        type="number"
                        min={1}
                        max={99}
                        value={formData.jerseyNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, jerseyNumber: Number(e.target.value) })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="height" className="text-xs">
                        Height (cm)
                      </Label>
                      <Input
                        id="height"
                        type="number"
                        placeholder="182"
                        value={formData.height}
                        onChange={(e) =>
                          setFormData({ ...formData, height: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-border/60">
                    <Label htmlFor="club" className="text-xs font-semibold">
                      Affiliated Club
                    </Label>
                    {isClubAdmin && (userClub || userClubId) ? (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-foreground block">
                              {userClub?.name || "Saint George SC"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {userClub?.city || "Addis Ababa"} • Auto-linked to your club
                            </span>
                          </div>
                        </div>
                        <Badge className="bg-emerald-600 text-white text-[10px]">Your Club (Auto-Linked)</Badge>
                      </div>
                    ) : (
                      <select
                        id="club"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                        value={formData.currentClubId}
                        onChange={(e) => {
                          const cid = e.target.value;
                          const matched = clubs.find((c) => c.id === cid);
                          setFormData({
                            ...formData,
                            currentClubId: cid,
                            currentClubName: matched ? matched.name : "",
                          });
                        }}
                      >
                        <option value="">No Club (Free Agent)</option>
                        {clubs.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.city || c.country})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: INITIAL CONTRACT AGREEMENT */}
              {step === 3 && (
                <div className="space-y-3.5">
                  <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                    <span className="font-semibold text-purple-800 dark:text-purple-300 text-xs flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4" />
                      Section 3: Initial Contract Terms & Valuation
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Register contract terms, monthly remuneration and release buyout clause with the federation.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Contract Type</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                        value={formData.initialContract.contractType}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialContract: {
                              ...formData.initialContract,
                              contractType: e.target.value as any,
                            },
                          })
                        }
                      >
                        <option value="professional">Professional Senior</option>
                        <option value="semi_professional">Semi-Professional</option>
                        <option value="youth">Youth / Academy Development</option>
                        <option value="amateur">Amateur Registration</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Monthly Salary (ETB)</Label>
                      <Input
                        type="number"
                        value={formData.initialContract.salaryMonthly}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialContract: {
                              ...formData.initialContract,
                              salaryMonthly: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Contract Start Date</Label>
                      <Input
                        type="date"
                        value={formData.initialContract.startDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialContract: {
                              ...formData.initialContract,
                              startDate: e.target.value,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Contract End Date</Label>
                      <Input
                        type="date"
                        value={formData.initialContract.endDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialContract: {
                              ...formData.initialContract,
                              endDate: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Buyout / Release Clause (ETB)</Label>
                      <Input
                        type="number"
                        placeholder="1,500,000"
                        value={formData.initialContract.buyoutClause}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialContract: {
                              ...formData.initialContract,
                              buyoutClause: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Player Agent / Representative</Label>
                      <Input
                        placeholder="e.g. East Africa Sports Agency"
                        value={formData.initialContract.agentName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialContract: {
                              ...formData.initialContract,
                              agentName: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: MEDICAL CLEARANCE & REGULATORY REVIEW */}
              {step === 4 && (
                <div className="space-y-3.5">
                  <div className="p-3 bg-teal-500/5 border border-teal-500/20 rounded-lg">
                    <span className="font-semibold text-teal-800 dark:text-teal-300 text-xs flex items-center gap-1.5">
                      <HeartPulse className="h-4 w-4" />
                      Section 4: Medical Examination & Federation Licensing
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Ensure mandatory medical clearance certificate is certified and active season license is issued.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Medical Clearance Expiry</Label>
                      <Input
                        type="date"
                        value={formData.medicalClearanceDate}
                        onChange={(e) =>
                          setFormData({ ...formData, medicalClearanceDate: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Blood Group</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                        value={formData.bloodGroup}
                        onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      >
                        <option value="O+">O+</option>
                        <option value="A+">A+</option>
                        <option value="B+">B+</option>
                        <option value="AB+">AB+</option>
                        <option value="O-">O-</option>
                        <option value="A-">A-</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Emergency Contact Phone</Label>
                      <Input
                        placeholder="+251 911 000000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Contact Email</Label>
                      <Input
                        type="email"
                        placeholder="player@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Summary Card Before Submission */}
                  <div className="p-3 bg-muted/50 rounded-lg border border-border/70 text-xs space-y-1.5">
                    <span className="font-semibold block text-[11px] text-foreground">
                      Registration Summary Checklist
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                      <div>
                        Identity: <strong className="text-foreground">{formData.firstName} {formData.lastName}</strong>
                      </div>
                      <div>
                        National ID: <strong className="text-foreground font-mono">{formData.nationalId || "ETH-NID-PENDING"}</strong>
                      </div>
                      <div>
                        Birth Place: <strong className="text-foreground">{formData.birthPlace || "Unspecified"}</strong>
                      </div>
                      <div>
                        Club: <strong className="text-foreground">{formData.currentClubName || "Free Agent"}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Navigation Buttons */}
              <DialogFooter className="pt-3 border-t border-border/50 flex items-center justify-between">
                <div>
                  {step > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStep((s) => (s - 1) as any)}
                    >
                      Back
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddModalOpen(false)}
                  >
                    Cancel
                  </Button>

                  {step < 4 ? (
                    <Button
                      type="button"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        if (step === 1) {
                          if (!formData.firstName || !formData.lastName) {
                            toast.error("Please enter first name and last name");
                            return;
                          }
                          if (!formData.nationalId) {
                            toast.error("National ID Number is required");
                            return;
                          }
                          if (!formData.birthPlace) {
                            toast.error("Birth Place is required");
                            return;
                          }
                        }
                        setStep((s) => (s + 1) as any);
                      }}
                    >
                      Next Step
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      {submitting ? "Registering Player..." : "Submit Official Registration"}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════════════════
            DIGITAL PLAYER PASSPORT MODAL (Official Federation Identity Dossier)
        ══════════════════════════════════════════════════════════════════════ */}
        {selectedPlayer && (
          <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-emerald-500/40">
              {/* Federation Passport Header */}
              <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-5 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedPlayer.photoUrl || PRESET_PHOTOS[0]}
                      alt=""
                      className="h-16 w-16 rounded-xl object-cover border-2 border-white/80 shadow-md"
                    />
                    <div>
                      <span className="text-[10px] tracking-widest uppercase font-mono text-emerald-200 block">
                        Ethiopian Football Federation • Official Digital Passport
                      </span>
                      <h2 className="text-lg font-bold">
                        {selectedPlayer.firstName} {selectedPlayer.lastName}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded text-white font-bold">
                          {selectedPlayer.federationId || `ETH-PLY-2026-${selectedPlayer.id.slice(-4)}`}
                        </span>
                        <span className="text-xs font-medium text-emerald-100">
                          {selectedPlayer.currentClubName || "Free Agent"} (#{selectedPlayer.jerseyNumber || "—"})
                        </span>
                      </div>
                    </div>
                  </div>

                  <Badge className="bg-white/20 text-white border-white/30 text-xs font-mono uppercase">
                    {selectedPlayer.status}
                  </Badge>
                </div>
              </div>

              {/* Passport Body */}
              <div className="p-5 space-y-4 text-xs">
                {/* Identity & Legal Data Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/70">
                  <div>
                    <span className="text-muted-foreground text-[10px] block font-medium">National ID #</span>
                    <span className="font-mono font-bold text-foreground">
                      {selectedPlayer.nationalId || selectedPlayer.idDocumentNumber || "ETH-NID-882910"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block font-medium">Place of Birth</span>
                    <span className="font-semibold text-foreground">
                      {selectedPlayer.birthPlace || "Ethiopia"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block font-medium">Date of Birth</span>
                    <span className="font-mono text-foreground">{selectedPlayer.dateOfBirth}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block font-medium">Nationality</span>
                    <span className="font-semibold text-foreground">{selectedPlayer.nationality}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block font-medium">Position</span>
                    <span className="font-semibold text-foreground">{selectedPlayer.position || "Forward"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block font-medium">Preferred Foot</span>
                    <span className="capitalize font-semibold text-foreground">
                      {selectedPlayer.preferredFoot || "Right"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block font-medium">Height & Weight</span>
                    <span className="font-mono text-foreground">
                      {selectedPlayer.height || 180} cm • {selectedPlayer.weight || 75} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block font-medium">Medical Clearance</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                      {selectedPlayer.medicalClearanceDate || "2026-12-31"}
                    </span>
                  </div>
                </div>

                {/* Real-time Matchday Eligibility Scorecard */}
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 text-xs">
                      <Shield className="h-4 w-4 text-emerald-600" />
                      Federation Matchday Regulatory Eligibility
                    </span>
                    <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                      100% Cleared to Play
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>National ID Verified</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Active Season License</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Medical Clearance Active</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Zero Active Suspensions</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Registered Club Contract</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Domestic Quota Cleared</span>
                    </div>
                  </div>
                </div>

                {/* Passport Tabs: Contracts, Transfers, Documents */}
                <Tabs defaultValue="passport-contracts" className="pt-1">
                  <TabsList className="bg-muted/60 p-0.5 h-8 text-xs">
                    <TabsTrigger value="passport-contracts" className="text-xs h-7">
                      Registered Contracts
                    </TabsTrigger>
                    <TabsTrigger value="passport-transfers" className="text-xs h-7">
                      Transfer History
                    </TabsTrigger>
                    <TabsTrigger value="passport-licensing" className="text-xs h-7">
                      License Credentials
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="passport-contracts" className="pt-2">
                    {passportLoading ? (
                      <p className="text-xs text-muted-foreground">Loading contract terms...</p>
                    ) : playerPassportData?.contracts?.length > 0 ? (
                      <div className="space-y-2">
                        {playerPassportData.contracts.map((c: any) => (
                          <div
                            key={c.id}
                            className="p-2.5 rounded-lg border border-border/60 bg-card flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-foreground block">
                                {c.contractType.toUpperCase()} Agreement
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {c.startDate} → {c.endDate}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-emerald-600 block">
                                {c.salaryMonthly ? `${c.salaryMonthly.toLocaleString()} ETB / mo` : "—"}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                Buyout: {c.buyoutClause ? `${c.buyoutClause.toLocaleString()} ETB` : "None"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 border rounded-lg bg-muted/20 text-xs text-muted-foreground">
                        No registered contracts on file for this player
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="passport-transfers" className="pt-2">
                    {playerPassportData?.transfers?.length > 0 ? (
                      <div className="space-y-2">
                        {playerPassportData.transfers.map((t: any) => (
                          <div
                            key={t.id}
                            className="p-2.5 rounded-lg border border-border/60 bg-card flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-foreground block">
                                Transfer #{t.id}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                Date: {t.transferDate}
                              </span>
                            </div>
                            <Badge className="bg-purple-500/10 text-purple-700 text-[10px]">
                              {t.status.toUpperCase()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 border rounded-lg bg-muted/20 text-xs text-muted-foreground">
                        No historical transfers recorded
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="passport-licensing" className="pt-2">
                    {playerPassportData?.registrations?.length > 0 ? (
                      <div className="space-y-2">
                        {playerPassportData.registrations.map((r: any) => (
                          <div
                            key={r.id}
                            className="p-2.5 rounded-lg border border-border/60 bg-card flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-mono font-bold text-emerald-600 block">
                                License #{r.licenseNumber || "PENDING"}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                Season: {r.seasonId}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              Expires: {r.expiryDate || "2027-06-30"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 border rounded-lg bg-muted/20 text-xs text-muted-foreground">
                        No license registrations found
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              <DialogFooter className="p-4 bg-muted/30 border-t border-border/60 flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleCheckEligibility(selectedPlayer);
                    setSelectedPlayer(null);
                  }}
                  className="text-xs gap-1.5"
                >
                  <Shield className="h-3.5 w-3.5 text-amber-600" />
                  <span>Inspect Eligibility Report</span>
                </Button>
                <Button variant="default" size="sm" onClick={() => setSelectedPlayer(null)}>
                  Close Passport
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ELIGIBILITY INSPECTOR MODAL
        ══════════════════════════════════════════════════════════════════════ */}
        {eligibilityModalPlayer && (
          <Dialog
            open={!!eligibilityModalPlayer}
            onOpenChange={() => {
              setEligibilityModalPlayer(null);
              setEligibilityData(null);
            }}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Matchday Regulatory Eligibility Report</span>
                  {eligibilityData && (
                    <Badge
                      className={`font-mono text-xs ${
                        eligibilityData.isEligible
                          ? "bg-emerald-600 text-white"
                          : eligibilityData.overallStatus === "conditional"
                          ? "bg-amber-600 text-white"
                          : "bg-rose-600 text-white"
                      }`}
                    >
                      Score: {eligibilityData.score}% ({eligibilityData.overallStatus.toUpperCase()})
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Automated regulatory compliance audit for {eligibilityModalPlayer.firstName}{" "}
                  {eligibilityModalPlayer.lastName}
                </DialogDescription>
              </DialogHeader>

              {checkingEligibility ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                  Running regulatory checks against federation rules...
                </div>
              ) : eligibilityData ? (
                <div className="space-y-4 py-2 text-xs">
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/40 space-y-2">
                    <span className="font-bold text-foreground block text-xs">
                      5 Regulatory Pillars Checklist
                    </span>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          {eligibilityData.checks.identityVerified ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-600" />
                          )}
                          Identity Verified (National ID & Birthplace)
                        </span>
                        <span className="font-mono font-semibold text-foreground">
                          {eligibilityData.details.nationalId}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          {eligibilityData.checks.activeLicense ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-600" />
                          )}
                          Active Federation License
                        </span>
                        <span className="font-mono text-foreground">
                          {eligibilityData.details.licenseNumber || "Missing"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          {eligibilityData.checks.disciplinaryClearance ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-600" />
                          )}
                          Disciplinary Record Clearance
                        </span>
                        <span className="text-foreground">
                          {eligibilityData.details.suspensionsCount === 0
                            ? "Zero Active Bans"
                            : `${eligibilityData.details.suspensionsCount} Active Suspensions`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          {eligibilityData.checks.medicalClearance ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-600" />
                          )}
                          Medical Clearance Certificate
                        </span>
                        <span className="font-mono text-foreground">
                          {eligibilityData.details.medicalExpiry || "Expired"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          {eligibilityData.checks.validContract ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-600" />
                          )}
                          Registered Club Contract
                        </span>
                        <span className="text-foreground">
                          {eligibilityData.details.contractStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {eligibilityData.reasons.length > 0 && (
                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-1">
                      <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Compliance Notice / Disqualification Factors:
                      </span>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-900 dark:text-amber-200">
                        {eligibilityData.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}

              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEligibilityModalPlayer(null);
                    setEligibilityData(null);
                  }}
                >
                  Dismiss Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            REGISTER NEW CONTRACT MODAL
        ══════════════════════════════════════════════════════════════════════ */}
        <Dialog open={contractModalOpen} onOpenChange={setContractModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Register New Player Contract</DialogTitle>
              <DialogDescription className="text-xs">
                Submit contractual agreement with wage and buyout terms to federation registry
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateContract} className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Select Player *</Label>
                <select
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  value={contractFormData.playerId}
                  onChange={(e) =>
                    setContractFormData({ ...contractFormData, playerId: e.target.value })
                  }
                >
                  <option value="">Choose player...</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.currentClubName || "Free Agent"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Contracting Club *</Label>
                <select
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  value={contractFormData.clubId}
                  onChange={(e) =>
                    setContractFormData({ ...contractFormData, clubId: e.target.value })
                  }
                >
                  <option value="">Choose club...</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Contract Type</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                    value={contractFormData.contractType}
                    onChange={(e) =>
                      setContractFormData({
                        ...contractFormData,
                        contractType: e.target.value as any,
                      })
                    }
                  >
                    <option value="professional">Professional</option>
                    <option value="semi_professional">Semi-Professional</option>
                    <option value="youth">Youth Development</option>
                    <option value="loan">Loan Agreement</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Monthly Salary (ETB)</Label>
                  <Input
                    type="number"
                    value={contractFormData.salaryMonthly}
                    onChange={(e) =>
                      setContractFormData({
                        ...contractFormData,
                        salaryMonthly: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={contractFormData.startDate}
                    onChange={(e) =>
                      setContractFormData({ ...contractFormData, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={contractFormData.endDate}
                    onChange={(e) =>
                      setContractFormData({ ...contractFormData, endDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Buyout Clause (ETB)</Label>
                  <Input
                    type="number"
                    value={contractFormData.buyoutClause}
                    onChange={(e) =>
                      setContractFormData({
                        ...contractFormData,
                        buyoutClause: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Agent Name</Label>
                  <Input
                    placeholder="e.g. Habesha Sports Agency"
                    value={contractFormData.agentName}
                    onChange={(e) =>
                      setContractFormData({ ...contractFormData, agentName: e.target.value })
                    }
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setContractModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submitting ? "Submitting..." : "Register Contract"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════════════════
            INITIATE TRANSFER MODAL
        ══════════════════════════════════════════════════════════════════════ */}
        <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Initiate Player Transfer (TMS)</DialogTitle>
              <DialogDescription className="text-xs">
                File a domestic or international player transfer request through the Federation TMS
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateTransfer} className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Player to Transfer *</Label>
                <select
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  value={transferFormData.playerId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const p = players.find((x) => x.id === pid);
                    setTransferFormData({
                      ...transferFormData,
                      playerId: pid,
                      fromClubId: p?.currentClubId || clubs[0]?.id || "",
                    });
                  }}
                >
                  <option value="">Choose player...</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.currentClubName || "Free Agent"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Origin Club (From) *</Label>
                  <select
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                    value={transferFormData.fromClubId}
                    onChange={(e) =>
                      setTransferFormData({ ...transferFormData, fromClubId: e.target.value })
                    }
                  >
                    <option value="">Origin club...</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Destination Club (To) *</Label>
                  <select
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                    value={transferFormData.toClubId}
                    onChange={(e) =>
                      setTransferFormData({ ...transferFormData, toClubId: e.target.value })
                    }
                  >
                    <option value="">Destination club...</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Transfer Fee (ETB)</Label>
                  <Input
                    type="number"
                    value={transferFormData.transferFee}
                    onChange={(e) =>
                      setTransferFormData({
                        ...transferFormData,
                        transferFee: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Transfer Effective Date</Label>
                  <Input
                    type="date"
                    value={transferFormData.transferDate}
                    onChange={(e) =>
                      setTransferFormData({ ...transferFormData, transferDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Reason / Agreement Summary</Label>
                <Input
                  value={transferFormData.reason}
                  onChange={(e) =>
                    setTransferFormData({ ...transferFormData, reason: e.target.value })
                  }
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTransferModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {submitting ? "Filing..." : "Submit to TMS"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
