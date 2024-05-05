import "@stdlib/deploy";
import "@stdlib/ownable";
import "./nft_eggs_item.tact";
import "./common/nft_eggs_messages.tact";
import "./common/nft_eggs_structures.tact";

contract NftEggsCollection with Deployable, Ownable {

    // Smart contract version for development
    const contract_version: String = "dev1.0.0";
    // Maximum number of NFTs. After that, the player can only buy NFTs on the market from other players.
    const max_nft_number: Int = 100000;
    // TON coins that we will keep on contract to pay storage fees
    const min_ton_for_storage: Int = ton("0.04");
    // The amount of TON we will pay for the running code in TWM
    const gas_consumtion: Int = ton("0.03");
    // The amount of TON we will pay for the transaction
    const gas_transaction: Int = ton("0.03");
    // The amount of TON we will keep for future transaction from owner wallet
    const gas_service: Int = ton("0.1");

    // Owner of NFTCollection. He has the right to make changes. Master wallet.
    owner: Address;
    // Address of the wallet, which will be replenished with profits
    bank: Address;
    // Index of next NFT item
    next_item_index: Int as uint32 = 0;
    // Amount required for NFT. Only for the first 100000.
    nft_cost: Int as coins = ton("1");
    // Information about collection
    collection_content: Cell;
    // Royalty collection information
    royalty_params: RoyaltyParams?;

    init(
        owner_address: Address,
        bank_address: Address,
        collection_content: Cell,
        royalty_params: RoyaltyParams
    ) {
        self.owner              = owner_address;
        self.bank               = bank_address;
        self.collection_content = collection_content;
        self.royalty_params     = royalty_params;
    }

    receive("Mint") {
        let ctx: Context = context();
        // The owner is not supposed to be involved in the minting of NFTs for themselves
        require(self.owner != sender(), "Owner can't mint NFT");
        require(self.next_item_index >= 0, "Non-sequential NFTs");
        require(self.next_item_index <= self.max_nft_number, "The NFT quantity limit has been exhausted");
        require(ctx.value >= self.nft_cost, "Not enough coins transferred");

        self.mint(sender());
    }

    fun mint(receiver: Address) {
        let ctx: Context = context();
        let nft_init: StateInit = self.get_nft_item_state_init(self.next_item_index);

        // Mint a new NFT
        send(SendParameters{
            to: contractAddress(nft_init),
            // The value will be sent to the owner's wallet for future spending
            value: self.transaction_fee() + self.service_fee(),
            mode: SendIgnoreErrors,
            body: Transfer {
                query_id: 0,
                new_owner: receiver,
                response_destination: self.owner,
                custom_payload: self.collection_content,
                forward_amount: 0,
                forward_payload: emptySlice()
            }.toCell(),
            code: nft_init.code,
            data: nft_init.data
        });

        // Sending the balance to the bank wallet
        send(SendParameters{
            to: self.bank,
            value: self.profit_amount(),
            mode: SendIgnoreErrors
        });

        // Sender notification
        emit(EventMintRecord{
            minter: sender(),
            item_id: self.next_item_index, 
            generate_number: nativeRandom() 
        }.toCell());

        self.next_item_index = self.next_item_index + 1;
    }

    receive(msg: GetRoyaltyParams) {
        let ctx: Context = context();
        send(SendParameters{
            to: ctx.sender,
            value: 0,
            mode: SendRemainingValue,
            bounce: false,
            body: ReportRoyaltyParams{
                query_id: msg.query_id,
                numerator:  (self.royalty_params!!).numerator,
                denominator: (self.royalty_params!!).denominator,
                destination: (self.royalty_params!!).destination
            }.toCell()
        });        
    }

    receive(msg: NftCostUpdate) {   
        require(self.owner == sender(), "Only owner can set new nft cost");
        self.nft_cost = msg.nft_cost;
    }

    receive(msg: BankAddressUpdate) {   
        require(self.bank == sender(), "Only bank can set new bank address");
        self.bank = msg.bank_address;
    }


    // ------------------ Get Function  ------------------ //
    get fun get_collection_data(): CollectionData {
        return CollectionData{
            next_item_index: self.next_item_index,
            collection_content: self.collection_content,
            owner_address: self.owner
        };
    }

    get fun get_nft_address_by_index(item_index: Int): Address {
        let nft_init: StateInit = self.get_nft_item_state_init(item_index); 
        return contractAddress(nft_init);
    }

    get fun get_nft_content(index: Int, individual_content: Cell): Cell { 
        let b: StringBuilder = beginString();
        let ic: String = individual_content.asSlice().asString();
        b.append(ic);
        return b.toCell();
    }

    get fun royalty_params(): RoyaltyParams {
        return self.royalty_params!!;
    }

    get fun get_nft_item_state_init(item_index: Int): StateInit {
        return initOf NftEggsItem(myAddress(), item_index);
    }

    get fun get_max_nft_number(): Int {
        return self.max_nft_number;
    }

    get fun get_nft_cost(): Int {
        return self.nft_cost;
    }


    // ------------------ Fees Calculation Functions  ------------------ //
    fun storage_fee(): Int {
        let ctx: Context = context();
        let balanceBeforeMsg: Int = myBalance() - ctx.value;
        return self.min_ton_for_storage - min(balanceBeforeMsg, self.min_ton_for_storage);
    }

    fun consumtion_fee(): Int {
        return self.gas_consumtion;
    }

    fun transaction_fee(): Int {
        return self.gas_transaction;
    }

    fun service_fee(): Int {
        return self.gas_service;
    }

    fun profit_amount(): Int {
        let ctx: Context = context();
        return ctx.value - (self.storage_fee() + self.consumtion_fee() + self.transaction_fee() + self.service_fee());
    }
}
