import type { Metadata } from "next";
import { Fraunces, Work_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Fraunces para títulos (serif con carácter, como el del boceto),
// Work Sans para el resto del texto — más prolijo que la fuente por
// defecto del sistema que se usaba antes.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600", "700"]
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  title: "Tierra — Equipos para tus aventuras en la montaña",
  description: "Ropa deportiva y urbana, bicicletas, equipamiento de montaña y alquiler de equipo de invierno."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${workSans.variable}`}>
      <body className="font-sans">
        {/* AuthProvider va por fuera: el carrito necesita reaccionar a la
            sesión (vaciarse al cerrarla), no al revés. */}
        <AuthProvider>
          <CartProvider>
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
