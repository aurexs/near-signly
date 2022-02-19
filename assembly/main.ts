import { creators, documents, Document } from './model'
import { context, u128 } from 'near-sdk-as'

const DOCUMENT_COST = '100000000000000000000000' // 0.1 NEAR

@nearBindgen
export class Contract {
  getDocuments(creator: string): Array<Document | null> {
    if (!creator) {
      creator = context.sender
    }
    if (!creators.contains(creator)) {
      throw new Error(`No hay Documentos para firmar creados por [${creator}]`)
    }

    // Obtiene el Array de IDs de documentos de este Creador
    const docsOwned = creators.getSome(creator)
    // Sacamos los documentos vía su ID
    const results: Array<Document | null> = []

    for (let i = 0; i < docsOwned.length; i++) {
      if (documents.contains(docsOwned[i])) {
        results[i] = documents.get(docsOwned[i], null)
      }
    }

    return results
  }

  getDocument(hash: string): Document {
    if (!documents.contains(hash)) {
      throw new Error(`No se encontró el documento [${hash}]`)
    }

    return documents.getSome(hash)
  }

  deleteDocument(hash: string): Document {
    const creator = context.sender

    const creatorDocuments = creators.get(creator, [])
    if (!creatorDocuments) {
      throw new Error(`No tienes documentos creados`)
    }

    const index = creatorDocuments.indexOf(hash)
    if (!~index) {
      if (documents.contains(hash)) {
        documents.delete(hash)
      }
      throw new Error(`No se encontró el documento solicitado en tu lista de documentos`)
    }

    creators.set(creator, creatorDocuments.splice(index, 1))

    if (!documents.contains(hash)) {
      throw new Error(`No se encontró el documento [${hash}]`)
    }

    const doc = documents.getSome(hash)
    documents.delete(hash)

    return doc
  }

  addSign(hash: string): string {
    if (!documents.contains(hash)) {
      throw new Error(`No se encontró el documento [${hash}]`)
    }

    const document = documents.getSome(hash)
    document.addSigner(context.sender)
    documents.set(hash, document)

    return `Agregado [${context.sender}] al documento [${document.title}]` + this.storageReport()
  }

  createDocument(hash: string, title: string, signers: Array<string>): string {
    // logging.log(`deposit: ${context.attachedDeposit}`)
    // logging.log("deposit: " + context.attachedDeposit.toI64().toString())
    // logging.log("deposit: " + context.attachedDeposit.toF32().toString())
    // logging.log("   cost: " + u128.fromString(DOCUMENT_COST).toString())
    if (context.attachedDeposit < u128.fromString(DOCUMENT_COST)) {
      throw new Error(`Debes pagar la tarifa mínima por documento: 0.1 NEAR.}`)
    }

    const creator = context.sender

    let creatorDocuments = creators.get(creator, [])
    if (creatorDocuments) {
      if (~creatorDocuments.indexOf(hash)) {
        throw new Error(`Ya se había agregado a firmas el documento [${title}]. ${this.storageReport()}`)
      }
    } else {
      creatorDocuments = []
    }

    const document = new Document(hash, title, signers)
    documents.set(hash, document)
    creatorDocuments.push(hash)
    creators.set(creator, creatorDocuments)

    return `Agregado [${title}] a firmar por [` + (signers.join(', ') + ']') + this.storageReport()
  }

  private storageReport(): string {
    return ` -- (stats: storage[${context.storageUsage}bytes], gas[${context.usedGas}])`
  }
}
