import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import {
  Bell,
  Search,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trophy,
  ArrowRightLeft,
  ShieldAlert,
  Info,
  Clock,
  ExternalLink,
  Filter,
} from "lucide-react";
import { motion } from "framer-motion";

export interface BulletinItem {
  id: string;
  title: string;
  category: "competition" | "transfer" | "disciplinary" | "administrative" | "circular";
  priority: "urgent" | "official" | "info";
  publishDate: string;
  author: string;
  summary: string;
  content: string;
  targetAudience: "all" | "clubs" | "referees";
  isRead?: boolean;
}

const OFFICIAL_BULLETINS: BulletinItem[] = [
  {
    id: "blt-2026-001",
    title: "Mid-Season Transfer Window Official Opening & TMS Deadlines",
    category: "transfer",
    priority: "urgent",
    publishDate: "2026-10-14",
    author: "Federation Transfer Department",
    summary:
      "All Premier League and Super League clubs are notified that the official mid-season player registration and domestic transfer window is active through Nov 15, 2026.",
    content:
      "All transfer requests, player contract terminations, and new professional registrations must be filed through the official Transfer Management System (TMS). Submissions after 23:59 EAT on the deadline date will not be processed under any circumstances. Ensure international clearance certificates (ITC) are uploaded in advance.",
    targetAudience: "clubs",
  },
  {
    id: "blt-2026-002",
    title: "Gameweek 6 Fixture Rescheduling: Addis Ababa Stadium Maintenance",
    category: "competition",
    priority: "urgent",
    publishDate: "2026-10-12",
    author: "Competition & League Operations Committee",
    summary:
      "Selected Premier League fixtures scheduled for this weekend have been adjusted due to national stadium turf rehabilitation works.",
    content:
      "Affected clubs including Saint George SC, Ethiopian Coffee SC, and Bahir Dar City FC are requested to adhere to the revised kickoff times. Match commissioner reports and squad team sheets must be delivered 75 minutes prior to revised kickoff times. Live television broadcast slots remain intact.",
    targetAudience: "all",
  },
  {
    id: "blt-2026-003",
    title: "Official League Table Standing Derivation and CAF Qualification Guidelines",
    category: "competition",
    priority: "official",
    publishDate: "2026-10-10",
    author: "Technical Study Group & Executive Board",
    summary:
      "Clarification on head-to-head tiebreakers and goal differential metrics applied to the 2025/2026 championship table standings.",
    content:
      "The Executive Committee confirms that table standings strictly calculate: 1. Total Points, 2. Goal Differential, 3. Greater Number of Goals Scored, 4. Head-to-Head record between tied clubs. Champions qualify directly to the CAF Champions League, while the runner-up and Federation Cup champion represent the nation in the CAF Confederation Cup.",
    targetAudience: "all",
  },
  {
    id: "blt-2026-004",
    title: "Updated Disciplinary Sanctions Schedule for Card Accumulations",
    category: "disciplinary",
    priority: "official",
    publishDate: "2026-10-08",
    author: "Disciplinary & Ethics Committee",
    summary:
      "Clubs are reminded of the automated 1-match suspension triggered after a player accumulates 3 yellow cards or 1 direct red card.",
    content:
      "Club administrators are required to verify their squad's card counts prior to each fixture. Ineligible player appearances will result in automated match forfeiture (3-0 default loss) plus financial sanctions against the responsible club as per Article 42 of Federation Regulations.",
    targetAudience: "clubs",
  },
  {
    id: "blt-2026-005",
    title: "Mandatory FIFA Medical Clearances & Cardiac Screening Protocols",
    category: "administrative",
    priority: "info",
    publishDate: "2026-10-05",
    author: "Medical & Anti-Doping Sub-Committee",
    summary:
      "All registered professional players must have certified pre-competition medical assessment (PCMA) reports filed before player licenses are validated.",
    content:
      "Club chief medical officers must upload verified ECG and blood test certificates into the Federation Digital Hub. Valid medical clearance is required for all active player status badges.",
    targetAudience: "clubs",
  },
  {
    id: "blt-2026-006",
    title: "Annual General Assembly & Club Presidents Executive Briefing",
    category: "circular",
    priority: "official",
    publishDate: "2026-10-01",
    author: "General Secretariat",
    summary:
      "Formal invitation to all affiliated club presidents and general secretaries for the 2026 National Football Governance Assembly in Addis Ababa.",
    content:
      "The assembly agenda will cover constitutional statutory amendments, youth academy subventions, VAR pilot introduction for Premier League matches, and broadcast rights revenue distributions.",
    targetAudience: "clubs",
  },
];

