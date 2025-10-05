import { type StateStorage } from 'zustand/middleware';

export const hashStorage: StateStorage = {
  getItem: (key): string => {
    const searchParams = new URLSearchParams(location.hash.slice(1));
    const storedValue = searchParams.get(key) ?? '';
    return JSON.parse(storedValue) as string;
  },
  setItem: (key, newValue): void => {
    const searchParams = new URLSearchParams(location.hash.slice(1));
    searchParams.set(key, JSON.stringify(newValue));
    location.hash = searchParams.toString();
  },
  removeItem: (key): void => {
    const searchParams = new URLSearchParams(location.hash.slice(1));
    searchParams.delete(key);
    location.hash = searchParams.toString();
  },
};

export const urlSearchParamsStorage: StateStorage = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getItem: (_key): string => {
    const searchParams = new URLSearchParams(location.search);
    // searchParams to JSON object
    const state: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      state[key] = value;
    });
    return JSON.stringify({ state, version: 0 });
  },
  setItem: (_key, newValue): void => {
    const searchParams = new URLSearchParams(location.search);
    // string to JSON object
    const data: {
      state: Record<string, unknown>;
      version: number;
    } = JSON.parse(newValue) as never;
    // data.state to searchParams
    Object.entries(data.state).forEach(([key, value]) => {
      searchParams.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
    history.replaceState(null, '', `${location.pathname}?${searchParams.toString()}`);
  },
  removeItem: (key): void => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete(key);
    history.replaceState(null, '', `${location.pathname}?${searchParams.toString()}`);
  },
};
