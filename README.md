# Signear

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

```bash
yarn dev-deploy
export CONTRACT="dev-xxx-xxx" # Generado por el cli, buscar 'Account id: dev-xxx-xxx'

# Documento no encontrado
near view $CONTRACT getDocument '{"hash":"121234"}'

# Crear documento para firmas.
# Cada documento requiere 0.1 Near para procesarlo $D
near call $CONTRACT createDocument \
  "{\"hash\":\"121234\",\"title\":\"Contrato de arrendamiento\",\"signers\":[\"aurex.testnet\",\"$CONTRACT\"]}" \
  --account-id $CONTRACT \
  --amount .1

# Documento Nuevo
near view $CONTRACT getDocument '{"hash":"121234"}'

# Firmar con mi cuenta en $CONTRACT
near call $CONTRACT addSign '{"hash":"121234"}' --account-id $CONTRACT

# Verificar que se agregó a la lista de firmas
near view $CONTRACT getDocument '{"hash":"121234"}'

# Eliminar el documento
near call $CONTRACT deleteDocument '{"hash":"121234"}' --account-id $CONTRACT
```

## TODO

- Falta UI
- Faltan validaciones
- Agregar firmas con llave privada del hash + firmante
- Optimizar tipos de dato
- Optimizar almacenamiento en storage
- Mejorar mapeo key-value
- Agregar soporte para DIDs
