import { VMContext, Context, u128 } from 'near-sdk-as'
import { Contract } from '../main'

let contract: Contract

beforeEach(() => {
  contract = new Contract()
})

describe('message tests', () => {
  it('agrega un documento', () => {
    VMContext.setCurrent_account_id('aurex.testnet')
    const document = contract.createDocument('123123', 'Contrato 1', '2022-02-20 23:00:00', ['aurex.testnet'])
    console.log(document.toString())
    expect(document.md5).toBe('123123', 'Tiene el md5 solicitado')
    // VMContext.setAttached_deposit(u128.from('100000000000000000000000'))
    // expect(messageAR[0].premium).toStrictEqual(true, 'should be premium')
  })
})
