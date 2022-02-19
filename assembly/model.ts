import { PersistentMap } from 'near-sdk-as'

@nearBindgen
export class Document {
  public hash: string
  public title: string
  public signers: Array<string>
  private signed: Array<string> // Cuentas, separadas por coma

  // creator: string; // Ya estará en el Map de documents
  constructor(hash: string, title: string, signers: Array<string>) {
    this.hash = hash
    this.title = title
    this.signers = signers
    this.signed = []
  }

  public addSigner(signer: string): Document {
    if (!~this.signers.indexOf(signer)) {
      throw new Error(`El documento ${this.title} no requiere la firma de ${signer}`)
    }
    if (~this.signed.indexOf(signer)) {
      throw new Error(`La firma de ${signer} ya se encuentra en el documento ${this.title}`)
    }

    this.signed.push(signer)

    return this
  }

  public getSignedBy(): Array<string> {
    return this.signed
  }
}

export const documents = new PersistentMap<string, Document>('doc:')
export const creators = new PersistentMap<string, Array<string>>('cre:')
