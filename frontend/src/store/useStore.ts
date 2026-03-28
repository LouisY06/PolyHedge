import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Position, Market, Bundle } from '../types'

interface AppState {
  isLoggedIn: boolean
  positions: Position[]
  markets: Market[]
  bundles: Bundle[]
  selectedMarkets: Market[]
  activeCategory: string
  activeSort: string

  setLoggedIn: (v: boolean) => void
  setPositions: (p: Position[]) => void
  setMarkets: (m: Market[]) => void
  addBundle: (bundle: Bundle) => void
  removeBundle: (id: string) => void
  toggleMarketSelection: (market: Market) => void
  clearSelections: () => void
  setActiveCategory: (c: string) => void
  setActiveSort: (s: string) => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      positions: [],
      markets: [],
      bundles: [],
      selectedMarkets: [],
      activeCategory: 'All',
      activeSort: 'Trending',

      setLoggedIn: (v) => set({ isLoggedIn: v }),
      setPositions: (p) => set({ positions: p }),
      setMarkets: (m) => set({ markets: m }),
      addBundle: (bundle) => set({ bundles: [...get().bundles, bundle] }),
      removeBundle: (id) =>
        set({ bundles: get().bundles.filter((b) => b.id !== id) }),
      toggleMarketSelection: (market) => {
        const current = get().selectedMarkets
        const exists = current.find((m) => m.id === market.id)
        set({
          selectedMarkets: exists
            ? current.filter((m) => m.id !== market.id)
            : [...current, market],
        })
      },
      clearSelections: () => set({ selectedMarkets: [] }),
      setActiveCategory: (c) => set({ activeCategory: c }),
      setActiveSort: (s) => set({ activeSort: s }),
    }),
    {
      name: 'polyhedge-storage',
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        bundles: state.bundles,
      }),
    }
  )
)
