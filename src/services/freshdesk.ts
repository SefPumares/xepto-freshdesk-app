import axios from 'axios'

const API_KEY = import.meta.env.VITE_FRESHDESK_API_KEY
const DOMAIN = import.meta.env.VITE_FRESHDESK_DOMAIN

const freshdesk = axios.create({
  baseURL: `https://${DOMAIN}/api/v2`,
  headers: {
    Authorization: 'Basic ' + btoa(`${API_KEY}:X`),
    'Content-Type': 'application/json'
  }
})

export async function fetchTickets() {
  try {
    const response = await freshdesk.get('/tickets')
    return response.data 
  } catch (error) {
    console.error('Failed to fetch tickets:', error)
    return []
  }
}

export default freshdesk
