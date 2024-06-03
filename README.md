P2P Auction System

This project implements a peer-to-peer (P2P) auction system using Hyperswarm RPC for communication between nodes. Each client in the system can open auctions, place bids, and close auctions, with all events being propagated to all other clients in the network. The approach ensures decentralized communication without relying on a central server.

Setup Instructions

1. Set Up a Private DHT Network
To set up the private DHT network, first install the hyperdht package globally:


npm install -g hyperdht
Then, run your first bootstrap node:


hyperdht --bootstrap --host 127.0.0.1 --port 30001
2. Install Dependencies
Navigate to the project folder and install the required packages:


npm install
3. Run the Server
Run the server to get the public key:


node src/server.js
The server will print the public key. Copy this key and paste it into the auctionHandler.js file, assigning it to the variable serverPublicKey.

4. Run the Clients
Use the following commands to start the clients (adjust the commands as needed for the number of clients):


node src/client.js Client#1 50001
node src/client.js Client#2 50002
node src/client.js Client#3 50003
5. Test the System
Use the following commands in the command line to interact with the auction system:

Create Auction


open auction1 Pic#1 75
open auction2 Pic#2 60
Place a Bid


bid auction1 75.5
bid auction1 80
Close Auction


close auction1
All information will be displayed on the command line.





Features Implemented

P2P Direct Communication:

All clients register their public keys with each other and interact based on events.
Each client displays notifications and updates based on their interactions.
Basic Security:

Auctioneers cannot bid on their own items.
Only the auctioneer can close the auction.
Broadcasting Messages:

Messages are broadcasted to every node based on events.


What's Missing and Limitations

Persistent Storage:

The current implementation stores auction data in memory. For a complete solution, Hyperbee can be used for persistent storage of auction and bid data.
Error Handling:

Comprehensive error handling for edge cases (e.g., auction not found, bid amount lower than starting price) needs to be added.
Security:

Implement authentication and authorization to secure communication and transactions.


Auction Duration:

Implement auction duration to automatically close after a specific time.
Note on Server Dependency
Due to time constraints and issues faced with certain functions like retrieving all peers on a topic, the server.js file currently serves as the initial entry point for all nodes. This can be improved in the future. For more information, refer to Hyperswarm documentation.

Detailed Approach

Overview
We have implemented a P2P auction system using Hyperswarm RPC for communication between nodes. Each client in the system can open auctions, place bids, and close auctions, with all events propagated to all other clients in the network. This approach ensures decentralized communication without a central server.

Key Components
Hyperswarm RPC: For creating RPC servers and clients for P2P communication.
Hypercore and Hyperbee: For data storage and retrieval.
HyperDHT: For creating a distributed hash table for peer discovery.
Detailed Steps
1. Setting Up the Environment

Libraries: Utilized @hyperswarm/rpc, hyperdht, hypercore, hyperbee, and crypto for P2P communication, data storage, and encryption.
Readline: Used for reading user input from the console.
2. Creating the Auction Handler

The core auction functionalities are encapsulated in an AuctionHandler class.

AuctionHandler Class Structure:

Constructor: Initializes variables for client ID, database path, port, and storage for clients and auctions.
init Method: Initializes Hypercore, Hyperbee, DHT, and RPC server.
RPC Server Methods: Defines how the server responds to various events like auctionClosed, new_client_registered, openAuction, placeBid, and closeAuction.
Auction Methods: Methods for opening an auction, placing a bid, closing an auction, and broadcasting messages.
3. Client Initialization

The client.js file:

Creates an instance of AuctionHandler.
Handles user input and invokes the appropriate methods on AuctionHandler.
Sets up the command-line interface to read user commands.
4. Communication and Data Propagation

Opening an Auction: Registers the auction locally and broadcasts the event to all peers.
Placing a Bid: Broadcasts the bid to all peers, ensuring everyone is aware of the current highest bid.
Closing an Auction: Broadcasts the closing event and the winning bid to all peers.
5. Running Multiple Clients

Each client is started with a unique ID and port, allowing multiple clients to run simultaneously and participate in the auction system.

Conclusion
The implemented system ensures:

All clients are notified of every event (auction opening, bidding, closing) in a decentralized manner.
No central server is required, adhering to the P2P paradigm.
The system can scale with the number of clients, maintaining a consistent view of the auctions across the network.
This approach provides a robust foundation for a P2P auction system, leveraging modern decentralized technologies to ensure seamless and secure communication between all participating nodes.



I could implement the core functionalities, but as this was something new and time constraints were tight, I couldn't complete everything. Note: For some functions like getting all peers on a topic from Peer or registering to DHT, I faced some errors and couldn't find a solution in the limited time. Therefore, the server.js file is the initial entry for all the nodes. This can be improved with the information available here.(https://docs.pears.com/how-tos/connect-to-many-peers-by-topic-with-hyperswarm)