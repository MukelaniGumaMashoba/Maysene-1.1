'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSubcontractor(formData: FormData) {
  const supabase = await createClient()
  
  const data = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    skills: (formData.get('skills') as string).split(',').map(s => s.trim()),
    availability: formData.get('availability') === 'true',
    rating: parseFloat(formData.get('rating') as string) || 0,
    hourly_rate: parseFloat(formData.get('hourly_rate') as string) || 0,
  }

  const { error } = await supabase
    .from('subcontractor')
    .insert(data)

  if (error) throw new Error(error.message)
  
  revalidatePath('/fleetManager/subcontractors')
  return { success: true }
}

export async function updateSubcontractor(id: string, formData: FormData) {
  const supabase = await createClient()
  
  const data = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    skills: (formData.get('skills') as string).split(',').map(s => s.trim()),
    availability: formData.get('availability') === 'true',
    rating: parseFloat(formData.get('rating') as string) || 0,
    hourly_rate: parseFloat(formData.get('hourly_rate') as string) || 0,
  }

  const { error } = await supabase
    .from('subcontractor')
    .update(data)
    .eq('id', id)

  if (error) throw new Error(error.message)
  
  revalidatePath('/fleetManager/subcontractors')
  return { success: true }
}

export async function deleteSubcontractor(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('subcontractor')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  
  revalidatePath('/fleetManager/subcontractors')
  return { success: true }
}