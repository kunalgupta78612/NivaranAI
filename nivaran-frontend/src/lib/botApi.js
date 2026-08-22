import axios from './axios'

/** Send a message to the Nivaran AI agent. Optionally continue a specific past thread
 *  and/or force a reply language ('en' | 'hi' | 'auto'). */
export async function sendChat({ message, hasPhoto = false, channel = 'web', sessionId = null, forceLanguage = null }) {
  const { data } = await axios.post('/chat', { message, hasPhoto, channel, sessionId, forceLanguage })
  return data
}

/** Which engine is live — an LLM provider, or the built-in civic engine. */
export async function getBotHealth() {
  const { data } = await axios.get('/chat/health')
  return data
}

/** Restore the CURRENT (non-archived) conversation after a page refresh. */
export async function getBotSession() {
  const { data } = await axios.get('/chat/session')
  return data
}

/** Load any past conversation by id — used by the history drawer. */
export async function getBotSessionById(id) {
  const { data } = await axios.get(`/chat/session/${id}`)
  return data
}

/** Every conversation this citizen has ever had — newest first. Nothing is deleted. */
export async function listBotSessions() {
  const { data } = await axios.get('/chat/sessions')
  return data
}

/** Archive the current thread and start a brand new one. */
export async function newBotSession() {
  const { data } = await axios.post('/chat/new')
  return data
}

/** Score a complaint without filing it (used for the live severity preview). */
export async function analyzeText(text) {
  const { data } = await axios.post('/chat/analyze', { text })
  return data
}
