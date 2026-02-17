# Extracto técnico del portal Getnet TPV Get Checkout ES para integración InSite

## Alcance y fuentes

Este informe resume y “extrae” (en formato utilizable para integración) el contenido relevante de las páginas del portal de desarrolladores de **TPV Get Checkout ES** necesarias para una integración **InSite** (iframe → `idOper` → REST) y para operativas asociadas: autorización/pago, preautorización, validación de tarjeta, devoluciones, anulaciones, COF/tokenización/1‑Click, DCC, Paygold, MOTO y 3DS/EMV3DS. citeturn0view2turn22view0turn21view3turn23view0turn0view0turn25view0turn24view0turn4view0turn5view3turn20view0turn27view0

Para algunas rutas del dominio `desarrolladores.santandertpv.es` el contenido no fue accesible desde la herramienta, pero existe un “espejo” funcional de esas mismas páginas en el dominio `sis-d.redsys.es/websantander/`, que es el utilizado aquí (por ejemplo: 3DS, devolución, 1‑Click y MOTO). citeturn27view0turn23view0turn24view0turn20view0

Contexto de producto/proveedor: esta pasarela se comercializa en el entorno de entity["company","Banco Santander","bank spain"] vía entity["company","Getnet","payment services santander"], y la mensajería/servidores están referenciados en documentación y endpoints de entity["company","Redsys","payment gateway spain"]. citeturn28view0turn0view2turn27view0turn4view0turn5view3

## Operaciones clave y transaction types

Las páginas de “Funcionalidades” documentan las operaciones mediante el campo de entrada `DS_MERCHANT_TRANSACTIONTYPE` (o `Ds_Merchant_TransactionType` según contexto) y confirman el significado de `Ds_Response`/`DS_RESPONSE` en la respuesta. citeturn0view2turn22view0turn21view3turn23view0turn0view0turn31view0turn30view0

### Mapa operativo mínimo para e‑commerce + membresías

| Operación | TransactionType (entrada) | Respuesta “OK” típica (`Ds_Response`) | Matices operativos relevantes |
|---|---:|---:|---|
| Autorización / Pago “clásico” | `0` | `0000` (rango `0000–0099`) | En InSite se paga enviando `DS_MERCHANT_IDOPER` en lugar de PAN/CVV/exp. citeturn0view2turn31view0 |
| Preautorización | `1` | `0000` (si bloquea correctamente) | Para capturar/confirmar el cargo se requiere una **segunda petición** de confirmación. citeturn12search5turn22view0 |
| Confirmación de preautorización | `2` | `0900` | Debe usar **mismo pedido y terminal** que la preautorización. citeturn22view0turn31view0 |
| Validación de tarjeta | `7` | `0000` | Puede implicar autenticación del titular si el comercio está configurado con método de pago seguro. citeturn21view3 |
| Confirmación de validación | `8` | `0000` | Necesaria “para hacer efectivo el cargo” de la validación; mismo pedido/terminal. citeturn21view1turn21view3 |
| Devolución | `3` | `0900` | Devolución referenciada a una operación previa; se tramita por REST con los datos básicos (importe/moneda/comercio/pedido/terminal). citeturn23view0turn31view0 |
| Anulación de preautorización | `9` | `0400` | Se indica que puede realizarse **hasta 7 días** después de la preautorización original (si no ha sido confirmada). citeturn0view0turn31view0 |
| Anulación de pago | `45` | `0400` | Usa mismo pedido/terminal que el pago original. citeturn0view0turn31view0 |
| Anulación de devolución | `46` | `0400` | Indicada como posible para devoluciones realizadas en los **2 últimos días**. citeturn0view0turn31view0 |
| Anulación de confirmación de autenticación | `47` | `0400` | Operación específica para “confirmación de autenticación”. citeturn0view0turn31view0 |
| Paygold (Get Link&Pay) | `F` | `9998` (fase inicial en ejemplos) | Devuelve `Ds_UrlPago2Fases` con el enlace de pago. citeturn5view3turn30view0 |

