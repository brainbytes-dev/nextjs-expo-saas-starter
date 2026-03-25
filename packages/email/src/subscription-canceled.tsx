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

interface SubscriptionCanceledEmailProps {
  appUrl?: string;
}

export function SubscriptionCanceledEmail({
  appUrl = "https://app.zentory.ch",
}: SubscriptionCanceledEmailProps) {
  return (
    <Html lang="de">
      <Head />
      <Preview>Dein Abo wurde gek&uuml;ndigt</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}><span style={logoZen}>ZEN</span><span style={logoTory}>TORY</span></Text>
          </Section>
          <Section style={body}>
            <Heading style={h1}>Abo gek&uuml;ndigt</Heading>
            <Text style={text}>Hallo,</Text>
            <Text style={text}>
              Dein Abo wurde gek&uuml;ndigt und endet zum n&auml;chsten Abrechnungszeitraum.
              Bis dahin hast du weiterhin vollen Zugang.
            </Text>
            <Text style={text}>
              Falls du es dir anders &uuml;berlegst, kannst du jederzeit ein neues Abo abschliessen.
            </Text>
            <Section style={buttonContainer}>
              <Link style={button} href={`${appUrl}/pricing`}>
                Preise ansehen
              </Link>
            </Section>
            <Text style={muted}>
              Falls du Fragen hast, wende dich gerne an unser Support-Team.
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

export default SubscriptionCanceledEmail;

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
