export const SUNPUMP_ABI = {
  entrys: [
    {
      inputs: [
        {
          name: "token",
          type: "address",
        },
      ],
      name: "LaunchPending",
      type: "Event",
    },
    {
      inputs: [
        {
          indexed: true,
          name: "oldLauncher",
          type: "address",
        },
        {
          indexed: true,
          name: "newLauncher",
          type: "address",
        },
      ],
      name: "LauncherChanged",
      type: "Event",
    },
    {
      inputs: [
        {
          name: "oldFee",
          type: "uint256",
        },
        {
          name: "newFee",
          type: "uint256",
        },
      ],
      name: "MinTxFeeSet",
      type: "Event",
    },
    {
      inputs: [
        {
          name: "oldFee",
          type: "uint256",
        },
        {
          name: "newFee",
          type: "uint256",
        },
      ],
      name: "MintFeeSet",
      type: "Event",
    },
    {
      inputs: [
        {
          indexed: true,
          name: "oldOperator",
          type: "address",
        },
        {
          indexed: true,
          name: "newOperator",
          type: "address",
        },
      ],
      name: "OperatorChanged",
      type: "Event",
    },
    {
      inputs: [
        {
          indexed: true,
          name: "oldOwner",
          type: "address",
        },
        {
          indexed: true,
          name: "newOwner",
          type: "address",
        },
      ],
      name: "OwnerChanged",
      type: "Event",
    },
    {
      inputs: [
        {
          indexed: true,
          name: "oldPendingOwner",
          type: "address",
        },
        {
          indexed: true,
          name: "newPendingOwner",
          type: "address",
        },
      ],
      name: "PendingOwnerSet",
      type: "Event",
    },
    {
      inputs: [
        {
          name: "oldFee",
          type: "uint256",
        },
        {
          name: "newFee",
          type: "uint256",
        },
      ],
      name: "PurchaseFeeSet",
      type: "Event",
    },
    {
      inputs: [
        {
          name: "oldFee",
          type: "uint256",
        },
        {
          name: "newFee",
          type: "uint256",
        },
      ],
      name: "SaleFeeSet",
      type: "Event",
    },
    {
      inputs: [
        {
          name: "tokenAddress",
          type: "address",
        },
        {
          name: "tokenIndex",
          type: "uint256",
        },
        {
          name: "creator",
          type: "address",
        },
      ],
      name: "TokenCreate",
      type: "Event",
    },
    {
      inputs: [
        {
          indexed: true,
          name: "token",
          type: "address",
        },
      ],
      name: "TokenLaunched",
      type: "Event",
    },
    {
      inputs: [
        {
          indexed: true,
          name: "token",
          type: "address",
        },
        {
          indexed: true,
          name: "buyer",
          type: "address",
        },
        {
          name: "trxAmount",
          type: "uint256",
        },
        {
          name: "fee",
          type: "uint256",
        },
        {
          name: "tokenAmount",
          type: "uint256",
        },
        {
          name: "tokenReserve",
          type: "uint256",
        },
      ],
      name: "TokenPurchased",
      type: "Event",
    },
    {
      inputs: [
        {
          indexed: true,
          name: "token",
          type: "address",
        },
        {
          indexed: true,
          name: "seller",
          type: "address",
        },
        {
          name: "trxAmount",
          type: "uint256",
        },
        {
          name: "fee",
          type: "uint256",
        },
        {
          name: "tokenAmount",
          type: "uint256",
        },
      ],
      name: "TokenSold",
      type: "Event",
    },
    {
      outputs: [
        {
          type: "uint256",
        },
      ],
      name: "LAUNCH_FEE",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "uint256",
        },
      ],
      name: "LAUNCH_THRESHOLD",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "uint256",
        },
      ],
      name: "LAUNCH_TRX_RESERVE",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "uint256",
        },
      ],
      name: "TOKEN_SUPPLY",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "uint256",
        },
      ],
      name: "TOTAL_SALE",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "uint256",
        },
      ],
      name: "VIRTUAL_TOKEN_RESERVE_AMOUNT",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "uint256",
        },
      ],
      name: "VIRTUAL_TRX_RESERVE_AMOUNT",
      stateMutability: "View",
      type: "Function",
    },
    {
      inputs: [
        {
          name: "proxy",
          type: "address",
        },
      ],
      name: "_becomeNewImplementation",
      stateMutability: "Nonpayable",
      type: "Function",
    },
    {
      name: "acceptOwner",
      stateMutability: "Nonpayable",
      type: "Function",
    },
    {
      inputs: [
        {
          name: "name",
          type: "string",
        },
        {
          name: "symbol",
          type: "string",
        },
      ],
      name: "createAndInitPurchase",
      stateMutability: "Payable",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "address",
        },
      ],
      name: "deadAddress",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          name: "trxAmount",
          type: "uint256",
        },
      ],
      inputs: [
        {
          name: "token",
          type: "address",
        },
        {
          name: "tokenAmount",
          type: "uint256",
        },
      ],
      name: "getExactTokenAmountForPurchase",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          name: "trxAmount",
          type: "uint256",
        },
        {
          name: "fee",
          type: "uint256",
        },
      ],
      inputs: [
        {
          name: "token",
          type: "address",
        },
        {
          name: "tokenAmount",
          type: "uint256",
        },
      ],
      name: "getExactTokenAmountForPurchaseWithFee",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          name: "tokenAmount",
          type: "uint256",
        },
      ],
      inputs: [
        {
          name: "token",
          type: "address",
        },
        {
          name: "trxAmount",
          type: "uint256",
        },
      ],
      name: "getExactTrxAmountForSale",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          name: "tokenAmount",
          type: "uint256",
        },
        {
          name: "fee",
          type: "uint256",
        },
      ],
      inputs: [
        {
          name: "token",
          type: "address",
        },
        {
          name: "trxAmount",
          type: "uint256",
        },
      ],
      name: "getExactTrxAmountForSaleWithFee",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "uint256",
        },
      ],
      inputs: [
        {
          name: "token",
          type: "address",
        },
      ],
      name: "getPrice",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          name: "tokenAmount",
          type: "uint256",
        },
      ],
      inputs: [
        {
          name: "token",
          type: "address",
        },
        {
          name: "trxAmount",
          type: "uint256",
        },
      ],
      name: "getTokenAmountByPurchase",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          name: "tokenAmount",
          type: "uint256",
        },
        {
          name: "fee",
          type: "uint256",
        },
      ],
      inputs: [
        {
          name: "token",
          type: "address",
        },
        {
          name: "trxAmount",
          type: "uint256",
        },
      ],
      name: "getTokenAmountByPurchaseWithFee",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "uint256",
        },
      ],
      inputs: [
        {
          name: "token",
          type: "address",
        },
      ],
      name: "getTokenState",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          name: "trxAmount",
          type: "uint256",
        },
      ],
      inputs: [
        {
          name: "token",
          type: "address",
        },
        {
          name: "tokenAmount",
          type: "uint256",
        },
      ],
      name: "getTrxAmountBySale",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          name: "trxAmount",
          type: "uint256",
        },
        {
          name: "fee",
          type: "uint256",
        },
      ],
      inputs: [
        {
          name: "token",
          type: "address",
        },
        {
          name: "tokenAmount",
          type: "uint256",
        },
      ],
      name: "getTrxAmountBySaleWithFee",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "address",
        },
      ],
      name: "implementation",
      stateMutability: "View",
      type: "Function",
    },
    {
      inputs: [
        {
          name: "_vault",
          type: "address",
        },
        {
          name: "_v2Router",
          type: "address",
        },
        {
          name: "_salefee",
          type: "uint256",
        },
        {
          name: "_purchasefee",
          type: "uint256",
        },
      ],
      name: "initialize",
      stateMutability: "Nonpayable",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "uint256",
        },
      ],
      name: "launchFee",
      stateMutability: "View",
      type: "Function",
    },
    {
      inputs: [
        {
          name: "token",
          type: "address",
        },
      ],
      name: "launchToDEX",
      stateMutability: "Nonpayable",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "address",
        },
      ],
      name: "launcher",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "uint256",
        },
      ],
      name: "maxPurachaseAmount",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "uint256",
        },
      ],
      name: "minTxFee",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "uint256",
        },
      ],
      name: "mintFee",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "address",
        },
      ],
      name: "operator",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "address",
        },
      ],
      name: "owner",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "bool",
        },
      ],
      name: "pause",
      stateMutability: "View",
      type: "Function",
    },
    {
      name: "pausePad",
      stateMutability: "Nonpayable",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "address",
        },
      ],
      name: "pendingImplementation",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "address",
        },
      ],
      name: "pendingOwner",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "uint256",
        },
      ],
      name: "purchaseFee",
      stateMutability: "View",
      type: "Function",
    },
    {
      inputs: [
        {
          name: "token",
          type: "address",
        },
        {
          name: "AmountMin",
          type: "uint256",
        },
      ],
      name: "purchaseToken",
      stateMutability: "Payable",
      type: "Function",
    },
    {
      name: "rerunPad",
      stateMutability: "Nonpayable",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "uint256",
        },
      ],
      name: "saleFee",
      stateMutability: "View",
      type: "Function",
    },
    {
      inputs: [
        {
          name: "token",
          type: "address",
        },
        {
          name: "tokenAmount",
          type: "uint256",
        },
        {
          name: "AmountMin",
          type: "uint256",
        },
      ],
      name: "saleToken",
      stateMutability: "Nonpayable",
      type: "Function",
    },
    {
      inputs: [
        {
          name: "newLauncher",
          type: "address",
        },
      ],
      name: "setLauncher",
      stateMutability: "Nonpayable",
      type: "Function",
    },
    {
      inputs: [
        {
          name: "newFee",
          type: "uint256",
        },
      ],
      name: "setMinTxFee",
      stateMutability: "Nonpayable",
      type: "Function",
    },
    {
      inputs: [
        {
          name: "_newMintFee",
          type: "uint256",
        },
        {
          name: "_newMinTxFee",
          type: "uint256",
        },
      ],
      name: "setMintAndMinTxFee",
      stateMutability: "Nonpayable",
      type: "Function",
    },
    {
      inputs: [
        {
          name: "newFee",
          type: "uint256",
        },
      ],
      name: "setMintFee",
      stateMutability: "Nonpayable",
      type: "Function",
    },
    {
      inputs: [
        {
          name: "newOp",
          type: "address",
        },
      ],
      name: "setOperator",
      stateMutability: "Nonpayable",
      type: "Function",
    },
    {
      inputs: [
        {
          name: "newPendingOwner",
          type: "address",
        },
      ],
      name: "setPendingOwner",
      stateMutability: "Nonpayable",
      type: "Function",
    },
    {
      inputs: [
        {
          name: "_fee",
          type: "uint256",
        },
      ],
      name: "setPurchaseFee",
      stateMutability: "Nonpayable",
      type: "Function",
    },
    {
      inputs: [
        {
          name: "_fee",
          type: "uint256",
        },
      ],
      name: "setSaleFee",
      stateMutability: "Nonpayable",
      type: "Function",
    },
    {
      inputs: [
        {
          name: "_addr",
          type: "address",
        },
      ],
      name: "setVault",
      stateMutability: "Nonpayable",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "address",
        },
      ],
      inputs: [
        {
          type: "uint256",
        },
      ],
      name: "tokenAddress",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "uint256",
        },
      ],
      name: "tokenCount",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "address",
        },
      ],
      inputs: [
        {
          type: "address",
        },
      ],
      name: "tokenCreator",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "address",
        },
      ],
      name: "v2Router",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          type: "address",
        },
      ],
      name: "vault",
      stateMutability: "View",
      type: "Function",
    },
    {
      outputs: [
        {
          name: "TRXReserve",
          type: "uint256",
        },
        {
          name: "TokenReserve",
          type: "uint256",
        },
        {
          name: "launched",
          type: "bool",
        },
      ],
      inputs: [
        {
          type: "address",
        },
      ],
      name: "virtualPools",
      stateMutability: "View",
      type: "Function",
    },
    {
      stateMutability: "Payable",
      type: "Receive",
    },
  ],
};
