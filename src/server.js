'use strict'

const RPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const Hypercore = require('hypercore')
const Hyperbee = require('hyperbee')
const crypto = require('crypto')

const main = async () => {
  // Initialize Hypercore and Hyperbee
  const hcore = new Hypercore('./db/rpc-server')
  const hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
  await hbee.ready()

  // Generate or retrieve the DHT seed
  let dhtSeed = (await hbee.get('dht-seed'))?.value
  if (!dhtSeed) {
    dhtSeed = crypto.randomBytes(32)
    await hbee.put('dht-seed', dhtSeed)
  }

  // Initialize the DHT
  const dht = new DHT({
    port: 40001,
    keyPair: DHT.keyPair(dhtSeed),
    bootstrap: [{ host: '127.0.0.1', port: 30001 }]
  })
  await dht.ready()

  // Generate or retrieve the RPC seed
  let rpcSeed = (await hbee.get('rpc-seed'))?.value
  if (!rpcSeed) {
    rpcSeed = crypto.randomBytes(32)
    await hbee.put('rpc-seed', rpcSeed)
  }

  // Initialize the RPC server
  const rpc = new RPC({ seed: rpcSeed, dht })
  const rpcServer = rpc.createServer()
  await rpcServer.listen()
  console.log('RPC server started listening on public key:', rpcServer.publicKey.toString('hex'))

  // Store the public key in Hyperbee
  await hbee.put('rpc-server-public-key', rpcServer.publicKey.toString('hex'))

  // In-memory auction data
  const auctions = {}
  const clients = {}

  // Register RPC handlers
  rpcServer.respond('openAuction', async (reqRaw) => {
    const req = JSON.parse(reqRaw.toString('utf-8'))
    const { auctionId, item, startingPrice } = req
    auctions[auctionId] = { item, startingPrice, bids: [] }
    console.log(`Auction ${auctionId} opened: ${item} starting at ${startingPrice} USDt`)
    return Buffer.from(JSON.stringify({ status: 'Auction opened', auctionId }), 'utf-8')
  })

  rpcServer.respond('placeBid', async (reqRaw) => {
    const req = JSON.parse(reqRaw.toString('utf-8'))
    const { auctionId, clientId, bidAmount } = req
    if (auctions[auctionId]) {
      auctions[auctionId].bids.push({ clientId, bidAmount })
      console.log(`Bid placed on ${auctionId}: ${clientId} bids ${bidAmount} USDt`)
      return Buffer.from(JSON.stringify({ status: 'Bid placed', auctionId, clientId, bidAmount }), 'utf-8')
    } else {
      return Buffer.from(JSON.stringify({ status: 'Auction not found', auctionId }), 'utf-8')
    }
  })

  rpcServer.respond('closeAuction', async (reqRaw) => {
    const req = JSON.parse(reqRaw.toString('utf-8'))
    const { auctionId } = req
    if (auctions[auctionId]) {
      const auction = auctions[auctionId]
      const winningBid = auction.bids.reduce((max, bid) => (bid.bidAmount > max.bidAmount ? bid : max), { bidAmount: 0 })
      console.log(`Auction ${auctionId} closed. Winner: ${winningBid.clientId} with ${winningBid.bidAmount} USDt`)
      
      // Notify all clients about the auction closure
    //   for (const clientPubKey in clients) {
    //     await rpc.request(Buffer.from(clientPubKey, 'hex'), 'auctionClosed', Buffer.from(JSON.stringify({ auctionId, winner: winningBid.clientId, bidAmount: winningBid.bidAmount }), 'utf-8'))
    //   }

      delete auctions[auctionId]
      return Buffer.from(JSON.stringify({ status: 'Auction closed', auctionId, winner: winningBid.clientId, bidAmount: winningBid.bidAmount }), 'utf-8')
    } else {
      return Buffer.from(JSON.stringify({ status: 'Auction not found', auctionId }), 'utf-8')
    }
  })

  rpcServer.respond('registerClient', async (reqRaw) => {
    const clientPubKey = reqRaw.toString('utf-8')

    for (const clientKey in clients) {
        await rpc.request(Buffer.from(clientPubKey, 'hex'), 'new_client_registered', Buffer.from(JSON.stringify({"clientPubKey" :clientKey}), 'utf-8'))
      }
    clients[clientPubKey] = true
    console.log(`Client registered: ${clientPubKey}`)

    for (const clientKey in clients) {
        if (clientKey != clientPubKey)
        await rpc.request(Buffer.from(clientKey, 'hex'), 'new_client_registered', Buffer.from(JSON.stringify({clientPubKey}), 'utf-8'))

      }
      console.log(clients)

    return Buffer.from(JSON.stringify({ status: 'Client registered', clientPubKey }), 'utf-8')
  })
}

main().catch(console.error)
