import { supabase } from '@/lib/supabaseClient'

export async function getOrCreateAccount() {
  const { data: userData, error: userError } =
    await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new Error('User not logged in')
  }

  const user = userData.user

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (existingProfile) {
    return existingProfile
  }

  const organisationId = crypto.randomUUID()

  const { error: orgError } = await supabase
    .from('organisations')
    .insert({
      id: organisationId,
      name: 'My Training Company',
    })

  if (orgError) {
    throw orgError
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .insert({
        id: user.id,
        organisation_id: organisationId,
        full_name: user.email,
        role: 'owner',
      })
      .select()
      .single()

  if (profileError) {
    throw profileError
  }

  await supabase.from('trainers').insert({
    organisation_id: organisationId,
    user_id: user.id,
    name: user.email,
    email: user.email,
    notes: 'Account owner',
  })

  await supabase
    .from('clients')
    .update({ organisation_id: organisationId })
    .eq('user_id', user.id)
    .is('organisation_id', null)

  await supabase
    .from('bookings')
    .update({ organisation_id: organisationId })
    .eq('user_id', user.id)
    .is('organisation_id', null)

  await supabase
    .from('invoices')
    .update({ organisation_id: organisationId })
    .eq('user_id', user.id)
    .is('organisation_id', null)

  await supabase
    .from('certificates')
    .update({ organisation_id: organisationId })
    .eq('user_id', user.id)
    .is('organisation_id', null)

  return profile
}