import { TAMANIO_PAGINA } from "./catalogo";
import type {
  FiltrosDeCatalogo,
  GeneroProducto,
  OpcionCategoria,
  OpcionMarca,
  Pagina,
  ProductoDetalle,
  ProductoResumen
} from "./types";

// DATOS DE PRUEBA para desarrollar el buscador y los filtros del catálogo
// ANTES de que el backend implemente el contrato (tarea H-D del plan).
//
// Este archivo hace dos trabajos a la vez:
//  1. Alimenta la pantalla mientras no hay backend (ver USAR_CATALOGO_DE_PRUEBA
//     en lib/api.ts).
//  2. Es la IMPLEMENTACIÓN DE REFERENCIA del contrato: consultarCatalogo()
//     dice, ejecutable y con pruebas, qué tiene que devolver el backend para
//     cada combinación de filtros. El backend se puede validar contra esto.
//
// Los 7 productos con id d0000000-... son los del seed real (mismos ids,
// nombres, marcas y precios): su detalle abre contra el backend de verdad. Los
// 20 con id d1000000-... están inventados para tener volumen y variedad
// (marcas, precios, géneros) -- sin eso no se pueden probar la paginación ni el
// filtro de género, porque los 7 reales son todos unisex.

export const CATEGORIAS_PRUEBA: OpcionCategoria[] = [
  { id: "c0000000-0000-0000-0000-000000000001", nombre: "Bicicletas", padreId: null },
  { id: "c0000000-0000-0000-0000-000000000002", nombre: "Ropa", padreId: null },
  { id: "c0000000-0000-0000-0000-000000000003", nombre: "Ropa deportiva", padreId: "c0000000-0000-0000-0000-000000000002" },
  { id: "c0000000-0000-0000-0000-000000000004", nombre: "Ropa urbana", padreId: "c0000000-0000-0000-0000-000000000002" },
  { id: "c0000000-0000-0000-0000-000000000005", nombre: "Carpas", padreId: null },
  { id: "c0000000-0000-0000-0000-000000000006", nombre: "Mochilas", padreId: null },
  { id: "c0000000-0000-0000-0000-000000000007", nombre: "Cascos", padreId: null }
];

export const MARCAS_PRUEBA: OpcionMarca[] = [
  { id: "b0000000-0000-0000-0000-000000000001", nombre: "Scott" },
  { id: "b0000000-0000-0000-0000-000000000002", nombre: "The North Face" },
  { id: "b0000000-0000-0000-0000-000000000003", nombre: "Northland" },
  { id: "b0000000-0000-0000-0000-000000000004", nombre: "Saucony" },
  { id: "b0000000-0000-0000-0000-000000000005", nombre: "New Balance" }
];

interface ProductoDePrueba {
  id: string;
  nombre: string;
  descripcion: string;
  marcaId: string;
  categoriaId: string;
  genero: GeneroProducto;
  precio: number;
  imagen: string | null;
}

const C = (n: number) => `c0000000-0000-0000-0000-00000000000${n}`;
const M = (n: number) => `b0000000-0000-0000-0000-00000000000${n}`;
const IMG = {
  bici: "/images/products/bicicleta-mtb.png",
  campera: "/images/products/campera-outdoor.png",
  carpa: "/images/products/carpa-2-personas.png",
  casco: "/images/products/casco-montana.png",
  mochila: "/images/products/mochila-trekking.png"
};

