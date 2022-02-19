import { context, PersistentMap } from 'near-sdk-as'

// @ts-ignore
@nearBindgen
export class Signer {
  account: string
  signed: u64

  /**
   * @param account Cuenta o Address de quien debe firmar
   * @param signed Fecha en que firmó, si no ha firmado es un 0
   */
  constructor(account: string, signed: u64) {
    this.account = account
    this.signed = signed || 0
  }

  toString(): string {
    return `${this.account}::${this.signed}`
  }
}

// @ts-ignore
@nearBindgen
export class Document {
  public md5: string
  public title: string
  public dateLimit: u64
  public hash: string
  public completedAt: u64
  public createdAt: u64
  public deletedAt: u64
  /** @var signers Lista de firmantes en un Mapeo de {Cuenta: fecha de firma} */
  private signers: Array<Signer> // Otra implementación

  /**
   * Inicializa un documento con parámetros básicos para serializarlo en el storage
   *
   * @param md5 Suma md5 del Documento
   * @param title Título del documento
   * @param dateLimit Fecha límite para poder firmar en UTC (entero blockTimestamp)
   * @param signers Lista de cuentas de quienes van a firmar
   * @param hash ID con el que se va a identificar este documento
   */
  constructor(md5: string, title: string, dateLimit: u64, signers: Array<string>, hash: string) {
    this.md5 = md5
    this.title = title
    this.dateLimit = dateLimit
    this.hash = hash
    this.createdAt = context.blockTimestamp
    this.deletedAt = 0
    this.completedAt = 0

    this.signers = new Array<Signer>()
    for (let i = 0; i < signers.length; i++) {
      this.signers.push(new Signer(signers[i], 0))
    }
  }

  public addSigner(signerAccount: string): Document {
    const signerPreIndex = this.findSigner(signerAccount)
    if (signerPreIndex == -1) {
      throw new Error(`El documento ${this.title} no requiere la firma de ${signerAccount}`)
    }

    const signerIndex = signerPreIndex > -1 ? i32(signerPreIndex) : 0

    if (this.signers[signerIndex].signed !== 0) {
      throw new Error(
        `La firma de ${signerAccount} ya se encuentra en el documento ${this.title}. Se firmó en [${this.signers[signerIndex].signed}UTC]`
      )
    }

    this.signers[signerIndex].signed = context.blockTimestamp

    // Verificar si ya se tienen todas las firmas

    let ok = true
    for (let i = 0; i < this.signers.length; i++) {
      if (this.signers[i].signed === 0) {
        ok = false
      }
    }
    if (ok) {
      this.completedAt = context.blockTimestamp
    }

    return this
  }

  public cancel(): void {
    this.deletedAt = context.blockTimestamp
  }

  public getSignedBy(): Array<Signer> {
    return this.signers
  }

  public toString(): string {
    let data = ''
    data += 'md5' + this.md5.toString()
    data += 'title' + this.title.toString()
    data += 'dateLimit' + this.dateLimit.toString()
    data += 'completedAt' + this.completedAt.toString()
    data += 'createdAt' + this.createdAt.toString()
    data += 'deletedAt' + this.deletedAt.toString()
    data += 'signers' + this.signers.toString()
    return data
  }

  private findSigner(account: string): number {
    for (let i = 0; i < this.signers.length; i++) {
      if (this.signers[i].account == account) {
        return i
      }
    }

    return -1
  }
}

export const documents = new PersistentMap<string, Document>('d:')
export const creatorDocs = new PersistentMap<string, Array<string>>('cd:')
