import { useState, useEffect, useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import type { User, Club, Role } from "@/lib/types";
import { ROLES } from "@/lib/types";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Building2,
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  KeyRound,
  LogIn,
  Trash2,
  Edit,
  Mail,
  Phone,
  ArrowUpDown,
  Filter,
  X,
  Lock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export default function UsersPage() {
  const { user: currentUser, login } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Create User Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [switchAfterCreate, setSwitchAfterCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "password123",
    role: "club_admin",
    clubId: "",
    phone: "",
  });

  // Edit User Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "",
    clubId: "",
    phone: "",
    isActive: true,
    password: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [uRes, cRes] = await Promise.all([
        api.users.list(),
        api.clubs.list(),
      ]);
      if (uRes?.users) setUsers(uRes.users);
      if (cRes?.clubs) setClubs(cRes.clubs);
    } catch (err: any) {
      console.error("Failed to load users:", err);
      toast.error(err.message || "Failed to load user registry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    if (formData.role === "club_admin" && !formData.clubId) {
      toast.error("Please assign a club for the Club Leader");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.users.create({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password || "password123",
        role: formData.role,
        clubId: formData.clubId || undefined,
        phone: formData.phone.trim() || undefined,
      });

      toast.success(res.message || "User created successfully!");
      setCreateModalOpen(false);

      const createdEmail = formData.email.trim();
      const createdPassword = formData.password || "password123";

      setFormData({
        name: "",
        email: "",
        password: "password123",
        role: "club_admin",
        clubId: "",
        phone: "",
      });

      await loadData();

      // If requested, immediately switch to the created user so super admin can test squad submission!
      if (switchAfterCreate) {
        toast.info(`Switching session to ${createdEmail}...`);
        const ok = await login(createdEmail, createdPassword);
        if (ok) {
          navigate("/dashboard/players");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      clubId: user.clubId || "",
      phone: user.phone || "",
      isActive: user.isActive,
      password: "",
    });
    setEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setSubmitting(true);
      await api.users.update(editingUser.id, {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        role: editFormData.role as Role,
        clubId: editFormData.clubId || undefined,
        phone: editFormData.phone.trim() || undefined,
        isActive: editFormData.isActive,
        password: editFormData.password ? editFormData.password : undefined,
      });

      toast.success("User updated successfully");
      setEditModalOpen(false);
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (id === currentUser?.id) {
      toast.error("You cannot delete your own active account");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete user account "${name}"?`)) {
      return;
    }

    try {
      await api.users.delete(id);
      toast.success("User removed successfully");
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  const handleImpersonate = async (email: string, name: string) => {
    try {
      toast.info(`Logging in as ${name}...`);
      const ok = await login(email, "password123");
      if (ok) {
        navigate("/dashboard/players");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to login as user");
    }
  };

  // Club map for fast lookup
  const clubMap = useMemo(() => {
    const map = new Map<string, Club>();
    clubs.forEach((c) => map.set(c.id, c));
    return map;
  }, [clubs]);

  // Sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Filtered and sorted
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users
      .filter((u) => {
        const assignedClubName = u.clubId ? clubMap.get(u.clubId)?.name || "" : "";
        const matchesSearch =
          !q ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone && u.phone.toLowerCase().includes(q)) ||
          assignedClubName.toLowerCase().includes(q);

        const matchesRole = roleFilter === "all" || u.role === roleFilter;
        const matchesClub = clubFilter === "all" || u.clubId === clubFilter;

        return matchesSearch && matchesRole && matchesClub;
      })
      .sort((a, b) => {
        let valA: any = "";
        let valB: any = "";

        if (sortField === "name") {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        } else if (sortField === "email") {
          valA = a.email.toLowerCase();
          valB = b.email.toLowerCase();
        } else if (sortField === "role") {
          valA = a.role;
          valB = b.role;
        } else if (sortField === "club") {
          valA = (a.clubId ? clubMap.get(a.clubId)?.name : "") || "";
          valB = (b.clubId ? clubMap.get(b.clubId)?.name : "") || "";
        } else if (sortField === "status") {
          valA = a.isActive ? 1 : 0;
          valB = b.isActive ? 1 : 0;
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [users, search, roleFilter, clubFilter, sortField, sortDirection, clubMap]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, clubFilter, pageSize]);

  // Metrics
  const clubLeadersCount = useMemo(
    () => users.filter((u) => u.role === "club_admin").length,
    [users]
  );
  const federationAdminsCount = useMemo(
    () => users.filter((u) => u.role === "super_admin" || u.role === "federation_admin").length,
    [users]
  );
  const activeUsersCount = useMemo(
    () => users.filter((u) => u.isActive).length,
    [users]
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] uppercase font-mono">
            Super Admin
          </Badge>
        );
      case "federation_admin":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[10px] uppercase font-mono">
            Federation Admin
          </Badge>
        );
      case "club_admin":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] uppercase font-mono">
            Club Leader / Admin
          </Badge>
        );
      case "competition_admin":
        return (
          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 text-[10px] uppercase font-mono">
            Competition Admin
          </Badge>
        );
      case "registration_officer":
        return (
          <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30 text-[10px] uppercase font-mono">
            Registration Officer
          </Badge>
        );
      case "transfer_officer":
        return (
          <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30 text-[10px] uppercase font-mono">
            Transfer Officer
          </Badge>
        );
      case "referee":
        return (
          <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30 text-[10px] uppercase font-mono">
            Official Referee
          </Badge>
        );
      case "disciplinary_officer":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px] uppercase font-mono">
            Disciplinary Officer
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] uppercase font-mono">
            {role}
          </Badge>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">User & Access Management</h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {users.length} Users
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Manage federation administrators, authorized club leaders, match officials and access credentials
            </p>
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
                setFormData({
                  name: "",
                  email: "",
                  password: "password123",
                  role: "club_admin",
                  clubId: clubs[0]?.id || "",
                  phone: "",
                });
                setSwitchAfterCreate(false);
                setCreateModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create Club Leader / User</span>
            </Button>
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Total Accounts
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold tracking-tight">{users.length}</span>
                  <span className="text-[11px] text-muted-foreground">Registered</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-muted/60 text-foreground border border-border flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Club Leaders
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold tracking-tight text-amber-600">
                    {clubLeadersCount}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Squad Managers</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Federation Admins
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold tracking-tight text-emerald-600">
                    {federationAdminsCount}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Authorities</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Active Access Rate
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold tracking-tight">{activeUsersCount}</span>
                  <span className="text-[11px] text-emerald-600 font-medium">
                    ({users.length ? Math.round((activeUsersCount / users.length) * 100) : 0}%)
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-600 border border-teal-500/20 flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Control Bar */}
        <Card className="border-border/60">
          <CardContent className="p-3.5 space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search user by name, email, phone, or assigned club..."
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

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="club_admin">Club Leader / Official</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="federation_admin">Federation Admin</option>
                  <option value="competition_admin">Competition Admin</option>
                  <option value="registration_officer">Registration Officer</option>
                  <option value="transfer_officer">Transfer Officer</option>
                  <option value="referee">Referee</option>
                  <option value="disciplinary_officer">Disciplinary Officer</option>
                </select>

                {/* Club Filter */}
                <select
                  value={clubFilter}
                  onChange={(e) => setClubFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer max-w-[180px] truncate"
                >
                  <option value="all">All Assigned Clubs</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {(search || roleFilter !== "all" || clubFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setRoleFilter("all");
                      setClubFilter("all");
                    }}
                    className="h-9 text-xs text-muted-foreground hover:text-foreground px-2.5 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    <span>Clear</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
              <span className="font-mono text-[11px]">
                Showing {filteredUsers.length} of {users.length} accounts
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px]">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 rounded border border-input bg-background px-2 text-[11px] cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users DataTable */}
        {loading ? (
          <div className="text-center py-20 text-xs text-muted-foreground border rounded-xl bg-card">
            <RefreshCw className="h-7 w-7 animate-spin mx-auto text-emerald-600 mb-2.5" />
            Loading federation users and club leaders...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 border rounded-xl bg-card border-dashed">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold">No user accounts found</p>
            <p className="text-xs text-muted-foreground mt-1">Try another search or role filter</p>
          </div>
        ) : (
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
                        User & Contact
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60 ml-1 inline-block" />
                      </span>
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("role")}
                      className="cursor-pointer select-none font-semibold hover:text-emerald-600 transition-colors"
                    >
                      <span className="flex items-center">
                        System Role
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60 ml-1 inline-block" />
                      </span>
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("club")}
                      className="cursor-pointer select-none font-semibold hover:text-emerald-600 transition-colors"
                    >
                      <span className="flex items-center">
                        Assigned Club (Squad Authority)
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60 ml-1 inline-block" />
                      </span>
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("status")}
                      className="cursor-pointer select-none font-semibold hover:text-emerald-600 transition-colors text-center"
                    >
                      <span className="flex items-center justify-center">
                        Status
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60 ml-1 inline-block" />
                      </span>
                    </TableHead>
                    <TableHead className="text-right font-semibold pr-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {paginatedUsers.map((user, index) => {
                    const rowNumber = (currentPage - 1) * pageSize + index + 1;
                    const assignedClub = user.clubId ? clubMap.get(user.clubId) : null;
                    const isSelf = user.id === currentUser?.id;

                    return (
                      <TableRow key={user.id} className="hover:bg-muted/30 transition-colors group">
                        <TableCell className="text-center font-mono text-[11px] text-muted-foreground w-12">
                          {rowNumber}
                        </TableCell>

                        {/* Name & Contact */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 font-bold text-xs shadow-xs">
                              {user.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-foreground truncate">
                                  {user.name}
                                </span>
                                {isSelf && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-600">
                                    Current User
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-muted-foreground text-[11px] mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {user.email}
                                </span>
                                {user.phone && (
                                  <span className="flex items-center gap-1 font-mono">
                                    <Phone className="h-3 w-3" />
                                    {user.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Role */}
                        <TableCell className="py-3">
                          {getRoleBadge(user.role)}
                        </TableCell>

                        {/* Assigned Club */}
                        <TableCell className="py-3">
                          {assignedClub ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold text-[10px]">
                                {assignedClub.shortName || assignedClub.name.slice(0, 3).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-semibold text-foreground block">
                                  {assignedClub.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  Official Squad Submitter
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px] italic">
                              Federation Wide (No Club Restriction)
                            </span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3 text-center">
                          <Badge
                            variant={user.isActive ? "default" : "secondary"}
                            className={`text-[10px] uppercase font-mono px-2 py-0.5 ${
                              user.isActive
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full mr-1.5 inline-block ${
                                user.isActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                              }`}
                            />
                            {user.isActive ? "Active" : "Disabled"}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3 text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            {!isSelf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleImpersonate(user.email, user.name)}
                                className="h-8 px-2.5 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer gap-1"
                                title="Login as this user to submit squad or test permissions"
                              >
                                <LogIn className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Login As</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(user)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Edit user details"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            {!isSelf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                title="Delete user account"
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
                {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} users
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 font-mono text-xs">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Create User / Club Leader Modal */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-600" />
                <span>Create User Account / Club Leader</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Provision access credentials for club officials to submit their squad and manage licenses
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateUser} className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="userName" className="text-xs font-semibold">
                  Full Name
                </Label>
                <Input
                  id="userName"
                  required
                  placeholder="e.g. Solomon Girma (Club President / Secretary)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="userEmail" className="text-xs font-semibold">
                  Official Email Address
                </Label>
                <Input
                  id="userEmail"
                  type="email"
                  required
                  placeholder="e.g. leader@saintgeorge.org"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="userRole" className="text-xs font-semibold">
                    System Role
                  </Label>
                  <select
                    id="userRole"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="club_admin">Club Leader / Official</option>
                    <option value="federation_admin">Federation Admin</option>
                    <option value="competition_admin">Competition Admin</option>
                    <option value="registration_officer">Registration Officer</option>
                    <option value="transfer_officer">Transfer Officer</option>
                    <option value="referee">Referee</option>
                    <option value="disciplinary_officer">Disciplinary Officer</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="userPhone" className="text-xs font-semibold">
                    Phone Number
                  </Label>
                  <Input
                    id="userPhone"
                    placeholder="+251 91 123 4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Club Assignment Dropdown - Highlighted for Club Leader */}
              <div className={`p-3 rounded-lg border transition-all ${
                formData.role === "club_admin"
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-muted/40 border-border/60"
              }`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Building2 className={`h-4 w-4 ${
                    formData.role === "club_admin" ? "text-amber-600" : "text-muted-foreground"
                  }`} />
                  <Label htmlFor="userClub" className="text-xs font-semibold">
                    Assigned Football Club {formData.role === "club_admin" && "(Required for Squad Submission)"}
                  </Label>
                </div>
                <select
                  id="userClub"
                  required={formData.role === "club_admin"}
                  value={formData.clubId}
                  onChange={(e) => setFormData({ ...formData, clubId: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="">
                    {formData.role === "club_admin"
                      ? "— Select Club for this Leader —"
                      : "— No specific club (Federation Authority) —"}
                  </option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city || "Ethiopia"})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Assigning a club enables this user to register and submit players specifically for this club's official roster.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="userPassword" className="text-xs font-semibold">
                  Initial Password
                </Label>
                <Input
                  id="userPassword"
                  type="text"
                  placeholder="password123"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground">
                  Default initial password is <span className="font-mono text-foreground font-semibold">password123</span>
                </p>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="switchAfterCreate"
                  checked={switchAfterCreate}
                  onChange={(e) => setSwitchAfterCreate(e.target.checked)}
                  className="rounded border-input text-emerald-600 cursor-pointer"
                />
                <label htmlFor="switchAfterCreate" className="text-xs cursor-pointer select-none">
                  Immediately switch session to this Club Leader to test squad submission
                </label>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting ? "Creating User..." : "Create Club Leader"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        {editingUser && (
          <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit User Profile</DialogTitle>
                <DialogDescription className="text-xs">
                  Update role, assigned club authority, and account status
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleUpdateUser} className="space-y-4 py-2 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Full Name</Label>
                  <Input
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Email Address</Label>
                  <Input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Role</Label>
                    <select
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                      className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    >
                      <option value="club_admin">Club Leader / Admin</option>
                      <option value="federation_admin">Federation Admin</option>
                      <option value="competition_admin">Competition Admin</option>
                      <option value="registration_officer">Registration Officer</option>
                      <option value="transfer_officer">Transfer Officer</option>
                      <option value="referee">Referee</option>
                      <option value="disciplinary_officer">Disciplinary Officer</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Phone</Label>
                    <Input
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Assigned Club</Label>
                  <select
                    value={editFormData.clubId}
                    onChange={(e) => setEditFormData({ ...editFormData, clubId: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="">— No Club (Federation Wide) —</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Reset Password (leave empty to keep current)</Label>
                  <Input
                    type="password"
                    placeholder="New password..."
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={editFormData.isActive}
                    onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    className="rounded border-input text-emerald-600 cursor-pointer"
                  />
                  <label htmlFor="isActiveCheck" className="text-xs cursor-pointer select-none">
                    Account is active and permitted to login
                  </label>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {submitting ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
