import { useEffect, useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Eye, Ban, RefreshCw, ArrowUpCircle, Trash2,
  MoreHorizontal, UserPlus, FileSpreadsheet,
} from "lucide-react";
import { LegacyStudentUpload } from "@/components/admin/LegacyStudentUpload";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  student_id: string | null;
  department: string | null;
  year: number | null;
  is_blocked: boolean;
  created_at: string;
  session: string | null;
  course_type: string | null;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
}

interface EnrollmentMap {
  [userId: string]: { subject_name: string; payment_status: string }[];
}

interface OnboardingData {
  whatsapp_number: string | null;
  alternative_phone: string | null;
  session: string | null;
  student_type: string | null;
  facebook_id_name: string | null;
  college_name: string | null;
  division: string | null;
  district: string | null;
  referral_source: string | null;
  has_complaint: boolean | null;
}

interface OnboardingMap {
  [userId: string]: OnboardingData;
}

const defaultStudent = {
  full_name: '',
  phone: '',
  email: '',
  department: 'management' as const,
  year: 1,
};

export function StudentsPageContent() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [enrollmentMap, setEnrollmentMap] = useState<EnrollmentMap>({});
  const [onboardingMap, setOnboardingMap] = useState<OnboardingMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [enrollSubjectId, setEnrollSubjectId] = useState<string>('');

  useEffect(() => {
    fetchStudents();
    fetchSubjects();
  }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    // Fetch profiles and filter to only students (users with 'student' role)
    const [profilesRes, studentRolesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .order('student_id', { ascending: true }),
      supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student'),
    ]);

    if (!profilesRes.error && profilesRes.data) {
      // Only show users who have the student role
      const studentUserIds = new Set(studentRolesRes.data?.map(r => r.user_id) || []);
      const studentProfiles = profilesRes.data.filter(p => studentUserIds.has(p.user_id));
      setStudents(studentProfiles);
      const userIds = studentProfiles.map(s => s.user_id);
      if (userIds.length > 0) {
        // Fetch enrollments and onboarding data in parallel
        const [enrollmentRes, onboardingRes] = await Promise.all([
          supabase
            .from('enrollments')
            .select('user_id, payment_status, subjects:subject_id (name)')
            .in('user_id', userIds)
            .eq('payment_status', 'completed'),
          supabase
            .from('student_onboarding')
            .select('user_id, whatsapp_number, alternative_phone, session, student_type, facebook_id_name, college_name, division, district, referral_source, has_complaint')
            .in('user_id', userIds),
        ]);

        const map: EnrollmentMap = {};
        enrollmentRes.data?.forEach((e: any) => {
          if (!map[e.user_id]) map[e.user_id] = [];
          map[e.user_id].push({
            subject_name: e.subjects?.name || 'Unknown',
            payment_status: e.payment_status,
          });
        });
        setEnrollmentMap(map);

        const obMap: OnboardingMap = {};
        onboardingRes.data?.forEach((o: any) => {
          obMap[o.user_id] = o;
        });
        setOnboardingMap(obMap);
      }
    }
    setIsLoading(false);
  };

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('id, name, slug');
    if (data) setSubjects(data);
  };

  const fetchStudentEnrollments = async (userId: string) => {
    const { data } = await supabase
      .from('enrollments')
      .select(`id, enrolled_at, payment_status, subjects:subject_id (name, price)`)
      .eq('user_id', userId);
    setEnrollments(data || []);
  };

  const handleViewStudent = async (student: Student) => {
    setSelectedStudent(student);
    await fetchStudentEnrollments(student.user_id);
  };

  const handleBlockToggle = async (student: Student) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: !student.is_blocked })
      .eq('id', student.id);
    if (!error) {
      toast({
        title: student.is_blocked ? "Student unblocked" : "Student blocked",
        description: `${student.full_name} has been ${student.is_blocked ? 'unblocked' : 'blocked'}.`,
      });
      fetchStudents();
    }
  };

  const handlePromoteYear = async (student: Student) => {
    if (!student.year || student.year >= 4) return;
    const { error } = await supabase
      .from('profiles')
      .update({ year: student.year + 1 })
      .eq('id', student.id);
    if (!error) {
      toast({ title: "Year promoted", description: `${student.full_name} promoted to Year ${student.year + 1}.` });
      fetchStudents();
      if (selectedStudent?.id === student.id) {
        setSelectedStudent({ ...student, year: student.year + 1 });
      }
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`Are you sure you want to delete ${student.full_name}? This action cannot be undone.`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', student.id);
    if (!error) {
      toast({ title: "Student deleted", description: `${student.full_name} has been removed.` });
      fetchStudents();
      setSelectedStudent(null);
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) return;
    if (!confirm(`Delete ${selectedStudents.length} selected students? This action cannot be undone.`)) return;
    const { error } = await supabase.from('profiles').delete().in('id', selectedStudents);
    if (!error) {
      toast({ title: "Students deleted", description: `${selectedStudents.length} students removed.` });
      setSelectedStudents([]);
      fetchStudents();
    }
  };

  const handleBulkBlock = async () => {
    if (selectedStudents.length === 0) return;
    const { error } = await supabase.from('profiles').update({ is_blocked: true }).in('id', selectedStudents);
    if (!error) {
      toast({ title: "Students blocked", description: `${selectedStudents.length} students blocked.` });
      setSelectedStudents([]);
      fetchStudents();
    }
  };

  const handleBulkPromote = async () => {
    if (selectedStudents.length === 0) return;
    const studentsToPromote = students.filter(s => selectedStudents.includes(s.id) && s.year && s.year < 4);
    for (const student of studentsToPromote) {
      await supabase.from('profiles').update({ year: (student.year || 0) + 1 }).eq('id', student.id);
    }
    toast({ title: "Students promoted", description: `${studentsToPromote.length} students promoted.` });
    setSelectedStudents([]);
    fetchStudents();
  };

  const handleManualEnroll = async () => {
    if (!selectedStudent || !enrollSubjectId) return;
    const { error } = await supabase.from('enrollments').insert({
      user_id: selectedStudent.user_id,
      subject_id: enrollSubjectId,
      payment_status: 'completed',
    });
    if (!error) {
      toast({ title: "Enrolled", description: "Student enrolled successfully." });
      setIsEnrollDialogOpen(false);
      setEnrollSubjectId('');
      await fetchStudentEnrollments(selectedStudent.user_id);
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  // Filter students - including by enrolled subject
  const availableSessions = [
    "17-18", "18-19", "19-20", "20-21", "21-22",
    "22-23", "23-24", "24-25", "25-26", "26-27",
  ];

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch =
        student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.phone.includes(searchQuery) ||
        (student.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.student_id?.includes(searchQuery);

      const matchesDepartment = departmentFilter === 'all' || student.department === departmentFilter;
      const matchesYear = yearFilter === 'all' || student.year?.toString() === yearFilter;

      let matchesSubject = true;
      if (subjectFilter !== 'all') {
        const subjectName = subjects.find(s => s.id === subjectFilter)?.name;
        const studentEnrollments = enrollmentMap[student.user_id] || [];
        matchesSubject = studentEnrollments.some(e => e.subject_name === subjectName);
      }

      let matchesSession = true;
      if (sessionFilter !== 'all') {
        // Check profiles.session first, fallback to onboarding
        const profileSession = student.session;
        const ob = onboardingMap[student.user_id];
        matchesSession = (profileSession === sessionFilter) || (ob?.session === sessionFilter);
      }

      return matchesSearch && matchesDepartment && matchesYear && matchesSubject && matchesSession;
    });
  }, [students, searchQuery, departmentFilter, yearFilter, subjectFilter, sessionFilter, enrollmentMap, subjects, onboardingMap]);

  // Excel export
  const handleExportExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;

    const exportData = filteredStudents.map(student => {
      const studentEnrollments = enrollmentMap[student.user_id] || [];
      const enrolledSubjects = studentEnrollments.map(e => e.subject_name).join(', ');
      const ob = onboardingMap[student.user_id];

      return {
        'Student ID': student.student_id || 'N/A',
        'Full Name': student.full_name,
        'Phone': student.phone,
        'Email': student.email || 'N/A',
        'WhatsApp Number': ob?.whatsapp_number || '',
        'Alternative Phone': ob?.alternative_phone || '',
        'Department': student.department ? student.department.charAt(0).toUpperCase() + student.department.slice(1) : 'N/A',
        'Year': student.year ? `Year ${student.year}` : 'N/A',
        'Session': student.session || ob?.session || '',
        'Student Type': ob?.student_type ? ob.student_type.charAt(0).toUpperCase() + ob.student_type.slice(1) : '',
        'College Name': ob?.college_name || '',
        'Division': ob?.division || '',
        'District': ob?.district || '',
        'Facebook ID Name': ob?.facebook_id_name || '',
        'Referral Source': ob?.referral_source ? ob.referral_source.charAt(0).toUpperCase() + ob.referral_source.slice(1) : '',
        'Has Complaint': ob?.has_complaint ? 'Yes' : ob?.has_complaint === false ? 'No' : '',
        'Status': student.is_blocked ? 'Blocked' : 'Active',
        'Enrolled Subjects': enrolledSubjects || 'None',
        'Total Enrolled': studentEnrollments.length,
        'Joined Date': new Date(student.created_at).toLocaleDateString('en-GB'),
      };
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Students');

    if (exportData.length > 0) {
      const headers = Object.keys(exportData[0]);
      ws.addRow(headers);
      // Bold header row
      ws.getRow(1).font = { bold: true };
      exportData.forEach(row => ws.addRow(headers.map(h => (row as any)[h])));
      // Auto-width columns
      headers.forEach((h, i) => {
        const maxLen = Math.max(h.length, ...exportData.map(r => String((r as any)[h] || '').length));
        ws.getColumn(i + 1).width = maxLen + 2;
      });
    }

    // Build filename from filters
    const parts = ['Students'];
    if (subjectFilter !== 'all') {
      const subjectName = subjects.find(s => s.id === subjectFilter)?.name;
      if (subjectName) parts.push(subjectName);
    }
    if (departmentFilter !== 'all') parts.push(departmentFilter);
    if (yearFilter !== 'all') parts.push(`Year-${yearFilter}`);
    const fileName = parts.join('_').replace(/\s+/g, '-') + '.xlsx';

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Exported", description: `${exportData.length} students exported to ${fileName}` });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Students</h1>
            <p className="text-sm text-muted-foreground">
              Manage {students.length} student accounts
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filteredStudents.length === 0}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel ({filteredStudents.length})
            </Button>
            <Button variant="outline" size="sm" onClick={fetchStudents}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedStudents.length > 0 && (
          <Card className="bg-muted/50 border-primary/20">
            <CardContent className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-sm font-medium">
                {selectedStudents.length} student(s) selected
              </span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleBulkPromote}>
                  <ArrowUpCircle className="h-4 w-4 mr-1" /> Promote
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkBlock}>
                  <Ban className="h-4 w-4 mr-1" /> Block
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, email, or student ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="management">Management</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="accounting">Accounting</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="economics">Economics</SelectItem>
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="1">Year 1</SelectItem>
              <SelectItem value="2">Year 2</SelectItem>
              <SelectItem value="3">Year 3</SelectItem>
              <SelectItem value="4">Year 4</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sessionFilter} onValueChange={setSessionFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              {availableSessions.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Summary */}
        {(subjectFilter !== 'all' || departmentFilter !== 'all' || yearFilter !== 'all' || sessionFilter !== 'all') && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Filters:</span>
            {subjectFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Subject: {subjects.find(s => s.id === subjectFilter)?.name}
              </Badge>
            )}
            {departmentFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs capitalize">
                Dept: {departmentFilter}
              </Badge>
            )}
            {yearFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Year {yearFilter}
              </Badge>
            )}
            {sessionFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Session: {sessionFilter}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => {
                setSubjectFilter('all');
                setDepartmentFilter('all');
                setYearFilter('all');
                setSessionFilter('all');
              }}
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Legacy Student Import */}
        <LegacyStudentUpload />

        {/* Students Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                     <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                       No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => {
                    const studentEnrollments = enrollmentMap[student.user_id] || [];
                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={() => toggleSelectStudent(student.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground">{student.phone}</p>
                            {student.email && (
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-bold">
                            {student.student_id || 'N/A'}
                          </code>
                        </TableCell>
                        <TableCell className="capitalize">{student.department || 'N/A'}</TableCell>
                        <TableCell>{student.year ? `Year ${student.year}` : 'N/A'}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {student.session || onboardingMap[student.user_id]?.session || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {studentEnrollments.length > 0 ? (
                            <Badge variant="secondary" className="text-xs">
                              {studentEnrollments.length} subject{studentEnrollments.length > 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {student.is_blocked ? (
                            <Badge variant="destructive">Blocked</Badge>
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewStudent(student)}>
                                <Eye className="h-4 w-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handlePromoteYear(student)}
                                disabled={!student.year || student.year >= 4}
                              >
                                <ArrowUpCircle className="h-4 w-4 mr-2" /> Promote Year
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleBlockToggle(student)}>
                                <Ban className="h-4 w-4 mr-2" />
                                {student.is_blocked ? 'Unblock' : 'Block'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteStudent(student)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Student Detail Dialog */}
        <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Student Details</DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedStudent.full_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Student ID</p>
                    <code className="text-sm bg-primary/10 text-primary px-2 py-1 rounded font-bold">
                      {selectedStudent.student_id || 'N/A'}
                    </code>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedStudent.phone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedStudent.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Department</p>
                    <p className="font-medium capitalize">{selectedStudent.department || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Year</p>
                    <p className="font-medium">{selectedStudent.year ? `Year ${selectedStudent.year}` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Joined</p>
                    <p className="font-medium">{new Date(selectedStudent.created_at).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    {selectedStudent.is_blocked ? (
                      <Badge variant="destructive">Blocked</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </div>
                </div>

                {/* Onboarding Information */}
                {onboardingMap[selectedStudent.user_id] && (() => {
                  const ob = onboardingMap[selectedStudent.user_id];
                  return (
                    <div>
                      <p className="text-sm font-medium mb-2">Onboarding Information</p>
                      <div className="grid grid-cols-2 gap-3 text-sm p-3 rounded-lg border bg-muted/30">
                        {ob.whatsapp_number && (
                          <div>
                            <p className="text-muted-foreground text-xs">WhatsApp</p>
                            <p className="font-medium">{ob.whatsapp_number}</p>
                          </div>
                        )}
                        {ob.alternative_phone && (
                          <div>
                            <p className="text-muted-foreground text-xs">Alt. Phone</p>
                            <p className="font-medium">{ob.alternative_phone}</p>
                          </div>
                        )}
                        {ob.session && (
                          <div>
                            <p className="text-muted-foreground text-xs">Session</p>
                            <p className="font-medium">{ob.session}</p>
                          </div>
                        )}
                        {ob.student_type && (
                          <div>
                            <p className="text-muted-foreground text-xs">Type</p>
                            <p className="font-medium capitalize">{ob.student_type}</p>
                          </div>
                        )}
                        {ob.college_name && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground text-xs">College/University</p>
                            <p className="font-medium">{ob.college_name}</p>
                          </div>
                        )}
                        {ob.division && (
                          <div>
                            <p className="text-muted-foreground text-xs">Division</p>
                            <p className="font-medium">{ob.division}</p>
                          </div>
                        )}
                        {ob.district && (
                          <div>
                            <p className="text-muted-foreground text-xs">District</p>
                            <p className="font-medium">{ob.district}</p>
                          </div>
                        )}
                        {ob.facebook_id_name && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground text-xs">Facebook ID</p>
                            <p className="font-medium">{ob.facebook_id_name}</p>
                          </div>
                        )}
                        {ob.referral_source && (
                          <div>
                            <p className="text-muted-foreground text-xs">Referral Source</p>
                            <p className="font-medium capitalize">{ob.referral_source}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground text-xs">Complaint</p>
                          <p className="font-medium">{ob.has_complaint ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Enrollments ({enrollments.length})</p>
                    <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <UserPlus className="h-3 w-3 mr-1" /> Add Enrollment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Manual Enrollment</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Subject</Label>
                            <Select value={enrollSubjectId} onValueChange={setEnrollSubjectId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select subject" />
                              </SelectTrigger>
                              <SelectContent>
                                {subjects.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={handleManualEnroll} className="w-full">
                            Enroll Student
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {enrollments.length > 0 ? (
                    <div className="space-y-2">
                      {enrollments.map((enrollment: any) => (
                        <div key={enrollment.id} className="flex items-center justify-between p-2 rounded border">
                          <div>
                            <span className="text-sm">{enrollment.subjects?.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ৳{enrollment.subjects?.price}
                            </span>
                          </div>
                          <Badge variant={enrollment.payment_status === 'completed' ? 'default' : 'secondary'}>
                            {enrollment.payment_status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No enrollments</p>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant={selectedStudent.is_blocked ? 'default' : 'destructive'}
                    className="flex-1"
                    onClick={() => {
                      handleBlockToggle(selectedStudent);
                      setSelectedStudent(null);
                    }}
                  >
                    {selectedStudent.is_blocked ? 'Unblock Student' : 'Block Student'}
                  </Button>
                  <Button variant="destructive" onClick={() => handleDeleteStudent(selectedStudent)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

export default function StudentsPage() {
  return <AdminLayout requiredPermission="can_manage_students"><StudentsPageContent /></AdminLayout>;
}
