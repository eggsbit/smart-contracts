import "@stdlib/deploy";
import "@stdlib/ownable";
import "./nft_eggs_item.tact";
import "./eggs_hatchery_builder.tact";
import "./common/common_messages.tact";
import "./common/nft_eggs_messages.tact";
import "./common/nft_eggs_structures.tact";
import "./common/eggs_hatchery_messages.tact";

contract NftEggsCollection with Deployable, Ownable {

    // Id to change contract before new deploy
    id: Int as uint32;
    // Maximum number of NFTs. After that, the player can only buy NFTs on the market from other players.
    const max_nft_number: Int = 500000;
    // TON coins that we will keep on contract to pay storage fees
    const min_ton_for_storage: Int = ton("0.03");
    // The amount of TON we will pay for the running code in TWM
    const gas_consumtion: Int = ton("0.03");
    // The amount of TON we will pay for the transaction
    const gas_transaction: Int = ton("0.03");
    // The amount of TON we will keep for future transaction from owner wallet
    const gas_service: Int = ton("0.1");

    // Owner of NFTCollection. He has the right to make changes. Master wallet.
    owner: Address;
    // Address of the wallet, which will be replenished with profits
    bank_address: Address;
    // Index of next NFT item
    next_item_index: Int as uint64 = 0;
    // Counter for first eggs generation
    first_generation_counter: Int as uint32 = 0;
    // Amount required for NFT. Only for the first 100000.
    nft_cost: Int as coins = ton("1");
    // Common collection url link
    collection_content: Cell;
    // Royalty collection information
    royalty_params: RoyaltyParams?;

    init(
        id: Int,
        owner_address: Address,
        bank_address: Address,
        collection_content: Cell,
        royalty_params: RoyaltyParams
    ) {
        self.id                            = id;
        self.owner                         = owner_address;
        self.bank_address                  = bank_address;
        self.collection_content            = collection_content;
        self.royalty_params                = royalty_params;
    }

    // Classic mint for sender
    receive("Mint") {
        let ctx: Context = context();
        // The owner is not supposed to be involved in the minting of NFTs for themselves
        require(self.owner != sender(), "Owner can't mint NFT");
        require(self.first_generation_counter <= self.max_nft_number, "The NFT quantity limit has been exhausted");
        require(ctx.value >= self.nft_cost, "Not enough coins transferred");

        self.mint(sender());
        self.first_generation_counter = self.first_generation_counter + 1;
    }

    // Mint as the birth of a new egg
    receive(msg: MintFromHatchery) {
        require(self.get_hatchery_builder_address() == sender(), "Only hatchery builder can create new nft");

        self.mint(msg.receiver);
    }

    fun mint(receiver: Address) {
        require(self.next_item_index >= 0, "Non-sequential NFTs");

        let ctx: Context = context();
        let nft_init: StateInit = self.get_nft_item_state_init(self.next_item_index);

        // Mint a new NFT
        send(SendParameters{
            to: contractAddress(nft_init),
            // The value will be sent to the owner's wallet for future spending
            value: self.transaction_fee() + self.service_fee(),
            mode: SendIgnoreErrors,
            body: Transfer{
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
            to: self.bank_address,
            value: self.profit_amount(),
            mode: SendPayGasSeparately + SendIgnoreErrors,
            body: Excesses{ query_id: 0 }.toCell()
        });

        // Sender notification
        emit(EventMintRecord{
            minter: receiver,
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

    // Create a hatchery builder from collection.
    // It's a single way because we can't provide the adresses to collection and builder - it's circle dependencies.
    // We can't predict the contract name because the contract address in tests and the result of contractAddress
    // inside the contract are different.
    receive("CreateHatcherBuilder") {
        require(self.owner == sender(), "Only owner can create hatchery builder");

        let hatchery_builder: StateInit = self.get_hatchery_builder_state_init();
        send(SendParameters{
            to: contractAddress(hatchery_builder),
            value: 0,
            mode: SendRemainingValue + SendIgnoreErrors,
            body: Deploy{
                queryId: 0
            }.toCell(),
            code: hatchery_builder.code,
            data: hatchery_builder.data
        });
    }

    // After a series of transactions, the collection accumulates money
    // We should be able to withdraw some money
    receive("WithdrawSafe") {
        require(self.bank_address == sender(), "Only bank can withdraw money");

        send(SendParameters{
            to: self.bank_address,
            value: myBalance() - (self.storage_fee() + self.consumtion_fee()),
            mode: SendRemainingValue + SendIgnoreErrors
        });
    }

    // The reciever to update base content link
    receive(msg: UpdateContent) {
        require(self.owner == sender(), "Only owner can change collection content");
        self.collection_content = msg.content;
    }

    receive(msg: NftCostUpdate) {   
        require(self.owner == sender(), "Only owner can set new nft cost");
        self.nft_cost = msg.nft_cost;
    }

    receive(msg: OwnerAddressUpdate) {   
        require(self.owner == sender(), "Only owner can set new owner address");
        self.owner = msg.owner_address;
    }

    receive(msg: BankAddressUpdate) {   
        require(self.bank_address == sender(), "Only bank can set new bank address");
        self.bank_address = msg.bank_address;
    }
   

    // ------------------ Get Function  ------------------ //
    get fun get_collection_data(): CollectionData {
        // Preparing the link for collection data
        let collectionDataUrl: StringBuilder = beginString();
        let collectionDataString: String = self.collection_content.asSlice().asString();
        collectionDataUrl.append(collectionDataString);
        collectionDataUrl.append("collection.json");

        return CollectionData{
            next_item_index: self.next_item_index,
            collection_content: collectionDataUrl.toCell(), 
            owner_address: self.owner
        };
    }

    get fun get_nft_item_state_init(index: Int): StateInit {
        return initOf NftEggsItem(myAddress(), index, self.owner);
    }

    get fun get_nft_address_by_index(index: Int): Address {
        let nft_init: StateInit = self.get_nft_item_state_init(index);
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

    get fun get_max_nft_number(): Int {
        return self.max_nft_number;
    }

    get fun get_nft_cost(): Int {
        return self.nft_cost;
    }

    get fun get_bank_address(): Address {
        return self.bank_address;
    }

    get fun get_hatchery_builder_state_init(): StateInit {
        return initOf EggsHatcheryBuilder(self.id, self.owner, myAddress());
    }

    get fun get_hatchery_builder_address(): Address {
        let hatchery_builder: StateInit = self.get_hatchery_builder_state_init(); 
        return contractAddress(hatchery_builder);
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
