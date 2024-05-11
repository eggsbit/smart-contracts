import "@stdlib/deploy";
import "./common/nft_eggs_messages.tact";
import "./common/nft_eggs_structures.tact";

contract NftEggsItem with Deployable {

    // TON coins that we will keep on contract to pay storage fees
    const min_ton_for_storage: Int = ton("0.03");
    // The amount of TON we will pay for the running code in TWM
    const gas_consumtion: Int = ton("0.03");

    // NFT Item Owner
    owner: Address?;
    // Collection address. The NFT can be minted only from collection contract.
    collection_address: Address;
    // Editor address. To update NFT metadata.
    editor_address: Address;
    // NFT item id
    index: Int as uint64;
    // Is the creation of the NFT complete
    is_initialized: Bool;
    // Common url part for NFT item
    content: Cell?;
    // Information about NFT item
    individual_content: Cell;

    init(collection_address: Address, index: Int, editor_address: Address, individual_content: Cell) {
        require(sender() == collection_address, "Only collection can init nft");

        self.is_initialized     = false;
        self.collection_address = collection_address;
        self.index              = index;
        self.editor_address     = editor_address;
        self.individual_content = individual_content;
    }

    receive(msg: Transfer) {
        if (self.is_initialized == false) {  // Initial Transfer, aka the "Minting" of the NFT
            self.nft_init(msg);
        } else {
            self.nft_transfer(msg);
        }
    }

    fun nft_init(msg: Transfer) {
        let ctx: Context = context();
        require(ctx.sender == self.collection_address, "Only a collection can initiate an NFT item");

        self.is_initialized = true;
        self.owner = msg.new_owner;
        self.content = msg.custom_payload;

        send(SendParameters{
            to: msg.response_destination!!,
            value: self.init_response_amount(),
            mode: SendPayGasSeparately,
            body: Excesses{ query_id: msg.query_id }.toCell()
        });
    }

    fun nft_transfer(msg: Transfer) {
        let ctx: Context = context();
        require(ctx.sender == self.owner!!, "Only owner can transfer NFT");

        self.owner = msg.new_owner;

        if (msg.forward_amount > 0) {
            send(SendParameters{
                to: msg.new_owner,
                value: msg.forward_amount,
                mode:  SendPayGasSeparately, 
                bounce: true,
                body: OwnershipAssigned{
                    query_id: msg.query_id,
                    prev_owner: ctx.sender,
                    forward_payload: msg.forward_payload
                }.toCell()
            }); 
        }

        if (msg.response_destination != null) { 
            send(SendParameters{ 
                to: msg.response_destination!!,
                value: self.transfer_response_amount() - msg.forward_amount,
                mode: SendPayGasSeparately,
                bounce: true,
                body: Excesses { query_id: msg.query_id }.toCell()
            });
        } 
    }

    receive(msg: GetStaticData) { 
        let ctx: Context = context();
        send(SendParameters{
            to: ctx.sender,
            value: 0,
            mode: SendRemainingValue,
            bounce: true,
            body: ReportStaticData{
                query_id: msg.query_id,
                index: self.index,
                collection: self.collection_address
            }.toCell()
        });
    }

    // The reciever to update base content link
    receive(msg: UpdateContent) {
        require(self.editor_address == sender(), "Only editor can change content");
        self.content = msg.content;
    }

    receive(msg: UpdateIndividualContent) {
        require(self.editor_address == sender(), "Only editor can change individual content");
        self.individual_content = msg.individual_content;
    }

    receive(msg: EditorAddressUpdate) {   
        require(self.editor_address == sender(), "Only editor can set new editor address");
        self.editor_address = msg.editor_address;
    }


    // ------------------ Get Function  ------------------ //
    get fun get_nft_data(): NftData {
        // Preparing the link for nft item data
        let nftItemDataUrl: StringBuilder = beginString();
        let contentData: String = (self.content!!).asSlice().asString();
        let individualContentData: String = (self.individual_content).asSlice().asString();
        nftItemDataUrl.append(contentData);
        nftItemDataUrl.append(individualContentData);

        return NftData{
            is_initialized: self.is_initialized, 
            index: self.index, 
            collection_address: self.collection_address, 
            owner_address: self.owner!!,
            individual_content: nftItemDataUrl.toCell()
        };
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

    fun init_response_amount(): Int {
        let ctx: Context = context();
        return ctx.value - (self.storage_fee() + self.consumtion_fee());
    }

    fun transfer_response_amount(): Int {
        let ctx: Context = context();
        return self.init_response_amount() - ctx.readForwardFee(); 
    }
}
