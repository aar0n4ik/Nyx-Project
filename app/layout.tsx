export const metadata = {
  title: "OFFSIDE",
  description: "Offline-first fan experience on Solana + Tether QVAC + TxLINE",
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{props.children}</body>
    </html>
  );
}
