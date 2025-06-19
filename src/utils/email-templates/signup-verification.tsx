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

const SignupVerification: React.FC<Readonly<EmailProps>> = ({
  otp,
  language,
}) => {
  const translations: Record<
    string,
    { subject: string; body: string; footer: string; expiry: string }
  > = {
    en: {
      subject: "Verify Your Email",
      body: "Please use the following OTP to verify your email address:",
      footer: "If you did not request this, please ignore this email.",
      expiry: "This OTP is valid for 2 minutes.",
    },
    nl: {
      subject: "Verifieer uw e-mailadres",
      body: "Gebruik de volgende OTP om uw e-mailadres te verifiëren:",
      footer: "Als u dit niet heeft aangevraagd, kunt u deze e-mail negeren.",
      expiry: "Deze OTP is 2 minuten geldig.",
    },
    fr: {
      subject: "Vérifiez votre adresse e-mail",
      body: "Veuillez utiliser le code OTP suivant pour vérifier votre adresse e-mail :",
      footer: "Si vous n'avez pas demandé cela, veuillez ignorer cet e-mail.",
      expiry: "Ce code est valable pendant 2 minutes.",
    },
    es: {
      subject: "Verifica tu correo electrónico",
      body: "Por favor, usa el siguiente código OTP para verificar tu correo electrónico:",
      footer: "Si no solicitaste esto, ignora este correo electrónico.",
      expiry: "Este código OTP es válido durante 2 minutos.",
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
            alt="Disstrikt Logo"
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

export default SignupVerification;
