import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
  itemLabel?: { ar: string; en: string };
  showSummary?: boolean;
}

/**
 * Reusable hook to handle client-side pagination with default 30 items per page
 */
export function usePagination<T>(items: T[], pageSize = 30) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return {
    currentPage: safePage,
    setCurrentPage,
    totalPages,
    pageSize,
    totalItems: items.length,
    paginatedItems,
  };
}

export function TablePagination({
  currentPage,
  totalItems,
  pageSize = 30,
  onPageChange,
  className,
  itemLabel,
  showSummary = true,
}: TablePaginationProps) {
  const { lang, pick } = useI18n();
  const isRtl = lang === "ar";

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate visible page numbers
  const pageNumbers = useMemo(() => {
    const delta = 1;
    const range: (number | "...")[] = [];
    const left = currentPage - delta;
    const right = currentPage + delta + 1;
    let prev: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i < right)) {
        if (prev) {
          if (i - prev === 2) {
            range.push(prev + 1);
          } else if (i - prev !== 1) {
            range.push("...");
          }
        }
        range.push(i);
        prev = i;
      }
    }
    return range;
  }, [currentPage, totalPages]);

  // If there are no items or only 1 page with no items, display minimal summary
  if (totalItems === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-4 px-4 py-3 border-t border-border/60 text-xs text-muted-foreground",
          className
        )}
      >
        <span>{pick("لا توجد عناصر لعرضها", "No items to display")}</span>
      </div>
    );
  }

  // Next and Prev handlers taking RTL into account
  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const handleFirst = () => {
    if (currentPage !== 1) onPageChange(1);
  };

  const handleLast = () => {
    if (currentPage !== totalPages) onPageChange(totalPages);
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border/60 bg-muted/20 text-xs select-none",
        className
      )}
    >
      {/* Items count summary */}
      {showSummary && (
        <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <span>
            {pick(
              `عرض ${startItem} - ${endItem} من إجمالي ${totalItems}`,
              `Showing ${startItem} - ${endItem} of ${totalItems}`
            )}
          </span>
          {itemLabel && (
            <span className="text-foreground font-semibold">
              ({pick(itemLabel.ar, itemLabel.en)})
            </span>
          )}
          <span className="mx-1 text-muted-foreground/40">•</span>
          <span>
            {pick(
              `30 عنصر لكل صفحة`,
              `30 per page`
            )}
          </span>
        </div>
      )}

      {/* Navigation Buttons (Only shown if totalPages > 1 or for consistent UI) */}
      <div className="flex items-center gap-1 ms-auto">
        {/* First Page */}
        <button
          type="button"
          onClick={handleFirst}
          disabled={currentPage === 1}
          aria-label={pick("الصفحة الأولى", "First page")}
          title={pick("الصفحة الأولى", "First page")}
          className="p-1.5 rounded-md border border-border/60 bg-card hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
        >
          {isRtl ? <ChevronsRight className="size-3.5" /> : <ChevronsLeft className="size-3.5" />}
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentPage === 1}
          aria-label={pick("الصفحة السابقة", "Previous page")}
          title={pick("الصفحة السابقة", "Previous page")}
          className="p-1.5 rounded-md border border-border/60 bg-card hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
        >
          {isRtl ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>

        {/* Page Number Pills */}
        <div className="flex items-center gap-1 mx-1">
          {pageNumbers.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-muted-foreground/60 font-mono text-xs"
                >
                  ...
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p as number)}
                className={cn(
                  "min-w-7 h-7 px-2 rounded-md font-bold text-xs transition-all cursor-pointer flex items-center justify-center",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-105"
                    : "border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={handleNext}
          disabled={currentPage === totalPages}
          aria-label={pick("الصفحة التالية", "Next page")}
          title={pick("الصفحة التالية", "Next page")}
          className="p-1.5 rounded-md border border-border/60 bg-card hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
        >
          {isRtl ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={handleLast}
          disabled={currentPage === totalPages}
          aria-label={pick("الصفحة الأخيرة", "Last page")}
          title={pick("الصفحة الأخيرة", "Last page")}
          className="p-1.5 rounded-md border border-border/60 bg-card hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
        >
          {isRtl ? <ChevronsLeft className="size-3.5" /> : <ChevronsRight className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}
