# Fírmamelo

dApp para cargar un documento que se debe firmar por varias partes.

El objetivo de la dApp es desplegar un SmartContract que solicite la firma de cada participante vía su Address o Cuenta Near.

## Procedimiento

- Se debe cargar el documento PDF que se va a firmar
- Se solicita el nombre del documento, el número de Firmantes y el address de cada uno y la fecha límite para firmar
- Se calcula la suma MD5 del documento y junto con el nombre se insertan en un SmartContract nuevo
- Se le debe hacer llegar a cada firmante una copia del documento, la suma md5, y la URL a la dApp donde realizará la firma
- Cada firmante debe ingresar con su cuenta, revisar el nombre del doc y confirmar que la suma MD5 coincida con su copia PDF
- Si está de acuerdo, emitirá su firma y un comentario si así lo desea
- Si ya firmó, la dApp le avisará que ya firmó
- Si ingresa un firmante que no está en el contrato, la dApp le avisará que no puede firmar
- La dApp mostrará el estatus del proceso de firmas (número de firmas recabadas) y pasada la fecha límite, mostrará la alerta correspondiente

## Comandos útiles

### Interactuar con el Smart Contract

```bash
# Despliega el contrato en desarrollo y setea la
# cuenta autogenerada por el cli: 'Account id: dev-xxx-xxx'
yarn dev-deploy && export CONTRACT=$(cat neardev/dev-account)

# En otra terminal, monitorear storage usando near-account-utils
watch -d -n 1 yarn storage $CONTRACT

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

# Guardar el hash generado del documento
HASHDOC=xxxxxxxxxxxx

# Muestra el documento recién ingresado
near view $CONTRACT getDocument "{\"hash\":\"$HASHDOC\"}"

# Firmar con mi cuenta en $CONTRACT
near call $CONTRACT addSign "{\"hash\":\"$HASHDOC\"}" --account-id $CONTRACT

# Verificar que se agregó a la lista de firmas
near view $CONTRACT getDocument "{\"hash\":\"$HASHDOC\"}"

# marcar documento como cancelado
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

### Otros

```bash
# Mostrar el estado completo
near view-state $CONTRACT --finality final
# "JSON RESULTANTE".forEach(_ => console.log(atob(_.key), atob(_.value)));

```

## TODO

- Falta UI
- Faltan validaciones
- Agregar firmas con llave privada del hash + firmante
- Optimizar tipos de dato
- Optimizar almacenamiento en storage
- Mejorar mapeo key-value
- Agregar soporte para DIDs
