# LegalTech Ecuador

Plataforma de asistencia legal inteligente con IA para el marco jurídico ecuatoriano.

## Arquitectura

```
legaltech-ecuador/
├── backend/        # API REST - Spring Boot 3.4 + Java 21
├── frontend/       # App móvil/web - Flutter
├── admin/          # Panel administrativo - Next.js + React
└── docs/           # Documentación
```

## Stack Tecnológico

| Componente | Tecnología |
|------------|-----------|
| **Backend** | Spring Boot 3.4, Java 21, JPA, Spring Security |
| **Frontend** | Flutter (Android, iOS, Web) |
| **Admin** | Next.js, React, TanStack Query, Tailwind CSS |
| **Base de datos** | PostgreSQL (Supabase) |
| **Autenticación** | Supabase Auth (OAuth2 JWT) |
| **IA** | Google Gemini 2.5 Flash |

## Requisitos

- **Java 21** (backend)
- **Maven 3.9+** (backend)
- **Flutter 3.x** (frontend)
- **Node.js 18+** (admin)

## Configuración

### Variables de entorno

Copiar `.env.example` a `.env` en cada proyecto y completar:

**Backend** (`backend/.env`):
```env
DB_HOST=
DB_PORT=
DB_NAME=
DB_USERNAME=
DB_PASSWORD=
SUPABASE_JWT_ISSUER=
GEMINI_API_KEY=
```

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

Corre en `http://localhost:8080`

### Frontend

```bash
cd frontend
flutter pub get
flutter run
```

### Admin

```bash
cd admin
npm install
npm run dev
```

Corre en `http://localhost:3000`

## Licencia

Privado - Todos los derechos reservados.
