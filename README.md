# Innovatech Backend

Backend de la aplicación Innovatech Chile, desarrollado con Node.js y Express, conectado a una base de datos MySQL. Desplegado en AWS EC2 mediante contenedores Docker con pipeline CI/CD en GitHub Actions.

## Tecnologias utilizadas

- Node.js 18
- Express.js
- MySQL 8.0
- Docker y Docker Compose
- GitHub Actions (CI/CD)
- Amazon EC2

## Arquitectura

La aplicacion se despliega en 3 instancias EC2 separadas:

- Innovatech_Frontend (172.31.0.176) - Contenedor React/nginx
- Innovatech_Backend (172.31.11.126) - Contenedor Node.js/Express
- Innovatech_BD (172.31.3.198) - Contenedor MySQL

## Estructura del proyecto

## Dockerfile

Se utiliza un Dockerfile multi-stage para optimizar el tamano de la imagen final:

- Stage 1 (builder): instala las dependencias de produccion
- Stage 2 (production): copia solo lo necesario, crea usuario no root por seguridad

## Docker Compose

El archivo docker-compose.yml levanta el servicio backend apuntando a la base de datos en su instancia dedicada mediante IP privada.

Variables de entorno configuradas:
- DB_HOST: IP privada de la instancia Innovatech_BD
- DB_USER: usuario de la base de datos
- DB_PASSWORD: contrasena de la base de datos
- DB_NAME: nombre de la base de datos
- PORT: puerto del servidor

## Persistencia de datos

La base de datos MySQL utiliza un named volume (mysql_data) definido en el docker-compose.yml de la instancia Innovatech_BD. Se eligio named volume sobre bind mount porque es gestionado directamente por Docker, es mas portable y no depende de la estructura de directorios del host.

## Pipeline CI/CD

El pipeline se activa automaticamente con cada push a la rama deploy y ejecuta los siguientes pasos:

1. Checkout del codigo
2. Login a Docker Hub
3. Build y push de la imagen a Docker Hub
4. Deploy automatico en la instancia EC2 via SSH

Secrets configurados en GitHub Actions:
- DOCKERHUB_USERNAME
- DOCKERHUB_TOKEN
- EC2_BACKEND_HOST
- EC2_SSH_KEY

## Endpoints disponibles

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | /api/health | Estado del servidor |
| GET | /api/productos | Listar productos |
| POST | /api/productos | Crear producto |

## Como ejecutar localmente

1. Clonar el repositorio
```bash
git clone https://github.com/ByBenjita/innovatech-backend.git
cd innovatech-backend
```

2. Levantar los contenedores
```bash
docker-compose up -d
```

3. Verificar que funciona
```bash
curl http://localhost:3001/api/health
```

## Como ejecutar en EC2

1. Conectarse a la instancia via EC2 Instance Connect
2. Crear el archivo docker-compose.yml con las variables de entorno correctas
3. Ejecutar:
```bash
docker-compose up -d
```

## Principios DevOps aplicados

- Contenedorizacion con Docker para garantizar consistencia entre entornos
- Pipeline CI/CD automatizado con GitHub Actions
- Gestion de secrets para credenciales sensibles
- Control de versiones con Git y ramas especificas por ambiente
- Persistencia de datos con volumenes Docker
- Usuario no root en contenedores para seguridad
- Multi-stage build para reducir tamano de imagen