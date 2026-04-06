import { Link } from "react-router";
import { DollarSign, FileSignature, Plus } from "lucide-react";
import { useRoofing } from "../context/RoofingContext";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export function Estimates() {
  const { estimates, contracts } = useRoofing();
  const money = (value: number) => `$${value.toLocaleString()}`;

  return (
    <div className="hd2d-page-shell text-[var(--x-text)]">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold sm:text-3xl">Estimates</h1>
          <p className="text-[var(--x-muted)]">
            Manage your project estimates.{" "}
            <Link className="text-[var(--x-accent)] underline hover:opacity-90" to="/contracts">
              Open contracts &amp; proposals
            </Link>
          </p>
        </div>
        <Link to="/measurement/new" className="shrink-0">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Estimate
          </Button>
        </Link>
      </div>

      {estimates.length === 0 ? (
        <Card className="border-white/[0.07] ring-1 ring-white/[0.04]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <DollarSign className="mb-4 h-16 w-16 text-[var(--x-muted)]" aria-hidden />
            <h3 className="mb-2 text-xl font-medium text-[var(--x-text)]">No estimates yet</h3>
            <p className="mb-6 max-w-sm text-center text-[var(--x-muted)]">
              Create your first estimate to get started
            </p>
            <Link to="/measurement/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create First Estimate
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {estimates.slice().reverse().map((estimate) => (
            <Card
              key={estimate.id}
              className="border-white/[0.07] bg-[var(--x-surface)] transition-shadow hover:shadow-lg hover:ring-sky-400/15 ring-1 ring-white/[0.04]"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-lg">{estimate.projectName}</CardTitle>
                    <CardDescription className="mt-1 text-[var(--x-muted)]">{estimate.date}</CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-emerald-500/35 bg-emerald-950/50 text-emerald-300"
                  >
                    Estimate
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-[var(--x-muted)]">Subtotal</p>
                    <p className="text-lg">{money(estimate.subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--x-muted)]">Tax</p>
                    <p className="text-lg">{money(estimate.tax)}</p>
                  </div>
                  {estimate.rcvBeforeMarkup != null && estimate.estimateMarkup != null ? (
                    <>
                      <div>
                        <p className="text-sm text-[var(--x-muted)]">Cost basis (line items + tax)</p>
                        <p className="text-lg">{money(estimate.rcvBeforeMarkup)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--x-muted)]">Profit markup (+50%)</p>
                        <p className="text-lg">{money(estimate.estimateMarkup)}</p>
                      </div>
                    </>
                  ) : null}
                  <div className="border-t border-white/[0.08] pt-3">
                    <p className="text-sm text-[var(--x-muted)]">Total (RCV)</p>
                    <p className="text-2xl font-semibold tabular-nums">{money(estimate.total)}</p>
                  </div>
                  <details className="border-t border-white/[0.08] pt-3">
                    <summary className="cursor-pointer text-sm text-[var(--x-accent)] hover:underline">
                      Line items
                    </summary>
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[var(--x-muted)]">Materials</p>
                        {estimate.materials.length === 0 ? (
                          <p className="mt-1 text-sm text-[var(--x-muted)]">No material lines.</p>
                        ) : (
                          <div className="mt-2 space-y-1">
                            {estimate.materials.map((line, index) => (
                              <div key={`${line.name}-${index}`} className="text-sm">
                                <div>{line.name}</div>
                                <div className="text-xs text-[var(--x-muted)]">
                                  {line.quantity} {line.unit} × {money(line.unitCost)} = {money(line.totalCost)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[var(--x-muted)]">Labor</p>
                        {estimate.labor.length === 0 ? (
                          <p className="mt-1 text-sm text-[var(--x-muted)]">No labor lines.</p>
                        ) : (
                          <div className="mt-2 space-y-1">
                            {estimate.labor.map((line, index) => (
                              <div key={`${line.description}-${index}`} className="text-sm">
                                <div>{line.description}</div>
                                <div className="text-xs text-[var(--x-muted)]">
                                  {line.hours} hr × {money(line.hourlyRate)} = {money(line.totalCost)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                  {(() => {
                    const proposal = contracts.find((ct) => ct.estimateId === estimate.id);
                    return proposal ? (
                      <div className="border-t border-white/[0.08] pt-3 text-sm">
                        <span className="text-[var(--x-muted)]">Proposal: </span>
                        <Link
                          className="font-medium text-[var(--x-accent)] hover:underline"
                          to="/contracts"
                        >
                          {proposal.status} · {proposal.clientName || "Client TBD"}
                        </Link>
                      </div>
                    ) : (
                      <div className="border-t border-white/[0.08] pt-3">
                        <Link
                          className="inline-flex items-center gap-1.5 text-sm text-[var(--x-accent)] hover:underline"
                          to="/measurement/new"
                        >
                          <FileSignature className="h-4 w-4" aria-hidden />
                          Create proposal from Measurement
                        </Link>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
