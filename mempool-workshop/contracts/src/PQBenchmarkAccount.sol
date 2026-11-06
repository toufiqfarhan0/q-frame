// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HegotaSupport} from "@forshtat/hegota-support/contracts/HegotaSupport.sol";
import {Devnet} from "@forshtat/hegota-support/contracts/Devnet.sol";
import {Scope, SigParam} from "@forshtat/hegota-support/contracts/Params.sol";

/// @title PQBenchmarkAccount
/// @notice An EIP-8141 smart account that benchmarks Post-Quantum hash-based verification
///         within native VERIFY execution frames.
/// @dev Inherits HegotaSupport to conform to the ERC-8421 devnet specification.
///      When msg.data carries verification parameters, it runs an iterative hash loop
///      calibrated to match NIST FIPS 205 (SLH-DSA / SPHINCS+) computational workloads (~240k gas).
contract PQBenchmarkAccount is HegotaSupport(Devnet.ERC8421_WORKSHOP) {
    address public immutable owner;
    bytes32 public currentRoot;

    event VerificationBenchmarked(uint256 gasUsed, bytes32 resultingRoot);
    event Executed(address indexed target, uint256 value, bytes data);

    constructor(address owner_, bytes32 initialRoot_) payable {
        owner = owner_;
        currentRoot = initialRoot_;
    }

    /// @notice The VERIFY frame targeting this wallet lands here.
    fallback() external payable {
        // 1. Confirm that the transaction's outer signature matches the registered owner
        require(address(uint160(sigparam(0, SigParam.RESOLVED_SIGNER))) == owner, "bad signer");

        // 2. If verification payload is passed, execute the post-quantum hash-chain computation
        if (msg.data.length >= 64) {
            uint256 startGas = gasleft();
            
            (uint256 chainCount, uint256 iterationsPerChain) = abi.decode(msg.data, (uint256, uint256));
            bytes32 acc = currentRoot;

            // Parameterizable hash loop to model hash-based signature evaluation
            for (uint256 i = 0; i < chainCount; i++) {
                bytes32 chainVal = keccak256(abi.encodePacked(acc, i));
                for (uint256 j = 0; j < iterationsPerChain; j++) {
                    chainVal = keccak256(abi.encodePacked(chainVal, acc));
                }
                acc = chainVal;
            }

            currentRoot = acc;
            emit VerificationBenchmarked(startGas - gasleft(), acc);
        }

        // 3. Approve the frame for execution and payment under EIP-8141
        approve(Scope.EXECUTION_AND_PAYMENT);
    }

    /// @notice Execution payload for SENDER mode execution (Frame 1)
    function execute(address target, uint256 value, bytes calldata data) external payable {
        (bool success, ) = target.call{value: value}(data);
        require(success, "execution failed");
        emit Executed(target, value, data);
    }
}

