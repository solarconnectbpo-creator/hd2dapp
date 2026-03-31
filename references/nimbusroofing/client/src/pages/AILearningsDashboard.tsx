import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, CheckCircle2, XCircle, TrendingUp, MessageSquare, AlertTriangle, Lightbulb } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

/**
 * AI Learnings Dashboard
 * Review and validate learnings extracted from chatbot conversations
 */
export default function AILearningsDashboard() {
  const [selectedTab, setSelectedTab] = useState("faqs");
  
  // Fetch learnings by type
  const faqs = trpc.aiLearnings.getByType.useQuery({ type: "faq", limit: 50 });
  const painPoints = trpc.aiLearnings.getByType.useQuery({ type: "pain_point", limit: 50 });
  const successfulResponses = trpc.aiLearnings.getByType.useQuery({ type: "successful_response", limit: 20 });
  const failedResponses = trpc.aiLearnings.getByType.useQuery({ type: "failed_response", limit: 20 });
  
  // Get conversation analytics
  const analytics = trpc.aiLearnings.getAnalytics.useQuery();
  
  // Validation mutation
  const validateLearning = trpc.aiLearnings.validate.useMutation({
    onSuccess: () => {
      faqs.refetch();
      painPoints.refetch();
    },
  });

  const handleValidate = (id: number, isValid: boolean) => {
    validateLearning.mutate({ id, isValidated: isValid });
  };

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">AI Learnings Dashboard</h1>
          <p className="text-muted-foreground">
            Review and validate knowledge extracted from customer conversations
          </p>
        </div>

        {/* Analytics Cards */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Learnings</CardTitle>
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.data?.totalLearnings || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Extracted from conversations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validated</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {analytics.data?.validatedCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.data?.validationRate || 0}% validation rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.data?.avgConfidence || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Confidence score
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.data?.totalConversations || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Analyzed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Learnings Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="faqs">FAQs ({faqs.data?.length || 0})</TabsTrigger>
            <TabsTrigger value="pain_points">Pain Points ({painPoints.data?.length || 0})</TabsTrigger>
            <TabsTrigger value="successful">Successful ({successfulResponses.data?.length || 0})</TabsTrigger>
            <TabsTrigger value="failed">Failed ({failedResponses.data?.length || 0})</TabsTrigger>
          </TabsList>

          {/* FAQs Tab */}
          <TabsContent value="faqs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>
                  Questions extracted from customer conversations. Validate to add to AI knowledge base.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {faqs.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : faqs.data && faqs.data.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {faqs.data.map((learning: any) => (
                        <TableRow key={learning.id}>
                          <TableCell className="font-medium max-w-md">
                            {learning.question}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{learning.category}</Badge>
                          </TableCell>
                          <TableCell>{learning.frequency}x</TableCell>
                          <TableCell>
                            <Badge
                              variant={learning.confidence >= 70 ? "default" : "secondary"}
                            >
                              {learning.confidence}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {learning.isValidated ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Validated
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!learning.isValidated && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleValidate(learning.id, true)}
                                  disabled={validateLearning.isPending}
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleValidate(learning.id, false)}
                                  disabled={validateLearning.isPending}
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No FAQs extracted yet. Start chatting with customers to build the knowledge base.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pain Points Tab */}
          <TabsContent value="pain_points" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Pain Points</CardTitle>
                <CardDescription>
                  Concerns and frustrations mentioned by customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {painPoints.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : painPoints.data && painPoints.data.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pain Point</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {painPoints.data.map((learning: any) => (
                        <TableRow key={learning.id}>
                          <TableCell className="font-medium max-w-md">
                            {learning.answer}
                          </TableCell>
                          <TableCell>{learning.frequency}x</TableCell>
                          <TableCell>
                            <Badge
                              variant={learning.confidence >= 70 ? "default" : "secondary"}
                            >
                              {learning.confidence}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {learning.isValidated ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Validated
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!learning.isValidated && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleValidate(learning.id, true)}
                                  disabled={validateLearning.isPending}
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleValidate(learning.id, false)}
                                  disabled={validateLearning.isPending}
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No pain points extracted yet.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Successful Responses Tab */}
          <TabsContent value="successful" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Successful Responses</CardTitle>
                <CardDescription>
                  Conversations with high satisfaction scores (70%+)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {successfulResponses.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : successfulResponses.data && successfulResponses.data.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Satisfaction</TableHead>
                        <TableHead>Lead Potential</TableHead>
                        <TableHead>Topics</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {successfulResponses.data.map((learning: any) => {
                        const context = learning.context ? JSON.parse(learning.context) : {};
                        return (
                          <TableRow key={learning.id}>
                            <TableCell>
                              <Badge variant="outline">{learning.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="bg-green-600">
                                {context.satisfactionScore || 0}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {context.leadPotential || 0}%
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-md">
                              {context.topics?.join(", ") || "N/A"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No successful responses recorded yet.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Failed Responses Tab */}
          <TabsContent value="failed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Failed Responses</CardTitle>
                <CardDescription>
                  Conversations with low satisfaction scores (&lt;70%) - needs improvement
                </CardDescription>
              </CardHeader>
              <CardContent>
                {failedResponses.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : failedResponses.data && failedResponses.data.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Satisfaction</TableHead>
                        <TableHead>Lead Potential</TableHead>
                        <TableHead>Topics</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failedResponses.data.map((learning: any) => {
                        const context = learning.context ? JSON.parse(learning.context) : {};
                        return (
                          <TableRow key={learning.id}>
                            <TableCell>
                              <Badge variant="outline">{learning.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {context.satisfactionScore || 0}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {context.leadPotential || 0}%
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-md">
                              {context.topics?.join(", ") || "N/A"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No failed responses recorded yet.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
