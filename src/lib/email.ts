import nodemailer, { type Transporter } from "nodemailer";

// ---------------------------------------------------------------------------
// Service d'envoi d'e-mails transactionnels — Brevo (ex Sendinblue)
// Transport SMTP via Nodemailer : smtp-relay.brevo.com:587 (STARTTLS),
// authentification par login SMTP + clé API (BREVO_SMTP_KEY, ou
// BREVO_API_KEY en repli).
// ---------------------------------------------------------------------------

/** Hôte SMTP relais Brevo par défaut. */
const HOTE_BREVO = "smtp-relay.brevo.com";
/** Port SMTP Brevo par défaut (STARTTLS). */
const PORT_BREVO = 587;

/** Transport Nodemailer mis en cache (créé paresseusement au premier envoi). */
let transport: Transporter | null = null;

/**
 * Construit (une seule fois) le transport SMTP Brevo à partir des variables
 * d'environnement. Lance une erreur explicite si la configuration est absente.
 */
function obtenirTransport(): Transporter {
  if (transport) {
    return transport;
  }

  const hote = process.env.BREVO_SMTP_HOST ?? HOTE_BREVO;
  const port = Number(process.env.BREVO_SMTP_PORT ?? PORT_BREVO);
  const utilisateur = process.env.BREVO_SMTP_LOGIN;
  const cle = process.env.BREVO_SMTP_KEY ?? process.env.BREVO_API_KEY;

  if (!utilisateur || !cle) {
    throw new Error(
      "Configuration Brevo manquante : renseignez BREVO_SMTP_LOGIN et BREVO_SMTP_KEY (ou BREVO_API_KEY) dans .env.",
    );
  }

  transport = nodemailer.createTransport({
    host: hote,
    port,
    secure: port === 465,
    auth: { user: utilisateur, pass: cle },
  });

  return transport;
}

/** Adresse d'expéditeur affichée (doit être vérifiée dans Brevo). */
function expediteur(): string {
  const nom = process.env.BREVO_EXPEDITEUR_NOM ?? "Église SaaS";
  const email =
    process.env.BREVO_EXPEDITEUR_EMAIL ?? "no-reply@eglise-saas.app";
  return `"${nom}" <${email}>`;
}

/** URL de base de l'application pour construire les liens des e-mails. */
function baseApplication(): string {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return base.replace(/\/+$/, "");
}

/**
 * Envoie un e-mail transactionnel via Brevo. Retourne `true` si l'envoi a
 * réussi ; les erreurs sont journalisées côté serveur sans faire échouer
 * l'appelant (l'inscription reste possible même si Brevo est indisponible).
 */
async function envoyer(params: {
  destinataire: string;
  sujet: string;
  texte: string;
  html: string;
}): Promise<boolean> {
  try {
    const client = obtenirTransport();
    await client.sendMail({
      from: expediteur(),
      to: params.destinataire,
      subject: params.sujet,
      text: params.texte,
      html: params.html,
    });
    return true;
  } catch (erreur) {
    console.error("Échec d'envoi d'e-mail (Brevo) :", erreur);
    return false;
  }
}

/**
 * Envoie l'e-mail de confirmation d'adresse e-mail après inscription.
 *
 * @param destinataire Adresse e-mail du nouveau compte.
 * @param tokenNom Jeton de vérification encodé dans le lien de confirmation
 *   (`/api/auth/verification-email?jeton=...`). Valable 48 heures.
 */
