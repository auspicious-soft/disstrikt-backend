import * as React from "react";
import {
  Html,
  Head,
  Container,
  Section,
  Text,
  Img,
} from "@react-email/components";

interface EmailProps {
  otp: string;
  language: string;
}

const ForgotPasswordVerification: React.FC<Readonly<EmailProps>> = ({
  otp,
  language,
}) => {
  const translations: Record<
    string,
    { subject: string; body: string; footer: string; expiry: string }
  > = {
    en: {
      subject: "Reset Your Password",
      body: "Use the OTP below to reset your password:",
      footer:
        "If you didn't request a password reset, you can safely ignore this email.",
      expiry: "This OTP will expire in 2 minutes.",
    },
    nl: {
      subject: "Wachtwoord opnieuw instellen",
      body: "Gebruik de onderstaande OTP om uw wachtwoord opnieuw in te stellen:",
      footer:
        "Als u geen verzoek tot wachtwoordherstel hebt gedaan, negeer deze e-mail dan.",
      expiry: "Deze OTP verloopt over 2 minuten.",
    },
    fr: {
      subject: "Réinitialisez votre mot de passe",
      body: "Utilisez le code OTP ci-dessous pour réinitialiser votre mot de passe :",
      footer:
        "Si vous n'avez pas demandé la réinitialisation de votre mot de passe, ignorez cet e-mail.",
      expiry: "Ce code expirera dans 2 minutes.",
    },
    es: {
      subject: "Restablece tu contraseña",
      body: "Utiliza el siguiente código OTP para restablecer tu contraseña:",
      footer:
        "Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.",
      expiry: "Este código caducará en 2 minutos.",
    },
  };

  const { subject, body, footer, expiry } =
    translations[language] || translations["en"];

  return (
    <Html lang={language}>
      <Head>
        <title>{subject}</title>
      </Head>
      <Container
        style={{
          maxWidth: "500px",
          margin: "0 auto",
          padding: "24px",
          backgroundColor: "#f9f9f9",
          borderRadius: "8px",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        <Section style={{ textAlign: "center" }}>
          <Img
            src="https://your-logo-url.com/logo.png"
            alt="Bookstagram Logo"
            width="120"
            style={{ marginBottom: "20px" }}
          />
          <h1 style={{ color: "#333", fontSize: "24px", margin: "10px 0" }}>
            {subject}
          </h1>
          <Text
            style={{ fontSize: "16px", color: "#555", marginBottom: "12px" }}
          >
            {body}
          </Text>

          <Section
            style={{
              backgroundColor: "#ffffff",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              display: "inline-block",
              margin: "20px 0",
            }}
          >
            <Text
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#111",
                letterSpacing: "6px",
              }}
            >
              {otp}
            </Text>
          </Section>

          <Text
            style={{ fontSize: "14px", color: "#888", marginBottom: "6px" }}
          >
            {expiry}
          </Text>
          <Text style={{ fontSize: "14px", color: "#aaa" }}>{footer}</Text>
        </Section>
      </Container>
    </Html>
  );
};

export default ForgotPasswordVerification;
