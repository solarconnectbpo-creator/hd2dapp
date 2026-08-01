import { Link } from "react-router";
import { Pencil, Plus } from "lucide-react";
import { useRoofing } from "../context/RoofingContext";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export function Contracts() {
  const { contracts, updateContract } = useRoofing();

  return (
    <div className="hd2d-page-shell text-[var(--x-text)]">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold sm:text-3xl">Contracts &amp; Proposals</h1>
          <p className="text-[var(--x-muted)]">
            Reopen a proposal to edit client details, scope language, and pricing in Proposal Builder.
          </p>
        </div>
        <Link to="/measurement/new" className="shrink-0">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New proposal
          </Button>
        </Link>
      </div>

      {contracts.length === 0 ? (
        <Card className="border-white/[0.07] bg-[var(--x-surface)] ring-1 ring-white/[0.04]">
          <CardContent className="py-16 text-center text-[var(--x-muted)]">
            No proposals yet. Create one from the Measurement page, then return here to edit it.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contracts
            .slice()
            .reverse()
            .map((c) => (
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
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm text-[var(--x-muted)]">Client</div>
                    <div className="font-medium">{c.clientName || "—"}</div>
                    {(c.clientEmail || c.clientPhone) && (
                      <div className="mt-1 text-xs text-[var(--x-muted)]">
                        {[c.clientEmail, c.clientPhone].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                  <div className="text-lg font-semibold tabular-nums">
                    ${c.totalAmount.toLocaleString()}
                  </div>
                  <label className="flex flex-col gap-1 text-xs text-[var(--x-muted)]">
                    Status
                    <select
                      className="rounded-md border border-white/10 bg-[var(--x-bg)] px-2 py-1.5 text-sm text-[var(--x-text)]"
                      value={c.status}
                      onChange={(e) =>
                        updateContract(c.id, {
                          status: e.target.value as "draft" | "sent" | "signed",
                        })
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="signed">Signed</option>
                    </select>
                  </label>
                  <Link to={`/measurement/new?contractId=${encodeURIComponent(c.id)}`}>
                    <Button type="button" variant="outline" className="w-full">
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit in Proposal Builder
                    </Button>
                  </Link>
                  {!c.builderSnapshot ? (
                    <p className="text-xs text-[var(--x-muted)]">
                      Older save — client fields will load; re-run Generate Estimate to refresh pricing.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
