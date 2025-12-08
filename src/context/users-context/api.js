// actions
import * as api from './actions'

import { createClient } from '@/lib/supabase/client'

// *****************************
// fetch users (Supabase)
// *****************************
export const fetchUsers = async (usersDispatch) => {
	usersDispatch(api.fetchUsersStart())
	try {
		const supabase = createClient()
		const { data, error } = await supabase.from('users').select('*')
		if (error) {
			console.error('fetchUsers error', error)
			usersDispatch(api.fetchUsersFailure(error))
			return
		}
		usersDispatch(api.fetchUsersSuccess(data || []))
	} catch (err) {
		console.error('fetchUsers exception', err)
		usersDispatch(api.fetchUsersFailure(err))
	}
}

// *****************************
// update user (Supabase)
// *****************************
export const updateUser = async (id, userData, usersDispatch) => {
	usersDispatch(api.updateUserStart())
	try {
		const supabase = createClient()
		const { data, error } = await supabase
			.from('users')
			.update(userData)
			.eq('id', id)
			.select()
			.single()
		
		if (error) {
			console.error('updateUser error', error)
			usersDispatch(api.updateUserFailure(error))
			return
		}
		usersDispatch(api.updateUserSuccess(data))
	} catch (err) {
		console.error('updateUser exception', err)
		usersDispatch(api.updateUserFailure(err))
	}
}

// *****************************
// add user (Supabase)
// *****************************
export const addUser = async (userData, usersDispatch) => {
	usersDispatch(api.addUserStart())
	try {
		const supabase = createClient()
		const { data, error } = await supabase
			.from('users')
			.insert(userData)
			.select()
			.single()
		
		if (error) {
			console.error('addUser error', error)
			usersDispatch(api.addUserFailure(error))
			return
		}
		usersDispatch(api.addUserSuccess(data))
	} catch (err) {
		console.error('addUser exception', err)
		usersDispatch(api.addUserFailure(err))
	}
}

// *****************************
// upsert user (add or update)
// *****************************
export const upsertUser = async (id, userData, usersDispatch) => {
	if (id) {
		await updateUser(id, userData, usersDispatch)
	} else {
		await addUser(userData, usersDispatch)
	}
}

// Note: delete helper still uses server proxy. Convert as needed.
