import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X, BookOpen, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COURSE_TYPES, DEPARTMENTS, COURSE_TYPE_LABELS, DEPARTMENT_LABELS, formatDepartment } from "@/lib/constants";

export interface PickerSubject {
  id: string;
  name: string;
  name_bn: string;
  department: string | null;
  course_type: string | null;
  compatible_years: number[] | null;
}

interface SubjectPickerProps {
  subjects: PickerSubject[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Optional empty-state hint shown below the filter bar */
  emptyHint?: string;
}

/**
 * Filterable subject picker used by Subject Content editor and Chapter Management.
 * Shows course type / department / year filters + search and renders subjects
 * with badges so admins can see which department a subject belongs to.
 */
export function SubjectPicker({ subjects, selectedId, onSelect, emptyHint }: SubjectPickerProps) {
  const [course, setCourse] = useState<string>("all");
  const [dept, setDept] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Auto-scroll to selected after subjects load
  useEffect(() => {
    if (!selectedId) return;
    const el = document.getElementById(`subj-pick-${selectedId}`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId, subjects.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subjects.filter(s => {
      if (course !== "all" && (s.course_type || "").toLowerCase() !== course.toLowerCase()) return false;
      if (dept !== "all" && (s.department || "").toLowerCase() !== dept.toLowerCase()) return false;
      if (year !== "all" && !s.compatible_years?.includes(Number(year))) return false;
      if (q) {
        return s.name.toLowerCase().includes(q) || (s.name_bn || "").includes(search.trim());
      }
      return true;
    });
  }, [subjects, course, dept, year, search]);

  // Group by department for readability
  const grouped = useMemo(() => {
    const map = new Map<string, PickerSubject[]>();
    filtered.forEach(s => {
      const key = (s.department || "general").toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const activeCount = [course !== "all", dept !== "all", year !== "all", search !== ""].filter(Boolean).length;
  const clear = () => { setCourse("all"); setDept("all"); setYear("all"); setSearch(""); };

  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-3">
        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search subject..."
              className="pl-9 h-10"
            />
          </div>
          <Select value={course} onValueChange={setCourse}>
            <SelectTrigger className="h-10 w-full sm:w-[150px]"><SelectValue placeholder="Course" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {COURSE_TYPES.map(ct => (
                <SelectItem key={ct} value={ct}>{COURSE_TYPE_LABELS[ct]?.en ?? ct}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="h-10 w-full sm:w-[150px]"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Depts</SelectItem>
              {DEPARTMENTS.map(d => (
                <SelectItem key={d} value={d}>{DEPARTMENT_LABELS[d]?.en ?? d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-10 w-full sm:w-[110px]"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {[1, 2, 3, 4].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} of {subjects.length} subjects</span>
          {activeCount > 0 && (
            <button onClick={clear} className="text-destructive hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>

        {/* Grouped list */}
        <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border bg-muted/20 divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
              {emptyHint || "No subjects match these filters."}
            </div>
          ) : grouped.map(([deptKey, items]) => (
            <div key={deptKey}>
              <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                {formatDepartment(deptKey)} · {items.length}
              </div>
              {items.map(s => {
                const active = s.id === selectedId;
                return (
                  <button
                    id={`subj-pick-${s.id}`}
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                      active ? "bg-primary/10" : "hover:bg-muted/60"
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      active ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}>
                      {active && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${active ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                        {s.name}
                      </div>
                      {s.name_bn && <div className="text-[11px] text-muted-foreground truncate">{s.name_bn}</div>}
                    </div>
                    <div className="flex flex-wrap gap-1 shrink-0">
                      {s.course_type && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">{s.course_type}</Badge>
                      )}
                      {s.compatible_years && s.compatible_years.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                          Y{s.compatible_years.join(',')}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
