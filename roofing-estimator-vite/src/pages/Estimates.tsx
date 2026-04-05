import { Link } from "react-router";
import { DollarSign, Plus } from "lucide-react";
import { useRoofing } from "../context/RoofingContext";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export function Estimates() {
  const { estimates } = useRoofing();
  const money = (value: number) => `$${value.toLocaleString()}`;

  return (
    <div className="hd2d-page-shell">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-2xl text-black sm:text-3xl">Estimates</h1>
          <p className="text-black">Manage your project estimates</p>
        </div>
        <Link to="/measurement/new" className="shrink-0">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Estimate
          </Button>
        </Link>
      </div>

      {estimates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <DollarSign className="w-16 h-16 text-black mb-4" />
            <h3 className="text-xl mb-2 text-black">No estimates yet</h3>
            <p className="text-black mb-6">Create your first estimate to get started</p>
            <Link to="/measurement/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create First Estimate
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {estimates.slice().reverse().map((estimate) => (
            <Card key={estimate.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{estimate.projectName}</CardTitle>
                    <CardDescription className="mt-1">{estimate.date}</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Estimate
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-black">Subtotal</p>
                    <p className="text-lg text-black">{money(estimate.subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-black">Tax</p>
                    <p className="text-lg text-black">{money(estimate.tax)}</p>
                  </div>
                  {estimate.rcvBeforeMarkup != null && estimate.estimateMarkup != null ? (
                    <>
                      <div>
                        <p className="text-sm text-black">Cost basis (line items + tax)</p>
                        <p className="text-lg text-black">{money(estimate.rcvBeforeMarkup)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-black">Profit markup (+50%)</p>
                        <p className="text-lg text-black">{money(estimate.estimateMarkup)}</p>
                      </div>
                    </>
                  ) : null}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-black">Total (RCV)</p>
                    <p className="text-2xl text-black">{money(estimate.total)}</p>
                  </div>
                  <details className="pt-3 border-t border-gray-200">
                    <summary className="cursor-pointer text-sm text-black">Line Items</summary>
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-black">Materials</p>
                        {estimate.materials.length === 0 ? (
                          <p className="text-sm text-black">No material lines.</p>
                        ) : (
                          <div className="mt-2 space-y-1">
                            {estimate.materials.map((line, index) => (
                              <div key={`${line.name}-${index}`} className="text-sm text-black">
                                <div>{line.name}</div>
                                <div className="text-xs text-black/80">
                                  {line.quantity} {line.unit} x {money(line.unitCost)} = {money(line.totalCost)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-black">Labor</p>
                        {estimate.labor.length === 0 ? (
                          <p className="text-sm text-black">No labor lines.</p>
                        ) : (
                          <div className="mt-2 space-y-1">
                            {estimate.labor.map((line, index) => (
                              <div key={`${line.description}-${index}`} className="text-sm text-black">
                                <div>{line.description}</div>
                                <div className="text-xs text-black/80">
                                  {line.hours} hr x {money(line.hourlyRate)} = {money(line.totalCost)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

