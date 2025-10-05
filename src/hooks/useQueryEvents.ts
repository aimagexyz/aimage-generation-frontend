import { type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

type QueryEvents<RespT, ErrT> = {
  onSuccess: (resp: RespT) => void;
  onError: (resp: ErrT) => void;
};

export function useQueryEvents<RespT, ErrT>(
  query: UseQueryResult<RespT, ErrT>,
  callbacks: Partial<QueryEvents<RespT, ErrT>>,
) {
  const { onSuccess, onError } = callbacks;

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    if (query.data && onSuccessRef.current) {
      onSuccessRef.current(query.data);
    }
  }, [query.data]);

  useEffect(() => {
    if (query.error && onErrorRef.current) {
      onErrorRef.current(query.error);
    }
  }, [query.error]);
}
