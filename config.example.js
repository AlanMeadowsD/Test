/*
 * Bearings AI public configuration template
 *
 * The values below are URLS for your own serverless functions; they are not
 * Gemini, Imagen, or Supabase secrets. Those credentials must stay in your
 * function-hosting provider's encrypted environment variables.
 */
window.BEARINGS_CONFIG = {
  // POST { question, selectedBook } => { answer }
  geminiStudentEndpoint: "https://YOUR-FUNCTION.example.com/student-assistant",
  // POST FormData { audio } => { subject, recap, homework }
  geminiAudioEndpoint: "https://YOUR-FUNCTION.example.com/class-wrap-up",
  // POST { prompt, style } => { imageUrl } or { imageBase64 }
  imagenEndpoint: "https://YOUR-FUNCTION.example.com/create-illustration",
  // GET => [{ id, date, subject, content, homework? }]
  familyUpdatesEndpoint: "",
  // POST { date, subject, content, homework } => update
  publishUpdateEndpoint: ""
};
