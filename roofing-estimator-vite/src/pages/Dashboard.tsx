import { useRef, useState } from "react";
import { Link } from "react-router";
import {
  FileSignature,
  FileText,
  Folder,
  GraduationCap,
  HardDriveDownload,
  Headphones,
  MapPinned,
  Megaphone,
  PhoneForwarded,
  Ruler,
  Search,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useRoofing } from "../context/RoofingContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  buildRoofingBackupPayload,
  downloadRoofingBackupJson,
  parseRoofingBackupJson,
} from "../lib/roofingBackup";

export function Dashboard() {
  const { measurements, estimates, contracts, fieldProjects, replaceAllRoofingData } = useRoofing();
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [backupNote, setBackupNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const stats = [
    { title: "Total Measurements", value: measurements.length, icon: Ruler, color: "bg-blue-500" },
    { title: "Estimates Created", value: estimates.length, icon: FileText, color: "bg-green-500" },
    { title: "Contracts", value: contracts.length, icon: FileSignature, color: "bg-purple-500" },
    {
      title: "Total Revenue",
      value: `$${contracts.reduce((sum, c) => sum + c.totalAmount, 0).toLocaleString()}`,
      icon: TrendingUp,
      color: "bg-orange-500",
    },
  ];

  const recentMeasurements = measurements.slice(-5).reverse();

  const onExportBackup = () => {
    const payload = buildRoofingBackupPayload(measurements, estimates, contracts, fieldProjects);
    const name = `roofing-pro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    downloadRoofingBackupJson(payload, name);
    setBackupNote({ kind: "ok", text: "Download started — keep this file somewhere safe." });
    window.setTimeout(() => setBackupNote(null), 5000);
  };

  const onPickBackupFile = (file: File) => {
    const reader = new FileReader();
    reader.onerror = () => {
      setBackupNote({ kind: "err", text: "Could not read the file." });
    };
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const result = parseRoofingBackupJson(parsed);
        if (!result.ok) {
          setBackupNote({ kind: "err", text: result.error });
          return;
        }
        const hasExisting =
          measurements.length > 0 ||
          estimates.length > 0 ||
          contracts.length > 0 ||
          fieldProjects.length > 0;
        if (
          hasExisting &&
          !window.confirm(
            "Replace all measurements, estimates, contracts, and field projects in this browser with the backup?",
          )
        ) {
          return;
        }
        replaceAllRoofingData(result.data);
        setBackupNote({
          kind: "ok",
          text: "Backup restored. Your data is saved in this browser.",
        });
        window.setTimeout(() => setBackupNote(null), 6000);
      } catch {
        setBackupNote({ kind: "err", text: "That file is not valid JSON." });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="hd2d-page-shell">
      <div className="mb-8 border-b border-white/[0.06] pb-8 sm:mb-10 sm:pb-10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#71767b]">Overview</p>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-black sm:text-3xl">Dashboard</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#71767b]">
          Measurements, estimates, and field tools — data stays in this browser unless you export.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="overflow-hidden border-white/[0.07] ring-1 ring-white/[0.04] transition-shadow duration-200 hover:ring-sky-400/15"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-black">{stat.title}</CardTitle>
                <div className={`${stat.color} rounded-xl p-2.5 shadow-lg shadow-black/20`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums tracking-tight text-black">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-white/[0.07] ring-1 ring-white/[0.04]">
          <CardHeader>
            <CardTitle className="text-lg">Quick actions</CardTitle>
            <CardDescription>Jump into the tools you use most</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/measurement/new">
              <Button className="w-full justify-start" variant="outline">
                <Ruler className="w-4 h-4 mr-2" />
                New Roof Measurement
              </Button>
            </Link>
            <Link to="/canvassing">
              <Button className="w-full justify-start" variant="outline">
                <MapPinned className="w-4 h-4 mr-2" />
                Canvassing map
              </Button>
            </Link>
            <Link to="/estimates">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                View Estimates
              </Button>
            </Link>
            <Link to="/contracts">
              <Button className="w-full justify-start" variant="outline">
                <FileSignature className="w-4 h-4 mr-2" />
                Contracts / Proposals
              </Button>
            </Link>
            <Link to="/projects">
              <Button className="w-full justify-start" variant="outline">
                <Folder className="w-4 h-4 mr-2" />
                Projects
              </Button>
            </Link>
            <Link to="/contacts">
              <Button className="w-full justify-start" variant="outline">
                Contacts &amp; settings
              </Button>
            </Link>
            <Link to="/property-lookup">
              <Button className="w-full justify-start" variant="outline">
                <Search className="w-4 h-4 mr-2" />
                Property records
              </Button>
            </Link>
            <Link to="/marketing">
              <Button className="w-full justify-start" variant="outline">
                <Megaphone className="w-4 h-4 mr-2" />
                Marketing &amp; social / ads
              </Button>
            </Link>
            <Link to="/courses">
              <Button className="w-full justify-start" variant="outline">
                <GraduationCap className="w-4 h-4 mr-2" />
                Courses &amp; training hub
              </Button>
            </Link>
            <Link to="/call-center">
              <Button className="w-full justify-start" variant="outline">
                <Headphones className="w-4 h-4 mr-2" />
                Call center reports
              </Button>
            </Link>
            <Link to="/leads">
              <Button className="w-full justify-start" variant="outline">
                <PhoneForwarded className="w-4 h-4 mr-2" />
                Buy leads
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-white/[0.07] ring-1 ring-white/[0.04]">
          <CardHeader>
            <CardTitle className="text-lg">Recent measurements</CardTitle>
            <CardDescription>
              {recentMeasurements.length > 0 ? "Your latest roof measurements" : "No measurements yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentMeasurements.length > 0 ? (
              <div className="space-y-3">
                {recentMeasurements.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-black">{m.projectName}</p>
                      <p className="text-xs text-black">
                        {m.adjustedArea.toFixed(0)} sq ft • {m.roofMaterial}
                      </p>
                    </div>
                    <span className="text-xs text-black">{m.date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-black text-center py-4">
                Start by creating your first measurement
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8 border-sky-500/25 bg-gradient-to-br from-[#12141a] via-[#161a22] to-[#12141a] ring-1 ring-sky-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-black">
            <HardDriveDownload className="h-5 w-5 text-sky-400" />
            Backup &amp; restore
          </CardTitle>
          <CardDescription className="text-[#8b9199]">
            Download a JSON copy of measurements, estimates, and contracts. Restore replaces everything in
            this browser — use after a new device or if data was cleared.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button type="button" variant="default" className="gap-2" onClick={onExportBackup}>
            <HardDriveDownload className="h-4 w-4" />
            Export backup (.json)
          </Button>
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onPickBackupFile(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => backupInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Restore from file
          </Button>
          {backupNote ? (
            <p
              className={`text-sm ${backupNote.kind === "ok" ? "text-green-700" : "text-red-700"}`}
              role="status"
            >
              {backupNote.text}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