// Los dos productos reales del seed cuya imagen es un SVG incrustado enorme
// (zapatillas y buzo) acá van sin imagen: ProductCard muestra el cuadro vacío.
const REALES: ProductoDePrueba[] = [
  { id: "d0000000-0000-0000-0000-000000000001", nombre: 'Bicicleta MTB 29"', descripcion: "Bicicleta de montaña rodado 29, cuadro de aluminio, frenos a disco.", marcaId: M(1), categoriaId: C(1), genero: "UNISEX", precio: 899990, imagen: IMG.bici },
  { id: "d0000000-0000-0000-0000-000000000002", nombre: "Campera Outdoor", descripcion: "Campera impermeable con capucha, ideal para trekking y running en climas fríos.", marcaId: M(2), categoriaId: C(3), genero: "UNISEX", precio: 149990, imagen: IMG.campera },
  { id: "d0000000-0000-0000-0000-000000000003", nombre: "Mochila Trekking 50L", descripcion: "Mochila de trekking con sistema de ventilación en la espalda y cobertor de lluvia.", marcaId: M(3), categoriaId: C(6), genero: "UNISEX", precio: 89990, imagen: IMG.mochila },
  { id: "d0000000-0000-0000-0000-000000000004", nombre: "Carpa 2 Personas", descripcion: "Carpa iglú de 2 personas, doble techo, ideal para camping de montaña.", marcaId: M(3), categoriaId: C(5), genero: "UNISEX", precio: 64990, imagen: IMG.carpa },
  { id: "d0000000-0000-0000-0000-000000000005", nombre: "Zapatillas Running", descripcion: "Zapatillas de running con amortiguación media, para asfalto y trail suave.", marcaId: M(4), categoriaId: C(3), genero: "UNISEX", precio: 79990, imagen: null },
  { id: "d0000000-0000-0000-0000-000000000006", nombre: "Buzo Urbano", descripcion: "Buzo de algodón con capucha, corte oversize.", marcaId: M(5), categoriaId: C(4), genero: "UNISEX", precio: 54990, imagen: null },
  { id: "d0000000-0000-0000-0000-000000000007", nombre: "Casco de Montaña", descripcion: "Casco de montaña con ventilación regulable, para ciclismo y outdoor.", marcaId: M(1), categoriaId: C(7), genero: "UNISEX", precio: 39990, imagen: IMG.casco }
];

const sintetico = (n: number, p: Omit<ProductoDePrueba, "id">): ProductoDePrueba => ({
  id: `d1000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`,
  ...p
});

const INVENTADOS: ProductoDePrueba[] = [
  sintetico(1, { nombre: "Bicicleta Gravel Aluminio", descripcion: "Bicicleta gravel para caminos de ripio y ruta, 18 velocidades.", marcaId: M(1), categoriaId: C(1), genero: "UNISEX", precio: 1250000, imagen: IMG.bici }),
  sintetico(2, { nombre: "Bicicleta Urbana Rodado 28", descripcion: "Bicicleta urbana con canasto y guardabarros, para la ciudad.", marcaId: M(1), categoriaId: C(1), genero: "UNISEX", precio: 480000, imagen: IMG.bici }),
  sintetico(3, { nombre: "Bicicleta Infantil Rodado 20", descripcion: "Bicicleta para chicos de 6 a 9 años, con rueditas desmontables.", marcaId: M(1), categoriaId: C(1), genero: "NINO", precio: 210000, imagen: IMG.bici }),
  sintetico(4, { nombre: "Campera Softshell Mujer", descripcion: "Campera softshell cortaviento y repelente al agua, para trekking.", marcaId: M(2), categoriaId: C(3), genero: "MUJER", precio: 189990, imagen: IMG.campera }),
  sintetico(5, { nombre: "Campera Softshell Hombre", descripcion: "Campera softshell cortaviento y repelente al agua, para trekking.", marcaId: M(2), categoriaId: C(3), genero: "HOMBRE", precio: 189990, imagen: IMG.campera }),
  sintetico(6, { nombre: "Remera Térmica Hombre", descripcion: "Primera capa térmica de secado rápido, para el frío de montaña.", marcaId: M(5), categoriaId: C(3), genero: "HOMBRE", precio: 32990, imagen: null }),
  sintetico(7, { nombre: "Calzas Largas Mujer", descripcion: "Calzas largas de compresión suave, para running y gimnasio.", marcaId: M(5), categoriaId: C(3), genero: "MUJER", precio: 41990, imagen: null }),
  sintetico(8, { nombre: "Zapatillas Trail Hombre", descripcion: "Zapatillas de trail con suela de tacos profundos, para sendero.", marcaId: M(4), categoriaId: C(3), genero: "HOMBRE", precio: 129990, imagen: null }),
  sintetico(9, { nombre: "Zapatillas Trail Mujer", descripcion: "Zapatillas de trail con suela de tacos profundos, para sendero.", marcaId: M(4), categoriaId: C(3), genero: "MUJER", precio: 129990, imagen: null }),
  sintetico(10, { nombre: "Campera Polar Niños", descripcion: "Campera polar abrigada, ideal para los días fríos de Esquel.", marcaId: M(3), categoriaId: C(3), genero: "NINO", precio: 59990, imagen: IMG.campera }),
  sintetico(11, { nombre: "Campera Rompeviento Urbana", descripcion: "Rompeviento liviano que se guarda en su propio bolsillo.", marcaId: M(3), categoriaId: C(4), genero: "UNISEX", precio: 99990, imagen: IMG.campera }),
  sintetico(12, { nombre: "Remera Algodón Mujer", descripcion: "Remera de algodón peinado, corte recto.", marcaId: M(5), categoriaId: C(4), genero: "MUJER", precio: 24990, imagen: null }),
  sintetico(13, { nombre: "Buzo Canguro Niños", descripcion: "Buzo canguro de friza, con bolsillo frontal.", marcaId: M(5), categoriaId: C(4), genero: "NINO", precio: 38990, imagen: null }),
  sintetico(14, { nombre: "Carpa 4 Personas", descripcion: "Carpa familiar de 4 personas con vestíbulo para el equipo.", marcaId: M(3), categoriaId: C(5), genero: "UNISEX", precio: 139990, imagen: IMG.carpa }),
  sintetico(15, { nombre: "Carpa Ultraliviana 1 Persona", descripcion: "Carpa de 1,5 kg para trekking de varios días.", marcaId: M(2), categoriaId: C(5), genero: "UNISEX", precio: 249990, imagen: IMG.carpa }),
  sintetico(16, { nombre: "Bolsa de Dormir -5°C", descripcion: "Bolsa de dormir momia para temperaturas bajo cero.", marcaId: M(3), categoriaId: C(5), genero: "UNISEX", precio: 74990, imagen: null }),
  sintetico(17, { nombre: "Mochila Urbana 25L", descripcion: "Mochila urbana con compartimento para notebook.", marcaId: M(3), categoriaId: C(6), genero: "UNISEX", precio: 45990, imagen: IMG.mochila }),
  sintetico(18, { nombre: "Mochila de Hidratación 12L", descripcion: "Mochila liviana con reservorio de agua, para trail y bici.", marcaId: M(1), categoriaId: C(6), genero: "UNISEX", precio: 68990, imagen: IMG.mochila }),
  sintetico(19, { nombre: "Casco Ruta Aero", descripcion: "Casco aerodinámico de ruta, liviano y ventilado.", marcaId: M(1), categoriaId: C(7), genero: "UNISEX", precio: 85990, imagen: IMG.casco }),
  sintetico(20, { nombre: "Casco Infantil", descripcion: "Casco para chicos con ajuste fácil en la nuca.", marcaId: M(1), categoriaId: C(7), genero: "NINO", precio: 29990, imagen: IMG.casco })
];

