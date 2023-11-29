import { Nullable } from 'uiSrc/utils'
import { IEnablementAreaItem } from 'uiSrc/slices/interfaces/workbench'

export enum InsightsPanelTabs {
  Explore = 'explore',
  Recommendations = 'recommendations'
}

export interface InsightsPanelState {
  isOpen: boolean,
  tabSelected: InsightsPanelTabs,
  explore: {
    search: string,
    itemScrollTop: number,
    data: Nullable<string>,
    url: Nullable<string>,
    manifest: Nullable<IEnablementAreaItem[]>,
    isPageOpen: boolean
  }
}