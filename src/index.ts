import * as crypto from 'crypto'
import { throws } from 'node:assert'
import { Transform } from 'node:stream'

// Transfer of funds between two wallets
class Transaction {
    constructor(
        public amount: number,
        public payer: string, // public key
        public payee: string // public key
    ) { }

    toString(): string {
        return JSON.stringify(this)
    }
}

// Individual block on the chain
class Block {
    public hash: string
    public nonce: number

    // public nonce: number = Math.round(Math.random() * 999999999)

    constructor(
        public prevHash: string,
        public transaction: Transaction[],
        public ts: number = Date.now(),
    ) {
        this.hash = this.getHash
        this.nonce = 0
    }

    get getHash(): string {
        return crypto.createHash('SHA256').update(JSON.stringify(this)).digest('hex')
    }

    set mine(difficulty: number) {
        console.log('⛏️\tMINING')

        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
            this.nonce += 1
            this.hash = this.getHash
        }

        console.log('💎\tBLOCK MINED ' + this.hash)


    }
}


// The blockchain
class Chain {
    // Singleton instance
    public static instance: Chain = new Chain()

    public chain: Block[]
    private difficulty: number
    private pendingTransactions: Transaction[]
    private miningReward: number

    constructor() {
        this.chain = [
            // Genesis block
            new Block('', [new Transaction(0, 'genesis', 'genesis')])
        ]
        this.difficulty = 4
        this.pendingTransactions = []
        this.miningReward = 1
    }

    // Most recent block
    get lastBlock(): Block {
        return this.chain[this.chain.length - 1]
    }


    minePendingTransaction(miningRewardAddress: string) {
        let block = new Block(this.lastBlock.hash, this.pendingTransactions)
        block.mine = this.difficulty

        this.chain.push(block)
        this.pendingTransactions = [new Transaction(this.miningReward, 'system', miningRewardAddress)]
    }

    createTransaction(transaction: Transaction) {
        this.pendingTransactions.push(transaction)
    }

    getBalanceFromAdress(address: string) {
        let balance = 0

        for (const block of this.chain) {
            for (const transaction of block.transaction) {
                balance -= (transaction.payer === address) ? transaction.amount : 0
                balance += (transaction.payee === address) ? transaction.amount : 0
            }
        }

        return balance
    }

    // Add a new block to the chain if valid signature & proof of work is complete
    addBlock(newBlock: Block) {
        newBlock.prevHash = this.lastBlock.hash
        newBlock.mine = this.difficulty
        this.chain.push(newBlock)
        // addBlock(transaction: Transaction, signature: Buffer) {
        // const verify: crypto.Verify = crypto.createVerify('SHA256')
        // verify.update(transaction.toString())

        // console.log(transaction.amount);


        // const isValid: boolean = verify.verify(transaction.payer, signature)

        // if (isValid) {
        //     const newBlock: Block = new Block(this.lastBlock.hash, transaction)
        //     const solution = this.mine(newBlock.nonce)
        //     newBlock.nonce += solution
        //     newBlock.hash
        //     console.log(newBlock.hash);

        //     // console.log(newBlock, newBlock.nonce, solution, ':', 
        //newBlock.nonce + solution, crypto.createHash('MD5').update((newBlock.nonce 
        //+ solution).toString()).digest('hex'));

        //     this.chain.push(newBlock)
        // }
    }

    get isChainValid(): { chainValid: boolean } {
        for (let index: number = 1; index < this.chain.length; index++) {
            const currentBlock = this.chain[index]
            const previousBlock = this.chain[index - 1]

            // Is the current block valid?
            if (currentBlock.hash !== currentBlock.hash) {
                return { chainValid: false }
            }

            // Is the previous block valid?
            if (currentBlock.prevHash !== previousBlock.hash) {
                return { chainValid: false }
            }
        }
        return { chainValid: true }
    }

}

// Wallet gives a user a public/private keypair
class Wallet {
    public publicKey: string
    public privateKey: string

    constructor() {
        const keypair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        })

        this.privateKey = keypair.privateKey
        this.publicKey = keypair.publicKey
    }

    sendMoney(amount: number, payeePublicKey: string) {
        const transaction: Transaction = new Transaction(amount, this.publicKey, payeePublicKey)

        const sign: crypto.Signer = crypto.createSign('SHA256')
        sign.update(transaction.toString()).end()

        const signature: Buffer = sign.sign(this.privateKey)
        Chain.instance.addBlock(transaction, signature)
    }
}

// Example usage

const coin = new Chain()
coin.createTransaction(new Transaction(50, 'red', 'green'))
coin.createTransaction(new Transaction(10, 'green', 'red'))
coin.createTransaction(new Transaction(1, 'green', 'red'))


console.log(`Starting miners`);
coin.minePendingTransaction('redo')
coin.minePendingTransaction('redo')
coin.minePendingTransaction('redo')


// console.log(`Balance: redo has ${coin.getBalanceFromAdress('redo')} coin`);
// console.log(`Balance: redo has ${coin.getBalanceFromAdress('red')} coin`);
// console.log(`Balance: redo has ${coin.getBalanceFromAdress('green')} coin`);
// console.log(coin.isChainValid);


console.log(coin)

// // console.log(Chain.instance.isChainValid);

