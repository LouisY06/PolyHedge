import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Position, Market, Bundle, AnalysisResult } from '../types'

interface AppState {
  isLoggedIn: boolean
  positions: Position[]
  markets: Market[]
  bundles: Bundle[]
  selectedMarkets: Market[]
  activeCategory: string
  activeSort: string
  analysis: AnalysisResult | null
  analysisCache: Record<string, AnalysisResult>
  analysisLoading: boolean
  analysisError: string | null
  gmailPreviewPositions: Position[]

  setLoggedIn: (v: boolean) => void
  setPositions: (p: Position[]) => void
  setMarkets: (m: Market[]) => void
  addBundle: (bundle: Bundle) => void
  removeBundle: (id: string) => void
  toggleMarketSelection: (market: Market) => void
  clearSelections: () => void
  setActiveCategory: (c: string) => void
  setActiveSort: (s: string) => void
  setAnalysis: (a: AnalysisResult | null) => void
  setAnalysisCache: (cache: Record<string, AnalysisResult>) => void
  setAnalysisLoading: (v: boolean) => void
  setAnalysisError: (e: string | null) => void
  setGmailPreviewPositions: (p: Position[]) => void
  clearGmailPreview: () => void
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
      analysis: null,
      analysisCache: {},
      analysisLoading: false,
      analysisError: null,
      gmailPreviewPositions: [],

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
      setAnalysis: (a) => set({ analysis: a }),
      setAnalysisCache: (cache) => set({ analysisCache: cache }),
      setAnalysisLoading: (v) => set({ analysisLoading: v }),
      setAnalysisError: (e) => set({ analysisError: e }),
      setGmailPreviewPositions: (p) => set({ gmailPreviewPositions: p }),
      clearGmailPreview: () => set({ gmailPreviewPositions: [] }),
    }),
    {
      name: 'polyhedge-storage',
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        positions: state.positions,
        markets: state.markets,
        bundles: state.bundles,
        analysis: state.analysis,
        analysisCache: state.analysisCache,
      }),
    }
  )
)
