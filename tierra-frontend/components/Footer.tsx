import { MAIL, URL_INSTAGRAM, URL_MAIL, WHATSAPP_VISIBLE, urlWhatsapp } from "@/lib/contacto";
import { Instagram, MessageCircle, MapPin, Clock, Phone, Mail, Bike, Tent, Shirt, Snowflake } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16">
      {/* Cuerpo del footer: fondo claro, texto bordó — distinto de la franja
          de copyright de abajo, que sí es bordó sólida con texto blanco. */}
      <div className="relative overflow-hidden bg-tierra-crema text-tierra-terracota-oscuro text-sm">
        <div className="relative max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/brand/logo.png" alt="Tierra" className="h-6 w-auto" />
            </div>
            <p className="text-tierra-terracota-oscuro/80 mb-3">Tierra Esquel | Outdoor</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2">
                <Bike size={14} className="shrink-0" /> Running · Trekking · Bike · Esquí
              </li>
              <li className="flex items-center gap-2">
                <Tent size={14} className="shrink-0" /> Camping y accesorios
              </li>
              <li className="flex items-center gap-2">
                <Shirt size={14} className="shrink-0" /> Ropa urbana
              </li>
              <li className="flex items-center gap-2">
                <Snowflake size={14} className="shrink-0" /> Rental de esquí
              </li>
            </ul>
          </div>

          <div>
            <p className="font-bold mb-2 uppercase text-xs tracking-wide">Información</p>
            <ul className="space-y-1.5 text-tierra-terracota-oscuro/90">
              <li>Envíos y entregas</li>
              <li>Cambios y devoluciones</li>
              <li>Medios de pago</li>
              <li>Preguntas frecuentes</li>
              <li>Términos y condiciones</li>
            </ul>
          </div>

          <div id="contacto" className="scroll-mt-32">
            <p className="font-bold mb-2 uppercase text-xs tracking-wide">Contacto</p>
            <ul className="space-y-1.5 text-tierra-terracota-oscuro/90">
              <li className="flex items-center gap-2">
                <MapPin size={14} className="shrink-0" /> Av. Fontana 482, Esquel 9200
              </li>
              <li className="flex items-center gap-2">
                <Clock size={14} className="shrink-0" /> De lunes a lunes de 9 a 13 hs
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="shrink-0" />
                <a href={urlWhatsapp()} target="_blank" rel="noopener noreferrer" className="hover:underline">WhatsApp {WHATSAPP_VISIBLE}</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="shrink-0" />
                <a href={URL_MAIL} className="hover:underline break-all">{MAIL}</a>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-bold mb-2 uppercase text-xs tracking-wide">Seguinos</p>
            <div className="flex gap-3">
              <a href={URL_INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram de Tierra (@tierra.esquel)" className="w-9 h-9 rounded-full bg-pink-500 text-white flex items-center justify-center transition-transform hover:scale-110">
                <Instagram size={16} />
              </a>
              <a href={urlWhatsapp()} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de Tierra" className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center transition-transform hover:scale-110">
                <MessageCircle size={16} />
              </a>
              <a href={URL_MAIL} aria-label="Escribinos por mail" className="w-9 h-9 rounded-full bg-tierra-terracota text-white flex items-center justify-center transition-transform hover:scale-110">
                <Mail size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-tierra-terracota text-white text-center py-4 text-xs">
        © <span suppressHydrationWarning>{new Date().getFullYear()}</span> TIERRA Esquel. Todos los derechos reservados.
      </div>
    </footer>
  );
}
