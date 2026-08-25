import { Instagram, Facebook, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-tierra-bordo text-white text-sm mt-16">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <p className="font-bold text-lg mb-2">TIERRA</p>
          <p className="text-tierra-crema-oscuro/90 mb-3">Tierra Esquel | Outdoor</p>
          <ul className="text-tierra-crema-oscuro/80 space-y-1">
            <li>Running · Trekking · Bike · Esquí</li>
            <li>Camping y accesorios</li>
            <li>Ropa urbana</li>
            <li>Rental de esquí</li>
          </ul>
        </div>

        <div>
          <p className="font-bold mb-2">Información</p>
          <ul className="space-y-1 text-tierra-crema-oscuro/90">
            <li>Envíos y entregas</li>
            <li>Cambios y devoluciones</li>
            <li>Medios de pago</li>
            <li>Preguntas frecuentes</li>
            <li>Términos y condiciones</li>
          </ul>
        </div>

        <div>
          <p className="font-bold mb-2">Contacto</p>
          <ul className="space-y-1 text-tierra-crema-oscuro/90">
            <li>Av. Fontana 482, Esquel 9200</li>
            <li>De lunes a lunes de 9 a 13 hs</li>
            <li>+54 9 2945 123456</li>
            <li>hola@tierra.esquel</li>
          </ul>
        </div>

        <div>
          <p className="font-bold mb-2">Seguinos</p>
          <div className="flex gap-3">
            <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
              <Instagram size={16} />
            </a>
            <a href="#" aria-label="Facebook" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
              <Facebook size={16} />
            </a>
            <a href="#" aria-label="WhatsApp" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
              <MessageCircle size={16} />
            </a>
          </div>
        </div>
      </div>
      <div className="text-center py-4 border-t border-white/20 text-xs">
        © {new Date().getFullYear()} TIERRA Esquel. Todos los derechos reservados.
      </div>
    </footer>
  );
}
