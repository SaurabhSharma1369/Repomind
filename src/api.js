import axios from 'axios'

const configuredApiUrl = import.meta.env.VITE_API_URL
const apiBaseUrl = configuredApiUrl
  ? `${configuredApiUrl.replace(/\/$/, '')}${configuredApiUrl.replace(/\/$/, '').endsWith('/api') ? '' : '/api'}`
  : '/api'

const client = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

function getErrorMessage(error) {
  return error.response?.data?.error?.message || error.response?.data?.detail || 'Something went wrong. Please try again.'
}

export async function ingestRepository(url) {
  try { return (await client.post('/repositories/ingest', { url })).data } catch (error) { throw new Error(getErrorMessage(error)) }
}

export async function analyzeRepository(repositoryId) {
  try { return (await client.get(`/repositories/${repositoryId}/analysis`)).data } catch (error) { throw new Error(getErrorMessage(error)) }
}

export async function chatWithRepository(repositoryId, question) {
  try { return (await client.post('/chat', { repository_id: repositoryId, question })).data } catch (error) { throw new Error(getErrorMessage(error)) }
}
