import "@stdlib/deploy";
import "@stdlib/ownable";
import "./common/messages.tact";
import "./common/structures.tact";

contract NftEggsItem with Deployable, Ownable {

    // NFT Item Owner
    owner: Address;
    // Collection address. The NFT can be minted only from collection contract.
    collection_address: Address;
    // NFT item id
    item_index: Int as uint64;
    // Information about NFT item
    item_content: String;

    init(
        owner: Address,
        collection_address: Address,
        item_index: Int,
        item_content: String
    ) {
        self.owner = owner;
        self.collection_address = collection_address;
        self.item_index = item_index;
        self.item_content = item_content;
    }

    receive(msg: Transfer) {
        self.requireOwner();
        self.owner = msg.new_owner;
    }

    get fun item_data(): NftEggsItemData {
        return NftEggsItemData{
            owner_address: self.owner,
            collection_address: self.collection_address,
            item_index: self.item_index,
            item_content: self.item_content.asSlice().asCell()
        };
    }
}
