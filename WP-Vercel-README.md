# Guía de Integración: App en Vercel + Headless WordPress (WP Engine) usando JSON (REST API)

Esta guía detalla paso a paso cómo conectar una aplicación frontend (típicamente Next.js) alojada en **Vercel** con un backend de **WordPress** alojado en **WP Engine**, utilizando la API REST nativa de WordPress (JSON). También incluye cómo crear campos personalizados (Custom Fields) y consumirlos en el frontend.

---

## Parte 1: Configuración en WP Engine (WordPress)

Para esta integración usaremos la API REST nativa que viene por defecto en WordPress. Solo necesitamos agregar soporte para los campos personalizados.

### 1. Instalar Plugins Necesarios
Accede al panel de administración de tu WordPress en WP Engine e instala y activa los siguientes plugins:
1. **[Advanced Custom Fields (ACF)](https://wordpress.org/plugins/advanced-custom-fields/)** (versión gratuita o Pro): Para crear campos personalizados.
2. **[ACF to REST API](https://wordpress.org/plugins/acf-to-rest-api/)**: Expone automáticamente los campos creados con ACF en la API REST (JSON) de WordPress.

### 2. Crear Campos Personalizados con ACF
1. Ve a **ACF > Grupos de campos** (Field Groups) y haz clic en **Añadir nuevo**.
2. Ponle un título, por ejemplo: `Detalles del Proyecto`.
3. Añade los campos que necesites. Ejemplos:
   * **Tipo**: Texto | **Etiqueta**: `Subtítulo` | **Nombre del campo**: `subtitulo`
   * **Tipo**: Imagen | **Etiqueta**: `Imagen Destacada` | **Nombre del campo**: `imagen_destacada` (selecciona formato de retorno como "URL de la imagen" o "Arreglo de imagen").
4. **Ubicación (Location):** Configura la regla para que el grupo de campos se muestre en el tipo de contenido que desees (por ejemplo: `Tipo de post es igual a Entrada`).
5. **Configuración REST API:**
   * Desplázate hacia abajo hasta los "Ajustes del grupo de campos".
   * Asegúrate de que la opción **"Show in REST API"** esté activada (si tu versión de ACF lo tiene, de lo contrario el plugin *ACF to REST API* lo hará automáticamente).
6. Haz clic en **Guardar cambios**.
7. Ve a crear o editar una Entrada y llena estos nuevos campos con información de prueba.

### 3. Obtener el Endpoint de tu API
La API de WordPress ya está funcionando. Tu endpoint principal será:
`https://tu-sitio.wpengine.com/wp-json`

Para ver tus entradas (posts), la URL será:
`https://tu-sitio.wpengine.com/wp-json/wp/v2/posts`

*(Puedes abrir esta URL directamente en tu navegador para ver el JSON en acción).*

---

## Parte 2: Configuración en Vercel y Frontend (Next.js)

### 1. Variables de Entorno
En tu proyecto local y en el panel de Vercel (en **Settings > Environment Variables**), debes configurar la URL base de tu API de WordPress:

```env
# .env.local
WORDPRESS_API_URL=https://tu-sitio.wpengine.com/wp-json
```

### 2. Realizar la Consulta (Fetch) en el Frontend
Si estás utilizando **Next.js** (App Router), la mejor práctica es hacer un `fetch` hacia tu endpoint JSON. 

Es muy importante añadir el parámetro `?_embed` al final de la URL para que WordPress incluya en el mismo JSON los datos de las imágenes destacadas y el autor.

```javascript
// app/page.jsx (o page.tsx)

// Función para obtener los datos mediante la API REST (JSON)
async function getPosts() {
  // El ?_embed trae la imagen destacada y el autor anidados en el JSON
  const res = await fetch(`${process.env.WORDPRESS_API_URL}/wp/v2/posts?_embed`, {
    // Vercel y Next.js caché (revalidación cada 60 segundos)
    next: { revalidate: 60 }
  });

  const posts = await res.json();
  return posts;
}

// Renderizado en el Frontend
export default async function HomePage() {
  const posts = await getPosts();

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Blog Headless (Vercel + WP Engine) - JSON</h1>
      
      <div style={{ display: 'grid', gap: '2rem', marginTop: '2rem' }}>
        {posts.map((post) => {
          // Extraemos los campos de ACF (vienen dentro del objeto "acf")
          const subtitulo = post.acf?.subtitulo;
          
          // Extraemos la imagen destacada de los datos _embedded
          const imagenUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;

          return (
            <article key={post.id} style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
              <h2>{post.title.rendered}</h2>
              
              {/* Visualizando el Campo Personalizado (Subtítulo) */}
              {subtitulo && (
                <p style={{ color: 'gray', fontStyle: 'italic' }}>
                  {subtitulo}
                </p>
              )}

              {/* Visualizando la Imagen */}
              {imagenUrl && (
                <img 
                  src={imagenUrl} 
                  alt={post.title.rendered}
                  style={{ maxWidth: '100%', height: 'auto', marginTop: '1rem' }}
                />
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
```

---

## Consejos Clave para Vercel + WP Engine

1. **Imágenes:** Si utilizas el componente `<Image>` de Next.js, recuerda agregar el dominio de WP Engine en tu archivo `next.config.js`:
   ```javascript
   module.exports = {
     images: {
       domains: ['tu-sitio.wpengine.com'],
     },
   }
   ```
2. **Caché y Revalidación (ISR):** Para mantener un rendimiento ultra rápido en Vercel, utiliza Incremental Static Regeneration (la propiedad `next: { revalidate: 60 }`). Esto evita llamar a WP Engine en cada visita, protegiendo los recursos de tu servidor WordPress y evitando que se caiga por exceso de peticiones.
3. **Paginación:** Si tienes muchos artículos, la API REST devuelve solo 10 por defecto. Puedes agregar parámetros a la URL como `?per_page=20&page=2` para paginar los resultados.
