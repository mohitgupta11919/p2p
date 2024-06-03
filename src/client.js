'use strict';

const readline = require('readline');
const AuctionHandler = require('./handlers/auctionHandler');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const main = async (clientId, dbPath, port) => {
    const auctionHandler = new AuctionHandler(clientId, dbPath, port);
    await auctionHandler.init();

    const prompt = () => {
        rl.question('Enter command (open, bid, close, exit): ', async (command) => {
            const [action, ...args] = command.split(' ');

            if (action === 'open') {
                const [auctionId, item, startingPrice] = args;
                await auctionHandler.openAuction(auctionId, item, parseFloat(startingPrice));
            } else if (action === 'bid') {
                const [auctionId, bidAmount] = args;
                await auctionHandler.placeBid(auctionId, parseFloat(bidAmount));
            } else if (action === 'close') {
                const [auctionId] = args;
                await auctionHandler.closeAuction(auctionId);
            } else if (action === 'exit') {
                rl.close();
                await auctionHandler.rpc.destroy();
                await auctionHandler.dht.destroy();
                return;
            } else {
                console.log('Unknown command');
            }
            prompt();
        });
    }

    prompt();
}

const args = process.argv.slice(2);
const clientId = args[0] || 'Client#1';
const port = parseInt(args[1], 10) || 50001;

main(clientId, `./db/rpc-client${clientId}`, port).catch(console.error);
