export type PublicBookingDelegatePricing = {
  id?: string | null
  booking_delegate_id?: string | null
  full_name?: string | null
  client_id?: string | null
  client_name?: string | null
  unit_price?: number | string | null
  invoice_id?: string | null
  invoice_line_description?: string | null
}

export type InvoiceLineItem = {
  description: string
  amount: number
}

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const cleanText = (value: string | null | undefined) => String(value || '').trim()

export const getPublicBookingPricingSummary = (
  delegates: PublicBookingDelegatePricing[]
) => {
  return delegates.reduce(
    (summary, delegate) => {
      const amount = toNumber(delegate.unit_price)

      summary.totalValue += amount

      if (delegate.invoice_id) {
        summary.invoicedCount += 1
        summary.invoicedValue += amount
      } else {
        summary.uninvoicedCount += 1
        summary.uninvoicedValue += amount
      }

      return summary
    },
    {
      totalCount: delegates.length,
      totalValue: 0,
      invoicedCount: 0,
      invoicedValue: 0,
      uninvoicedCount: 0,
      uninvoicedValue: 0,
    }
  )
}

export const getSelectedPublicInvoiceDelegates = (
  delegates: PublicBookingDelegatePricing[],
  selectedDelegateIds: string[]
) => {
  const selectedIds = new Set(selectedDelegateIds)

  return delegates.filter((delegate) => delegate.id && selectedIds.has(delegate.id))
}

export const getPublicDelegateInvoiceSummary = (
  delegates: PublicBookingDelegatePricing[],
  selectedDelegateIds: string[]
) => {
  const selectedDelegates = getSelectedPublicInvoiceDelegates(
    delegates,
    selectedDelegateIds
  )
  const alreadyInvoiced = selectedDelegates.filter((delegate) => delegate.invoice_id)
  const readyToInvoice = selectedDelegates.filter((delegate) => !delegate.invoice_id)
  const clientIds = new Set(
    readyToInvoice
      .map((delegate) => cleanText(delegate.client_id))
      .filter(Boolean)
  )

  return {
    selectedDelegates,
    readyToInvoice,
    selectedCount: selectedDelegates.length,
    alreadyInvoicedCount: alreadyInvoiced.length,
    uninvoicedCount: readyToInvoice.length,
    totalAmount: readyToInvoice.reduce(
      (total, delegate) => total + toNumber(delegate.unit_price),
      0
    ),
    hasMixedClients: clientIds.size > 1,
    hasClientRecipient: clientIds.size === 1,
    clientId: Array.from(clientIds)[0] || null,
  }
}

export const buildPublicDelegateInvoiceLineDescription = (
  delegate: PublicBookingDelegatePricing,
  courseName?: string | null
) => {
  const existing = cleanText(delegate.invoice_line_description)
  if (existing) return existing

  const delegateName = cleanText(delegate.full_name) || 'Delegate'
  const course = cleanText(courseName)

  return course ? `${delegateName} - ${course}` : delegateName
}

export const getPublicDelegateInvoiceLineItems = (
  delegates: PublicBookingDelegatePricing[],
  invoiceId: string,
  courseName?: string | null
): InvoiceLineItem[] => {
  return delegates
    .filter((delegate) => delegate.invoice_id === invoiceId)
    .map((delegate) => ({
      description: buildPublicDelegateInvoiceLineDescription(delegate, courseName),
      amount: toNumber(delegate.unit_price),
    }))
}
