import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface LeadEmailProps {
  /** Property address or title */
  propertyTitle: string;
  /** Sender name */
  senderName: string;
  /** Sender email */
  senderEmail: string;
  /** Sender phone (optional) */
  senderPhone?: string;
  /** Message from sender */
  message: string;
  /** Link to property or conversation */
  viewUrl?: string;
  /** Brand name */
  brandName?: string;
}

export function LeadEmail({
  propertyTitle = "Apartament 2 camere, Militari",
  senderName = "Ion Popescu",
  senderEmail = "ion.popescu@example.com",
  senderPhone,
  message = "Bună ziua, sunt interesat de acest apartament. Aș dori mai multe detalii despre starea sa.",
  viewUrl = "https://example.com/dashboard/leads/123",
  brandName = "imob.ro"
}: LeadEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Mesaj nou pentru {propertyTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>{brandName}</Heading>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={h2}>Ai primit un mesaj nou</Heading>
            
            <Text style={paragraph}>
              <strong>Proprietate:</strong> {propertyTitle}
            </Text>

            <Hr style={hrThin} />

            <Text style={label}>De la:</Text>
            <Text style={paragraph}>
              <strong>{senderName}</strong>
              <br />
              Email: <a href={`mailto:${senderEmail}`} style={link}>{senderEmail}</a>
              {senderPhone && (
                <>
                  <br />
                  Telefon: <a href={`tel:${senderPhone}`} style={link}>{senderPhone}</a>
                </>
              )}
            </Text>

            <Text style={label}>Mesaj:</Text>
            <Section style={messageBox}>
              <Text style={messageText}>{message}</Text>
            </Section>

            {viewUrl && (
              <Button style={button} href={viewUrl}>
                Vezi mesajul complet
              </Button>
            )}
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Răspunde direct la acest email pentru a continua conversația cu {senderName}.
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} {brandName}. Toate drepturile rezervate.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default LeadEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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

const h2 = {
  color: "#1f2937",
  fontSize: "20px",
  fontWeight: "600",
  margin: "0 0 24px",
};

const content = {
  padding: "0 24px",
};

const paragraph = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "8px 0",
};

const label = {
  color: "#6b7280",
  fontSize: "14px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "24px 0 8px",
};

const messageBox = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderLeft: "4px solid #2563eb",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0 24px",
};

const messageText = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
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
  textDecoration: "none",
};

const hrThin = {
  borderColor: "#e5e7eb",
  margin: "16px 0",
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
