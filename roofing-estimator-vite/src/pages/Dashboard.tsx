import { Link } from "react-router";
import { FileSignature, FileText, Folder, MapPinned, Ruler, Search, TrendingUp } from "lucide-react";
import { useRoofing } from "../context/RoofingContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export function Dashboard() {
  const { measurements, estimates, contracts } = useRoofing();

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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Measurements, estimates, and field tools — data stays in this browser unless you export.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-gray-600">{stat.title}</CardTitle>
                <div className={`${stat.color} p-2 rounded-lg`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-gray-900">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Measurements</CardTitle>
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
                      <p className="text-sm text-gray-900">{m.projectName}</p>
                      <p className="text-xs text-gray-500">
                        {m.adjustedArea.toFixed(0)} sq ft • {m.roofMaterial}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">{m.date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Start by creating your first measurement
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

