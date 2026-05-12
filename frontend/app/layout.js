export const metadata = {
  title: "DocOCR — RAG Project",
  description: "Extract text from PDFs using Gemini",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}