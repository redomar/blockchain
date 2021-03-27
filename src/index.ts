import * as crypto from 'crypto'

// Transfer of funds between two wallets
class Transaction {
    public signature: string
    constructor(
        public amount: number,
        public payer: string, // public key
        public payee: string  // public key
    ) { this.signature = '' }

    get toString(): string {
        return JSON.stringify({ amount: this.amount, payer: this.payer, payee: this.payee })
    }

    get hash(): string {
        return crypto.createHash('SHA256').update(this.toString).digest('hex')
    }

    set signTransaction(privateKey: string) {
        this.signature = crypto.createSign('SHA256').update(this.hash).sign(privateKey, 'base64').toString()
    }

    get verifyTransaction(): boolean {
        if (this.payer === 'system') return true
        return crypto.createVerify('SHA256').update(this.hash).verify(Buffer.from(this.payer, 'utf-8'), Buffer.from(this.signature, 'base64'))
    }
}

// Individual block on the chain
class Block {
    public hash: string
    public nonce: number

    constructor(
        public prevHash: string,
        public transactions: Transaction[],
        public ts: number = Date.now(),
    ) {
        this.hash = this.getHash
        this.nonce = 0
    }

    get getHash(): string {
        return crypto.createHash('SHA256').update(JSON.stringify({
            prevHash: this.prevHash,
            transactions: this.transactions,
            ts: this.ts,
            nonce: this.nonce
        })).digest('hex')
    }

    set mine(difficulty: number) {
        console.log('⛏️\tMINING')

        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
            this.nonce += 1
            this.hash = this.getHash
        }

        console.log('💎\tBLOCK MINED ' + this.hash)
    }

    hasValidTransactions() {
        for (const transaction of this.transactions) {
            if (!transaction.verifyTransaction) return false
        }

        return true
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
        this.miningReward = 100
    }

    // Most recent block
    get lastBlock(): Block {
        return this.chain[this.chain.length - 1]
    }


    minePendingTransaction(miningRewardAddress: string) {
        const rewardsTransaction = new Transaction(this.miningReward, 'system', miningRewardAddress)
        this.pendingTransactions.push(rewardsTransaction)

        let block = new Block(this.lastBlock.hash, this.pendingTransactions)
        block.mine = this.difficulty

        this.chain.push(block)
        this.pendingTransactions = []
    }

    addTransaction(transaction: Transaction) {
        // !transaction.payer || !transaction.payee 
        this.pendingTransactions.push(transaction)
    }

    getBalanceFromAdress(address: string) {
        let balance = 0

        for (const block of this.chain) {
            for (const transaction of block.transactions) {
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
    }

    get isChainValid(): { chainValid: boolean } {
        for (let index: number = 2; index < this.chain.length; index += 1) {
            const currentBlock = this.chain[index]
            const previousBlock = this.chain[index - 1]

            if (!currentBlock.hasValidTransactions) {
                return { chainValid: false }
            }

            // Is the current block valid?
            if (currentBlock.hash !== currentBlock.getHash) {
                return { chainValid: false }
            }

            // Is the previous block valid?
            if (currentBlock.prevHash !== previousBlock.getHash) {
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

    constructor(public chain: Chain) {
        const keypair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        })

        this.privateKey = keypair.privateKey
        this.publicKey = keypair.publicKey
    }

    sendCoins(amount: number, payeePublicKey: string) {
        const transaction: Transaction = new Transaction(amount, this.publicKey, payeePublicKey)

        transaction.signTransaction = this.privateKey

        this.chain.addTransaction(transaction)

        // const sign: crypto.Signer = crypto.createSign('SHA256')
        // sign.update(transaction.toString()).end()

        // const signature: Buffer = sign.sign(this.privateKey)
        // Chain.instance.addBlock(transaction, signature)
    }
}

// Example usage

const coin = new Chain()

const red = new Wallet(coin)
const green = new Wallet(coin)
const blue = new Wallet(coin)
const greenTrans: [number, string][] = [[10, red.publicKey], [1, red.publicKey]]

red.sendCoins(50, green.publicKey)
greenTrans.map(g => green.sendCoins(...g))
red.sendCoins(11, blue.publicKey)



console.log(`Starting miners`);

coin.minePendingTransaction(red.publicKey)


console.log(coin.chain[1].transactions)
console.log(coin.isChainValid)

console.log(`Balance: ${coin.getBalanceFromAdress(red.publicKey)} coin`);
// console.log(`Balance: ${coin.getBalanceFromAdress(blue.publicKey)} coin`);
// console.log(`Balance: ${coin.getBalanceFromAdress(green.publicKey)} coin`);

// // console.log(Chain.instance.isChainValid);

