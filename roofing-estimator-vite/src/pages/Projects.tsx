import { Calendar, Layers, Ruler } from "lucide-react";
import { useRoofing } from "../context/RoofingContext";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

export function Projects() {
  const { measurements } = useRoofing();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-gray-900">Projects & Reports</h1>
        <p className="text-gray-600">View all measurements and project data</p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Projects</TabsTrigger>
          <TabsTrigger value="gable">Gable Roofs</TabsTrigger>
          <TabsTrigger value="hip">Hip Roofs</TabsTrigger>
          <TabsTrigger value="flat">Flat Roofs</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {measurements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Ruler className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-xl mb-2 text-gray-900">No measurements yet</h3>
                <p className="text-gray-600">Create your first measurement to see it here</p>
              </CardContent>
            </Card>
          ) : (
            measurements
              .slice()
              .reverse()
              .map((measurement) => (
                <Card key={measurement.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{measurement.projectName}</CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {measurement.date}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {measurement.roofMaterial}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Dimensions</p>
                        <p className="text-lg text-gray-900">
                          {measurement.length}' × {measurement.width}'
                        </p>
                        <p className="text-sm text-gray-500">
                          {(measurement.length * measurement.width).toFixed(0)} sq ft base
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Roof Pitch</p>
                        <p className="text-lg text-gray-900">{measurement.pitch}/12</p>
                        <p className="text-sm text-gray-500">
                          {(Math.atan(measurement.pitch / 12) * (180 / Math.PI)).toFixed(1)}° angle
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Adjusted Area</p>
                        <p className="text-lg text-gray-900">{measurement.adjustedArea.toFixed(0)} sq ft</p>
                        <p className="text-sm text-gray-500">+{measurement.wastePercentage}% waste factor</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                          <Layers className="w-4 h-4" />
                          Roofing Squares
                        </p>
                        <p className="text-2xl text-blue-600">{(measurement.adjustedArea / 100).toFixed(2)}</p>
                        <p className="text-sm text-gray-500">100 sq ft = 1 square</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        {(["gable", "hip", "flat"] as const).map((type) => (
          <TabsContent key={type} value={type} className="space-y-4">
            {measurements.filter((m) => m.roofForm === type).map((measurement) => (
              <Card key={measurement.id}>
                <CardHeader>
                  <CardTitle>{measurement.projectName}</CardTitle>
                  <CardDescription>{measurement.date}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-900">
                    Area: {measurement.adjustedArea.toFixed(0)} sq ft ({(measurement.adjustedArea / 100).toFixed(2)} squares)
                  </p>
                </CardContent>
              </Card>
            ))}
            {measurements.filter((m) => m.roofForm === type).length === 0 ? (
              <p className="text-center text-gray-500 py-8">No {type} roof measurements</p>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

