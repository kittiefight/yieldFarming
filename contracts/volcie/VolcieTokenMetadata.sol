pragma solidity ^0.5.5;

import "../libs/openzeppelin_v2_5_0/GSN/Context.sol";
import "../libs/openzeppelin_v2_5_0/token/ERC721/ERC721.sol";
import "../libs/openzeppelin_v2_5_0/token/ERC721/IERC721Metadata.sol";
import "../libs/openzeppelin_v2_5_0/introspection/ERC165.sol";
import "../libs/StringUtils.sol";

/**
 * @dev This is basically a clone of OpenZeppelin ERC721Metadata
 * with small modifications, to generate tokenURI on the fly
 * instead of using a mapping
 */
contract VolcieTokenMetadata is Context, ERC165, ERC721, IERC721Metadata {
    using StringUtils for string;
    using StringUtils for uint256;

    // Token name
    string private _name;

    // Token symbol
    string private _symbol;

    // Base URI
    string private _baseURI;

    /*
     *     bytes4(keccak256('name()')) == 0x06fdde03
     *     bytes4(keccak256('symbol()')) == 0x95d89b41
     *     bytes4(keccak256('tokenURI(uint256)')) == 0xc87b56dd
     *
     *     => 0x06fdde03 ^ 0x95d89b41 ^ 0xc87b56dd == 0x5b5e139f
     */
    bytes4 private constant _INTERFACE_ID_ERC721_METADATA = 0x5b5e139f;

    /**
     * @dev Constructor function
     */
    constructor (string memory name, string memory symbol) public {
        _name = name;
        _symbol = symbol;

        // register the supported interfaces to conform to ERC721 via ERC165
        _registerInterface(_INTERFACE_ID_ERC721_METADATA);
    }

    /**
     * @dev Gets the token name.
     * @return string representing the token name
     */
    function name() external view returns (string memory) {
        return _name;
    }

    /**
     * @dev Gets the token symbol.
     * @return string representing the token symbol
     */
    function symbol() external view returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the URI for a given token ID. May return an empty string.
     *
     * Reverts if the token ID does not exist.
     */
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_exists(tokenId), "VolcieTokenMetadata: URI query for nonexistent token");
        return _baseURI.concat(tokenId.fromUint256(), ".json");
    }

    function contractURI() public view returns (string memory) {
        return _baseURI.concat("contract.json");
    }

    /**
     * @dev Internal function to set the base URI for all token IDs. It is
     * automatically added as a prefix to the value returned in {tokenURI}.
     *
     * _Available since v2.5.0._
     */
    function _setBaseURI(string memory baseURI) internal {
        _baseURI = baseURI;
    }

    /**
    * @dev Returns the base URI set via {_setBaseURI}. This will be
    * automatically added as a preffix in {tokenURI} to each token's URI, when
    * they are non-empty.
    *
    * _Available since v2.5.0._
    */
    function baseURI() external view returns (string memory) {
        return _baseURI;
    }

}
