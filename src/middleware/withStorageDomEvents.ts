import { type Mutate, type StoreApi } from 'zustand';

export type StoreWithPersist<T> = Mutate<StoreApi<T>, [['zustand/persist', T]]>;

export const withStorageDomEvents = <T>(store: StoreWithPersist<T>) => {
  const storageEventCallback = (e: StorageEvent) => {
    if (e.key == store.persist.getOptions().name && e.newValue) {
      store.persist.rehydrate()?.catch(console.error);
    }
  };
  window.addEventListener('storage', storageEventCallback);
  return () => {
    window.removeEventListener('storage', storageEventCallback);
  };
};
