import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Heading,
  Link,
  Preview,
  Section,
  Hr,
} from "@react-email/components";

interface PaymentFailedEmailProps {
  appUrl?: string;
}

export function PaymentFailedEmail({ appUrl = "https://app.zentory.ch" }: PaymentFailedEmailProps) {
  return (
    <Html lang="de">
      <Head />
      <Preview>Zahlung fehlgeschlagen — bitte Zahlungsmethode aktualisieren</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}><span style={logoZen}>ZEN</span><span style={logoTory}>TORY</span></Text>
          </Section>
          <Section style={body}>
            <Heading style={h1}>Zahlung fehlgeschlagen</Heading>
            <Text style={text}>Hallo,</Text>
            <Text style={text}>
              Wir konnten deine Abo-Zahlung nicht verarbeiten. Bitte aktualisiere deine
              Zahlungsmethode, damit dein Abo aktiv bleibt.
            </Text>
            <Section style={buttonContainer}>
              <Link style={button} href={`${appUrl}/dashboard/billing`}>
                Zahlungsmethode aktualisieren
              </Link>
            </Section>
            <Text style={muted}>
              Falls du glaubst, dass dies ein Fehler ist, wende dich bitte an unser Support-Team.
            </Text>
          </Section>
          <Hr style={hr} />
          <Section style={footerSection}>
            <Text style={footer}>&copy; 2026 Zentory &middot; zentory.ch</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default PaymentFailedEmail;

const main = { backgroundColor: "#f4f5f7", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" };
const container = { margin: "0 auto", maxWidth: "560px", backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden" as const };
const header = { backgroundColor: "#236B56", padding: "24px 32px", textAlign: "center" as const };
const logo = { color: "#ffffff", fontSize: "22px", letterSpacing: "2px", margin: "0" };
const logoZen = { fontWeight: "700" as const };
const logoTory = { fontWeight: "300" as const };
const body = { padding: "32px 32px 24px" };
const h1 = { color: "#1f2937", fontSize: "20px", fontWeight: "bold" as const, margin: "0 0 16px" };
const text = { color: "#4b5563", fontSize: "15px", lineHeight: "24px", margin: "0 0 12px" };
const buttonContainer = { textAlign: "center" as const, margin: "24px 0" };
const button = {
  backgroundColor: "#D97706",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  padding: "12px 24px",
  display: "inline-block",
};
const muted = { color: "#9ca3af", fontSize: "12px", margin: "16px 0 0" };
const hr = { borderColor: "#e5e7eb", margin: "0" };
const footerSection = { padding: "16px 32px", textAlign: "center" as const };
const footer = { color: "#9ca3af", fontSize: "12px", margin: "0" };
