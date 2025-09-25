import { useCallback, useEffect, useRef } from 'react';

type Props = {
  fetchMore: () => void;
  loading: boolean;
  fallback?: React.ReactNode;
} & React.ComponentPropsWithoutRef<'div'>;

export function ScrollLoader(props: Props) {
  const { fetchMore, loading, children, fallback, ...restProps } = props;
  const loaderRef = useRef(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const observerCallback: IntersectionObserverCallback = useCallback(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !loading) {
          fetchMore();
        }
      });
    },
    [loading, fetchMore],
  );

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5,
    };
    observerRef.current = new IntersectionObserver(observerCallback, observerOptions);
    if (loaderRef.current) {
      observerRef.current.observe(loaderRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [observerCallback]);

  if (loading) {
    return <>{fallback}</>;
  }
  return (
    <div ref={loaderRef} {...restProps} className="h-0.5">
      {children}
    </div>
  );
}
