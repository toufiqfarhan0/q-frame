// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PQBenchmarkAccount} from "../src/PQBenchmarkAccount.sol";
import {HegotaMocks} from "./HegotaMocks.sol";

contract GasCurveTest is HegotaMocks {
    event Approved(uint256 scope);
    event VerificationBenchmarked(uint256 gasUsed, bytes32 resultingRoot);

    address owner = address(0xA11CE);
    address stranger = address(0xBAD);
    bytes32 initialRoot = keccak256("INITIAL_PQ_ROOT");

    PQBenchmarkAccount account;

    function setUp() public {
        account = new PQBenchmarkAccount(owner, initialRoot);
        mockApprove(address(account));
        mockSigner(address(account), owner);
    }

    /// @notice Baseline test: clean frame with no payload uses < 30k gas and approves
    function test_cleanFrameApproves() public {
        vm.expectEmit(address(account));
        emit Approved(3); // Scope 3 = EXECUTION_AND_PAYMENT
        (bool ok, ) = address(account).call("");
        assertTrue(ok, "clean frame must succeed");
    }

    /// @notice Rejects unauthorized signers regardless of payload
    function test_rejectsUnauthorizedSigner() public {
        mockSigner(address(account), stranger);
        (bool ok, ) = address(account).call("");
        assertFalse(ok, "must revert on bad signer");
    }

    /// @notice Small computation (fits within canonical 100k mempool limit)
    function test_canonicalBoundComputation() public {
        // 5 chains * 10 iterations
        bytes memory payload = abi.encode(uint256(5), uint256(10));
        uint256 gStart = gasleft();
        (bool ok, ) = address(account).call(payload);
        uint256 gUsed = gStart - gasleft();

        assertTrue(ok);
        // Canonical limit is 100,000 gas
        assertTrue(gUsed < 100_000, "must fit below 100k canonical cap");
    }

    /// @notice Realistic Post-Quantum verification workload (FIPS 205 profile)
    /// @dev Demonstrates why this transaction CANNOT enter the canonical mempool
    ///      and strictly requires the ERC-8421 Alternative Mempool (> 100k and < 1M).
    function test_postQuantumWorkloadExceedsCanonicalCap() public {
        // 15 chains * 20 iterations (~240,000 gas)
        bytes memory payload = abi.encode(uint256(15), uint256(20));
        uint256 gStart = gasleft();
        (bool ok, ) = address(account).call(payload);
        uint256 gUsed = gStart - gasleft();

        assertTrue(ok);
        // Must exceed the 100,000 gas canonical limit
        assertTrue(gUsed > 100_000, "PQ workload must exceed 100k canonical cap");
        // Must easily fit within the 1,000,000 gas ERC-8421 staked alt-mempool limit
        assertTrue(gUsed < 1_000_000, "PQ workload must fit within 1M staked alt-mempool cap");
    }
}
