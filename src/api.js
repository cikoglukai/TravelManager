const API_BASE = 'http://localhost:3000/api/trips'

export async function getTrips() {
    const res = await fetch(API_BASE)
    if (!res.ok) throw new Error('Failed to fetch trips')
    return res.json()
}

export async function getTrip(id) {
    const res = await fetch(`${API_BASE}/${id}`)
    if (!res.ok) throw new Error('Trip not found')
    return res.json()
}

export async function createTrip(tripData) {
    const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tripData),
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Creation failed')
    }
    return res.json()
}

export async function updateTrip(id, tripData) {
    const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tripData),
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Update failed')
    }
    return res.json()
}

export async function deleteTrip(id) {
    const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Delete failed')
    }
}