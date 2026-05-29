const invoiceNumberPattern = /^INV-(\d+)$/

export const getNextInvoiceNumber = (existingInvoiceNumbers: Array<string | null | undefined>) => {
  const highestNumber = existingInvoiceNumbers.reduce((highest, invoiceNumber) => {
    const match = String(invoiceNumber || '').trim().match(invoiceNumberPattern)

    if (!match) return highest

    return Math.max(highest, Number(match[1]))
  }, 0)

  return `INV-${String(highestNumber + 1).padStart(4, '0')}`
}

export const isDuplicateInvoiceNumberError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false

  const maybeError = error as { code?: string; message?: string; details?: string }
  const searchableText = `${maybeError.message || ''} ${maybeError.details || ''}`.toLowerCase()

  return maybeError.code === '23505' || searchableText.includes('duplicate')
}
