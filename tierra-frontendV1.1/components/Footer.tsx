import { Instagram, Facebook, MessageCircle, MapPin, Clock, Phone, Mail, Bike, Tent, Shirt, Snowflake } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16">
      {/* Cuerpo del footer: fondo claro, texto bordó — distinto de la franja
          de copyright de abajo, que sí es bordó sólida con texto blanco. */}
      <div className="bg-tierra-crema text-tierra-bordo-oscuro text-sm">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/brand/logo.png" alt="Tierra" className="h-6 w-auto" />
            </div>
            <p className="text-tierra-bordo-oscuro/80 mb-3">Tierra Esquel | Outdoor</p>
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
            <ul className="space-y-1.5 text-tierra-bordo-oscuro/90">
              <li>Envíos y entregas</li>
              <li>Cambios y devoluciones</li>
              <li>Medios de pago</li>
              <li>Preguntas frecuentes</li>
              <li>Términos y condiciones</li>
            </ul>
          </div>

          <div>
            <p className="font-bold mb-2 uppercase text-xs tracking-wide">Contacto</p>
            <ul className="space-y-1.5 text-tierra-bordo-oscuro/90">
              <li className="flex items-center gap-2">
                <MapPin size={14} className="shrink-0" /> Av. Fontana 482, Esquel 9200
              </li>
              <li className="flex items-center gap-2">
                <Clock size={14} className="shrink-0" /> De lunes a lunes de 9 a 13 hs
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="shrink-0" /> +54 9 2945 123456
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="shrink-0" /> hola@tierra.esquel
              </li>
            </ul>
          </div>

          <div>
            <p className="font-bold mb-2 uppercase text-xs tracking-wide">Seguinos</p>
            <div className="flex gap-3">
              <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-full bg-pink-500 text-white flex items-center justify-center hover:opacity-90">
                <Instagram size={16} />
              </a>
              <a href="#" aria-label="Facebook" className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center hover:opacity-90">
                <Facebook size={16} />
              </a>
              <a href="#" aria-label="WhatsApp" className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center hover:opacity-90">
                <MessageCircle size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-tierra-bordo text-white text-center py-4 text-xs">
        © {new Date().getFullYear()} TIERRA Esquel. Todos los derechos reservados.
      </div>
    </footer>
  );
}