export default function NewsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBulletin, setSelectedBulletin] = useState<BulletinItem | null>(OFFICIAL_BULLETINS[0]);

  const filteredBulletins = useMemo(() => {
    const q = search.toLowerCase().trim();
    return OFFICIAL_BULLETINS.filter((b) => {
      const matchesSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.summary.toLowerCase().includes(q) ||
        b.content.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q);

      const matchesCat = selectedCategory === "all" || b.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [search, selectedCategory]);

  const getCategoryBadge = (cat: BulletinItem["category"]) => {
    switch (cat) {
      case "competition":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">Fixtures & Schedule</Badge>;
      case "transfer":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px]">Transfers & TMS</Badge>;
      case "disciplinary":
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]">Disciplinary</Badge>;
      case "administrative":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">Administration</Badge>;
      default:
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Official Circular</Badge>;
    }
  };

  const getPriorityBadge = (p: BulletinItem["priority"]) => {
    switch (p) {
      case "urgent":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            URGENT NOTICE
          </span>
        );
      case "official":
        return (
          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            OFFICIAL MEMO
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-full">
            INFORMATION
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Official Bulletins & Federation News
              </h1>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                Verified Circulars
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Authoritative notices on match schedules, transfer windows, regulatory decisions, and table standings.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Clock className="h-3.5 w-3.5 text-emerald-600" />
            <span>Updated Daily by General Secretariat</span>
          </div>
        </div>

        {/* Club Notice Alert if Club Admin */}
        {user?.role === "club_admin" && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3">
            <Info className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-foreground">
                Club Administration Notice: All Official Updates are Legally Binding
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                As an affiliated club executive, notifications published here constitute official regulatory communication.
                Please ensure your club secretary and coaching staff review schedule adjustments and transfer window deadlines promptly.
              </p>
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: "all", label: "All Bulletins" },
              { id: "competition", label: "Schedule & Fixtures" },
              { id: "transfer", label: "Transfer Window" },
              { id: "disciplinary", label: "Disciplinary" },
              { id: "administrative", label: "Medical & Admin" },
              { id: "circular", label: "Circulars" },
            ].map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs h-8 shrink-0 cursor-pointer ${
                  selectedCategory === cat.id ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""
                }`}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search circulars..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-card"
            />
          </div>
        </div>

        {/* Main Content Layout: List + Detail Viewer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Bulletin List */}
          <div className="lg:col-span-5 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground px-1">
              Showing {filteredBulletins.length} Official Announcement(s)
            </p>

            <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
              {filteredBulletins.map((item) => {
                const isSelected = selectedBulletin?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedBulletin(item)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/[0.04] shadow-sm ring-1 ring-emerald-500/20"
                        : "border-border/70 bg-card hover:border-emerald-500/40 hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {getCategoryBadge(item.category)}
                      {getPriorityBadge(item.priority)}
                    </div>

                    <h3 className="text-xs font-bold text-foreground line-clamp-2 mb-1.5">
                      {item.title}
                    </h3>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2.5 mt-2 border-t border-border/40">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="h-3 w-3 text-emerald-600" />
                        {item.publishDate}
                      </span>
                      <span className="font-medium truncate max-w-[160px]">{item.author}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bulletin Full Reader */}
          <div className="lg:col-span-7">
            {selectedBulletin ? (
              <Card className="border-border/70 sticky top-20 shadow-sm">
                <CardHeader className="pb-4 border-b border-border/50">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {getCategoryBadge(selectedBulletin.category)}
                    {getPriorityBadge(selectedBulletin.priority)}
                  </div>
                  <CardTitle className="text-lg font-bold text-foreground leading-snug">
                    {selectedBulletin.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-3 text-xs pt-1">
                    <span className="font-mono text-emerald-600 font-semibold">
                      Ref: {selectedBulletin.id.toUpperCase()}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {selectedBulletin.publishDate}
                    </span>
                    <span>•</span>
                    <span className="text-muted-foreground">Issued by: {selectedBulletin.author}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Executive Summary */}
                  <div className="p-3.5 rounded-lg bg-muted/30 border border-border/60 text-xs text-foreground font-medium leading-relaxed">
                    <span className="font-bold text-emerald-600 block mb-1">Executive Summary:</span>
                    {selectedBulletin.summary}
                  </div>

                  {/* Body Content */}
                  <div className="space-y-3 pt-2 text-xs leading-relaxed text-foreground/90">
                    <h4 className="font-bold text-sm text-foreground">Official Directives & Protocols:</h4>
                    <p className="leading-relaxed whitespace-pre-line">{selectedBulletin.content}</p>

                    <p className="pt-2 text-[11px] text-muted-foreground leading-relaxed border-t border-border/40">
                      Note: This bulletin is archived permanently in the Federation Regulatory Gazette.
                      Any appeals or inquiries regarding the implementation of these measures must be directed to the
                      Secretariat within 7 business days of publication.
                    </p>
                  </div>

                  {/* Official Stamping Footer */}
                  <div className="pt-6 border-t border-border/60 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Digitally Certified by National Football Federation</span>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      Target: {selectedBulletin.targetAudience.toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="p-12 text-center border rounded-xl border-dashed bg-card text-muted-foreground text-xs">
                Select an official bulletin from the list to read the full circular text.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
