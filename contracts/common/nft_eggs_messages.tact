message(0x5fcc3d14) Transfer { 
    query_id: Int as uint64;
    new_owner: Address;
    response_destination: Address?;
    custom_payload: Cell?;
    forward_amount: Int as coins;
    forward_payload: Slice as remaining;
}

message EventMintRecord {
    minter: Address;
    item_id: Int;
    generate_number: Int;
}

message(0x693d3950) GetRoyaltyParams {
    query_id: Int as uint64;
}

message(0xa8cb00ad) ReportRoyaltyParams {
    query_id: Int as uint64;
    numerator: Int as uint16;
    denominator: Int as uint16;
    destination: Address;
}

message(0x05138d91) OwnershipAssigned {
    query_id: Int as uint64;
    prev_owner: Address;
    forward_payload: Slice as remaining;
}

message(0x2fcb26a2) GetStaticData {
    query_id: Int as uint64;
}

message(0x8b771735) ReportStaticData {
    query_id: Int as uint64;
    index: Int;
    collection: Address;
}

message(0xd53276db) Excesses {
    query_id: Int as uint64;
}

message NftCostUpdate {
    query_id: Int as uint64;
    nft_cost: Int as coins;
}

message BankAddressUpdate {
    query_id: Int as uint64;
    bank_address: Address;
}

message EditorAddressUpdate {
    query_id: Int as uint64;
    editor_address: Address;
}

message(0x04) UpdateContent {
    query_id: Int as uint64;
    content: Cell;
}

message UpdateIndividualContent {
    query_id: Int as uint64;
    individual_content: Cell;
}