Esta tabla se apoya en la documentación específica de Autorización, Preautorización/Confirmación, Validación/Confirmación, Devolución y Anulación, además del glosario oficial de códigos `Ds_Response`. citeturn0view2turn22view0turn21view3turn23view0turn0view0turn31view0

## COF, tokenización, OneClick y pagos MIT

### Qué es COF y por qué importa para “suscripciones”
La página de COF define **Credential‑On‑File (COF)** como operativa en la que el comercio reutiliza credenciales de tarjeta (PAN o PAN tokenizado + caducidad) que el titular autorizó a almacenar y reutilizar, y remarca que su identificación correcta se vuelve crítica con PSD2, especialmente en pagos iniciados por el comercio sin participación del titular (**MIT, Merchant‑Initiated Transactions**), porque **no pueden autenticarse** y podrían ser denegados si no se marcan adecuadamente. citeturn25view0

En el ecosistema de TPV Get Checkout ES, la **tokenización** (referencia de tarjeta) se trata como un tipo concreto de COF: el comercio almacena una **referencia/token** y en pagos futuros envía esa referencia sin enviar PAN/CVV, con la nota explícita de que el sistema almacena “tarjeta y caducidad, nunca CVV2”. citeturn25view0turn6search7

### Parámetros COF relevantes para recurrentes

En la **primera operación** COF se documenta:

- `DS_MERCHANT_COF_INI` para indicar que es la primera transacción (`"S"`). citeturn26view0  
- `DS_MERCHANT_COF_TYPE` para indicar el tipo: `R` (Recurring), `I` (Installments), etc., recomendándose enviarlo para mejorar resultados de autorización, especialmente si hay MIT posteriores. citeturn26view0turn29view5  
- Alternativamente (o además), se puede pedir tokenización con `DS_MERCHANT_IDENTIFIER="REQUIRED"`; el propio texto indica que si se envía `Ds_Merchant_Identifier="REQUIRED"`, `DS_MERCHANT_COF_INI` pasa a ser opcional. citeturn26view0turn29view2

En **operaciones sucesivas** COF, se documenta que:

- `DS_MERCHANT_COF_TXNID` es un identificador devuelto en la primera operación COF y debe enviarse en transacciones sucesivas asociadas a esas credenciales. citeturn25view0turn29view5  
- Para casos antiguos sin TID, se menciona el valor “comodín” `999999999999999`, con advertencia de que su uso futuro podría invalidarse para algunas marcas. citeturn25view0turn25view1  
- Si en la respuesta a una transacción MIT se recibe un nuevo `DS_MERCHANT_COF_TXNID`, debe almacenarse y usarse en sucesivas (en lugar del comodín). citeturn25view0turn25view1  

### Cómo se marca un MIT en este sistema

La guía de COF detalla explícitamente que, para minimizar rechazos en operaciones **MIT** (no hay intervención del titular), deben marcarse como COF sucesivas y como exención MIT usando:

- `DS_MERCHANT_EXCEP_SCA = "MIT"` citeturn25view1turn29view4  
- y adicionalmente `Ds_Merchant_DirectPayment = true` para indicar que son pagos sin intervención del titular y, por tanto, no es posible autenticación. citeturn25view1turn26view2turn29view6  

Esto es el “núcleo” de lo que en prácticas de suscripciones se describe como “MIT recurring”: el comercio inicia los cobros periódicos usando credenciales almacenadas (COF) y marcándolos como MIT para cumplimiento SCA/PSD2 cuando procede. citeturn25view0turn25view1turn29view4

### OneClick y referencia `DS_MERCHANT_IDENTIFIER`

La página de Pago 1‑Click documenta la operativa basada en **referencia**:

- En la primera petición se envía `DS_MERCHANT_IDENTIFIER="REQUIRED"` para generar la referencia y se devuelve la referencia (mismo nombre) y `Ds_ExpiryDate`. citeturn24view0turn29view2  
- En operaciones posteriores se envía la referencia como `DS_MERCHANT_IDENTIFIER` sin datos de tarjeta. citeturn24view0turn29view2  
- La referencia queda válida hasta la caducidad de la tarjeta; llegado ese punto, pasa a ser inválida. citeturn24view0  
- Se describe que `Ds_Merchant_DirectPayment=true` puede usarse como “flag” para no mostrar pantallas adicionales (DCC, fraccionamiento, autenticación) cuando se paga con referencia válida; además, si se fuerza `true`, no se autentican operaciones aunque el comercio esté configurado para ello. citeturn24view0turn29view6  

