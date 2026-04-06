import { useRoofing } from "../context/RoofingContext";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export function Contracts() {
  const { contracts } = useRoofing();

  return (
    <div className="hd2d-page-shell text-[var(--x-text)]">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold sm:text-3xl">Contracts &amp; Proposals</h1>
        <p className="text-[var(--x-muted)]">Generated proposals from your estimates</p>
      </div>

      {contracts.length === 0 ? (
        <Card className="border-white/[0.07] bg-[var(--x-surface)] ring-1 ring-white/[0.04]">
          <CardContent className="py-16 text-center text-[var(--x-muted)]">
            No proposals yet. Create one from the Measurement page.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contracts.slice().reverse().map((c) => (
            <Card
              key={c.id}
              className="border-white/[0.07] bg-[var(--x-surface)] ring-1 ring-white/[0.04] transition-shadow hover:shadow-lg hover:ring-violet-400/15"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-lg">{c.projectName}</CardTitle>
                    <CardDescription className="mt-1 text-[var(--x-muted)]">{c.date}</CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-violet-500/35 bg-violet-950/50 capitalize text-violet-200"
                  >
                    {c.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-[var(--x-muted)]">Client</div>
                <div className="font-medium">{c.clientName || "—"}</div>
                <div className="text-lg font-semibold tabular-nums">${c.totalAmount.toLocaleString()}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
