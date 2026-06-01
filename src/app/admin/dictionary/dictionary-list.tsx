"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, EyeOff, Hash, Pencil, Trash2, CheckSquare, Square } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setEntryStatus, deleteEntry, bulkSetEntryStatus, bulkDeleteEntries } from "../actions";
import type { AdminEntry } from "@/lib/data/admin";

export function DictionaryList({
  drafts,
  published,
}: {
  drafts: AdminEntry[];
  published: AdminEntry[];
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [isPending, startTransition] = React.useTransition();

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = (entries: AdminEntry[]) => {
    const allSelected = entries.length > 0 && entries.every(e => selected.has(e.id));
    const next = new Set(selected);
    if (allSelected) {
      entries.forEach(e => next.delete(e.id));
    } else {
      entries.forEach(e => next.add(e.id));
    }
    setSelected(next);
  };

  const handleBulkAction = (action: "publish" | "draft" | "delete") => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      if (action === "delete") {
        if (confirm(`Yakin ingin menghapus ${ids.length} kata?`)) {
          await bulkDeleteEntries(ids);
          setSelected(new Set());
        }
      } else {
        await bulkSetEntryStatus(ids, action === "publish" ? "published" : "draft");
        setSelected(new Set());
      }
    });
  };

  const renderSection = (title: string, entries: AdminEntry[]) => {
    const allSelected = entries.length > 0 && entries.every(e => selected.has(e.id));
    
    return (
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle>{title}</CardTitle>
          {entries.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => toggleAll(entries)} className="gap-2 text-muted-foreground">
              {allSelected ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
              {allSelected ? "إلغاء التحديد" : "تحديد الكل"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground">لا شيء هنا.</p>
          )}
          {entries.map((e) => {
            const isSelected = selected.has(e.id);
            return (
              <div
                key={e.id}
                className={`flex items-center justify-between gap-3 rounded-md border p-3 transition-colors ${
                  isSelected ? "bg-primary/5 border-primary/30" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button 
                    onClick={() => toggleSelect(e.id)} 
                    className="text-muted-foreground hover:text-primary shrink-0"
                  >
                    {isSelected ? <CheckSquare className="size-5 text-primary" /> : <Square className="size-5" />}
                  </button>
                  <div className="min-w-0">
                    <p className="truncate font-naskh text-lg">{e.lemma_ar}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Hash className="size-3" />
                      {e.root_ar || "—"} · {e.meaning_ar.slice(0, 40)}
                    </p>
                  </div>
                </div>
                
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={e.status === "published" ? "default" : "secondary"}>
                    {e.status === "published" ? "منشور" : "مسوّدة"}
                  </Badge>
                  
                  <form
                    action={setEntryStatus.bind(
                      null,
                      e.id,
                      e.status === "published" ? "draft" : "published"
                    )}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      title={e.status === "published" ? "إلغاء النشر" : "نشر"}
                    >
                      {e.status === "published" ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  </form>
                  <Button asChild variant="ghost" size="icon" title="تعديل">
                    <Link href={`/admin/dictionary/${e.id}`}>
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                  <form action={deleteEntry.bind(null, e.id)}>
                    <Button variant="ghost" size="icon" title="حذف" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="size-4" />
                    </Button>
                  </form>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {renderSection(`مسوّدات (${drafts.length})`, drafts)}
      {renderSection(`منشورة (${published.length})`, published)}

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 shadow-lg bg-background border rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5" dir="rtl">
          <span className="text-sm font-medium whitespace-nowrap">
            تم تحديد {selected.size}
          </span>
          <div className="w-px h-6 bg-border" />
          <Button 
            size="sm" 
            variant="default" 
            disabled={isPending}
            onClick={() => handleBulkAction("publish")}
            className="gap-2"
          >
            <Eye className="size-4" />
            نشر
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            disabled={isPending}
            onClick={() => handleBulkAction("draft")}
            className="gap-2"
          >
            <EyeOff className="size-4" />
            مسوّدة
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            disabled={isPending}
            onClick={() => handleBulkAction("delete")}
            className="gap-2"
          >
            <Trash2 className="size-4" />
            حذف
          </Button>
        </div>
      )}
    </>
  );
}
