import "@stdlib/deploy";
import "@stdlib/ownable";
import "./nft_eggs_item.tact";
import "./common/messages.tact";
import "./common/structures.tact";

contract NftEggsCollection with Deployable, Ownable {

    // Smart contract version for development
    const contract_version: String = "dev1.0.0";
    // Maximum number of NFTs. After that, the player can only buy NFTs on the market from other players.
    const max_nft_number: Int = 100000;
    // TON coins that we will keep on contract to pay storage fees
    const min_ton_for_storage: Int = ton("0.03");
    // The amount of TON we will pay for the running code in TWM
    const gas_consumtion: Int = ton("0.03");
    // The amount of TON we will pay for the transaction
    const gas_transaction: Int = ton("0.03");

    // Owner of NFTCollection. He has the right to make changes.
    owner: Address;
    // Index of next NFT item
    next_item_index: Int as uint32 = 0;
    // Amount required for NFT
    nft_cost: Int as coins = ton("1");
    // Information about collection
    collection_content: String;

    init() {
        self.owner = sender();
        self.collection_content = "EggsBit Collection";
    }

    receive("Mint") {
        // The owner is not supposed to be involved in the minting of NFTs for themselves
        require(self.owner != sender(), "Owner can't mint NFT");
        self.mint(sender());
    }

    fun mint(receiver: Address) {
        let ctx: Context = context();
        // Message validation 
        require(self.next_item_index >= 0, "Non-sequential NFTs");
        require(self.next_item_index <= self.max_nft_number, "The NFT quantity limit has been exhausted");
        require(ctx.value >= self.nft_cost, "Not enough coins transferred");

        // Mint NFT
        let nft_init: StateInit = self.nft_item_init(self.next_item_index);
        send(SendParameters{
            to: contractAddress(nft_init),
            value: self.transaction_fee(),
            mode: SendIgnoreErrors,
            body: Transfer{
                query_id: 0,
                new_owner: receiver
            }.toCell(),
            code: nft_init.code,
            data: nft_init.data
        });

        // Sending the balance to the owner's wallet
        send(SendParameters{
            to: self.owner,
            value: self.owner_address_transaction_value(ctx.value),
            mode: SendIgnoreErrors
        });

        self.next_item_index = self.next_item_index + 1;
    }

    get fun nft_item_init(item_index: Int): StateInit {
        let b: StringBuilder = beginString();
        b.append("Item # - ");
        b.append(item_index.toString());

        return initOf NftEggsItem(myAddress(), myAddress(), item_index, b.toString());
    }

    get fun nft_address_by_index(item_index: Int): Address {
        let nft_init: StateInit = self.nft_item_init(item_index); 
        return contractAddress(nft_init);
    }

    get fun collection_data(): NftEggsCollectionData {
        return NftEggsCollectionData{
            max_nft_number: self.max_nft_number,
            next_item_index: self.next_item_index,
            collection_content: self.collection_content.asSlice().asCell(),
            nft_cost: self.nft_cost,
            owner_address: self.owner
        };
    }

    get fun storage_fee(): Int {
        let ctx: Context = context();
        let balanceBeforeMsg: Int = myBalance() - ctx.value;
        return self.min_ton_for_storage - min(balanceBeforeMsg, self.min_ton_for_storage);
    }

    get fun consumtion_fee(): Int {
        return self.gas_consumtion;
    }

    get fun transaction_fee(): Int {
        return self.gas_transaction;
    }

    get fun owner_address_transaction_value(income_value: Int): Int {
        return income_value - (self.storage_fee() + self.consumtion_fee() + self.transaction_fee());
    }
}
