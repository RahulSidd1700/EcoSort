// Google Gemini (Generative Language API) vision provider.
export async function classifyWithGemini({ apiKey, model, prompt, base64Image, mimeType, signal }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    signal,
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Image } }],
        },
      ],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${text.slice(0, 300)}`);
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text) throw new Error('Gemini returned an empty response.');
  return text;
}
