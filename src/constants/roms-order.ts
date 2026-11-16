export const romsOrders = ['added', 'name', 'played', 'popular', 'released'] as const
export type RomsOrder = (typeof romsOrders)[number]

/** Best match: only while searching, where it's the order a search starts in */
export const searchOrder = 'match'
export type ListOrder = RomsOrder | typeof searchOrder

/** Game lists open sorted by popularity */
export const defaultRomsOrder: RomsOrder = 'popular'

/** Popular and Most played read from the top; the rest from A, or the oldest. Best match is always best first */
export function getDefaultRomsDirection(order: string) {
  return order === 'popular' || order === 'played' ? 'desc' : 'asc'
}

/** A list's order from the address: best match while searching unless another is picked, and never without a search */
export function getListOrder(sort: null | string | undefined, searching: boolean): ListOrder {
  if (searching && (!sort || sort === searchOrder)) {
    return searchOrder
  }
  return romsOrders.find((order) => order === sort) ?? defaultRomsOrder
}
