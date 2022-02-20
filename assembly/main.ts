import { creatorDocs, documents, Document } from './model'
import { context, math, u128, base64, datetime, logging } from 'near-sdk-as'
import { PlainDateTime } from 'assemblyscript-temporal'

/** @var DOCUMENT_COST de dar de alta un documento */
const DOCUMENT_COST = '100000000000000000000000' // 0.1 NEAR

/** @var MAX_DATE_LIMIT Límite máximo para permitir firmar documentos */
const MAX_DATE_LIMIT = 'P6M' // 6 meses

// @ts-ignore
@nearBindgen
export class Contract {
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
  createDocument(md5: string, title: string, dateLimit: string, signers: Array<string>): Document {
    if (context.attachedDeposit < u128.fromString(DOCUMENT_COST)) {
      throw new Error(`Debes anexar la tarifa mínima por documento: 0.1 NEAR.}`)
    }

    // Obtiene los primeros 12 caracteres base64 del sha256(documento + cuenta) del creador como ID único
    const creator = context.sender
    const hash = base64.encode(math.hash(creator + md5)).substr(0, 12)

    let creatorDocuments = creatorDocs.get(creator, null)
    if (creatorDocuments) {
      if (~creatorDocuments.indexOf(hash)) {
        throw new Error(`Ya se había agregado a firmas el documento [${title}]}`)
      }
    } else {
      creatorDocuments = []
    }

    // Verifica fecha límite

    // Si la fecha es MySQL y no ISO, le agrega los milisegundos y Z
    // Convierte: YYYY-MM-DD HH:mm:ss
    //         a: YYYY-MM-DDTHH:mm:ss.sssZ
    if (~dateLimit.indexOf(' ')) {
      dateLimit = `${dateLimit.replace(' ', 'T')}.000Z`
    }

    const now = datetime.block_datetime()
    const plainDateLimit = PlainDateTime.from(dateLimit)

    if (PlainDateTime.compare(plainDateLimit, now) <= 0) {
      throw new Error(`La fecha límite de firma ya pasó`)
    }

    if (PlainDateTime.compare(now.add(MAX_DATE_LIMIT), plainDateLimit) <= 0) {
      throw new Error(`La fecha límite de firma no debe ser superior a 6 meses`)
    }

    // Genera documento
    const document = new Document(md5, title, u64(plainDateLimit.epochNanoseconds), signers, hash)
    documents.set(hash, document)
    creatorDocuments.push(hash)
    creatorDocs.set(creator, creatorDocuments)

    logging.log(`DOC CREATED: hash[${hash}] owner[${creator}] md5[${md5}] -- ` + this.storageReport())

    return document
  }

  /**
   * Obtiene el listado de documentos de una cuenta `creator` específica.
   *
   * @param creator Cuenta de la que se quieren obtener los documentos
   * @returns Lista de documentos o una lista vacía
   * @throws Si no se especifíca al Creador o no tiene documentos
   */
  getDocuments(creator: string): Array<Document> {
    if (!creator) {
      throw new Error(`Especifíca de qué cuenta recuperar los documentos`)
    }

    if (!creatorDocs.contains(creator)) {
      throw new Error(`No hay Documentos para firmar creados por [${creator}]`)
    }

    // Obtiene el Array de IDs de documentos de este Creador
    const docsOwned = creatorDocs.getSome(creator)
    const results: Array<Document> = []

    // Sacamos los documentos vía su ID
    for (let i = 0; i < docsOwned.length; i++) {
      if (documents.contains(docsOwned[i])) {
        results[i] = documents.getSome(docsOwned[i])
      }
    }

    return results
  }

  /**
   * Agrega la firma de la cuenta actual a un documento
   *
   * @param hash ID del documento a firmar
   * @returns El documento firmado
   * @throws Si no se encuentra el documento o ya no se puede firmar
   */
  addSign(hash: string): Document {
    if (!documents.contains(hash)) {
      throw new Error(`No se encontró el documento [${hash}]`)
    }

    const document = documents.getSome(hash)
    if (document.deletedAt !== 0) {
      throw new Error(`Este documento ha sido cancelado`)
    }

    // Verificación de fecha
    const now = datetime.block_datetime()
    const dateLimit = myGetDateTimeFromEpoch(document.dateLimit)

    if (PlainDateTime.compare(dateLimit, now) < 0) {
      throw new Error(`La fecha límite de firma ya pasó, ya no es posible firmar el documento`)
    }

    // OK
    document.addSigner(context.sender)
    documents.set(hash, document)

    logging.log(`DOC SIGNED: hash[${hash}] signer[${context.sender}] md5[${document.md5}] -- ` + this.storageReport())
    return document
  }

