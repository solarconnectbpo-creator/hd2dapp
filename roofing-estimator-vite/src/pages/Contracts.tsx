import { useRoofing } from "../context/RoofingContext";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export function Contracts() {
  const { contracts } = useRoofing();

  return (
    <div className="hd2d-page-shell">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl text-black sm:text-3xl">Contracts &amp; Proposals</h1>
        <p className="text-black">Generated proposals from your estimates</p>
      </div>

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-black">
            No proposals yet. Create one from the Measurement page.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contracts.slice().reverse().map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{c.projectName}</CardTitle>
                    <CardDescription className="mt-1">{c.date}</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    {c.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-black">Client</div>
                <div className="text-black">{c.clientName || "N/A"}</div>
                <div className="text-black">${c.totalAmount.toLocaleString()}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

