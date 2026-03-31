import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { useRealtimeNotifications } from "../hooks/useRealtimeNotifications";

export default function CallbackManagement() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [selectedCallback, setSelectedCallback] = useState<number | null>(null);
  const [assignTo, setAssignTo] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsRecipient, setSmsRecipient] = useState<{ id: number; name: string; phone: string } | null>(null);
  const [smsMessage, setSmsMessage] = useState<string>("");
  
  // Real-time notifications
  const { isConnected, unreadCount, markAsRead } = useRealtimeNotifications();

  // Auto-refresh when new notifications arrive
  useEffect(() => {
    if (unreadCount > 0) {
      refetch();
      markAsRead();
    }
  }, [unreadCount]);
  
  // Fetch callbacks with filters
  const { data: callbacks, refetch } = trpc.callbacks.getAll.useQuery({
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    urgency: urgencyFilter !== "all" ? (urgencyFilter as any) : undefined,
  });

  // Fetch statistics
  const { data: stats } = trpc.callbacks.getStats.useQuery();

  // Mutations
  const updateStatusMutation = trpc.callbacks.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      setNotes("");
      alert("Status updated successfully!");
    },
  });

  const assignMutation = trpc.callbacks.assign.useMutation({
    onSuccess: () => {
      refetch();
      setAssignTo("");
      alert("Callback assigned successfully!");
    },
  });

  const initiateCallMutation = trpc.callbacks.initiateCall.useMutation({
    onSuccess: (data) => {
      refetch();
      alert(data.message);
    },
  });

  const sendSmsMutation = trpc.callbacks.sendSms.useMutation({
    onSuccess: () => {
      refetch();
      setShowSmsModal(false);
      setSmsRecipient(null);
      setSmsMessage("");
      alert("SMS sent successfully!");
    },
    onError: (error) => {
      alert(`Failed to send SMS: ${error.message}`);
    },
  });

  const handleUpdateStatus = (id: number, status: string) => {
    updateStatusMutation.mutate({
      id,
      status: status as any,
      notes: notes || undefined,
    });
  };

  const handleAssign = (id: number) => {
    if (!assignTo) {
      alert("Please enter a sales rep name");
      return;
    }
    assignMutation.mutate({ id, assignedTo: assignTo });
  };

  const handleInitiateCall = (id: number) => {
    if (confirm("Initiate call to this customer now?")) {
      initiateCallMutation.mutate({ id });
    }
  };

  const handleSendSms = (callback: any) => {
    setSmsRecipient({
      id: callback.id,
      name: callback.name,
      phone: callback.phone,
    });
    setShowSmsModal(true);
  };

  const handleSendSmsSubmit = () => {
    if (!smsRecipient || !smsMessage) {
      alert("Please enter a message");
      return;
    }
    sendSmsMutation.mutate({
      id: smsRecipient.id,
      message: smsMessage,
    });
  };

  const smsTemplates = [
    "Hi {name}, this is Nimbus Roofing. We received your callback request and will call you at {time}. Reply STOP to opt out.",
    "Hi {name}, your free roof inspection is scheduled for {time}. We'll see you then! Reply STOP to opt out.",
    "Hi {name}, thank you for contacting Nimbus Roofing. We'll get back to you within 24 hours. Reply STOP to opt out.",
    "Hi {name}, we're ready to provide your roof estimate. When is a good time to call? Reply STOP to opt out.",
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "emergency":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      case "no_answer":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              Callback Management
              {isConnected && (
                <span className="flex items-center gap-2 text-sm font-normal text-green-600">
                  <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                  Live
                </span>
              )}
            </h1>
            <p className="text-gray-600 mt-2">
              Manage and track all customer callback requests
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-yellow-50 p-6 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="text-sm text-yellow-700">Pending</div>
              <div className="text-3xl font-bold text-yellow-900">{stats.pending}</div>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg shadow border-l-4 border-blue-500">
              <div className="text-sm text-blue-700">Scheduled</div>
              <div className="text-3xl font-bold text-blue-900">{stats.scheduled}</div>
            </div>
            <div className="bg-green-50 p-6 rounded-lg shadow border-l-4 border-green-500">
              <div className="text-sm text-green-700">Completed</div>
              <div className="text-3xl font-bold text-green-900">{stats.completed}</div>
            </div>
            <div className="bg-red-50 p-6 rounded-lg shadow border-l-4 border-red-500">
              <div className="text-sm text-red-700">Emergency</div>
              <div className="text-3xl font-bold text-red-900">{stats.emergency}</div>
            </div>
            <div className="bg-orange-50 p-6 rounded-lg shadow border-l-4 border-orange-500">
              <div className="text-sm text-orange-700">High Priority</div>
              <div className="text-3xl font-bold text-orange-900">{stats.high}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_answer">No Answer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Urgency Filter
              </label>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Urgencies</option>
                <option value="emergency">Emergency</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Callbacks Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preferred Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Urgency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {callbacks?.map((callback) => (
                  <tr
                    key={callback.id}
                    className={`hover:bg-gray-50 ${
                      selectedCallback === callback.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedCallback(callback.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {callback.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{callback.phone}</div>
                      {callback.email && (
                        <div className="text-xs text-gray-500">{callback.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {callback.requestReason}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {callback.preferredTime}
                      </div>
                      {callback.scheduledFor && (
                        <div className="text-xs text-gray-500">
                          {new Date(callback.scheduledFor).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getUrgencyColor(
                          callback.urgency
                        )}`}
                      >
                        {callback.urgency}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          callback.status
                        )}`}
                      >
                        {callback.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {callback.assignedTo || (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDistanceToNow(new Date(callback.createdAt), {
                        addSuffix: true,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {callback.status === "pending" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInitiateCall(callback.id);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          📞 Call
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendSms(callback);
                        }}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        💬 SMS
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newStatus = prompt(
                            "Update status to:",
                            callback.status
                          );
                          if (newStatus) {
                            handleUpdateStatus(callback.id, newStatus);
                          }
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        ✓ Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {callbacks?.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No callbacks found matching your filters.
            </div>
          )}
        </div>

        {/* Selected Callback Details */}
        {selectedCallback && callbacks && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow">
            {(() => {
              const callback = callbacks.find((c) => c.id === selectedCallback);
              if (!callback) return null;

              return (
                <div>
                  <h2 className="text-xl font-bold mb-4">
                    Callback Details - {callback.name}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Assign to Sales Rep */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assign to Sales Rep
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={assignTo}
                          onChange={(e) => setAssignTo(e.target.value)}
                          placeholder="Enter sales rep name"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleAssign(callback.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Assign
                        </button>
                      </div>
                      {callback.assignedTo && (
                        <div className="mt-2 text-sm text-gray-600">
                          Currently assigned to: <strong>{callback.assignedTo}</strong>
                        </div>
                      )}
                    </div>

                    {/* Add Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Enter notes about this callback..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                      {callback.notes && (
                        <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>Previous notes:</strong> {callback.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Conversation Context */}
                  {callback.conversationContext && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        Conversation Context
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                        {callback.conversationContext}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleInitiateCall(callback.id)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      📞 Initiate Call Now
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(callback.id, "completed")}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      ✓ Mark Completed
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(callback.id, "cancelled")}
                      className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                    >
                      ✗ Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(callback.id, "no_answer")}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                    >
                      📵 No Answer
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* SMS Modal */}
        {showSmsModal && smsRecipient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  Send SMS to {smsRecipient.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">{smsRecipient.phone}</p>
              </div>
              <div className="p-6 space-y-6">
                {/* SMS Templates */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Templates
                  </label>
                  <div className="space-y-2">
                    {smsTemplates.map((template, index) => (
                      <button
                        key={index}
                        onClick={() =>
                          setSmsMessage(
                            template
                              .replace("{name}", smsRecipient.name)
                              .replace("{time}", "your preferred time")
                          )
                        }
                        className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 border border-gray-200"
                      >
                        {template
                          .replace("{name}", smsRecipient.name)
                          .replace("{time}", "your preferred time")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    placeholder="Type your custom message here..."
                    rows={5}
                    maxLength={160}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {smsMessage.length}/160 characters
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSendSmsSubmit}
                    disabled={!smsMessage || sendSmsMutation.isPending}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {sendSmsMutation.isPending ? "Sending..." : "Send SMS"}
                  </button>
                  <button
                    onClick={() => {
                      setShowSmsModal(false);
                      setSmsRecipient(null);
                      setSmsMessage("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