  /**
   * Recupera un documento y su estatus de firmas
   *
   * @param hash ID del documento a buscar
   * @returns El documento
   * @throws Documento no encontrado
   */
  getDocument(hash: string): Document | null {
    if (!documents.contains(hash)) {
      // return null
      throw new Error(`No se encontró el documento [${hash}]`)
    }

    return documents.getSome(hash)
  }

  /**
   * Cancela un documento de la cuenta que lo solicita.
   * **Esta operación es irrevocable**
   *
   * @param hash ID del documento a cancelar
   * @returns El documento cancelado
   * @throws Si no se encuentra o no tiene documentos creados
   */
  cancelDocument(hash: string): Document {
    const creator = context.sender

    // Documentos creados por la cuenta

    const creatorDocuments = creatorDocs.get(creator, [])
    if (!creatorDocuments) {
      throw new Error(`No tienes documentos creados`)
    }

    // Verifica que esta cuenta sea dueña del documento y lo elimina

    const index = creatorDocuments.indexOf(hash)
    if (!~index) {
      throw new Error(`No se encontró el documento solicitado en tu lista de documentos`)
    }

    // Obtiene el documento para retornar y le pone fecha de cancelación

    if (!documents.contains(hash)) {
      throw new Error(`No se encontró el documento [${hash}]`)
    }

    const doc = documents.getSome(hash)
    doc.cancel()
    documents.set(hash, doc)

    logging.log(`DOC CANCELED: hash[${hash}] owner[${creator}] md5[${doc.md5}] -- ` + this.storageReport())

    return doc
  }

  /**
   * **Para fines de prueba:** Elimina un documento de la cuenta que lo solicita
   *
   * @param hash ID del documento a eliminar
   * @returns El documento eliminado
   * @throws Si no se encuentra o no tiene documentos creados
   */
  deleteDocument(hash: string): Document {
    const creator = context.sender

    // Documentos creados por la cuenta

    const creatorDocuments = creatorDocs.get(creator, [])
    if (!creatorDocuments) {
      throw new Error(`No tienes documentos creados`)
    }

    // Verifica que esta cuenta sea dueña del documento y lo elimina

    const index = creatorDocuments.indexOf(hash)
    if (!~index) {
      // if (documents.contains(hash)) { documents.delete(hash) } // failsafe por si quedó en memoria
      throw new Error(`No se encontró el documento solicitado en tu lista de documentos`)
    }

    creatorDocuments.splice(index, 1)
    creatorDocs.set(creator, creatorDocuments)

    // Obtiene el documento para retornar y lo elimina del listado

    if (!documents.contains(hash)) {
      throw new Error(`No se encontró el documento [${hash}]`)
    }

    const doc = documents.getSome(hash)
    documents.delete(hash)

    logging.log(`DOC DELETED: hash[${hash}] owner[${creator}] doc[${doc.toString()}] -- ` + this.storageReport())

    return doc
  }

  private storageReport(): string {
    return `storage[${context.storageUsage}bytes], gas[${context.usedGas}])`
  }
}

/**
 * Helper para convertir block_datetime guardados a PlainDateTime
 *
 * @param epochNanoseconds
 * @returns
 */
function myGetDateTimeFromEpoch(epochNanoseconds: u64): PlainDateTime {
  const quotient = epochNanoseconds / 1_000_000
  const remainder = epochNanoseconds % 1_000_000
  let epochMilliseconds = +quotient
  let nanos = +remainder
  if (nanos < 0) {
    nanos += 1_000_000
    epochMilliseconds -= 1
  }
  const microsecond = i32((nanos / 1_000) % 1_000)
  const nanosecond = i32(nanos % 1_000)

  const item = new Date(epochMilliseconds)
  const year = item.getUTCFullYear()
  const month = item.getUTCMonth() + 1
  const day = item.getUTCDate()
  const hour = item.getUTCHours()
  const minute = item.getUTCMinutes()
  const second = item.getUTCSeconds()
  const millisecond = item.getUTCMilliseconds()

  return new PlainDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond)
}