export const PRODUCTOS_PRUEBA: ProductoDePrueba[] = [...REALES, ...INVENTADOS];

// Minúsculas y sin tildes: "campera" tiene que encontrar "Campéra", y
// "termica" tiene que encontrar "Térmica".
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// La categoría pedida y todas las que cuelgan de ella (hijas, nietas...):
// filtrar por "Ropa" tiene que traer también lo de "Ropa deportiva".
function idsConDescendientes(categoriaId: string, categorias: OpcionCategoria[]): Set<string> {
  const ids = new Set([categoriaId]);
  let agregoAlguno = true;
  while (agregoAlguno) {
    agregoAlguno = false;
    for (const c of categorias) {
      if (c.padreId !== null && ids.has(c.padreId) && !ids.has(c.id)) {
        ids.add(c.id);
        agregoAlguno = true;
      }
    }
  }
  return ids;
}

// IMPLEMENTACIÓN DE REFERENCIA DEL CONTRATO de GET /api/productos.
//
//  - q: todas las palabras tienen que aparecer (en cualquier orden) en el
//    nombre, la marca, la categoría o la descripción; sin distinguir
//    mayúsculas ni tildes, y por contenido ("camp" encuentra "Campera").
//  - Los filtros se combinan con Y: un producto tiene que cumplirlos todos.
//  - categoriaId incluye las categorías hijas. precioMin/precioMax son
//    inclusivos; si el mínimo es mayor que el máximo, no hay resultados.
//  - Orden: nombre (A-Z), precio_asc o precio_desc. El empate se desempata
//    siempre igual (por nombre y después por id) para que las páginas sean
//    estables: sin eso un producto podría repetirse o saltearse entre página
//    y página.
//  - pagina empieza en 1. Una página más allá de la última devuelve
//    `contenido` vacío (no es un error) con los totales reales.
//  - tamanio se acota entre 1 y 48. totalPaginas es 0 si no hay resultados.
export function consultarCatalogo(
  filtros: FiltrosDeCatalogo,
  tamanio: number = TAMANIO_PAGINA,
  productos: ProductoDePrueba[] = PRODUCTOS_PRUEBA,
  categorias: OpcionCategoria[] = CATEGORIAS_PRUEBA,
  marcas: OpcionMarca[] = MARCAS_PRUEBA
): Pagina<ProductoResumen> {
  const tam = Math.min(48, Math.max(1, Math.floor(tamanio)));
  const pagina = Math.max(1, Math.floor(filtros.pagina));
  const palabras = filtros.q ? normalizar(filtros.q).split(/\s+/).filter(Boolean) : [];
  const categoriasValidas = filtros.categoriaId ? idsConDescendientes(filtros.categoriaId, categorias) : null;

  const nombreMarca = (id: string) => marcas.find((m) => m.id === id)?.nombre ?? "";
  const nombreCategoria = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? "";

  const coinciden = productos.filter((p) => {
    if (categoriasValidas && !categoriasValidas.has(p.categoriaId)) return false;
    if (filtros.marcaId && p.marcaId !== filtros.marcaId) return false;
    if (filtros.genero && p.genero !== filtros.genero) return false;
    if (filtros.precioMin !== undefined && p.precio < filtros.precioMin) return false;
    if (filtros.precioMax !== undefined && p.precio > filtros.precioMax) return false;
    if (palabras.length > 0) {
      const texto = normalizar([p.nombre, nombreMarca(p.marcaId), nombreCategoria(p.categoriaId), p.descripcion].join(" "));
      if (!palabras.every((palabra) => texto.includes(palabra))) return false;
    }
    return true;
  });

  const porNombre = (a: ProductoDePrueba, b: ProductoDePrueba) =>
    a.nombre.localeCompare(b.nombre, "es") || a.id.localeCompare(b.id);
  const ordenadas = [...coinciden].sort((a, b) => {
    if (filtros.orden === "precio_asc") return a.precio - b.precio || porNombre(a, b);
    if (filtros.orden === "precio_desc") return b.precio - a.precio || porNombre(a, b);
    return porNombre(a, b);
  });

  const inicio = (pagina - 1) * tam;
  return {
    contenido: ordenadas.slice(inicio, inicio + tam).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      marca: nombreMarca(p.marcaId),
      categoria: nombreCategoria(p.categoriaId),
      precio: p.precio,
      imagenPrincipal: p.imagen
    })),
    pagina,
    tamanio: tam,
    totalElementos: ordenadas.length,
    totalPaginas: Math.ceil(ordenadas.length / tam)
  };
}

