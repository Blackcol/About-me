<div style="text-align: justify">

 All this experiences are without filter, i talk in generally about all that i learned by myself and without any type of help more than internet and test/error.<br>
At 2021 when I started there was no chat gpt or something similar.. and stackoverflow didnt have any question answered about web3, so i was mostly test/error and a lot of money lost to learn :)..

## Python
Coded trading bots using python based on passivbot repository, added multiple functions that this doesnt have, like the ability to apply a new type of grid based on Martingala concepts..<br>
Added take profit, stop loss, trailing stop, and the possibility to detect pivots and reset a trailing stop.. as part of a strategy..<br>
Changed the original calculations to determine the entries of the recursive grids..<br>

## About Ai but still python
Coded lot of notebooks testing the limits of AI trying to predict stock prices initially, then deeply consume sklearn using random forest to predict if a crypto asset will be up or down in N minutes in the future with success, specially in BTC, all the data was extracted from other software that i own built in js..<br>
In python I need to built my own simulator to verify "manually" that the model can predicts, and not based on accuracy or other metrics that dont evaluate this complex models..<br>
The simulation included the time of bet and what information the bot can access at certain time and what was the result with that information available.

## Javascript / node.js / bun.js
I developed extractors of data of blockchain and tradingview to store data at exact times that I need. For example I developed another bot that make bets in a dapp, i needed all the information before the time window to bet was closed, so 10 seconds before a bet was about to close the extractor generated all the data..
This run for about 1 year, making constantly new changes, adding new data, etc..
All this data was later used to run simulators with basic strategies, like an AI with simple algos..
All this through 3 years finally became a heavy AI with pure algo maths that searched patterns based on albert einsten last simphony documental.

Coded arbitrage bots that operated in a matter of milliseconds and was very difficult to make nodejs so precise, because i needed nano seconds precision to achieve the best results, for a couple of days tested golang language but it has delays like nodejs too.. so i discard it.. and continued with node js and then migrate it to bun.js to achieve the best results.

Coded simple bots/programs like telegram bots, transfer bots (buy at exchange n asset and transfer it to a wallet to specific blockchain), simple private wallet (generate my wallet from my script and created only transfer usdt function to avoid using metamask or other wallets that can have my secret keys), and others very similar..

Coded blockchain arbitrage bot, this was different because needed my own contract in the blockchain to be effective, all the logic was in js and the contract was in solidity.<br>

Coded more than 6 different versions of arbitrage bots for exchanges using different strategies.<br>
Coded blockchain snipers to buy ASAP when a token launch.<br>
Coded blockchain sniper of dapp called pinksale to buy at launch too.<br>
Coded multiple simulators of my own AI from scratch, finding the best strategy to use with a model.<br>
Coded automated bot for a bet dapp that required calling contract functions in sync with my own AI, extractor in real time to have the data to pass to the AI model, the model generator that updates the model every hour, statistics bot that track all the bets of the bot and generates a lot of stats like winrate, max drawdown, pnl, wins, loses, etc.<br>
Coded multiple (more than 5) bots to automated clic to earn nfts, like PVU, cryptomines, dragonary, eterland, nintia, etc.. all this bots played the game for me 24/7, all them required different algos to avoid being detected and played the game perfectly. Never was banned any of my bots permanently, just temporarily less than a day.

## Solidity
Coded multiple version of my best contract to make arbitrages, swaps, etc, this contract was consumed by my js blockchain contract bot, this can validate it my identity because required a passphrase, also, was limited to operate under certains conditions like within the same blocknumber, and some other functionalities required to make swaps in descentralized apps like pancakeswap.<br>
I needed to learn solidity to identify how the nft games worked, so i can understand how to automate all the process..<br>
Also automated contracts of nft marketplaces, built a js bot to read this contracts for potential buys very cheap and inmediatly buy it in mempool.. that brings us to geth/nodes..

## Blockchain Nodes
I learned to deploy my own node in BSC, played a lot with the configuration and read parts of the code in golang to understand everything better..<br>
Coded a bot to monitor the peers connected to my node and the bot acts like a firewall for bad peers every n seconds..

## Ubuntu
I learned a lot of ubuntu to make my node server very safe!, there was a lot of attackers trying to take down my server, ofc a good hosting was necessary too that pre apply a firewall.. but anyways i ended up learning about firewalls, security, drives.. recovery of files (because once the server got corrupted system), etc..
Obviously for other experiences i deployed web systems like apache or nginx, but this level of security and speed required for nodes was different.

</div>
