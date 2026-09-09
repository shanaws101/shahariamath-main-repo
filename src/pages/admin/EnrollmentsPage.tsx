import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CreditCard, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Enrollment {
  id: string;
  user_id: string;
  subject_id: string;
  enrolled_at: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_id: string | null;
  student_name?: string;
  student_id_display?: string;
  discount_code?: string | null;
  subjects: {
    name: string;
    price: number;
  } | null;
}

export function EnrollmentsPageContent() {
  const { toast } = useToast();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    setIsLoading(true);
    // Fetch enrollments with subject info (no FK to profiles, so fetch separately)
    const { data: enrollmentData, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        subjects:subject_id (name, price)
      `)
      .order('enrolled_at', { ascending: false });

    if (!error && enrollmentData) {
      // Get unique user IDs and fetch their profiles
      const userIds = [...new Set(enrollmentData.map(e => e.user_id))];
      const paymentIds = enrollmentData.map(e => e.payment_id).filter(Boolean) as string[];

      const [{ data: profiles }, { data: paymentsData }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, student_id').in('user_id', userIds),
        paymentIds.length > 0
          ? supabase.from('payments').select('id, gateway_response').in('id', paymentIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profileMap: Record<string, { full_name: string; student_id: string | null }> = {};
      profiles?.forEach(p => { profileMap[p.user_id] = p; });

      const paymentDiscountMap: Record<string, string> = {};
      paymentsData?.forEach((p: any) => {
        if (p.gateway_response?.discount_code) {
          paymentDiscountMap[p.id] = p.gateway_response.discount_code;
        }
      });

      const enriched = enrollmentData.map(e => ({
        ...e,
        student_name: profileMap[e.user_id]?.full_name || 'Unknown',
        student_id_display: profileMap[e.user_id]?.student_id || 'N/A',
        discount_code: e.payment_id ? paymentDiscountMap[e.payment_id] || null : null,
      })) as unknown as Enrollment[];

      setEnrollments(enriched);
    }
    setIsLoading(false);
  };

  const handleUpdateStatus = async (enrollment: Enrollment, newStatus: 'completed' | 'failed' | 'refunded') => {
    const { error } = await supabase
      .from('enrollments')
      .update({ payment_status: newStatus })
      .eq('id', enrollment.id);

    if (!error) {
      toast({
        title: "Status updated",
        description: `Enrollment status changed to ${newStatus}.`,
      });
      fetchEnrollments();
    }
  };

  const filteredEnrollments = enrollments.filter(e => 
    statusFilter === 'all' || e.payment_status === statusFilter
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'refunded':
        return <Badge variant="outline">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Enrollments</h1>
            <p className="text-sm text-muted-foreground">Manage student enrollments and payments</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchEnrollments}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                   <TableRow>
                     <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                   </TableRow>
                 ) : filteredEnrollments.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                       No enrollments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEnrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{enrollment.student_name || 'Unknown'}</p>
                          <code className="text-xs text-muted-foreground">
                            {enrollment.student_id_display || 'N/A'}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>{enrollment.subjects?.name || 'Unknown'}</TableCell>
                      <TableCell>৳{enrollment.subjects?.price || 0}</TableCell>
                      <TableCell>
                        {enrollment.discount_code ? (
                          <Badge variant="outline" className="text-xs font-mono">{enrollment.discount_code}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(enrollment.enrolled_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(enrollment.payment_status)}</TableCell>
                      <TableCell className="text-right">
                        {enrollment.payment_status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUpdateStatus(enrollment, 'completed')}
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUpdateStatus(enrollment, 'failed')}
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                        {enrollment.payment_status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateStatus(enrollment, 'refunded')}
                          >
                            Refund
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function EnrollmentsPage() {
  return <AdminLayout requiredPermission="can_manage_enrollments"><EnrollmentsPageContent /></AdminLayout>;
}
