import { Link } from "react-router";
import { DollarSign, Plus } from "lucide-react";
import { useRoofing } from "../context/RoofingContext";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export function Estimates() {
  const { estimates } = useRoofing();

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2 text-gray-900">Estimates</h1>
          <p className="text-gray-600">Manage your project estimates</p>
        </div>
        <Link to="/measurement/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Estimate
          </Button>
        </Link>
      </div>

      {estimates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <DollarSign className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl mb-2 text-gray-900">No estimates yet</h3>
            <p className="text-gray-600 mb-6">Create your first estimate to get started</p>
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
                    <p className="text-sm text-gray-600">Subtotal</p>
                    <p className="text-lg text-gray-900">${estimate.subtotal.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tax</p>
                    <p className="text-lg text-gray-900">${estimate.tax.toLocaleString()}</p>
                  </div>
                  {estimate.rcvBeforeMarkup != null && estimate.estimateMarkup != null ? (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">RCV before +50%</p>
                        <p className="text-lg text-gray-900">${estimate.rcvBeforeMarkup.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Estimate adjustment (+50%)</p>
                        <p className="text-lg text-gray-900">${estimate.estimateMarkup.toLocaleString()}</p>
                      </div>
                    </>
                  ) : null}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">Total (RCV)</p>
                    <p className="text-2xl text-blue-600">${estimate.total.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

