import { useRoofing } from "../context/RoofingContext";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export function Contracts() {
  const { contracts } = useRoofing();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-gray-900">Contracts & Proposals</h1>
        <p className="text-gray-600">Generated proposals from your estimates</p>
      </div>

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-600">
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
                <div className="text-sm text-gray-600">Client</div>
                <div className="text-gray-900">{c.clientName || "N/A"}</div>
                <div className="text-gray-900">${c.totalAmount.toLocaleString()}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

