# Conexión InSite (TPV Get Checkout ES) — Funcionamiento y Guía

## Funcionamiento

El objetivo principal es disponer de un proceso de pago **rápido**, **sencillo** e **integrado**, totalmente adaptado al diseño del comercio online, fácil de usar e integrar, y que mantenga la **seguridad** de los datos de pago introducidos por el cliente.  
Con InSite, el comercio evita tener que asumir procesos costosos asociados al cumplimiento de la normativa **PCI DSS**, ya que los datos sensibles de tarjeta **no son accesibles** para el servidor del comercio (ni para terceros que hayan comprometido el servidor).

Redsys facilita las “piezas” (campos) del formulario de pago para integrarlas **uno a uno** como elementos incrustados en el checkout, con **estilos configurables** para alinearlos con el diseño del sitio.

---

## Flujo general de una operación con InSite

1. El comercio presenta el formulario de pago al titular.
2. Redsys completa el formulario del comercio con los campos de captura de datos de tarjeta.
3. El titular introduce sus datos de tarjeta y acepta el pago.  
   Los datos se envían a Redsys **sin pasar por el servidor del comercio**.
4. Redsys genera un **ID de operación** (*) y se lo informa al comercio.
5. El comercio lanza la operación de pago mediante una conexión **REST** usando el ID de operación recibido.

> **Nota:** El ID de operación tiene una validez de **30 minutos** desde su generación.

**Resumen operativo:**  
El cliente introduce los datos de tarjeta en el *iframe* incrustado en la web del comercio. Se procesa la petición a través del TPV Get Checkout ES, que devuelve un **ID de operación**. Con ese ID, el comercio envía la petición de pago.  
Esta petición se puede enviar **en el mismo momento** o enviarse **posteriormente**, ya que la validez del ID también se indica como de **7 días** (ej.: verificar stock antes de hacer el cargo).

---

## Ventajas

- Experiencia de pago sencilla y satisfactoria: integrada en la web del comercio y **sin saltos** de navegación.
- Mayor control del flujo de checkout y pago: las peticiones se realizan de forma **síncrona** por parte del servidor del comercio, sin procesos asíncronos de “escucha”.
- Facilidad de integración.
- Alto nivel de seguridad, similar a una solución con redirección a página externa.

En definitiva: permite un checkout totalmente integrado y más flexibilidad, separando los pasos de **captura de datos** y **ejecución de la operación**.

---

## Creación del iFrame

### 1) Incluir el JavaScript de Redsys

Se debe incluir el fichero JavaScript alojado por Redsys (varía según entorno):

> **Importante:** todos los parámetros que se pasan a las llamadas JavaScript deben ser **strings** (cadenas).  
> Si se envían como `int` u otro tipo, se recibirá un error.

```html
<!-- Test -->
<script src="https://sis-t.redsys.es:25443/sis/NC/sandbox/redsysV3.js"></script>

<!-- Real -->
<script src="https://sis.redsys.es/sis/NC/redsysV3.js"></script>
```

### 2) Elegir alternativa de integración

- **Integración unificada (todo en uno):** un único iframe con número de tarjeta, caducidad, CVV y botón.  
  Responsive, estilos CSS personalizables, ayudas interactivas y validación de formatos.
- **Integración por elementos independientes:** cada campo se incrusta por separado.  
  Permite control total de diseño, posición y gestión de errores.

---

## Integración unificada (todo en uno)

En esta modalidad se genera **un único iframe** con el formulario completo (incluye reconocimiento de marca y verificaciones de formato).

### 1) Crear el contenedor

```html
<div id="card-form"/>
```

### 2) Añadir campos ocultos para recibir el token o el error

```html
<input type="hidden" id="token"></input>
<input type="hidden" id="errorCode"></input>
```

### 3) Listener para recoger el ID de operación (token) o el error

Se define una función de validación propia y un *listener* que delega el almacenamiento del ID de operación con `storeIdOper()`.

