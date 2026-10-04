# Stack completo en contenedores

Levanta **base, backend y frontend** dentro de Docker, sin necesidad de tener
Java ni Node instalados en la máquina.

## Cuándo usarlo

- Mostrarle el sistema funcionando a alguien que no tiene el entorno armado.
- Que alguien que recién se suma vea el proyecto andando antes de configurar nada.

## Cuándo NO usarlo

**Para desarrollar, no.** Para eso está `tierra-infra/docker-compose.yml`, que
levanta sólo PostgreSQL: el backend y el frontend corren en tu máquina, con
recarga en caliente y depurador. Acá cada cambio obliga a reconstruir la imagen,
que son varios minutos.

## No pueden correr los dos a la vez

Los dos usan los puertos 5432, 8080 y 3000. Antes de levantar el stack hay que
bajar el entorno de desarrollo:

```powershell
cd tierra-infra
docker compose down

cd stack
docker compose up -d --build
```

Y para volver a desarrollar, al revés:

```powershell
cd tierra-infra\stack
docker compose down

cd ..
docker compose up -d
```

La primera construcción tarda varios minutos porque descarga las dependencias
de Maven y de npm. Las siguientes usan la caché.

## Por qué vive en una subcarpeta

`docker compose` busca el archivo subiendo por las carpetas padre. Cuando este
archivo estaba en la raíz del repositorio, ejecutar `docker compose up` desde
cualquier subcarpeta lo encontraba a él en vez del de desarrollo, y construía
todo el stack sin que nadie se lo pidiera. Pasó dos veces.

Acá abajo eso no puede ocurrir: hay que entrar a esta carpeta a propósito.