// Detalle de un producto INVENTADO (d1000000-...), para que sus tarjetas
// abran una página que funcione. Los productos reales (d0000000-...) no pasan
// por acá: su detalle sale del backend. Los ids de variante son inventados,
// así que agregar uno de estos al carrito sirve para probar la pantalla, pero
// comprarlo fallaría en el backend real (no conoce esa variante).
export function detalleDePrueba(id: string): ProductoDetalle | null {
  const p = INVENTADOS.find((x) => x.id === id);
  if (!p) return null;

  const nn = p.id.slice(-2);
  const usaTalles = p.categoriaId === C(3) || p.categoriaId === C(4);
  const variantes = usaTalles
    ? [
        { talla: "S", stock: 5 },
        { talla: "M", stock: 8 },
        { talla: "L", stock: 0 }
      ]
    : [{ talla: null, stock: 10 }];

  return {
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    marca: MARCAS_PRUEBA.find((m) => m.id === p.marcaId)?.nombre ?? "",
    categoria: CATEGORIAS_PRUEBA.find((c) => c.id === p.categoriaId)?.nombre ?? "",
    genero: p.genero,
    precio: p.precio,
    variantes: variantes.map((v, i) => ({
      id: `e1000000-0000-0000-00${nn}-0000000000${String(i + 1).padStart(2, "0")}`,
      sku: `PRUEBA-${nn}-${i + 1}`,
      talla: v.talla,
      color: null,
      stock: v.stock,
      controlaStock: true
    })),
    imagenes: p.imagen ? [p.imagen] : []
  };
}
