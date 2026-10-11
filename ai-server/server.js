import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';

const app = express();
const port = Number(process.env.PORT || 8787);
const apiKey = process.env.GROQ_API_KEY;
const groq = apiKey ? new Groq({ apiKey }) : null;

app.use(cors({ origin: true }));
app.get('/', (_req, res) => res.json({ status: 'EcoSort AI server running', ok: true, configured: Boolean(groq) }));
app.get('/api/health', (_req, res) => res.json({ ok: true, configured: Boolean(groq) }));

const SYSTEM_PROMPT = `You are EcoSort, a waste-image classification assistant.
Classify the main visible waste item into exactly one category:
- Recyclable: clean paper, cardboard, plastic bottles, metal cans, glass.
- Organic: food scraps, fruit/vegetable waste, garden waste.
- E-Waste: mobile phones, laptops, chargers, keyboards and discarded electronic devices.
- Hazardous: chemicals, paint containers with hazardous residue, and hazardous household waste. Classify batteries as Hazardous.
- Non-Recyclable: dirty tissues, contaminated materials, and mixed waste that cannot easily be recycled.
If no waste is visible or the image is too unclear, use category Unknown.
Do not invent a confidence percentage or estimated price.
Return ONLY a raw JSON object with keys item, category, description, disposal_advice.
Do not wrap JSON in Markdown code fences.`;

function parseModelJson(text) {
  const cleaned = String(text || '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('The AI returned an unreadable response. Please try another image.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

app.post('/api/classify', express.json({ limit: '12mb' }), async (req, res) => {
  try {
    if (!groq) return res.status(503).json({ error: 'GROQ_API_KEY is missing. Add it to ai-server/.env and restart the AI server.' });
    const { image, mimeType } = req.body || {};
    if (typeof image !== 'string' || !image) return res.status(400).json({ error: 'Image data is required.' });
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedTypes.has(mimeType)) return res.status(400).json({ error: 'Please upload a JPG, PNG, or WEBP image.' });
    // Accept only raw base64 from the client and keep it in memory for this request.
    const base64 = image.replace(/^data:image\/(?:jpeg|png|webp);base64,/i, '');
    if (base64.length > 8 * 1024 * 1024) return res.status(413).json({ error: 'Image is too large. Please choose an image under about 6 MB.' });
    const completion = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      temperature: 0,
      max_tokens: 500,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: [
          { type: 'text', text: 'Classify this waste image for EcoSort. Return the requested JSON only.' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        ] },
      ],
    });
    const parsed = parseModelJson(completion.choices?.[0]?.message?.content);
    const allowed = new Set(['Recyclable', 'Organic', 'E-Waste', 'Hazardous', 'Non-Recyclable', 'Unknown']);
    if (!allowed.has(parsed.category)) return res.status(502).json({ error: 'The AI returned an unsupported category. Please try again.' });
    if (parsed.category === 'Unknown') return res.status(422).json({ error: 'I could not identify the waste clearly. Try a brighter, closer photo or use manual classification.' });
    return res.json({
      item: String(parsed.item || 'Waste item').slice(0, 120),
      category: parsed.category,
      description: String(parsed.description || '').slice(0, 1000),
      disposal_advice: String(parsed.disposal_advice || '').slice(0, 1000),
    });
  } catch (error) {
    console.error('Waste classification failed:', error?.message || error);
    if (error?.status === 401) return res.status(502).json({ error: 'Groq rejected the API key. Check GROQ_API_KEY in ai-server/.env.' });
    if (error?.status === 404) return res.status(502).json({ error: 'The Groq model is unavailable for this API key. Check the current Groq model ID.' });
    return res.status(502).json({ error: 'AI classification failed. Check the AI server terminal and try again.' });
  }
});

app.listen(port, () => {
  console.log(`EcoSort temporary AI server listening at http://localhost:${port}`);
  if (!groq) console.warn('GROQ_API_KEY is missing. Add it to ai-server/.env.');
});
