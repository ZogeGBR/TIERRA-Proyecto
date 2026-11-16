# Tierra — infraestructura local

Esta carpeta tiene la base de datos de desarrollo: **PostgreSQL 16 en Docker**.
El backend y el frontend corren en tu máquina, fuera de Docker.

La guía completa para levantar el proyecto (variables de entorno, backend,
frontend, usuarios de prueba y scripts de verificación) está en
[CONTRIBUTING.md §6](../CONTRIBUTING.md#6-levantar-el-proyecto-en-local).
Acá está sólo lo que corresponde a esta carpeta.

## Qué hay

| Archivo | Para qué |
|---|---|
| `docker-compose.yml` | Sólo PostgreSQL (contenedor `tierra-postgres`, puerto 5432). **Es el que se usa para desarrollar.** |
| `stack/` | Base + backend + frontend en contenedores, para mostrar el sistema en una máquina sin Java ni Node. No se usa para desarrollar. Ver [`stack/README.md`](stack/README.md). |

Los dos no pueden correr a la vez: comparten los puertos 5432, 8080 y 3000.

## Levantar la base

Con Docker Desktop abierto y el motor corriendo, parado en esta carpeta:

```powershell
docker compose up -d
docker compose logs postgres --tail 5
```

Esperá a ver `database system is ready to accept connections`. La base
arranca **vacía**: las tablas las crea el backend al arrancar, con Flyway, y
los datos de prueba los carga el mismo backend con el perfil `dev`. Esta
carpeta ya no tiene scripts SQL.

| Dato | Valor |
|---|---|
| Base | `tierra` |
| Usuario | `tierra_app` |
| Password | `tierra_dev_local` (la misma que `DB_PASSWORD` en el `.env` de la raíz) |

Desde la raíz del repo se puede hacer lo mismo sin entrar acá:
`npm run db:up`, `npm run db:down`, `npm run db:logs` y `npm run db:reset`.

## Bajarla y resetearla

```powershell
docker compose down       # la baja; los datos se conservan
docker compose down -v    # la baja y BORRA todos los datos (el volumen)
```

No hace falta resetear cada vez que empezás a trabajar: los datos sobreviven
entre reinicios y el backend aplica solo las migraciones nuevas. Cuándo sí
hace falta (por ejemplo, al cambiar a una rama con menos migraciones) está en
[CONTRIBUTING.md §6.7](../CONTRIBUTING.md#67--resetear-la-base-desde-cero).

> ⚠️ `docker compose down -v` **siempre desde esta carpeta** (o con
> `npm run db:reset` desde la raíz). `docker compose` busca el archivo
> subiendo por las carpetas padre: ejecutado en otro lado puede actuar sobre
> otro proyecto.

## Dónde está cada cosa de la base

- **Esquema:** migraciones de Flyway en
  `tierra-backend/src/main/resources/db/migration/`. Para cambiarlo se crea
  una migración nueva; nunca se edita una ya mergeada
  ([CONTRIBUTING.md §7](../CONTRIBUTING.md#7-cambios-en-la-base-de-datos)).
- **Datos de prueba:** `tierra-backend/src/main/resources/db/dev/R__seed_dev.sql`,
  que sólo se carga con el perfil `dev`.
- **Consultar la base a mano:**

  ```powershell
  docker exec -it tierra-postgres psql -U tierra_app -d tierra
  ```
