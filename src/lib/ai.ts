/**
 * Geração de texto com Google Gemini (camada gratuita do AI Studio).
 * Sem GEMINI_API_KEY → usa modelos de texto prontos (funciona offline/demo).
 * Chamada via REST, sem SDK, para manter o bundle leve.
 */
export const aiEnabled = () => Boolean(process.env.GEMINI_API_KEY);

export async function generateText(prompt: string, fallback: string): Promise<{ text: string; source: "gemini" | "modelo" }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { text: fallback, source: "modelo" };
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 600 },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const json = await res.json();
    const text: string | undefined = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
    return text?.trim() ? { text: text.trim(), source: "gemini" } : { text: fallback, source: "modelo" };
  } catch (e) {
    console.error("[ai] falha no Gemini, usando modelo pronto:", e);
    return { text: fallback, source: "modelo" };
  }
}

export interface CampaignInput {
  eventName: string;
  date: string;
  highlight: string; // ex: "Caipirinha de kiwi por R$ 18 até 0h"
  tone?: "festa" | "premium" | "urgencia";
}

export async function generateCampaign(input: CampaignInput) {
  const prompt = `Você é social media de uma casa noturna no Brasil. Crie um post curto para Instagram em português do Brasil.
Evento: ${input.eventName} (${input.date}). Destaque: ${input.highlight}. Tom: ${input.tone ?? "festa"}.
Responda EXATAMENTE neste formato:
TITULO: (no máximo 4 palavras, em maiúsculas)
LEGENDA: (até 3 frases, com 2 a 4 emojis e chamada para ação)
HASHTAGS: (5 hashtags)`;
  const fallback = `TITULO: ${input.highlight.split(" ").slice(0, 3).join(" ").toUpperCase()}
LEGENDA: 🔥 ${input.eventName} chegando! ${input.highlight}. Garanta seu lugar pelo app e entre sem fila 🎟️
HASHTAGS: #baladacuritiba #sextou #vipflow #openbar #rolê`;
  const { text, source } = await generateText(prompt, fallback);
  const get = (k: string) => text.match(new RegExp(`${k}:\\s*(.+)`, "i"))?.[1]?.trim() ?? "";
  return { title: get("TITULO") || input.eventName.toUpperCase(), caption: get("LEGENDA") || text, hashtags: get("HASHTAGS"), source };
}

export async function generateInviteMessage(name: string, weekday: string, table: string | null, eventName: string) {
  const first = name.split(" ")[0];
  const fallback = `Oi, ${first}! 🎉 Sua ${weekday} na ${eventName} já está garantida: separamos um ingresso free${table ? ` e o ${table}` : ""} pra você. Toque no link para confirmar 👇`;
  const prompt = `Escreva uma mensagem curta de WhatsApp (máx. 2 frases, 1-2 emojis), calorosa e pessoal, convidando ${first}, cliente VIP frequente, para o evento "${eventName}" na ${weekday}, dizendo que ele ganhou um ingresso free${table ? ` e reservamos o ${table}` : ""}. Termine pedindo para confirmar no link. Sem hashtags.`;
  return (await generateText(prompt, fallback)).text;
}
