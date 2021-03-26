import * as crypto from 'crypto'

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

    public nonce: number = Math.round(Math.random() * 999999999)

    constructor(
        public prevHash: string,
        public transaction: Transaction,
        public ts: number = Date.now()
    ) { }

    get hash(): string {
        const block: string = JSON.stringify(this)
        const hash: crypto.Hash = crypto.createHash('SHA256')
        hash.update(block).end()
        return hash.digest('hex')
    }
}


// The blockchain
class Chain {
    // Singleton instance
    public static instance: Chain = new Chain()

    chain: Block[]

    constructor() {
        this.chain = [
            // Genesis block
            new Block('', new Transaction(100, 'genesis', 'satoshi'))
        ]
    }

    // Most recent block
    get lastBlock(): Block {
        return this.chain[this.chain.length - 1]
    }

    // Proof of work system
    mine(nonce: number): number {
        let solution: number = 1
        console.log('⛏️  mining...')

        while (true) {

            const hash: crypto.Hash = crypto.createHash('MD5')
            hash.update((nonce + solution).toString()).end()

            const attempt: string = hash.digest('hex')

            if (attempt.substr(0, 4) === '0000') {
                console.log(`Solved: ${solution}`)
                return solution
            }

            solution += 1
        }
    }

    // Add a new block to the chain if valid signature & proof of work is complete
    addBlock(transaction: Transaction, signature: Buffer) {
        const verify: crypto.Verify = crypto.createVerify('SHA256')
        verify.update(transaction.toString())

        console.log(transaction.amount);


        const isValid: boolean = verify.verify(transaction.payer, signature)

        if (isValid) {
            const newBlock: Block = new Block(this.lastBlock.hash, transaction)
            this.mine(newBlock.nonce)
            this.chain.push(newBlock)
        }
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

const satoshi = new Wallet()
const bob = new Wallet()
const alice = new Wallet()

satoshi.sendMoney(50, bob.publicKey)
Chain.instance.chain[1].transaction.amount = 5100 // Why is this possible?
bob.sendMoney(23, alice.publicKey)
alice.sendMoney(5, bob.publicKey)

console.log(Chain.instance.chain)

console.log(Chain.instance.isChainValid);

