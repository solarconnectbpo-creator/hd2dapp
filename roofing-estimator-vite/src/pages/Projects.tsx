import { Calendar, Layers, Ruler } from "lucide-react";
import { useRoofing } from "../context/RoofingContext";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { FieldProjectsPanel } from "../features/fieldProjects/FieldProjectsPanel";

export function Projects() {
  const { measurements } = useRoofing();

  const tabListChrome =
    "inline-flex min-w-max h-10 rounded-xl border border-white/[0.08] bg-[#12141a] p-1 text-[#8b9199] shadow-none";
  const tabTriggerChrome =
    "rounded-lg px-4 py-2 text-sm font-medium text-[#8b9199] data-[state=active]:border-transparent data-[state=active]:bg-[#1d9bf0] data-[state=active]:text-white data-[state=active]:shadow-[0_0_24px_rgba(29,155,240,0.22)] data-[state=inactive]:hover:text-[#e7e9ea]";

  return (
    <div className="hd2d-page-shell">
      <div className="mb-8 border-b border-white/[0.06] pb-8 sm:mb-10 sm:pb-10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#71767b]">Pipeline</p>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-black sm:text-3xl">Projects &amp; Reports</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#71767b]">
          Field jobs with list/board pipeline, deal value &amp; tags, damage photos, and saved measurements
        </p>
      </div>

      <Tabs defaultValue="field" className="space-y-6">
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <TabsList className={tabListChrome}>
            <TabsTrigger value="field" className={tabTriggerChrome}>
              Field jobs
            </TabsTrigger>
            <TabsTrigger value="measurements" className={tabTriggerChrome}>
              Measurements
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="field" className="space-y-4">
          <FieldProjectsPanel />
        </TabsContent>

        <TabsContent value="measurements" className="space-y-6">
          <Tabs defaultValue="all" className="space-y-6">
            <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              <TabsList className={tabListChrome}>
                <TabsTrigger value="all" className={tabTriggerChrome}>
                  All
                </TabsTrigger>
                <TabsTrigger value="gable" className={tabTriggerChrome}>
                  Gable
                </TabsTrigger>
                <TabsTrigger value="hip" className={tabTriggerChrome}>
                  Hip
                </TabsTrigger>
                <TabsTrigger value="flat" className={tabTriggerChrome}>
                  Flat
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="space-y-4">
              {measurements.length === 0 ? (
                <Card className="border-white/[0.07] ring-1 ring-white/[0.04]">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Ruler className="mb-4 h-16 w-16 text-black" />
                    <h3 className="mb-2 text-xl text-black">No measurements yet</h3>
                    <p className="text-black">Create a measurement from the estimator to see it here</p>
                  </CardContent>
                </Card>
              ) : (
                measurements
                  .slice()
                  .reverse()
                  .map((measurement) => (
                    <Card key={measurement.id} className="border-white/[0.07] ring-1 ring-white/[0.04]">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{measurement.projectName}</CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {measurement.date}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="border-gray-200 bg-gray-100 text-black">
                            {measurement.roofMaterial}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                          <div>
                            <p className="mb-1 text-sm text-black">Dimensions</p>
                            <p className="text-lg text-black">
                              {measurement.length}&apos; × {measurement.width}&apos;
                            </p>
                            <p className="text-sm text-black">
                              {(measurement.length * measurement.width).toFixed(0)} sq ft base
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 text-sm text-black">Roof Pitch</p>
                            <p className="text-lg text-black">{measurement.pitch}/12</p>
                            <p className="text-sm text-black">
                              {(Math.atan(measurement.pitch / 12) * (180 / Math.PI)).toFixed(1)}° angle
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 text-sm text-black">Adjusted Area</p>
                            <p className="text-lg text-black">{measurement.adjustedArea.toFixed(0)} sq ft</p>
                            <p className="text-sm text-black">+{measurement.wastePercentage}% waste factor</p>
                          </div>
                          <div>
                            <p className="mb-1 flex items-center gap-1 text-sm text-black">
                              <Layers className="h-4 w-4" />
                              Roofing Squares
                            </p>
                            <p className="text-2xl text-black">{(measurement.adjustedArea / 100).toFixed(2)}</p>
                            <p className="text-sm text-black">100 sq ft = 1 square</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </TabsContent>

            {(["gable", "hip", "flat"] as const).map((type) => (
              <TabsContent key={type} value={type} className="space-y-4">
                {measurements
                  .filter((m) => m.roofForm === type)
                  .map((measurement) => (
                    <Card key={measurement.id} className="border-white/[0.07] ring-1 ring-white/[0.04]">
                      <CardHeader>
                        <CardTitle>{measurement.projectName}</CardTitle>
                        <CardDescription>{measurement.date}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-black">
                          Area: {measurement.adjustedArea.toFixed(0)} sq ft (
                          {(measurement.adjustedArea / 100).toFixed(2)} squares)
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                {measurements.filter((m) => m.roofForm === type).length === 0 ? (
                  <p className="py-8 text-center text-black">No {type} roof measurements</p>
                ) : null}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
