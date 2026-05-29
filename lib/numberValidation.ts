export type ParsedNumber = {
  value: number | null
  error: string
}

const parseFiniteNumber = (rawValue: string, label: string): ParsedNumber => {
  const trimmedValue = rawValue.trim()

  if (!trimmedValue) {
    return { value: null, error: '' }
  }

  const value = Number(trimmedValue)

  if (!Number.isFinite(value)) {
    return { value: null, error: `${label} must be a valid number` }
  }

  return { value, error: '' }
}

export const parseRequiredPositiveNumber = (
  rawValue: string,
  label: string
): ParsedNumber => {
  const parsed = parseFiniteNumber(rawValue, label)

  if (parsed.error) return parsed

  if (parsed.value === null) {
    return { value: null, error: `${label} is required` }
  }

  if (parsed.value <= 0) {
    return { value: null, error: `${label} must be greater than 0` }
  }

  return parsed
}

export const parseOptionalNonNegativeNumber = (
  rawValue: string,
  label: string
): ParsedNumber => {
  const parsed = parseFiniteNumber(rawValue, label)

  if (parsed.error || parsed.value === null) return parsed

  if (parsed.value < 0) {
    return { value: null, error: `${label} must be 0 or more` }
  }

  return parsed
}

export const parseOptionalPositiveInteger = (
  rawValue: string,
  label: string
): ParsedNumber => {
  const parsed = parseFiniteNumber(rawValue, label)

  if (parsed.error || parsed.value === null) return parsed

  if (!Number.isInteger(parsed.value) || parsed.value < 1) {
    return { value: null, error: `${label} must be a whole number of at least 1` }
  }

  return parsed
}
