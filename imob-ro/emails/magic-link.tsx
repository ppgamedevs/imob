import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface MagicLinkEmailProps {
  magicLink: string;
  brandName?: string;
}

export function MagicLinkEmail({
  magicLink = "https://example.com/auth/verify?token=abc123",
  brandName = "imob.ro",
}: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Conectează-te la {brandName}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>{brandName}</Heading>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={paragraph}>Salut!</Text>

            <Text style={paragraph}>
              Apasă pe butonul de mai jos pentru a te conecta. Linkul expiră în 15 minute.
            </Text>

            <Button style={button} href={magicLink}>
              Conectează-te
            </Button>

            <Text style={paragraphSmall}>Sau copiază acest link în browser:</Text>

            <Link href={magicLink} style={link}>
              {magicLink}
            </Link>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>Dacă nu ai cerut acest email, ignoră-l.</Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} {brandName}. Toate drepturile rezervate.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default MagicLinkEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  padding: "32px 24px",
  textAlign: "center" as const,
};

const h1 = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0",
  padding: "0",
};

const content = {
  padding: "0 24px",
};

const paragraph = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
};

const paragraphSmall = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "16px 0 8px",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "12px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "600",
  lineHeight: "44px",
  textAlign: "center" as const,
  textDecoration: "none",
  padding: "0 32px",
  margin: "24px 0",
};

const link = {
  color: "#2563eb",
  fontSize: "14px",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  padding: "0 24px",
};

const footerText = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "4px 0",
};
