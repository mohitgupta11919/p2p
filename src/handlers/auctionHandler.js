'use strict';

const RPC = require('@hyperswarm/rpc');
const DHT = require('hyperdht');
const Hypercore = require('hypercore');
const Hyperbee = require('hyperbee');
const crypto = require('crypto');

const serverPublicKey = "7d3aa22d8f28ced07e909c8361f64571122e4addef26440e40dc52c41af6fd6b";
class AuctionHandler {
    constructor(clientId, dbPath, port) {
        this.clientId = clientId;
        this.dbPath = dbPath;
        this.port = port;
        this.clients = {};
        this.auctions = {};
    }

    async init() {
        this.hcore = new Hypercore(this.dbPath);
        this.hbee = new Hyperbee(this.hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' });
        await this.hbee.ready();

        let dhtSeed = (await this.hbee.get('dht-seed'))?.value;
        if (!dhtSeed) {
            dhtSeed = crypto.randomBytes(32);
            await this.hbee.put('dht-seed', dhtSeed);
        } else {
            dhtSeed = Buffer.from(dhtSeed, 'base64');
        }

        this.dht = new DHT({
            port: this.port,
            keyPair: DHT.keyPair(dhtSeed),
            bootstrap: [{ host: '127.0.0.1', port: 30001 }]
        });
        await this.dht.ready();

        this.rpc = new RPC({ dht: this.dht });
        this.rpcServer = this.rpc.createServer();

        this.rpcServer.respond('auctionClosed', async (reqRaw) => {
            const req = JSON.parse(reqRaw.toString('utf-8'));
            console.log(`${this.clientId} received auction closed notification:`, req);
            return Buffer.from(JSON.stringify({ status: 'Notification received' }), 'utf-8');
        });

        this.rpcServer.respond('new_client_registered', async (reqRaw) => {
            const req = JSON.parse(reqRaw.toString('utf-8'));
            console.log(`${this.clientId} received registration notification:`, req);
            this.clients[req.clientPubKey] = true;
            return Buffer.from(JSON.stringify({ status: 'Notification received' }), 'utf-8');
        });

        this.rpcServer.respond('openAuction', async (reqRaw) => {
            const req = JSON.parse(reqRaw.toString('utf-8'));
            console.log(`${this.clientId} received openAuction notification:`, req);
            return Buffer.from(JSON.stringify({ status: 'Notification received' }), 'utf-8');
        });

        this.rpcServer.respond('placeBid', async (reqRaw) => {
            const req = JSON.parse(reqRaw.toString('utf-8'));
            const { auctionId, clientId, bidAmount } = req;
            console.log(`Bid placed on ${auctionId}: ${clientId} bids ${bidAmount} USDt`);
            if (this.auctions[auctionId]) {
                this.auctions[auctionId].bids.push({ clientId, bidAmount });
                return Buffer.from(JSON.stringify({ status: 'Bid placed', auctionId, clientId, bidAmount }), 'utf-8');
            } else {
                return Buffer.from(JSON.stringify({ status: 'Auction not found', auctionId }), 'utf-8');
            }
        });

        this.rpcServer.respond('closeAuction', async (reqRaw) => {
            const req = JSON.parse(reqRaw.toString('utf-8'));
            console.log(`${this.clientId} received closeAuction notification:`, req);
            return Buffer.from(JSON.stringify({ status: 'Notification received' }), 'utf-8');
        });

        await this.rpcServer.listen();
        const serverPubKey = Buffer.from(serverPublicKey, 'hex');
        await this.rpc.request(serverPubKey, 'registerClient', Buffer.from(this.rpcServer.publicKey.toString('hex'), 'utf-8'));
    }

    async openAuction(auctionId, item, startingPrice) {
        const payload = { auctionId, item, startingPrice };
        this.auctions[auctionId] = { item, startingPrice, bids: [] };
        const payloadRaw = Buffer.from(JSON.stringify(payload), 'utf-8');
        const serverPubKey = Buffer.from(serverPublicKey, 'hex');
        await this.rpc.request(serverPubKey, 'openAuction', payloadRaw);
        await this.broadcastMessage('openAuction', payloadRaw);
    }

    async placeBid(auctionId, bidAmount) {
        if (this.auctions[auctionId]) {
            console.log("You can't bid in your own Auction");
            return;
        }
        const payload = { auctionId, clientId: this.clientId, bidAmount };
        const payloadRaw = Buffer.from(JSON.stringify(payload), 'utf-8');
        const serverPubKey = Buffer.from(serverPublicKey, 'hex');
        await this.rpc.request(serverPubKey, 'placeBid', payloadRaw);
        await this.broadcastMessage('placeBid', payloadRaw);
    }

    async closeAuction(auctionId) {
        if (!this.auctions[auctionId]) {
            console.log("You can't close someone else's Auction");
            return;
        }
        const payload = { auctionId };
        const payloadRaw = Buffer.from(JSON.stringify(payload), 'utf-8');
        const auction = this.auctions[auctionId];
        const winningBid = auction.bids.reduce((max, bid) => (bid.bidAmount > max.bidAmount ? bid : max), { bidAmount: 0 });
        console.log(`Auction ${auctionId} closed. Winner: ${winningBid.clientId} with ${winningBid.bidAmount} USDt`);
        delete this.auctions[auctionId];
        const payloadToReturn = Buffer.from(JSON.stringify({ status: 'Auction closed', auctionId, winner: winningBid.clientId, bidAmount: winningBid.bidAmount }), 'utf-8');
        const serverPubKey = Buffer.from(serverPublicKey, 'hex');
        await this.rpc.request(serverPubKey, 'closeAuction', payloadRaw);
        await this.broadcastMessage('closeAuction', payloadToReturn);
    }

    async broadcastMessage(eventName, payload) {
        for (const key in this.clients) {
            await this.rpc.request(Buffer.from(key, 'hex'), eventName, payload);
        }
    }
}

module.exports = AuctionHandler;
