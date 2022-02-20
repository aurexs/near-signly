<script lang="js">
import getConfig from '@/config.js'
import * as nearAPI from 'near-api-js'
import Big from 'big.js'

const nearConfig = getConfig('testnet')
const DOCUMENT_COST = 0.1
const BOATLOAD_OF_GAS = Big(3)
  .times(10 ** 13)
  .toFixed()

// Initializing contract
async function initContract() {
  const keyStore = new nearAPI.keyStores.BrowserLocalStorageKeyStore()

  const near = await nearAPI.connect({ keyStore, ...nearConfig })
  const walletConnection = new nearAPI.WalletConnection(near, 'firmamelo')

  // Load in user's account data
  let currentUser
  if (walletConnection.getAccountId()) {
    currentUser = {
      accountId: walletConnection.getAccountId(),
      balance: (await walletConnection.account().state()).amount,
    }
  }

  // Initializing our contract APIs by contract name and configuration
  const contract = await new nearAPI.Contract(walletConnection.account(), nearConfig.contractName, {
    // View methods are read-only – they don't modify the state, but usually return some value
    viewMethods: ['getDocuments', 'getDocument'],
    // Change methods can modify the state, but you don't receive the returned value when called
    changeMethods: ['createDocument', 'addSign', 'cancelDocument', 'deleteDocument'],
    // Sender is the account ID to initialize transactions.
    // getAccountId() will return empty string if user is still unauthorized
    // sender: walletConnection.getAccountId(),
  })

  return { contract, currentUser, nearConfig, walletConnection }
}

function myParseDate(octoDate) {
  if (octoDate != "0") {
    return new Date(parseInt(octoDate.substring(0,13))).toString()
  } else {
    return ""
  }
}

export default {
  name: 'AppScreen',
  data() {
    return {
      loadingWallet: true,
      content: '',
      contract: null,
      currentUser: null,
      nearConfig: null,
      wallet: null,
      firmaOpened: false,
      newOpened: false,
      historyOpened: true,

      signHash: null,
      signDoc: null,

      newDoc: {
        md5: '',
        title: '',
        dateLimit: '2022-02-20 23:00:00',
        signers: '',
      },
      documents: [],
    }
  },
  created() {
    initContract()
      .then((nearData) => {
        console.log(nearData)
        this.loadingWallet = false

        this.contract = nearData.contract
        this.currentUser = nearData.currentUser
        this.nearConfig = nearData.nearConfig
        this.wallet = nearData.walletConnection

        let code = window.location.hash.substring(1)
        console.log(code);
        if (code.indexOf("code=") === 0) {
          code = code.substring(5)
          this.firmaOpened = true
          this.signHash = code
          this.historyOpened = false

          this.getDocument(code, "sign")
        }

        if (this.historyOpened) {
          this.getDocuments()
        }
      })
      .catch((error) => {
        console.log(error)

        this.content =
          (error.response && error.response.data && error.response.data.message) || error.message || error.toString()
      })
  },
  methods: {
    signIn() {
      // console.log(this.wallet);
      this.wallet.requestSignIn(
        { contractId: nearConfig.contractName, methodNames: [this.contract.createDocument] }, //contract requesting access
        'Fírmamelo App', //optional name
        null, //optional URL to redirect to if the sign in was successful
        null //optional URL to redirect to if the sign in was NOT successful
      )
    },

    signOut() {
      this.wallet.signOut()
      window.location.replace(window.location.origin + window.location.pathname)
    },

    parseDocument(doc) {
        doc.completedAt = myParseDate(doc.completedAt)
        doc.dateLimit = myParseDate(doc.dateLimit)
        doc.createdAt = myParseDate(doc.createdAt)
        doc.deletedAt = myParseDate(doc.deletedAt)

        doc.url = window.location.origin + '/#code=' + doc.hash

        return doc
    },

    getDocument(code, action) {
      this.contract
        .getDocument({ hash: code })
        .then((data) => {
          console.log(data);
          if (data) {
            if (action == 'sign') {
              this.signDoc = this.parseDocument(data)
            }
            // return this.parseDocument(data)
          } else  {
            return null
          }
        })
        .catch((e) => {
          console.log(e)
        })
    },

    getDocuments() {
      this.contract
        .getDocuments({ creator: this.currentUser.accountId })
        .then((data) => {
          console.log(data);
          if (data && data.length) {
            this.documents = data.map(item => {
              return this.parseDocument(item)
            })
          } else  {
            this.documents = []
          }
        })
        .catch((e) => {
          console.log(e)
        })
    },

    addSign() {
      this.contract
        .addSign({ hash: this.signHash }, BOATLOAD_OF_GAS)
        .then((data) => {
          console.log("addSignOKK", data);
          // this.contract.getDocument().then((data) => {
          //   console.log(data)
          // })
        })
        .catch((e) => {
          console.log(e)
        })
    },

    cancelDocument(code) {
      this.contract
        .cancelDocument({ hash: code }, BOATLOAD_OF_GAS)
        .then((data) => {
          this.getDocuments()
        })
        .catch((e) => {
          console.log(e)
        })
    },

    createDocument() {
      let signersList = this.newDoc.signers.split(',')
      signersList = signersList.map((item) => item.trim()).filter((item) => item)

      this.contract
        .createDocument(
          {
            md5: this.newDoc.md5,
            title: this.newDoc.title,
            dateLimit: this.newDoc.dateLimit,
            signers: signersList,
          },
          BOATLOAD_OF_GAS,
          Big(DOCUMENT_COST)
            .times(10 ** 24)
            .toFixed()
        )
        .then((data) => {
          console.log("createDocumentOKK", data);
          // this.contract.getDocument().then((data) => {
          //   console.log(data)
          // })
        })
        .catch((e) => {
          console.log(e)
        })
    },

    openHistory() {
      this.historyOpened = !this.historyOpened
      if (this.historyOpened && !this.documents.length) {
        this.getDocuments()
      }
    }
  },
}
</script>