```html
<script>
  function merchantValidationEjemplo(){
    // Insertar validaciones…
    return true;
  }

  // Listener de recepción de ID de operación
  window.addEventListener("message", function receiveMessage(event) {
    storeIdOper(event, "token", "errorCode", merchantValidationEjemplo);
  });
</script>
```

---

## Generación del formulario unificado (iFrame)

Hay dos funciones disponibles:

- `getInSiteForm(...)`: parámetros posicionales.
- `getInSiteFormJSON(...)`: parámetros en JSON (permite enviar solo lo necesario).

### Estilos disponibles (CSS)

- `estiloBoton`: personalización completa del botón de pago.
- `estiloBody`: fondo, color o estilo de textos.
- `estiloCaja`: fondo de la caja de introducción y color de *placeholder*.
- `estiloInputs`: tipografía, color de texto, etc.

Además, se puede personalizar:
- `buttonValue` (texto del botón)
- `fuc`, `terminal`, `merchantOrder` (pedido) en la carga del iframe.

### 1) Petición clásica

```js
// Petición de carga de iframe clásica
getInSiteForm(
  idContenedor,
  estiloBoton,
  estiloBody,
  estiloCaja,
  estiloInputs,
  buttonValue,
  fuc,
  terminal,
  merchantOrder,
  idiomaInsite,
  mostrarLogo,
  estiloReducido,
  estiloInsite
);

// Ejemplo
getInSiteForm(
  "card-form",
  "",
  "",
  "",
  "",
  "Texto botón pago",
  "123456789",
  "1",
  "ped4227",
  "ES",
  true,
  false,
  "twoRows"
);
```

### 2) Petición JSON

```js
var insiteJSON = {
  "id": "card-form",
  "fuc": "123456789",
  "terminal": "1",
  "order": "ped4227",
  "estiloInsite": "inline"
};

getInSiteFormJSON(insiteJSON);
```

### Parámetros opcionales (en la carga del iFrame)

- **Idioma (`idiomaInsite`)**: textos del formulario. Acepta código **SIS** o **ISO 639-1**.  
  Si no se indica o es incorrecto, el idioma por defecto es **Castellano**.
- **Logo entidad (`mostrarLogoInsite`)**: `true/false` (por defecto `true`).
- **Estilo reducido (`estiloReducidoInsite`)**: ancho reducido (`true/false`, por defecto `false`).
- **Estilo InSite (`estiloInsite`)**: `inline` o `twoRows` (por defecto `inline`).

---

## Parámetros JSON (tabla)

| Parámetro              | Req. | Valores             | Por defecto |
|------------------------|:---:|---------------------|------------|
| `id`                   | Sí  | —                   | —          |
| `fuc`                  | Sí  | —                   | —          |
| `terminal`             | Sí  | —                   | —          |
| `order`                | Sí  | —                   | —          |
| `styleButton`          | No  | Estilo CSS          | `""`       |
| `styleBody`            | No  | Estilo CSS          | `""`       |
| `styleBox`             | No  | Estilo CSS          | `""`       |
| `styleBoxText`         | No  | Estilo CSS          | `""`       |
| `buttonValue`          | No  | Texto botón pago    | `Pagar`    |
| `idiomaInsite`         | No  | Catálogo de idiomas | `ES`       |
| `mostrarLogoInsite`    | No  | `true`, `false`     | `true`     |
| `estiloReducidoInsite` | No  | `true`, `false`     | `false`    |
| `estiloInsite`         | No  | `inline`, `twoRows` | `inline`   |

---

## Solicitud de la operación (autorización) vía REST

Una vez recibido y almacenado el **ID de operación** (`token`), el comercio debe lanzar la operación de autorización mediante una petición **REST**.

- En la operación se debe enviar:
  - `DS_MERCHANT_IDOPER` = valor del `token` (en lugar de campos de tarjeta)
  - `DS_MERCHANT_ORDER` = el mismo número de pedido usado en la generación del `idOper`

Se mencionan librerías de ayuda para la conexión REST (Java y PHP).

---

## Ejemplo completo de integración simple

