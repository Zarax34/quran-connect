import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Extend jsPDF type for autotable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ExportCredentialsProps {
  centerId?: string | null;
}

interface StudentWithParent {
  id: string;
  full_name: string;
  phone: string | null;
  halaqat: { name: string } | null;
  student_parents: {
    parent_id: string;
    relationship: string | null;
    parents: {
      full_name: string;
      phone: string;
    };
  }[];
}

export const ExportCredentials = ({ centerId }: ExportCredentialsProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const fetchData = async () => {
    let query = supabase
      .from("students")
      .select(`
        id,
        full_name,
        phone,
        halaqat(name),
        student_parents(
          parent_id,
          relationship,
          parents(full_name, phone)
        )
      `)
      .eq("is_active", true)
      .order("full_name");

    if (centerId) {
      query = query.eq("center_id", centerId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as StudentWithParent[];
  };

  const prepareExportData = (students: StudentWithParent[]) => {
    const rows: {
      studentName: string;
      studentUsername: string;
      studentPassword: string;
      halqa: string;
      parentName: string;
      parentUsername: string;
      parentPassword: string;
      relationship: string;
    }[] = [];

    students.forEach((student) => {
      const studentPassword = student.phone || 
        (student.student_parents?.[0]?.parents?.phone) || "";
      
      if (student.student_parents && student.student_parents.length > 0) {
        student.student_parents.forEach((sp) => {
          rows.push({
            studentName: student.full_name,
            studentUsername: student.full_name,
            studentPassword: studentPassword,
            halqa: student.halaqat?.name || "-",
            parentName: sp.parents?.full_name || "-",
            parentUsername: sp.parents?.full_name || "-",
            parentPassword: sp.parents?.phone || "-",
            relationship: sp.relationship || "-",
          });
        });
      } else {
        rows.push({
          studentName: student.full_name,
          studentUsername: student.full_name,
          studentPassword: studentPassword,
          halqa: student.halaqat?.name || "-",
          parentName: "-",
          parentUsername: "-",
          parentPassword: "-",
          relationship: "-",
        });
      }
    });

    return rows;
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const students = await fetchData();
      const data = prepareExportData(students);

      const worksheetData = [
        [
          "اسم الطالب",
          "اسم المستخدم (الطالب)",
          "كلمة المرور (الطالب)",
          "الحلقة",
          "اسم ولي الأمر",
          "اسم المستخدم (ولي الأمر)",
          "كلمة المرور (ولي الأمر)",
          "صلة القرابة",
        ],
        ...data.map((row) => [
          row.studentName,
          row.studentUsername,
          row.studentPassword,
          row.halqa,
          row.parentName,
          row.parentUsername,
          row.parentPassword,
          row.relationship,
        ]),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths
      worksheet["!cols"] = [
        { wch: 25 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 25 },
        { wch: 25 },
        { wch: 15 },
        { wch: 12 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "بيانات الدخول");

      XLSX.writeFile(workbook, "بيانات_الدخول.xlsx");
      toast.success("تم تصدير البيانات إلى Excel بنجاح");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("حدث خطأ في تصدير البيانات");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const students = await fetchData();
      const data = prepareExportData(students);

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Add Arabic font support - using built-in font with RTL
      doc.setFont("helvetica");
      
      // Title
      doc.setFontSize(18);
      doc.text("Login Credentials - بيانات الدخول", 148, 15, { align: "center" });

      // Table
      doc.autoTable({
        startY: 25,
        head: [
          [
            "Relationship",
            "Parent Password",
            "Parent Username",
            "Parent Name",
            "Halqa",
            "Student Password",
            "Student Username",
            "Student Name",
          ],
        ],
        body: data.map((row) => [
          row.relationship,
          row.parentPassword,
          row.parentUsername,
          row.parentName,
          row.halqa,
          row.studentPassword,
          row.studentUsername,
          row.studentName,
        ]),
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 3,
          halign: "center",
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30 },
          2: { cellWidth: 35 },
          3: { cellWidth: 35 },
          4: { cellWidth: 25 },
          5: { cellWidth: 30 },
          6: { cellWidth: 35 },
          7: { cellWidth: 35 },
        },
      });

      doc.save("بيانات_الدخول.pdf");
      toast.success("تم تصدير البيانات إلى PDF بنجاح");
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast.error("حدث خطأ في تصدير البيانات");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          تصدير بيانات الدخول
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="w-4 h-4" />
          تصدير إلى Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4" />
          تصدير إلى PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