<template>
  <div class="container-md mx-auto">
    <main class="" v-if="!this.wallet">
      <div v-if="this.loadingWallet">
        <h1>Cargando...</h1>
        <p>Intenta obtener conexión con la red de Near</p>
      </div>
      <div v-else>
        <h1>No se ha podido establecer la conexión con la red de Near</h1>
        <p>Intenta de nuevo más tarde</p>
      </div>
    </main>
    <main class="" v-if="this.wallet">
      <header>
        <h1>Fírmamelo! <small class="text-sm text-muted">(Signear)</small></h1>
        <div v-if="currentUser">
          <div class="hero mb-6 pb-4">
            <p>
              Hola de nuevo!<br />Estás usando la cuenta
              <b
                ><a href="https://explorer.mainnet.near.org/accounts/aurex.near" target="_blank">{{
                  currentUser.accountId
                }}</a> </b
              ><br />¿Qué deseas hacer?
            </p>
            <button @click="signOut" class="btn-secondary btn-sm">Cerrar Wallet</button>
          </div>
          <h3 @click="firmaOpened = !firmaOpened" class="pointer">Firmar un documento</h3>
          <div class="mb-4" v-show="firmaOpened">
            <form class="row g-3">
              <div class="col-auto">
                <div class="form-floating">
                  <input
                    type="text"
                    class="form-control"
                    id="floatingInput"
                    placeholder="código de 12 caracteres"
                    v-model="signHash"
                  />
                  <label for="floatingInput">Código de documento</label>
                </div>
              </div>
              <div class="col-auto">
                <button type="button" class="btn btn-primary mb-3" @click="addSign">Buscar y firmar documento</button>
              </div>
            </form>
            <div v-if="signDoc" class="border-top px-4 pt-4 mt-4">
              <h4
                :class="{
                  'text-info': !signDoc.deletedAt,
                  'text-danger': signDoc.deletedAt,
                  'text-success': signDoc.completedAt,
                }"
              >
                {{ signDoc.title }} {{ signDoc.deletedAt ? 'CANCELADO' : '' }}
              </h4>
              <p>
                <b>URL</b>
                <small
                  ><a :href="signDoc.url">{{ signDoc.url }}</a></small
                ><br />
                <b>Código</b> <small>{{ signDoc.hash }}</small
                ><br />
                <b>Firmantes</b>
                <small>{{ signDoc.signers.map((s) => '' + s.account + (s.signed !== '0' ? '(✔)' : '')) }}</small
                ><br />
                <b>Creado</b> <small>{{ signDoc.createdAt }}</small
                ><br />
                <b>Límite firma</b> <small>{{ signDoc.dateLimit }}</small
                ><br />
                <span v-if="signDoc.deletedAt">
                  <b>Cancelado</b> <small>{{ signDoc.deletedAt }}</small
                  ><br
                /></span>
              </p>
            </div>
          </div>
          <h3 @click="newOpened = !newOpened" class="pointer">Crear un documento nuevo</h3>
          <div class="mb-4" style="max-width: 560px" v-show="newOpened">
            <p>Carga un archivo y agrega un lista de Cuentas Near de quienes van a firmar, separados por coma</p>

            <div class="form-floating">
              <input type="text" class="form-control" id="nd1" v-model="newDoc.title" />
              <label for="nd1">Título del documento</label>
            </div>
            <div class="form-floating">
              <input type="text" class="form-control" id="nd1" v-model="newDoc.md5" />
              <label for="nd1">Suma MD5</label>
            </div>
            <div class="form-floating">
              <input type="text" class="form-control" id="nd1" v-model="newDoc.dateLimit" />
              <label for="nd1">Fecha límite (UTC en formato ISO 8601 [YYYY-MM-DD HH:mm:ss])</label>
            </div>
            <div class="form-floating">
              <input type="text" class="form-control" id="nd1" v-model="newDoc.signers" />
              <label for="nd1">Firmantes, separados por coma</label>
            </div>
            <p class="muted">El costo por documento es de 0.1 Near más las tarifas de comisión por uso de la Red</p>
            <div>
              <button class="btn btn-primary btn-lg w-100" @click="createDocument">Generar</button>
            </div>
          </div>
          <h3 @click="openHistory" class="pointer">Mis documentos creados</h3>
          <div class="mb-4" v-show="historyOpened">
            <div v-if="documents && documents.length" class="">
              <div v-for="(doc, i) in documents" :key="i" class="border-top px-4">
                <h4
                  :class="{
                    'text-info': !doc.deletedAt,
                    'text-danger': doc.deletedAt,
                    'text-success': doc.completedAt,
                  }"
                >
                  {{ i + 1 }}) {{ doc.title }} {{ doc.deletedAt ? '[CANCELADO]' : '' }}
                </h4>
                <p>
                  <b>URL</b>
                  <small
                    ><a :href="doc.url">{{ doc.url }}</a></small
                  ><br />
                  <b>Código</b> <small>{{ doc.hash }}</small
                  ><br />
                  <b>Firmantes</b>
                  <small>{{ doc.signers.map((s) => '' + s.account + (s.signed !== '0' ? '(✔)' : '')) }}</small
                  ><br />
                  <b>Creado</b> <small>{{ doc.createdAt }}</small
                  ><br />
                  <b>Límite firma</b> <small>{{ doc.dateLimit }}</small
                  ><br />
                  <span v-if="doc.deletedAt">
                    <b>Cancelado</b> <small>{{ doc.deletedAt }}</small
                    ><br
                  /></span>
                </p>
                <p><button class="btn btn-sm btn-danger" @click="cancelDocument(doc.hash)">cancelar</button></p>
              </div>
            </div>
            <div v-else>
              No has creado documentos aún. Adelante, crea unos cuantos. <br /><br /><button
                class="btn btn-small btn-success"
                @click="getDocuments"
              >
                refrescar
              </button>
            </div>
          </div>
        </div>
        <div v-if="!currentUser">
          <p class="hero">Hola!</p>
          <p>Para comenzar a utilizar esta App, debes iniciar con tu cuenta NEAR</p>
          <button class="btn btn-primary btn-lg" @click="signIn">Iniciar sesión</button>
        </div>
      </header>
    </main>
  </div>

  <!-- {currentUser ? <Form onSubmit="{onSubmit}" currentUser="{currentUser}" /> : <SignIn />} {!!currentUser &&
  !!messages.length && <Messages messages="{messages}" />} -->
</template>
<style>
.form-signin {
  width: 100%;
  max-width: 640px;
  padding: 15px;
  margin: auto;
}
</style>