### Gestión de referencias (borrado)

En COF se incluye una operación de “borrar referencia”, indicando `Ds_Merchant_TransactionType="44"` junto con `Ds_Merchant_Identifier` (la referencia a borrar). citeturn25view0turn26view1

## Autenticación 3DS y EMV3DS

### Flujo EMV3DS para REST/InSite

La página de Autenticación con 3DSecure explica que, salvo en redirección, integrar autenticación del titular implica introducir pasos adicionales en el flujo (documentado especialmente para **conexión REST**), con el esquema:

- `iniciaPeticionREST` para obtener configuración/versión EMV3DS de la tarjeta. citeturn27view0  
- Ejecución opcional de `3DSMethod` para “device data collection”. citeturn27view0  
- `trataPeticionREST` (autorización) enviando `DS_MERCHANT_EMV3DS` con JSON del protocolo (`AuthenticationData`, `protocolVersion`, parámetros del browser, etc.). citeturn27view0turn29view3  
- Respuesta puede ser **Frictionless** (final con `Ds_Response`) o **Challenge** (requiere fase adicional y “confirmación de autorización” con el resultado del challenge). citeturn27view0  

La misma página da los endpoints para la fase “Inicia Petición” en test y real:  
`https://sis-t.redsys.es:25443/sis/rest/iniciaPeticionREST` y `https://sis.redsys.es/sis/rest/iniciaPeticionREST`. citeturn27view0turn28view0

### 3DSMethod: requisitos prácticos

Se detalla que `3DSMethod` se ejecuta en un iframe oculto en el navegador del cliente; el comercio espera notificación de finalización, y en la autorización envía `threeDSCompInd` con:

- `Y` si se completa en menos de 10s  
- `N` si no se completa en 10s (detener espera) citeturn27view0  

### Códigos relevantes cuando hay redirecciones a autenticación (H2H)

El glosario de códigos de error lista, entre otros:

- `8210` operación redirigida a autenticar EMV3DS v2.1.0 (H2H)  
- `8220` operación redirigida a autenticar EMV3DS v2.2.0 (H2H) citeturn31view3  

Y en códigos `Ds_Response` se incluye `0195` como “Requiere autenticación SCA”. citeturn31view0

### Recomendaciones de datos extra EMV3DS v2

En la tabla de parámetros de entrada se recomienda incluir campos adicionales EMV 3DS v2 (por ejemplo Email, homePhone, shipAddrLine1 y campos de `acctInfo`) para mejorar la experiencia de autenticación. citeturn29view3turn32view1

## Funcionalidades complementarias

### Operativa DCC

La página DCC documenta un flujo en **dos peticiones** (para REST o InSite):

- Paso 1 “Inicia petición”: consultar si la tarjeta ofrece DCC aportando `DS_MERCHANT_DCC="Y"`. citeturn4view0turn29view4  
- Paso 2 “Solicitud de autorización” (trata petición): enviar la autorización incluyendo el objeto `DS_MERCHANT_DCC` con datos (por ejemplo moneda/importe DCC). citeturn4view0turn30view0  

Restricciones operativas destacadas:

- hay **un máximo de 1 hora** entre el inicio y la autorización; pasado ese tiempo hay que reiniciar el flujo citeturn4view0  
- se requiere mantener la sesión entre la primera y la segunda llamada (se dan ejemplos del concepto “mantener sesión” en librerías). citeturn4view0  

Para modalidad InSite, los ejemplos incorporan `DS_MERCHANT_IDOPER` en los mensajes (en lugar de PAN/CVV). citeturn4view0turn29view1

### Paygold

