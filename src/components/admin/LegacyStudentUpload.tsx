import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, Check, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ExcelJS from "exceljs";

interface ParsedStudent {
  full_name: string;
  phone: string;
  email?: string;
  department?: string;
  year?: number;
  student_id?: string;
}

export function LegacyStudentUpload() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedStudent[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number } | null>(null);

  const validDepts = ["management", "marketing", "accounting", "finance", "economics"];

  const normalizePhone = (phone: string): string => {
    return phone?.toString().replace(/\D/g, "").replace(/^880/, "0") || "";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadResult(null);
    setErrors([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      if (file.name.endsWith('.csv')) {
        // Parse CSV manually for browser compatibility
        const text = new TextDecoder().decode(data);
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        const csvHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const ws = workbook.addWorksheet('CSV');
        ws.addRow(csvHeaders);
        for (let i = 1; i < lines.length; i++) {
          ws.addRow(lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, '')));
        }
      } else {
        await workbook.xlsx.load(data);
      }
      const sheet = workbook.worksheets[0];
      if (!sheet) {
        setErrors(["File is empty or has no worksheets."]);
        return;
      }
      const headers: string[] = [];
      sheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value || "").trim();
      });
      const rows: Record<string, string>[] = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const obj: Record<string, string> = {};
        row.eachCell((cell, colNumber) => {
          obj[headers[colNumber - 1] || `col${colNumber}`] = String(cell.value ?? "");
        });
        rows.push(obj);
      });

      if (rows.length === 0) {
        setErrors(["File is empty or has no data rows."]);
        return;
      }

      const parseErrors: string[] = [];
      const students: ParsedStudent[] = [];

      rows.forEach((row, idx) => {
        const lineNum = idx + 2; // 1-indexed + header
        const name = (row["full_name"] || row["name"] || row["Name"] || row["Full Name"] || "").toString().trim();
        const phone = normalizePhone((row["phone"] || row["Phone"] || row["mobile"] || row["Mobile"] || "").toString());
        const email = (row["email"] || row["Email"] || "").toString().trim();
        const dept = (row["department"] || row["Department"] || row["dept"] || "").toString().toLowerCase().trim();
        const year = parseInt((row["year"] || row["Year"] || "").toString()) || undefined;
        const studentId = (row["student_id"] || row["Student ID"] || row["ID"] || "").toString().trim();

        if (!name) {
          parseErrors.push(`Row ${lineNum}: Missing name`);
          return;
        }
        if (!phone || phone.length < 10) {
          parseErrors.push(`Row ${lineNum}: Invalid phone for "${name}"`);
          return;
        }
        if (dept && !validDepts.includes(dept)) {
          parseErrors.push(`Row ${lineNum}: Invalid department "${dept}" for "${name}"`);
        }

        students.push({
          full_name: name,
          phone,
          email: email || undefined,
          department: validDepts.includes(dept) ? dept : undefined,
          year: year && year >= 1 && year <= 4 ? year : undefined,
          student_id: studentId || undefined,
        });
      });

      setErrors(parseErrors);
      setParsed(students);
    } catch {
      setErrors(["Failed to parse file. Ensure it's a valid CSV or Excel file."]);
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUpload = async () => {
    if (parsed.length === 0) return;
    setIsUploading(true);

    let success = 0;
    let failed = 0;

    // Batch insert in chunks of 50
    for (let i = 0; i < parsed.length; i += 50) {
      const chunk = parsed.slice(i, i + 50).map((s) => ({
        full_name: s.full_name,
        phone: s.phone,
        email: s.email || null,
        department: s.department || null,
        year: s.year || null,
        student_id: s.student_id || null,
      }));

      const { data, error } = await supabase.from("legacy_students").insert(chunk).select("id");
      if (error) {
        failed += chunk.length;
      } else {
        success += data.length;
      }
    }

    setUploadResult({ success, failed });
    setParsed([]);
    toast({
      title: "Import complete",
      description: `${success} students imported${failed > 0 ? `, ${failed} failed` : ""}`,
    });
    setIsUploading(false);
  };

  const downloadTemplate = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Students");
    ws.addRow(["full_name", "phone", "email", "department", "year", "student_id"]);
    ws.addRow(["John Doe", "01712345678", "john@example.com", "management", 2, "SMC-2025-000001"]);
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "legacy_students_template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Import Legacy Students
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-xs gap-1">
            <Download className="h-3 w-3" />
            Template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Upload a CSV or Excel file with old student records. They'll be auto-detected when they sign up.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileSelect}
        />

        {parsed.length === 0 && !uploadResult ? (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Choose File (CSV / Excel)
          </Button>
        ) : null}

        {errors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {errors.length} warning(s)
            </div>
            <div className="max-h-24 overflow-y-auto text-xs text-destructive/80 space-y-0.5">
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          </div>
        )}

        {parsed.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{parsed.length} students ready</Badge>
              <Button size="sm" variant="ghost" onClick={() => { setParsed([]); setErrors([]); }}>
                Cancel
              </Button>
            </div>
            <div className="max-h-40 overflow-y-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Phone</th>
                    <th className="text-left p-2">Dept</th>
                    <th className="text-left p-2">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 10).map((s, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="p-2">{s.full_name}</td>
                      <td className="p-2 font-mono">{s.phone}</td>
                      <td className="p-2 capitalize">{s.department || "-"}</td>
                      <td className="p-2">{s.year || "-"}</td>
                    </tr>
                  ))}
                  {parsed.length > 10 && (
                    <tr><td colSpan={4} className="p-2 text-center text-muted-foreground">...and {parsed.length - 10} more</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Button onClick={handleUpload} disabled={isUploading} className="w-full gap-2">
              <Upload className="h-4 w-4" />
              {isUploading ? "Importing..." : `Import ${parsed.length} Students`}
            </Button>
          </div>
        )}

        {uploadResult && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 dark:text-green-300">
              {uploadResult.success} imported{uploadResult.failed > 0 ? `, ${uploadResult.failed} failed` : ""}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
