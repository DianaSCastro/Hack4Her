# 👩‍💻 Hack4Her 2026 Edition 
¡Bienvenidas al repositorio oficial de **Bytes & Babes**! Aquí construiremos nuestro proyecto para el hackathon. Para trabajar de forma ordenada utilizaremos una estrategia de Git basada en **Ramas por Nombre**.

---

## Arquitectura de Ramas

* 🛡️ **`main`**: La rama sagrada. Aquí solo vive el código final, estable y 100% funcional. De aquí se presentará el proyecto a los jueces.
* 🤝 **`develop`**: Nuestro punto de encuentro. Aquí iremos fusionando el trabajo de las 4 para integrar el sistema.
* 💻 **`dev-[tu-nombre]`**: Tu espacio seguro basicamente. Aquí creas tus archivos, rompes el código, pruebas librerías y avanzas en tus módulos sin miedo a afectar a las demás.

---

## Flujo de Trabajo

Cada vez que vayas a programar una nueva función o script, sigue estos pasos:

### 0. Clona el repositorio
https://github.com/DianaSCastro/Hack4Her.git

### 1. Mantén tu rama actualizada
Antes de empezar a escribir, asegúrate de traer lo que tus compañeras ya fusionaron en `develop` para evitar conflictos:

git checkout dev-[tu-nombre]
git merge develop

### 2. Programa y guarda tus cambios de forma local
Haz commits pequeños y seguidos con mensajes claros:

git add .
git commit -m "Estructura inicial del procesamiento de datos"

### 3. Sube tus cambios a GitHub

git push origin dev-[tu-nombre]


## ¿Cómo hacer un Pull Request (PR) correcto?

Cuando tu funcionalidad ya corra perfectamente en tu computadora, es hora de enviarla al punto de encuentro (develop).
Ve a la página del repositorio en GitHub.

**Haz clic en New Pull Request.**

**⚠️ ¡¡CRUCIAL!! ⚠️** Por defecto, GitHub intentará apuntar a main. **Debes cambiar manualmente la rama de destino en las pestañas superiores para que quede exactamente así:**

**base:** develop ⬅️ **compare:** dev-[tu-nombre]

Avisa al equipo por el grupo: "¡Girrllsss, subí el PR de mi módulo, quién me lo revisa y le da merge!".