Paygold (Get Link&Pay) se describe como pago en dos fases: el comercio genera una solicitud y se envía al cliente un enlace por SMS/email, y el cliente paga entrando en ese enlace. citeturn5view3

Detalles especialmente útiles para diseño de flujos:

- `DS_MERCHANT_TRANSACTIONTYPE="F"` identifica la operación Paygold. citeturn5view3  
- Campos típicos: `DS_MERCHANT_CUSTOMER_MOBILE`, `DS_MERCHANT_CUSTOMER_MAIL`, `DS_MERCHANT_P2F_EXPIRYDATE`, `DS_MERCHANT_CUSTOMER_SMS_TEXT`, `DS_MERCHANT_P2F_XMLDATA`. citeturn5view3turn29view0  
- Se indica que el tiempo de validez del link “no está limitado” por defecto, pero puede configurarse. citeturn5view3  
- La respuesta puede incluir `Ds_UrlPago2Fases` (URL del enlace Paygold). citeturn5view3turn30view0  
- El propio Paygold contempla “Paygold + Generación de Referencia” usando `DS_MERCHANT_IDENTIFIER="REQUIRED"`. citeturn5view3turn29view2  

### MOTO

La página “TPV Get Moto” describe la operativa para ventas telefónicas/correo (cliente no presente), tratadas como “no seguras” y sin autenticación, con dos operaciones: autorización (`TransactionType=0`) y preautorización (`TransactionType=1`). citeturn20view0

La marcación se hace enviando `DS_MERCHANT_DIRECTPAYMENT="MOTO"` junto al `DS_MERCHANT_TRANSACTIONTYPE` correspondiente, y existen ejemplos también para modalidad InSite (`DS_MERCHANT_IDOPER`). citeturn20view0turn29view6

## Entornos de pruebas y troubleshooting

La página de “Realización de Pruebas” documenta:

- URLs de test para redirección (`/sis/realizarPago`), REST (inicia/trata), y accesos al módulo de administración. citeturn28view0turn5view3turn27view0  
- Credenciales genéricas de test:  
  - `Ds_Merchant_MerchantCode` (ejemplo: `999008881`)  
  - `Ds_Merchant_Terminal` (ejemplo: `049`, y nota de probar `001` si hay error)  
  - “clave de comercio” genérica para firma en test (ejemplo literal indicado en la página). citeturn28view0  
- Tarjetas de test específicas para EMV3DS 2.1 y 2.2 (frictionless/challenge), PSD2, y para DCC, con PAN/caducidad/CVV. citeturn28view0  
- Reglas de test para denegaciones: CVV `999` o importes terminados en ciertos dígitos para simular respuestas (incluyendo 172/173/174). citeturn28view0turn31view0  

## Parámetros de entrada y salida

### Parámetros de entrada críticos para InSite + e‑commerce + recurrentes

El portal de “Parámetros entrada/salida” consolida los campos (longitud/tipo, obligatoriedad y comentarios). De cara a implantación, estos son los que típicamente condicionan arquitectura y validaciones. citeturn29view0turn32view0turn29view1turn29view3turn29view4turn29view5turn29view6

