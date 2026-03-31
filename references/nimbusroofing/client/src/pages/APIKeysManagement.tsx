import { useState } from "react";
import { trpc } from "../lib/trpc";
import DashboardLayout from "../components/DashboardLayout";
import { formatDistanceToNow } from "date-fns";

export default function APIKeysManagement() {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>(["leads:create"]);
  const [rateLimit, setRateLimit] = useState(1000);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);

  const { data: apiKeys, refetch } = trpc.apiKeys.list.useQuery();
  const { data: logs } = trpc.apiKeys.getLogs.useQuery({
    apiKeyId: selectedKeyId || undefined,
    limit: 50,
  });

  const generateMutation = trpc.apiKeys.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedKey(data.key);
      refetch();
      // Reset form
      setName("");
      setDescription("");
      setPermissions(["leads:create"]);
      setRateLimit(1000);
      setExpiresInDays(null);
    },
  });

  const revokeMutation = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleGenerate = () => {
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    generateMutation.mutate({
      name,
      description,
      permissions,
      rateLimit,
      expiresAt,
    });
  };

  const handleRevoke = (id: number) => {
    if (confirm("Are you sure you want to revoke this API key?")) {
      revokeMutation.mutate({ id });
    }
  };

  const availablePermissions = [
    { value: "leads:create", label: "Create Leads" },
    { value: "leads:read", label: "Read Leads" },
    { value: "webhooks:receive", label: "Receive Webhooks" },
    { value: "content:generate", label: "Generate Content" },
  ];

  const togglePermission = (perm: string) => {
    if (permissions.includes(perm)) {
      setPermissions(permissions.filter((p) => p !== perm));
    } else {
      setPermissions([...permissions, perm]);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">API Keys Management</h1>
            <p className="text-gray-600 mt-2">
              Generate and manage API keys for external integrations
            </p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            + Generate New Key
          </button>
        </div>

        {/* API Keys List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Active API Keys</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apiKeys?.map((key) => (
                  <tr
                    key={key.id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      selectedKeyId === key.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedKeyId(key.id)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{key.name}</div>
                        {key.description && (
                          <div className="text-sm text-gray-500">{key.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {key.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {key.rateLimit}/hour
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {key.totalRequests} requests
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {key.lastUsedAt
                        ? formatDistanceToNow(new Date(key.lastUsedAt), {
                            addSuffix: true,
                          })
                        : "Never"}
                    </td>
                    <td className="px-6 py-4">
                      {key.isActive ? (
                        key.expiresAt && new Date(key.expiresAt) < new Date() ? (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                            Expired
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                            Active
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {key.isActive && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevoke(key.id);
                          }}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!apiKeys || apiKeys.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No API keys yet. Generate your first key to get started.
              </div>
            )}
          </div>
        </div>

        {/* API Request Logs */}
        {selectedKeyId && logs && logs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recent Requests</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Endpoint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          {log.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{log.endpoint}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            log.responseStatus >= 200 && log.responseStatus < 300
                              ? "bg-green-100 text-green-800"
                              : log.responseStatus >= 400 && log.responseStatus < 500
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {log.responseStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.duration}ms
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.ipAddress}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Generate Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Generate New API Key</h2>
              </div>
              <div className="p-6 space-y-6">
                {generatedKey ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 font-semibold mb-2">
                        ✅ API Key Generated Successfully!
                      </p>
                      <p className="text-green-700 text-sm mb-4">
                        Copy this key now. You won't be able to see it again.
                      </p>
                      <div className="bg-white border border-green-300 rounded p-3 font-mono text-sm break-all">
                        {generatedKey}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedKey);
                          alert("API key copied to clipboard!");
                        }}
                        className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-semibold"
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setShowGenerateModal(false);
                        setGeneratedKey(null);
                      }}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Key Name *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Website Contact Form"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional description of what this key is used for"
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Permissions *
                      </label>
                      <div className="space-y-2">
                        {availablePermissions.map((perm) => (
                          <label key={perm.value} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={permissions.includes(perm.value)}
                              onChange={() => togglePermission(perm.value)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rate Limit (requests per hour)
                      </label>
                      <input
                        type="number"
                        value={rateLimit}
                        onChange={(e) => setRateLimit(parseInt(e.target.value))}
                        min={1}
                        max={10000}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expires In (days)
                      </label>
                      <input
                        type="number"
                        value={expiresInDays || ""}
                        onChange={(e) =>
                          setExpiresInDays(e.target.value ? parseInt(e.target.value) : null)
                        }
                        placeholder="Leave empty for no expiration"
                        min={1}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleGenerate}
                        disabled={!name || permissions.length === 0 || generateMutation.isPending}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {generateMutation.isPending ? "Generating..." : "Generate API Key"}
                      </button>
                      <button
                        onClick={() => setShowGenerateModal(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
