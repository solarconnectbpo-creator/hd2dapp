import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, Share2, FileSpreadsheet, Phone, Mail, MessageSquare, FileText } from "lucide-react";
import { toast } from "sonner";

export default function LeadsManagement() {
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [spreadsheetId, setSpreadsheetId] = useState("");

  const filters = {
    source: sourceFilter !== "all" ? sourceFilter as any : undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    priority: priorityFilter !== "all" ? priorityFilter as any : undefined,
  };

  const { data: leadsData, refetch } = trpc.leads.getAll.useQuery(filters);
  const { data: stats } = trpc.leads.getStats.useQuery();

  const exportToExcel = trpc.leads.exportToExcel.useMutation();
  const createSheet = trpc.leads.createGoogleSheet.useMutation();

  const handleExportExcel = async () => {
    try {
      const result = await exportToExcel.mutateAsync(filters);
      const blob = new Blob([Uint8Array.from(atob(result.data), c => c.charCodeAt(0))], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Excel file downloaded!");
    } catch (error) {
      toast.error("Failed to export");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary to-accent text-white py-8">
        <div className="container">
          <h1 className="text-3xl font-bold">Lead Management</h1>
        </div>
      </div>

      <div className="container py-8">
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-3xl font-bold">{stats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">New</div>
              <div className="text-3xl font-bold">{stats.new}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Converted</div>
              <div className="text-3xl font-bold">{stats.converted}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">High Priority</div>
              <div className="text-3xl font-bold">{stats.highPriority}</div>
            </Card>
          </div>
        )}

        <Card className="p-4 mb-6">
          <div className="flex gap-4">
            <Button onClick={handleExportExcel}>
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Button onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          {leadsData && leadsData.leads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Name</th>
                    <th className="text-left p-3 font-semibold">Phone</th>
                    <th className="text-left p-3 font-semibold">Email</th>
                    <th className="text-left p-3 font-semibold">Address</th>
                    <th className="text-left p-3 font-semibold">Source</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Priority</th>
                    <th className="text-left p-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsData.leads.map((lead) => (
                    <tr key={lead.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{lead.name}</td>
                      <td className="p-3">{lead.phone || '-'}</td>
                      <td className="p-3">{lead.email || '-'}</td>
                      <td className="p-3 text-sm">{lead.address || '-'}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {lead.source}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          lead.status === 'new' ? 'bg-green-100 text-green-800' :
                          lead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'qualified' ? 'bg-purple-100 text-purple-800' :
                          lead.status === 'converted' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          lead.urgency === 'emergency' ? 'bg-red-100 text-red-800' :
                          lead.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                          lead.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {lead.urgency}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No leads found
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
