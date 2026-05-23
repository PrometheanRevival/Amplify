// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Amplify — Post messages and echo/reshare others
contract Amplify {
    struct Message {
        uint256 id;
        address author;
        string content;
        uint256 timestamp;
        uint256 echoCount;
        uint256 echoOf; // 0 = original, >0 = echo of that id+1
    }

    Message[] public messages;
    mapping(address => mapping(uint256 => bool)) public hasEchoed;
    uint256 public totalMessages;

    event Posted(uint256 indexed id, address indexed author, string content);
    event Echoed(uint256 indexed echoId, uint256 indexed originalId, address indexed echoer);

    function post(string calldata content) external returns (uint256) {
        require(bytes(content).length > 0, "Empty");
        require(bytes(content).length <= 280, "Too long");
        uint256 id = messages.length;
        messages.push(Message(id, msg.sender, content, block.timestamp, 0, 0));
        totalMessages++;
        emit Posted(id, msg.sender, content);
        return id;
    }

    function echo(uint256 originalId) external returns (uint256) {
        require(originalId < messages.length, "Not found");
        require(!hasEchoed[msg.sender][originalId], "Already echoed");
        require(messages[originalId].author != msg.sender, "Can't echo own post");
        hasEchoed[msg.sender][originalId] = true;
        messages[originalId].echoCount++;
        uint256 echoId = messages.length;
        messages.push(Message(echoId, msg.sender, messages[originalId].content, block.timestamp, 0, originalId + 1));
        totalMessages++;
        emit Echoed(echoId, originalId, msg.sender);
        return echoId;
    }

    function getFeed(uint256 count) external view returns (Message[] memory) {
        uint256 len = messages.length;
        uint256 n = count > len ? len : count;
        Message[] memory result = new Message[](n);
        for (uint256 i = 0; i < n; i++) result[i] = messages[len - 1 - i];
        return result;
    }

    function getMessage(uint256 id) external view returns (Message memory) {
        require(id < messages.length, "Not found");
        return messages[id];
    }
}