export async function envoyerEmailVerification(
  destinataire: string,
  tokenNom: string,
): Promise<boolean> {
  const lien = `${baseApplication()}/api/auth/verification-email?jeton=${encodeURIComponent(tokenNom)}`;
  const sujet = "Confirmez votre adresse e-mail — Église SaaS";

  const texte = [
    "Bienvenue sur Église SaaS !",
    "",
    "Pour activer votre compte, confirmez votre adresse e-mail en ouvrant le lien ci-dessous :",
    lien,
    "",
    "Ce lien est valable 48 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    "",
    "— L'équipe Église SaaS",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:32px;border:1px solid #e8e4f5;border-radius:16px;background:#ffffff">
      <p style="font-size:20px;font-weight:bold;color:#6d28d9;margin:0 0 4px">Église SaaS</p>
      <h1 style="font-size:18px;color:#1a1330;margin:16px 0 8px">Confirmez votre adresse e-mail</h1>
      <p style="font-size:14px;color:#5b5478;line-height:1.6;margin:0 0 20px">Bienvenue ! Pour activer votre compte et pouvoir vous connecter, veuillez confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous.</p>
      <p style="margin:0 0 24px"><a href="${lien}" style="display:inline-block;background:#6d28d9;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 24px;border-radius:8px">Confirmer mon adresse e-mail</a></p>
      <p style="font-size:12px;color:#8b85a8;line-height:1.6;margin:0">Ce lien est valable 48 heures. Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :<br/><a href="${lien}" style="color:#6d28d9;word-break:break-all">${lien}</a></p>
      <p style="font-size:12px;color:#8b85a8;margin:20px 0 0">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p>
    </div>`.trim();

  return envoyer({ destinataire, sujet, texte, html });
}

/**
 * Envoie l'e-mail de réinitialisation de mot de passe.
 *
 * @param destinataire Adresse e-mail du compte.
 * @param token Jeton de réinitialisation encodé dans le lien
 *   (`/reinitialisation-mot-de-passe?jeton=...`). Valable 1 heure.
 */
export async function envoyerLienReinitialisation(
  destinataire: string,
  token: string,
): Promise<boolean> {
  const lien = `${baseApplication()}/reinitialisation-mot-de-passe?jeton=${encodeURIComponent(token)}`;
  const sujet = "Réinitialisez votre mot de passe — Église SaaS";

  const texte = [
    "Bonjour,",
    "",
    "Une demande de réinitialisation de mot de passe a été effectuée pour votre compte Église SaaS.",
    "Pour choisir un nouveau mot de passe, ouvrez le lien ci-dessous :",
    lien,
    "",
    "Ce lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.",
    "",
    "— L'équipe Église SaaS",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:32px;border:1px solid #e8e4f5;border-radius:16px;background:#ffffff">
      <p style="font-size:20px;font-weight:bold;color:#6d28d9;margin:0 0 4px">Église SaaS</p>
      <h1 style="font-size:18px;color:#1a1330;margin:16px 0 8px">Réinitialisation du mot de passe</h1>
      <p style="font-size:14px;color:#5b5478;line-height:1.6;margin:0 0 20px">Une demande de réinitialisation a été effectuée pour votre compte. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>
      <p style="margin:0 0 24px"><a href="${lien}" style="display:inline-block;background:#6d28d9;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 24px;border-radius:8px">Réinitialiser mon mot de passe</a></p>
      <p style="font-size:12px;color:#8b85a8;line-height:1.6;margin:0">Ce lien est valable 1 heure. Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :<br/><a href="${lien}" style="color:#6d28d9;word-break:break-all">${lien}</a></p>
      <p style="font-size:12px;color:#8b85a8;margin:20px 0 0">Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.</p>
    </div>`.trim();

  return envoyer({ destinataire, sujet, texte, html });
}

/**
 * Envoie le code OTP à 6 chiffres pour l'authentification à deux facteurs.
 *
 * @param destinataire Adresse e-mail du compte en cours de connexion.
 * @param code Code à 6 chiffres généré côté serveur (valable 10 minutes).
 */
export async function envoyerCodeOtp(
  destinataire: string,
  code: string,
): Promise<boolean> {
  const sujet = "Votre code de vérification — Église SaaS";

  const texte = [
    "Bonjour,",
    "",
    "Pour finaliser votre connexion à Église SaaS, saisissez le code de vérification ci-dessous :",
    "",
    code,
    "",
    "Ce code est valable 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.",
    "",
    "— L'équipe Église SaaS",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:32px;border:1px solid #e8e4f5;border-radius:16px;background:#ffffff">
      <p style="font-size:20px;font-weight:bold;color:#6d28d9;margin:0 0 4px">Église SaaS</p>
      <h1 style="font-size:18px;color:#1a1330;margin:16px 0 8px">Votre code de vérification</h1>
      <p style="font-size:14px;color:#5b5478;line-height:1.6;margin:0 0 20px">Pour finaliser votre connexion, saisissez le code à 6 chiffres ci-dessous. Il est valable <strong>10 minutes</strong>.</p>
      <p style="margin:0 0 24px;text-align:center"><span style="display:inline-block;background:#f5f1ff;border:1px dashed #6d28d9;color:#1a1330;font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px 24px 16px 32px;border-radius:12px">${code}</span></p>
      <p style="font-size:12px;color:#8b85a8;line-height:1.6;margin:0">Ne partagez jamais ce code. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p>
      <p style="font-size:12px;color:#8b85a8;margin:20px 0 0">— L'équipe Église SaaS</p>
    </div>`.trim();

  return envoyer({ destinataire, sujet, texte, html });
}