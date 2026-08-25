const basicEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const normalizeOptionalDelegateEmail = (value?: string | null) => {
  const trimmed = String(value || '').trim()

  return trimmed || null
}

export const validateOptionalDelegateEmail = (value?: string | null) => {
  const normalized = normalizeOptionalDelegateEmail(value)

  if (!normalized) {
    return { value: null, error: '' }
  }

  if (!basicEmailPattern.test(normalized)) {
    return {
      value: normalized,
      error: 'Enter a valid email address, or leave it blank.',
    }
  }

  return { value: normalized, error: '' }
}
