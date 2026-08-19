import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Users,
  Shield,
  Trophy,
  ClipboardList,
  Building2,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Zap,
  Globe,
  Lock,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08 },
  }),
};

const features = [
  {
    icon: Users,
    title: "Player Registry",
    desc: "Permanent player identities with full career history — transfers, clubs, and competitions tracked for life.",
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
  },
  {
    icon: ClipboardList,
    title: "Registration Workflow",
    desc: "End-to-end registration process: submission, document verification, officer review, and license issuance.",
    color: "text-blue-600",
    bg: "bg-blue-500/10",
  },
  {
    icon: Building2,
    title: "Club Management",
    desc: "Manage clubs, officials, documents, and licensing status across the entire federation.",
    color: "text-violet-600",
    bg: "bg-violet-500/10",
  },
  {
    icon: Trophy,
    title: "Competitions & Seasons",
    desc: "Organize leagues, cups, and youth competitions with seasons, divisions, and registration windows.",
    color: "text-amber-600",
    bg: "bg-amber-500/10",
  },
  {
    icon: Shield,
    title: "RBAC & Compliance",
    desc: "Role-based access control with full audit trails on every regulated entity change.",
    color: "text-rose-600",
    bg: "bg-rose-500/10",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    desc: "Real-time dashboards, pending approvals, and federation-wide statistics at a glance.",
    color: "text-cyan-600",
    bg: "bg-cyan-500/10",
  },
];

const stats = [
  { value: "10+", label: "Federation Roles" },
  { value: "100%", label: "Audit Coverage" },
  { value: "24/7", label: "Availability" },
  { value: "∞", label: "Player History" },
];

const benefits = [
  "Never lose player history on transfers",
  "Full audit trail on every state change",
  "Role-based access for all federation staff",
  "Automated eligibility and suspension checks",
  "Digital document management with verification",
  "Real-time dashboards and pending approval alerts",
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <span className="text-base font-bold tracking-tight">FFMS</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Sign in
            </Button>
            <Button size="sm" onClick={() => navigate("/auth")}>
              Get Started
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 ff-field-pattern opacity-60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/[0.03] blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
              <Zap className="h-3 w-3" />
              Football Federation Management
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
          >
            Manage your federation
            <br />
            <span className="text-primary">with confidence</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            A centralized platform for player registrations, club management, competitions,
            transfers, and compliance — built so every player keeps one permanent identity for life.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button size="lg" className="gap-2 px-6" onClick={() => navigate("/auth")}>
              Start Managing
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="gap-2 px-6" onClick={() => navigate("/auth")}>
              Sign In to Dashboard
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 divide-x divide-border/60">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="py-8 px-6 text-center"
            >
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold tracking-tight">Everything your federation needs</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              From player registration to competition management — a complete platform for modern football governance.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="group rounded-xl border border-border/60 bg-card p-6 ff-shadow-card hover:ff-shadow-elevated transition-all duration-300"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${f.bg} mb-4`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-6 bg-muted/30 border-y border-border/60">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight">Built for compliance</h2>
            <p className="mt-3 text-muted-foreground">
              Every design decision serves regulatory accuracy and operational trust.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {benefits.map((b, i) => (
              <motion.div
                key={b}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-4"
              >
                <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm">{b}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to modernize your federation?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Get started with FFMS today. Secure, auditable, and built for the way football governance actually works.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="gap-2 px-6" onClick={() => navigate("/auth")}>
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Secure & encrypted</span>
            <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Cloud hosted</span>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">FFMS</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Football Federation Management System · Built with precision
          </p>
        </div>
      </footer>
    </div>
  );
}
