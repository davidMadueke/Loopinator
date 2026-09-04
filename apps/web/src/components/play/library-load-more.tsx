import { Button } from "@loopinator/ui/components/button";

export const LIBRARY_PAGE_SIZE = 5;

type LibraryLoadMoreProps = {
  total: number;
  visible: number;
  onLoadMore: () => void;
};

export function remainingCount(total: number, visible: number) {
  return Math.max(0, total - visible);
}

export function LibraryLoadMore({ total, visible, onLoadMore }: LibraryLoadMoreProps) {
  const remaining = remainingCount(total, visible);
  if (remaining === 0) {
    return null;
  }

  return (
    <div className="pt-2 flex justify-center">
      <Button variant="ghost" size="sm" onClick={onLoadMore} className="hover:text-primary">
        Load more ({remaining} remaining)
      </Button>
    </div>
  );
}
