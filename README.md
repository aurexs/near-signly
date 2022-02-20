# Fírmamelo

dApp para cargar un documento que se debe firmar por varias partes.

El objetivo de la dApp es desplegar un SmartContract que solicite la firma de cada participante vía su Address o Cuenta Near.

## Procedimiento

- Se debe cargar el documento PDF que se va a firmar
- Se solicita el nombre del documento, el número de Firmantes y el address de cada uno y la fecha límite para firmar
- Se calcula la suma MD5 del documento y junto con el nombre se insertan en el SmartContract como un nuevo documento del propietario de la cuenta. Se debe pagar una comisión de 0.1 NEAR para registrar el documento
- Se le debe hacer llegar a cada firmante una copia del documento, la suma md5, y la URL a la dApp donde realizará la firma, esto se hace fuera de la dApp por cualquiér medio de contacto: email, discord, slack, etc.
- Cada firmante debe ingresar al enlace y abrir con su cuenta NEAR, revisar los detalles del documento y confirmar que la suma MD5 coincida con su copia que se le envió
- Si está de acuerdo, emitirá su firma
- Si ya firmó, la dApp le avisará que ya firmó
- Si ingresa un firmante que no está en el contrato, la dApp le avisará que no puede firmar
- La dApp mostrará el estatus del proceso de firmas (número de firmas recabadas) y pasada la fecha límite, mostrará la alerta correspondiente
- No se pueden registrar documentos con fecha límite de firma más allá de 6 meses
- Un mismo documento puede ser subido a firmas por diferentes personas, se lleva el registro vía el ID del creador
- Los documentos para firmas se pueden cancelar/derogar

## Documentación rápida

```typescript
/**
 * Registra un nuevo documento a firmar y se agrega a la cuenta de quien hace la transacción.
 * Solo el creador del documento puede ampliar la fecha límite para firmar o cancelarlo.
 * Un documento puede ser subido por diferentes creadores y se rastrean por medio de un hash único
 *
 * @param md5 Suma MD5 del documento
 * @param title Título del documento, ej: "Contrato de arrendamiento"
 * @param dateLimit Fecha límite para firmar, UTC en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss.000Z)
 * @param signers Lista de cuentas que pueden firmar
 * @returns Documento creado
 * @throws Validaciones o si la fecha no es parseable
 */
createDocument(md5: string, title: string, dateLimit: string, signers: Array<string>): Document

/**
 * Obtiene el listado de documentos de una cuenta `creator` específica.
 *
 * @param creator Cuenta de la que se quieren obtener los documentos
 * @returns Lista de documentos o una lista vacía
 * @throws Si no se especifíca al Creador o no tiene documentos
 */
getDocuments(creator: string): Array<Document>

/**
 * Agrega la firma de la cuenta actual a un documento
 *
 * @param hash ID del documento a firmar
 * @returns El documento firmado
 * @throws Si no se encuentra el documento o ya no se puede firmar
 */
addSign(hash: string): Document

/**
 * Recupera un documento y su estatus de firmas
 *
 * @param hash ID del documento a buscar
 * @returns El documento
 * @throws Documento no encontrado
 */
getDocument(hash: string): Document

/**
 * Cancela un documento de la cuenta que lo solicita.
 * **Esta operación es irrevocable**
 *
 * @param hash ID del documento a cancelar
 * @returns El documento cancelado
 * @throws Si no se encuentra o no tiene documentos creados
 */
cancelDocument(hash: string): Document

/**
 * **Para fines de prueba:** Elimina un documento de la cuenta que lo solicita
 *
 * @param hash ID del documento a eliminar
 * @returns El documento eliminado
 * @throws Si no se encuentra o no tiene documentos creados
 */
deleteDocument(hash: string): Document

```

## Comandos útiles

### Interactuar con el Smart Contract

```bash
# Despliega el contrato en desarrollo y setea la
# cuenta autogenerada por el cli: 'Account id: dev-xxx-xxx'
yarn dev-deploy && export CONTRACT=$(cat neardev/dev-account)
# En otra terminal, monitorear storage usando near-account-utils
watch -d -n 1 yarn storage $CONTRACT

# O únicamente revisar el storage
yarn storage $CONTRACT

# Documento no encontrado
near view $CONTRACT getDocument '{"hash":"121234"}'

# Crear documento para firmas.
# Cada documento requiere 0.1 Near para ingresarlo
near call $CONTRACT createDocument \
  "{ \
    \"md5\":\"121234\", \
    \"title\":\"Contrato de arrendamiento\", \
    \"dateLimit\":\"2022-02-20 23:00:00\", \
    \"signers\":[\"aurex.testnet\",\"$CONTRACT\"] \
  }" \
  --account-id $CONTRACT \
  --amount .1

# Guardar el hash generado del documento, para futuras llamadas
HASHDOC=xxxxxxxxxxxx

# Muestra el documento recién ingresado
near view $CONTRACT getDocument "{\"hash\":\"$HASHDOC\"}"

# Firmar con mi cuenta en $CONTRACT
near call $CONTRACT addSign "{\"hash\":\"$HASHDOC\"}" --account-id $CONTRACT

# Verificar que se agregó a la lista de firmas
near view $CONTRACT getDocument "{\"hash\":\"$HASHDOC\"}"

# Marcar documento como cancelado
near call $CONTRACT cancelDocument "{\"hash\":\"$HASHDOC\"}" --account-id $CONTRACT

# Eliminar el documento del storage
near call $CONTRACT deleteDocument "{\"hash\":\"$HASHDOC\"}" --account-id $CONTRACT

# Eliminar el contrato
BENEFICIARY=aurex.testnet
near delete $CONTRACT $BENEFICIARY

```

### Monitorear cuentas

Usa las [NEAR Utilities](https://github.com/near-examples/near-account-utils)

```bash
# Cuentas
# https://github.com/near-examples/near-account-utils#accounts-report
yarn accounts

# Claves
# https://github.com/near-examples/near-account-utils#account-keys-report
yarn keys

# Storage
# https://github.com/near-examples/near-account-utils#storage-report
yarn storage $CONTRACT
```

### UI

La UI está soportada por Vue + Vite. La UI se encuentra en desarrollo.

```bash
# Lanzar vite en modo desarrollo
yarn dev

# Compilar dist para productivo
yarn build-ui
```

## TODO

- Falta Optimizar y refactorizar UI
- Faltan validaciones en la UI
- Mejorar mapeo key-value
- Agregar soporte para DIDs

## 📖 Licencia

Este es un proyecto de software open-sourced licenciado bajo la MIT license.

## Acerca del proyecto

Este proyecto fue realizado por Aurelio Santos como parte del Near Development Bootcamp llevado a cabo de manera virtual en febrero de 2022.

Agradecimientos especiales a todo el equipo Staff de Blockdemy y a [@jhonzusa](https://twitter.com/jhonzusa) por el acompañamiento.
