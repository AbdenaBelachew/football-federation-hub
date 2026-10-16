import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Shield,
  Users,
  CheckCircle2,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  Building2,
  Calendar,
  Layers,
  FileCheck2,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";

interface AuthProps {
  redirectAfterAuth?: string;
}

const DEMO_PRESETS = [
  {
    role: "super_admin",
    name: "Solomon Tadesse",
    label: "Super Admin",
    email: "admin@federation.org",
    desc: "Full federation governance & audit access",
    icon: Shield,
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  {
    role: "federation_admin",
    name: "Helen Berhanu",
    label: "Federation Admin",
    email: "fed@federation.org",
    desc: "Executive league operations & approvals",
    icon: Trophy,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  {
    role: "competition_admin",
    name: "Dawit Kebede",
    label: "Competition Admin",
    email: "competition@federation.org",
    desc: "Fixtures, matches, live scores & standings",
    icon: Calendar,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  {
    role: "registration_officer",
    name: "Almaz Girma",
    label: "Registration Officer",
    email: "registration@federation.org",
    desc: "Player licensing & eligibility verification",
    icon: FileCheck2,
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  {
    role: "transfer_officer",
    name: "Yared Wolde",
    label: "Transfer Officer",
    email: "transfer@federation.org",
    desc: "Player domestic & international transfer approvals",
    icon: Layers,
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  },
  {
    role: "club_admin",
    name: "Abebe Bikila (Saint George SC)",
    label: "Club Official",
    email: "club@saintgeorge.org",
    desc: "Club squad roster, contract & transfer submissions",
    icon: Building2,
    color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  },
];

export default function AuthPage({ redirectAfterAuth = "/dashboard" }: AuthProps) {
  const { isAuthenticated, login, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || redirectAfterAuth;

  const [activeTab, setActiveTab] = useState<"demo" | "signin" | "register">("demo");
  const [email, setEmail] = useState("admin@federation.org");
  const [password, setPassword] = useState("password123");
  const [submitting, setSubmitting] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState("club_admin");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(returnTo);
    }
  }, [authLoading, isAuthenticated, navigate, returnTo]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = await login(email, password);
    setSubmitting(false);
    if (ok) navigate(returnTo);
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setSubmitting(true);
    setEmail(demoEmail);
    const ok = await login(demoEmail, "password123");
    setSubmitting(false);
    if (ok) navigate(returnTo);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.auth.register({
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole as any,
      });
      if (res?.user) {
        await login(regEmail, regPassword);
        navigate(returnTo);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left side visual branding */}
      <div className="lg:w-1/2 relative ff-gradient-sidebar flex flex-col justify-between p-8 sm:p-12 text-white overflow-hidden">
        {/* Pitch line decorations */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute w-[600px] h-[600px] rounded-full border-2 border-white -top-48 -left-48" />
          <div className="absolute w-[800px] h-[800px] rounded-full border-2 border-white top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute top-0 bottom-0 left-1/2 border-l-2 border-white" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 group-hover:scale-105 transition-transform">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">FFMS Hub</span>
              <span className="text-[11px] text-emerald-400 font-medium uppercase tracking-widest">
                Football Federation Portal
              </span>
            </div>
          </Link>
        </div>

        <div className="relative z-10 my-12 max-w-lg space-y-6">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1 text-xs">
            Official Federation Management System
          </Badge>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
            Govern leagues, players & transfers with precision.
          </h1>

          <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
            Enterprise regulatory compliance, real-time match operations, verified player digital passports,
            and auditable transfer workflows in a single unified hub.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2.5 text-xs text-gray-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Full FIFA/CAF compliance</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-gray-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Instant digital licensing</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-gray-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Immutable audit logging</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-gray-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Multi-role access control</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-gray-400 flex items-center justify-between border-t border-white/10 pt-4">
          <span>&copy; {new Date().getFullYear()} National Football Federation</span>
          <span className="text-emerald-400/80">Production Ready v1.0</span>
        </div>
      </div>

      {/* Right side form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 mb-6 p-1 bg-muted/60">
              <TabsTrigger value="demo" className="text-xs font-semibold gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Demo 1-Click
              </TabsTrigger>
              <TabsTrigger value="signin" className="text-xs font-semibold">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="text-xs font-semibold">
                Register
              </TabsTrigger>
            </TabsList>

            {/* DEMO 1-CLICK ROLES */}
            <TabsContent value="demo" className="space-y-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Select Federation Role</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Click any verified test account below to log in instantly and test its permissions:
                </p>
              </div>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {DEMO_PRESETS.map((demo) => {
                  const Icon = demo.icon;
                  return (
                    <button
                      key={demo.role}
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDemoLogin(demo.email)}
                      className="w-full text-left p-3.5 rounded-xl border border-border/70 hover:border-emerald-500/50 hover:bg-emerald-500/[0.03] transition-all flex items-start gap-3.5 group cursor-pointer shadow-xs"
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${demo.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground group-hover:text-emerald-600 transition-colors">
                            {demo.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {demo.email}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-foreground/80 mt-0.5 truncate">
                          {demo.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {demo.desc}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all self-center shrink-0" />
                    </button>
                  );
                })}
              </div>

              {submitting && (
                <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating demo session...</span>
                </div>
              )}
            </TabsContent>

            {/* STANDARD SIGN IN */}
            <TabsContent value="signin">
              <Card className="border-border/70 shadow-sm">
                <form onSubmit={handleLoginSubmit}>
                  <CardHeader>
                    <CardTitle className="text-xl">Sign in to Federation Portal</CardTitle>
                    <CardDescription className="text-xs">
                      Enter your official federation email credentials
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          className="pl-9"
                          placeholder="officer@federation.org"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                        <span className="text-[11px] text-muted-foreground">Demo pwd: password123</span>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          className="pl-9"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("demo")}
                      className="text-xs text-muted-foreground hover:text-foreground text-center"
                    >
                      Need instant access? Use 1-Click Demo
                    </button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            {/* REGISTER CLUB / OFFICIAL */}
            <TabsContent value="register">
              <Card className="border-border/70 shadow-sm">
                <form onSubmit={handleRegisterSubmit}>
                  <CardHeader>
                    <CardTitle className="text-xl">Register Official Account</CardTitle>
                    <CardDescription className="text-xs">
                      Join the Football Federation Hub network
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="regName" className="text-xs font-medium">Full Name</Label>
                      <Input
                        id="regName"
                        placeholder="e.g. Dawit Tilahun"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="regEmail" className="text-xs font-medium">Email Address</Label>
                      <Input
                        id="regEmail"
                        type="email"
                        placeholder="official@newclub.org"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="regPassword" className="text-xs font-medium">Password</Label>
                      <Input
                        id="regPassword"
                        type="password"
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="regRole" className="text-xs font-medium">Role</Label>
                      <select
                        id="regRole"
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                      >
                        <option value="club_admin">Club Official / Secretary</option>
                        <option value="registration_officer">Registration Officer</option>
                        <option value="competition_admin">Competition Coordinator</option>
                        <option value="referee">Match Official / Referee</option>
                      </select>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    >
                      {submitting ? "Creating Account..." : "Register & Sign In"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
