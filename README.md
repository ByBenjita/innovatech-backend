# Innovatech Backend

Backend de la aplicación Innovatech Chile (SaborExpress), desarrollado con Node.js y Express, conectado a una base de datos MySQL. Orquestado en un clúster Amazon EKS con pipeline CI/CD en GitHub Actions (build → push a ECR → deploy en el clúster).

## Tecnologías utilizadas
- Node.js 18 (imagen `node:18-alpine`)
- Express.js
- MySQL 8.0
- Docker (build multi-stage)
- Amazon EKS (Kubernetes)
- Amazon ECR (registro de imágenes)
- GitHub Actions (CI/CD)

## Arquitectura

El proyecto evolucionó de un despliegue inicial en 3 instancias EC2 separadas (etapa de contenedorización) a una orquestación completa sobre Kubernetes:

- Clúster **innovatech-eks** (Amazon EKS), 2 nodos t3.medium distribuidos en us-east-1c y us-east-1d, dentro de una VPC unificada (10.1.0.0/16).
- El Backend corre como Deployment con 2 réplicas, expuesto internamente mediante un Service de tipo ClusterIP (`backend-service`).
- MySQL corre como pod dentro del clúster (almacenamiento `emptyDir`, ya que el EBS CSI Driver no está disponible por restricciones IAM del entorno académico).
- La comunicación entre servicios se resuelve vía **DNS interno de Kubernetes** (`backend-service:3001`), no mediante IPs privadas fijas.
- Autoscaling configurado con HPA (min=2, max=6 réplicas, umbral 50% CPU).

## Dockerfile

Build multi-stage para optimizar el tamaño de la imagen final:
- **Stage 1 (builder):** instala las dependencias de producción.
- **Stage 2 (production):** copia solo lo necesario, crea usuario no root (`appuser`) por seguridad.

## Registro de imágenes

Las imágenes se publican en Amazon ECR, etiquetadas con el hash del commit que las originó, lo que permite trazabilidad directa entre el artefacto desplegado y el código fuente.
<account_id>.dkr.ecr.us-east-1.amazonaws.com/innovatech-backend:<commit-sha>


## Pipeline CI/CD

El pipeline (rama `deploy-eks`) se activa con cada push y ejecuta:

1. Checkout del código
2. Instalación de dependencias y ejecución de tests (`npm install && npm test --if-present`)
3. Configuración de credenciales AWS (STS)
4. Build y push de la imagen Docker a Amazon ECR
5. Deploy automático en el clúster EKS (`kubectl set image deployment/backend-deployment ...`)

Secrets configurados en GitHub Actions:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN`
- `EKS_CLUSTER_NAME`

## Endpoints disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/health | Estado del servidor |
| GET | /api/productos | Listar productos |
| POST | /api/productos | Crear producto |

## Cómo ejecutar localmente (desarrollo)

```bash
git clone https://github.com/ByBenjita/innovatech-backend.git
cd innovatech-backend
docker-compose up -d
curl http://localhost:3001/api/health
```

`docker-compose.yml` levanta el backend junto a una instancia MySQL local, para desarrollo y pruebas sin depender del clúster EKS.

## Cómo desplegar en EKS

```bash
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl rollout status deployment/backend-deployment
```

## Principios DevOps aplicados

- Contenedorización con Docker (multi-stage build) para consistencia entre entornos
- Orquestación productiva con Kubernetes (Amazon EKS)
- Autoscaling horizontal (HPA) y self-healing nativo de Kubernetes
- Pipeline CI/CD automatizado con GitHub Actions, incluyendo etapa de test
- Registro de imágenes versionado por commit en Amazon ECR
- Gestión de secretos vía GitHub Secrets y Kubernetes Secrets
- Usuario no root en contenedores por seguridad
- Principio de mínimo privilegio en roles IAM
