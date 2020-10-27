pragma solidity ^0.5.5;

/**
 * Based on OpenZeppelin and Oraclize libraries.
 * - https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol (MIT licence)
 */
library StringUtils {
    struct Slice {
        uint256 _len;
        uint256 _ptr;
    }

    function concat(string memory a, string memory b)
        internal
        pure
        returns (string memory)
    {
        return string(abi.encodePacked(a, b));
    }

    function concat(
        string memory a,
        string memory b,
        string memory c
    ) internal pure returns (string memory) {
        return string(abi.encodePacked(a, b, c));
    }

    function fromUint256(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        uint256 index = digits - 1;
        temp = value;
        while (temp != 0) {
            buffer[index--] = bytes1(uint8(48 + (temp % 10)));
            temp /= 10;
        }
        return string(buffer);
    }

    function fromUint256(
        uint256 value,
        uint256 decimals,
        uint256 precision
    ) internal pure returns (string memory) {
        require(precision <= decimals, "StringUtils: incorrect precision");
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        if (digits <= decimals) {
            digits = decimals + 2; //add "0."
        } else {
            digits = digits + 1; //add "."
        }
        uint256 truncateDecimals = decimals - precision;
        uint256 bufferLen = digits - truncateDecimals;
        uint256 dotIndex = bufferLen - precision - 1;
        bytes memory buffer = new bytes(bufferLen);
        uint256 index = bufferLen;
        temp = value / 10**truncateDecimals;
        while (temp != 0) {
            index--;
            if (index == dotIndex) {
                buffer[index] = ".";
                index--;
            }
            buffer[index] = bytes1(uint8(48 + (temp % 10)));
            temp /= 10;
        }
        while (index > 0) {
            index--;
            if (index == dotIndex) {
                buffer[index] = ".";
            } else {
                buffer[index] = "0";
            }
        }
        return string(buffer);
    }
}
