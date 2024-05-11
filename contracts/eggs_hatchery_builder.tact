import "@stdlib/deploy";
import "@stdlib/ownable";
import "./eggs_hatchery.tact";
import "./common/common_messages.tact";
import "./common/eggs_hatchery_messages.tact";
import "./common/eggs_hatchery_structures.tact";

contract EggsHatcheryBuilder with Deployable, Ownable {

    // Id to change contract before new deploy
    id: Int as uint32;
    // Contract owner. He has the right to make changes. Master wallet.
    owner: Address;
    // Collection address for transmitting messages
    collection_address: Address;
    // Index of next hatchery item
    next_item_index: Int as uint64 = 0;

    init(
        id: Int,
        owner_address: Address,
        collection_address: Address
    ) {
        self.id                 = id;
        self.owner              = owner_address;
        self.collection_address = collection_address;
    }

    // Create new hatchery when players are ready to create new eggs
    receive(msg: CreateEggsHatchery) {
        require(self.owner == sender(), "Only owner can create a ne hatchery");

        let hatchery_init: StateInit = self.get_hatchery_item_state_init(self.next_item_index);
        send(SendParameters{
            to: contractAddress(hatchery_init),
            value: 0,
            mode: SendRemainingValue + SendIgnoreErrors,
            body: CreateEggsHatchery{
                query_id: msg.query_id,
                parent_one: msg.parent_one,
                parent_two: msg.parent_two,
                birth_cost: msg.birth_cost
            }.toCell(),
            code: hatchery_init.code,
            data: hatchery_init.data
        });

        self.next_item_index = self.next_item_index + 1;
    }

    // Transfer message from hatchery to collection. It's easier to validate sender here.
    receive(msg: MintFromHatchery) {
        let hatchery_init: StateInit = self.get_hatchery_item_state_init(msg.hatchery_index);
        require(contractAddress(hatchery_init) == sender(), "Only hatchery can send a message to mint");

        send(SendParameters{
            to: self.collection_address,
            value: 0,
            mode: SendIgnoreErrors + SendRemainingValue,
            body: MintFromHatchery{
                query_id: msg.query_id,
                hatchery_index: msg.hatchery_index,
                receiver: msg.receiver
            }.toCell()
        });
    }

    receive(msg: OwnerAddressUpdate) {   
        require(self.owner == sender(), "Only owner can set new owner address");
        self.owner = msg.owner_address;
    }

    receive(msg: Slice) {
        send(SendParameters{
            to: self.owner,
            value: 0,
            mode: SendIgnoreErrors + SendRemainingValue
        });
    }

    // ------------------ Get Function  ------------------ //
    get fun get_hatchery_builder_data(): EggsHatcheryBuilderData {
        return EggsHatcheryBuilderData{
            owner_address:      self.owner,
            collection_address: self.collection_address,
            next_item_index:    self.next_item_index
        };
    }

    get fun get_hatchery_address_by_index(item_index: Int): Address {
        let hatchery_init: StateInit = self.get_hatchery_item_state_init(item_index); 
        return contractAddress(hatchery_init);
    }

    get fun get_hatchery_item_state_init(item_index: Int): StateInit {
        return initOf EggsHatchery(myAddress(), item_index);
    }
}
