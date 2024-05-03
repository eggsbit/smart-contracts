struct NftEggsCollectionData{
    max_nft_number: Int;
    next_item_index: Int;
    collection_content: Cell;
    nft_cost: Int;
    owner_address: Address;
}

struct NftEggsItemData{
    owner_address: Address;
    collection_address: Address;
    item_index: Int;
    item_content: Cell;
}
