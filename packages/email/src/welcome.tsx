import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Link,
  Preview,
  Hr,
} from "@react-email/components";

interface WelcomeEmailProps {
  name: string;
  appUrl?: string;
}

export function WelcomeEmail({ name, appUrl = "https://app.zentory.ch" }: WelcomeEmailProps) {
  return (
    <Html lang="de">
      <Head />
      <Preview>Willkommen bei Zentory, {name}!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>ZENTORY</Text>
          </Section>
          <Section style={body}>
            <Heading style={h1}>Willkommen bei Zentory!</Heading>
            <Text style={text}>Hallo {name},</Text>
            <Text style={text}>
              Vielen Dank f&uuml;r deine Registrierung. Wir freuen uns, dich an Bord zu haben.
            </Text>
            <Section style={buttonContainer}>
              <Link style={button} href={`${appUrl}/dashboard`}>
                Zum Dashboard
              </Link>
            </Section>
            <Text style={muted}>
              Falls du dieses Konto nicht erstellt hast, kannst du diese E-Mail ignorieren.
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

export default WelcomeEmail;

const main = { backgroundColor: "#f4f5f7", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" };
const container = { margin: "0 auto", maxWidth: "560px", backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden" as const };
const header = { backgroundColor: "#236B56", padding: "24px 32px", textAlign: "center" as const };
const logo = { color: "#ffffff", fontSize: "22px", fontWeight: "700" as const, letterSpacing: "2px", margin: "0" };
const body = { padding: "32px 32px 24px" };
const h1 = { color: "#1f2937", fontSize: "20px", fontWeight: "bold" as const, margin: "0 0 16px" };
const text = { color: "#4b5563", fontSize: "15px", lineHeight: "24px", margin: "0 0 12px" };
const buttonContainer = { textAlign: "center" as const, margin: "24px 0" };
const button = {
  backgroundColor: "#236B56",
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