- `DS_MERCHANT_AMOUNT`: importe sin separador decimal (céntimos en EUR), con ejemplo `43,45€ → 4345`. citeturn32view0  
- `DS_MERCHANT_ORDER`: se recomienda que los 4 primeros dígitos sean numéricos y el resto use solo caracteres ASCII alfanuméricos (rangos indicados). citeturn29view0  
- `DS_MERCHANT_MERCHANTCODE` (FUC) y `DS_MERCHANT_TERMINAL`: obligatorios. citeturn29view1turn30view0  
- `DS_MERCHANT_IDOPER`: identificador de operación de InSite. citeturn29view1turn0view2turn4view0turn27view0  
- `DS_MERCHANT_MERCHANTURL`: URL de notificación on‑line (si el comercio la tiene configurada en administración, se envía POST con el resultado a esa URL). citeturn29view0turn0view2turn5view3  
- `DS_MERCHANT_URLOK` / `DS_MERCHANT_URLKO`: URLs de retorno en redirección. citeturn0view2turn20view0  
- `DS_MERCHANT_IDENTIFIER`: referencia/token o solicitud de generar referencia (`"REQUIRED"`). citeturn29view2turn24view0turn25view0turn5view3  
- `DS_MERCHANT_COF_INI`, `DS_MERCHANT_COF_TXNID`, `DS_MERCHANT_COF_TYPE`: COF / recurrentes. citeturn26view0turn29view5turn25view0  
- `DS_MERCHANT_EXCEP_SCA`: exenciones PSD2, incluyendo `MIT` (requiere activación por la entidad). citeturn29view4turn25view1  
- `DS_MERCHANT_DIRECTPAYMENT`: valores documentados `true` (intención de operación sin autenticación) y `MOTO` (operación MOTO). citeturn29view6turn20view0turn24view0turn25view1  
- `DS_MERCHANT_EMV3DS`: JSON con información EMV3DS V1/V2 para autenticación (cuando se usa el flujo EMV3DS). citeturn29view3turn27view0  
- `DS_MERCHANT_DCC`: JSON/campo de solicitud para DCC (`Y`/`N` para inicia petición y objeto para confirmación). citeturn29view4turn4view0  

### Parámetros de salida críticos para verificación de pagos

El portal también lista el set típico de salida: `DS_DATE`, `DS_HOUR`, `DS_AMOUNT`, `DS_CURRENCY`, `DS_ORDER`, `DS_MERCHANTCODE`, `DS_TERMINAL` y `DS_RESPONSE`, además de datos opcionales (marca, país, etc.). citeturn30view0

Dos puntos de diseño importantes:

- `DS_RESPONSE` es la clave del resultado funcional, con rangos como: `0000–0099` autorizado (pagos/preautorizaciones), `0900` autorizado (devoluciones/confirmaciones) y `0400` autorizado (anulaciones). citeturn31view0turn30view0  
- `DS_SIGNATURE` se entrega en respuesta como firma de la respuesta. citeturn30view1  

## Bloque listo para Claude Opus 4.6

El siguiente bloque está diseñado para copiar/pegar en Claude Opus 4.6 como “contexto técnico” (sin código de tu app) para guiar la implementación InSite + tokenización/COF + MIT, incorporando la información extraída de las páginas solicitadas (autorización, preautorización, preautenticación, devolución, anulación, COF, DCC, OneClick, MOTO, Paygold, entornos y parámetros). citeturn0view2turn22view0turn21view3turn23view0turn0view0turn25view0turn4view0turn24view0turn20view0turn5view3turn28view0turn29view0turn31view0turn27view0

