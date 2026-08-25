export const getCertificateEmailSentUpdate = (
  emailSucceeded: boolean,
  sentAt = new Date().toISOString()
) => {
  if (!emailSucceeded) return null

  return {
    certificate_emailed_at: sentAt,
  }
}

export const getCertificateEmailSentDisplay = (
  certificate?: { certificate_emailed_at?: string | null } | null
) => {
  return certificate?.certificate_emailed_at || null
}