```html
<html>
<head>
  <script src="https://sis-t.redsys.es:25443/sis/NC/sandbox/redsysV3.js"></script>
</head>

<body>
  <div id="card-form" />
  <form name="datos">
    <input type="hidden" id="token"></input>
    <input type="hidden" id="errorCode"></input>
    <a href="javascript:alert(document.datos.token.value + '--' + document.datos.errorCode.value)">ver</a>
  </form>

  <script>
    function merchantValidationEjemplo() {
      // Insertar validaciones…
      alert("Esto son validaciones propias");
      return true;
    }

    // Listener de recepción de ID de operación
    window.addEventListener("message", function receiveMessage(event) {
      storeIdOper(event, "token", "errorCode", merchantValidationEjemplo);
    });

    function pedido() {
      return "pedido" + Math.floor((Math.random() * 1000) + 1);
    }

    var insiteJSON = {
      "id": "card-form",
      "fuc": "999008881",
      "terminal": "1",
      "order": pedido(),
      "estiloInsite": "twoRows"
    };

    getInSiteFormJSON(insiteJSON);
  </script>
</body>
</html>
```

---

## Errores más comunes

1) **`idOper = -1`**  
   Indica que el número de pedido está repetido. Hay que garantizar que `order` sea único (p. ej. incrementando o usando un identificador único).

2) **Devuelve “Error”**  
   Suele ocurrir por enviar parámetros que no son **strings**.

3) **El iFrame no se pinta**  
   Puede deberse a que el dominio donde se integra InSite no está permitido en el portal de administración del TPV. Hay que autorizarlo.

### Errores de validación al generar el iFrame

| Error  | Descripción |
|--------|-------------|
| `msg1` | Ha de rellenar los datos de la tarjeta |
| `msg2` | La tarjeta es obligatoria |
| `msg3` | La tarjeta ha de ser numérica |
| `msg4` | La tarjeta no puede ser negativa |
| `msg5` | El mes de caducidad es obligatorio |
| `msg6` | El mes de caducidad ha de ser numérico |
| `msg7` | El mes de caducidad es incorrecto |
| `msg8` | El año de caducidad es obligatorio |
| `msg9` | El año de caducidad ha de ser numérico |
| `msg10`| El año de caducidad no puede ser negativo |
| `msg11`| Longitud incorrecta del código de seguridad |
| `msg12`| El código de seguridad ha de ser numérico |
| `msg13`| El código de seguridad no puede ser negativo |
| `msg14`| El código de seguridad no es necesario para su tarjeta |
| `msg15`| La longitud de la tarjeta no es correcta |
| `msg16`| Introducir un número de tarjeta válido (sin espacios ni guiones) |
| `msg17`| Validación incorrecta por parte del comercio |

---

## Catálogo de idiomas

| Idioma      | Código (SIS) | ISO 639-1 |
|------------|:------------:|:---------:|
| Español    | 1            | ES        |
| Inglés     | 2            | EN        |
| Catalán    | 3            | CA        |
| Francés    | 4            | FR        |
| Alemán     | 5            | DE        |
| Neerlandés | 6            | NL        |
| Italiano   | 7            | IT        |
| Sueco      | 8            | SV        |
| Portugués  | 9            | PT        |
| Valenciano | 10           | VA        |
| Polaco     | 11           | PL        |
| Gallego    | 12           | GL        |
| Euskera    | 13           | EU        |
| Búlgaro    | 100          | BG        |
| Chino      | 156          | ZH        |
| Croata     | 191          | HR        |
| Checo      | 203          | CS        |
| Danés      | 208          | DA        |
| Estonio    | 233          | ET        |
| Finlandés  | 246          | FI        |
| Griego     | 300          | EL        |
| Húngaro    | 348          | HU        |
| Indio      | 356          | HI        |
| Japonés    | 392          | JA        |
| Coreano    | 410          | KO        |
| Letón      | 428          | LV        |
| Lituano    | 440          | LT        |
| Maltés     | 470          | MT        |
| Rumano     | 642          | RO        |
| Ruso       | 643          | RU        |
