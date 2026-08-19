import { create } from 'zustand';
import { dictService } from '@/services/dict';
import type { DictItemTreeResp } from '@/types/dict';

export interface DictItemData {
  id: string;
  name: string;
  itemValue: string;
  enabled: boolean;
  tagColor?: string;
  children?: DictItemData[];
}

interface DictCacheEntry {
  items: DictItemData[];
  loading: boolean;
  error?: string;
  /** Request promise for deduplication - same dictCode only requests once */
  promise?: Promise<DictItemData[]>;
}

interface DictCacheState {
  caches: Record<string, DictCacheEntry>;
  fetchDictItems: (dictCode: string) => Promise<DictItemData[]>;
  getItems: (dictCode: string) => DictItemData[] | undefined;
  isLoading: (dictCode: string) => boolean;
  reset: () => void;
}

function toDictItemData(item: DictItemTreeResp): DictItemData {
  return {
    id: item.id,
    name: item.name,
    itemValue: item.itemValue,
    enabled: item.enabled,
    tagColor: item.tagColor,
    children: item.children?.map(toDictItemData),
  };
}

export const useDictCacheStore = create<DictCacheState>((set, get) => ({
  caches: {},

  fetchDictItems: (dictCode: string): Promise<DictItemData[]> => {
    if (!dictCode) return Promise.resolve([]);

    const { caches } = get();
    const existing = caches[dictCode];

    if (existing?.promise) {
      return existing.promise;
    }

    if (existing?.items.length > 0 && !existing.loading) {
      return Promise.resolve(existing.items);
    }

    const promise = dictService
      .listItemsByCode(dictCode)
      .then((data) => {
        const items = data.map(toDictItemData);
        set((state) => ({
          caches: {
            ...state.caches,
            [dictCode]: {
              items,
              loading: false,
              error: undefined,
              promise: undefined,
            },
          },
        }));
        return items;
      })
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        set((state) => ({
          caches: {
            ...state.caches,
            [dictCode]: {
              items: [],
              loading: false,
              error: errorMessage,
              promise: undefined,
            },
          },
        }));
        throw error;
      });

    set((state) => ({
      caches: {
        ...state.caches,
        [dictCode]: {
          items: existing?.items ?? [],
          loading: true,
          error: undefined,
          promise,
        },
      },
    }));

    return promise;
  },

  getItems: (dictCode: string): DictItemData[] | undefined => {
    return get().caches[dictCode]?.items;
  },

  isLoading: (dictCode: string): boolean => {
    return get().caches[dictCode]?.loading ?? false;
  },

  reset: () => {
    set({ caches: {} });
  },
}));