```markdown
# Contexto: Portal Getnet/Redsys — piezas necesarias para InSite + COF + MIT (resumen técnico)

## Objetivo
Implementar pagos y “suscripciones” usando:
- InSite: iframe captura tarjeta → devuelve ID de operación (idOper) → el servidor ejecuta el pago por REST usando DS_MERCHANT_IDOPER.
- Tokenización/COF: guardar una referencia de tarjeta (DS_MERCHANT_IDENTIFIER) y/o identificadores COF para cobros posteriores.
- MIT recurring: para cobros periódicos iniciados por el comercio (sin participación del titular) marcar como MIT (exención) y direct payment.

## Tabla de transaction types (entrada) que vamos a usar
- 0 = Autorización (pago estándar)
- 1 = Preautorización
- 2 = Confirmación de preautorización (respuesta OK típica Ds_Response = 0900)
- 3 = Devolución (respuesta OK típica Ds_Response = 0900)
- 7 = Validación de tarjeta
- 8 = Confirmación de validación
- 9 = Anulación de preautorización (respuesta OK típica Ds_Response = 0400)
- 45 = Anulación de pago (Ds_Response = 0400)
- 46 = Anulación de devolución (Ds_Response = 0400)
- 47 = Anulación confirmación autenticación (Ds_Response = 0400)
- F = Paygold (Get Link&Pay): genera enlace Ds_UrlPago2Fases
- 44 = Borrar referencia (token) (gestión de referencias)

## Campos de entrada clave (DS_MERCHANT_*)
- DS_MERCHANT_AMOUNT: importe en “céntimos” (EUR 43,45 -> 4345).
- DS_MERCHANT_CURRENCY: ISO-4217 numérico (EUR=978).
- DS_MERCHANT_ORDER: 12 chars; recomendado 4 primeros numéricos; resto solo [0-9A-Za-z].
- DS_MERCHANT_MERCHANTCODE (FUC) y DS_MERCHANT_TERMINAL: obligatorios.
- DS_MERCHANT_IDOPER: ID de operación InSite (token idOper) para autorizar/3DS/DCC en modalidad InSite.
- DS_MERCHANT_IDENTIFIER:
  - “REQUIRED” para solicitar generación de referencia/token en una operación inicial.
  - Valor de referencia/token para pagos posteriores sin PAN/CVV.
- DS_MERCHANT_MERCHANTURL: URL de notificación online (POST server-to-server) si está configurada en el TPV.
- DS_MERCHANT_DIRECTPAYMENT:
  - "true" para intención de pago sin autenticación / sin pantallas adicionales en ciertas operativas.
  - "MOTO" para pagos MOTO (cliente no presente).
- DS_MERCHANT_EXCEP_SCA: exenciones PSD2; valores incluyen "MIT" (requiere activación por la entidad).
- COF:
  - DS_MERCHANT_COF_INI: "S" primera transacción COF (almacenamiento credenciales); si usas IDENTIFIER="REQUIRED", COF_INI puede ser opcional.
  - DS_MERCHANT_COF_TYPE: "R" para Recurring.
  - DS_MERCHANT_COF_TXNID: devuelto en la COF inicial; debe enviarse en COF sucesivas.
- EMV3DS:
  - DS_MERCHANT_EMV3DS: JSON requerido en flujos manuales 3DS (REST/InSite) cuando aplique.

## Salida clave (DS_*)
- DS_RESPONSE: resultado principal (0000-0099 ok pagos/preauth; 0900 ok devol/confirm; 0400 ok anulaciones).
- DS_SIGNATURE: firma de la respuesta.
- DS_ORDER/DS_AMOUNT/DS_CURRENCY/DS_MERCHANTCODE/DS_TERMINAL: deben coincidir con la petición.

## MIT recurring (Merchant Initiated Transaction) — patrón recomendado por COF docs
Para cobros periódicos iniciados por el comercio:
- Marcar como COF sucesiva (usar referencia/token y/o COF datos).
- Enviar DS_MERCHANT_EXCEP_SCA = "MIT".
- Enviar DS_MERCHANT_DIRECTPAYMENT = "true".
- Enviar DS_MERCHANT_COF_TXNID ligado a la COF inicial (si no existe por historicidad, existe un valor comodín 999999999999999, pero se avisa que podría invalidarse en el futuro).
- Si en un MIT recibes un nuevo DS_MERCHANT_COF_TXNID en la respuesta, almacenarlo y usarlo en siguientes MIT.

## DCC (si se activa)
- Flujo en dos pasos (iniciaPeticion + trataPeticion) con máximo 1 hora entre ambos y manteniendo sesión.
- Paso 1: iniciar petición con DS_MERCHANT_DCC="Y".
- Paso 2: autorizar enviando DS_MERCHANT_DCC como objeto con moneda/importe DCC.
- En InSite, esos mensajes incluyen DS_MERCHANT_IDOPER.

## Paygold
- TransactionType "F".
- Permite enviar link por SMS/email o devolver enlace.
- Puede combinarse con DS_MERCHANT_IDENTIFIER="REQUIRED" para generar referencia.

## Entorno de pruebas (sandbox)
- REST: https://sis-t.redsys.es:25443/sis/rest/iniciaPeticionREST y trataPeticionREST
- Redirección: https://sis-t.redsys.es:25443/sis/realizarPago
- MerchantCode test común: 999008881; terminal test común: 049 (y nota para usar 001 si hay error).
- Hay tarjetas de test específicas para EMV3DS 2.1/2.2 (frictionless/challenge), PSD2, y DCC.
```
