# 🔥 Configuración de Firebase para Haleon Quality Agent

## ✅ Sistema Implementado

El proyecto ahora usa **Firebase Firestore** para almacenar las sesiones de chat en la nube, con fallback automático a localStorage.

### Características:
- ☁️ **Sincronización en la nube** con Firebase Firestore
- 🔄 **Backup automático** en localStorage
- 🔒 **IDs anónimos** de usuario (sin login requerido)
- ⚡ **Carga rápida** con queries optimizadas
- 📱 **Acceso desde cualquier dispositivo**
- 💾 **Hasta 50 sesiones** guardadas por usuario

---

## 🚀 Pasos para Configurar Firebase

### 1. Crear Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en **"Agregar proyecto"**
3. Nombre del proyecto: `haleon-quality` (o el que prefieras)
4. Desactiva Google Analytics (opcional para este proyecto)
5. Haz clic en **"Crear proyecto"**

### 2. Crear Base de Datos Firestore

1. En el menú lateral, ve a **"Firestore Database"**
2. Haz clic en **"Crear base de datos"**
3. Selecciona **"Modo de producción"** (configuraremos las reglas después)
4. Selecciona una ubicación cercana (ej: `us-central1` o `southamerica-east1` para Argentina)
5. Haz clic en **"Habilitar"**

### 3. Configurar Reglas de Seguridad

En Firestore Database > Reglas, reemplaza las reglas por defecto con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir que cada usuario acceda solo a sus propias sesiones
    match /users/{userId}/sessions/{sessionId} {
      allow read, write: if true; // Para desarrollo
      // Para producción, usa:
      // allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Publica** las reglas haciendo clic en **"Publicar"**.

### 4. Obtener Credenciales

1. Ve a **Project Settings** (⚙️ en el menú lateral)
2. Scroll down hasta **"Tus apps"**
3. Haz clic en el icono **Web** (`</>`)
4. Registra la app con el nombre: `Haleon Quality Web`
5. **NO marques** "También configurar Firebase Hosting"
6. Copia los valores de configuración que aparecen

### 5. Configurar Variables de Entorno

Abre el archivo `.env.local` y reemplaza los valores:

```env
OPENAI_API_KEY=tu-openai-api-key-aqui

# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto-id
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123def456
```

### 6. Instalar Dependencias

```bash
npm install
```

### 7. Ejecutar el Proyecto

```bash
npm run dev
```

---

## 📊 Estructura de Datos en Firestore

```
/users
  /{userId}
    /sessions
      /{sessionId}
        - title: string
        - transcripts: array
          - id: string
          - role: 'user' | 'model'
          - text: string
          - timestamp: Timestamp
        - createdAt: Timestamp
        - updatedAt: Timestamp
```

### Ejemplo de Documento:

```javascript
{
  "title": "¿Cómo validar un lote de Sensodyne?",
  "transcripts": [
    {
      "id": "user-1704567890123",
      "role": "user",
      "text": "¿Cómo validar un lote de Sensodyne?",
      "timestamp": Timestamp(2024-01-06 10:30:00)
    },
    {
      "id": "model-1704567891234",
      "role": "model",
      "text": "Para validar un lote de Sensodyne...",
      "timestamp": Timestamp(2024-01-06 10:30:05)
    }
  ],
  "createdAt": Timestamp(2024-01-06 10:30:00),
  "updatedAt": Timestamp(2024-01-06 10:35:00)
}
```

---

## 💰 Costos de Firebase (Plan Gratuito)

| Servicio | Límite Gratuito | Suficiente para |
|----------|----------------|-----------------|
| **Firestore** | | |
| - Lecturas | 50,000/día | ~1,600 usuarios/día |
| - Escrituras | 20,000/día | ~650 usuarios/día |
| - Eliminaciones | 20,000/día | Más que suficiente |
| - Almacenamiento | 1 GB | ~200,000 sesiones |
| **Ancho de banda** | 10 GB/mes | Uso normal |

### Estimación de Uso:
- **Cargar historial**: 1 lectura por sesión
- **Guardar mensaje**: 1 escritura
- **Sesión típica**: ~10-20 mensajes = 10-20 escrituras
- **Usuario activo/día**: ~3-5 sesiones = ~100 lecturas + 50 escrituras

**El plan gratuito es suficiente para:**
- ✅ 500-1000 usuarios activos al mes
- ✅ Prototipo y pruebas
- ✅ Despliegue inicial

---

## 🔒 Seguridad

### Para Desarrollo (Actual):
```javascript
allow read, write: if true;
```
✅ Cualquiera puede leer/escribir (solo para desarrollo)

### Para Producción (Recomendado):

#### Opción 1: Con Autenticación Anónima
1. Habilita **Authentication** > **Anonymous** en Firebase Console
2. Actualiza las reglas:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/sessions/{sessionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Actualiza `firebase.ts`:
```typescript
import { getAuth, signInAnonymously } from 'firebase/auth';

const auth = getAuth(app);

// Auto-login anónimo
signInAnonymously(auth).catch((error) => {
  console.error('Error en auth anónimo:', error);
});
```

#### Opción 2: Sin Autenticación (Solo validación básica)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/sessions/{sessionId} {
      // Validar que el userId sea una cadena válida
      allow read: if userId.matches('^user-[0-9]+-[a-z0-9]+$');
      allow write: if userId.matches('^user-[0-9]+-[a-z0-9]+$')
                   && request.resource.data.keys().hasAll(['title', 'transcripts', 'createdAt', 'updatedAt']);
    }
  }
}
```

---

## 🐛 Troubleshooting

### Error: "Missing or insufficient permissions"
- Verifica que las reglas de Firestore estén publicadas
- Asegúrate de que el userId coincida con el formato esperado

### Error: "Failed to get document because the client is offline"
- El hook tiene fallback automático a localStorage
- Verifica tu conexión a internet
- Firebase funciona offline y sincroniza cuando vuelve la conexión

### Las sesiones no se cargan
1. Verifica las variables en `.env.local`
2. Abre la consola del navegador y busca errores
3. Revisa Firebase Console > Firestore Database para ver si hay datos
4. Verifica que el proyecto esté en el plan Blaze (si superas el límite gratuito)

### Cambiar de localStorage a Firebase
- El sistema migra automáticamente
- Las sesiones existentes en localStorage se mantienen como respaldo
- Las nuevas sesiones se crean en Firebase

---

## 📈 Monitoreo

### Firebase Console
Ve a **Firestore Database** > **Usage** para ver:
- Lecturas/Escrituras por día
- Almacenamiento usado
- Ancho de banda

### Logs
Abre la consola del navegador para ver:
- Éxito/Error de operaciones Firebase
- Fallback a localStorage
- Tiempos de carga

---

## 🚀 Despliegue

### Vercel
```bash
vercel
```

Configura las variables de entorno en Vercel Dashboard:
- `VITE_OPENAI_API_KEY`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- etc.

### Netlify
```bash
netlify deploy --prod
```

Configura las variables en Netlify Dashboard > Site Settings > Environment Variables

---

## 🔄 Backup y Migración

### Exportar Sesiones
```javascript
// En la consola del navegador:
const sessions = JSON.parse(localStorage.getItem('haleon_chat_sessions'));
console.log(JSON.stringify(sessions, null, 2));
```

### Importar Sesiones a Firebase
Usa Firebase Console > Firestore Database > Import/Export

---

## 📚 Recursos

- [Firebase Docs](https://firebase.google.com/docs)
- [Firestore Quickstart](https://firebase.google.com/docs/firestore/quickstart)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Pricing](https://firebase.google.com/pricing)
