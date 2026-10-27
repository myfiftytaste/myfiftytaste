// Envoie chaque retour par e-mail à contact@50films.fr (via Resend), avec le texte mis en forme
// et une ligne CSV en pièce jointe : plus besoin d'aller le chercher dans Postgres.
// Au mieux : un échec d'envoi ne fait jamais échouer l'enregistrement du retour (déjà en base).

const LABELS: Record<string, string> = {
  profile_resonates: "Le profil te parle",
  general_comment: "Commentaire général",
  one_change: "Une chose à changer",
  design_detail: "Design",
  clarte_detail: "Clarté",
  stats_detail: "Statistiques",
  recos_detail: "Recommandations",
  hof_detail: "Hall of Fame",
  mobile_detail: "Mobile",
  bug_detail: "Bug",
  idee_detail: "Idée",
  autre_detail: "Autre",
  username: "Pseudo",
  device: "Appareil",
  source_page: "Page d'origine",
};

function csvCell(value: string | null): string {
  const text = value ?? "";
  return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function sendFeedbackEmail(fields: Record<string, string | null>): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // pas configuré (local, aperçu) : le retour reste en base seulement
  const now = new Date();
  const stamp = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(now);
  const day = now.toISOString().slice(0, 10);
  const keys = Object.keys(LABELS);
  const text = keys
    .filter((key) => fields[key])
    .map((key) => `${LABELS[key]} :\n${fields[key]}`)
    .join("\n\n");
  const csv = `date;${keys.join(";")}\n${[now.toISOString(), ...keys.map((key) => csvCell(fields[key]))].join(";")}\n`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.FEEDBACK_EMAIL_FROM ?? "Fifty <feedback@50films.fr>",
        to: [process.env.FEEDBACK_EMAIL_TO ?? "contact@50films.fr"],
        subject: `Feedback - ${stamp}`,
        text: `${text}\n\n— Envoyé automatiquement par 50films.fr (ligne CSV jointe).`,
        attachments: [{ filename: `feedback-${day}.csv`, content: Buffer.from(`﻿${csv}`, "utf-8").toString("base64") }],
      }),
    });
    if (!response.ok) console.error(`feedback mail: ${response.status} ${(await response.text()).slice(0, 160)}`);
  } catch (error) {
    console.error("feedback mail: fetch_error", error instanceof Error ? error.message : error);
  }
}
