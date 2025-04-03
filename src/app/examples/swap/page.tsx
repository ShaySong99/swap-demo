/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { readContract, writeContract } from '@wagmi/core';
import { ethers, solidityPacked } from 'ethers';
import { useAtomValue } from 'jotai';
import { erc20Abi, formatEther, parseEther } from 'viem';
import { ChainId } from '@/configs/chains';
import { uniRouterAbi } from '@/lib/abis/unirouter';
import { accountAtom } from '@/lib/states/evm';
import { wagmiConfig } from '@/lib/utils/wagmi';
import { Button } from '@/ui/shadcn/button';

const encodePath = (path: string[], fees: number[]): string => {
  if (path.length !== fees.length + 1) {
    throw new Error('path/fee lengths do not match');
  }

  let encoded = '0x';
  for (let i = 0; i < fees.length; i++) {
    // 20 byte encoding of the address
    encoded += path[i].slice(2);
    // 3 byte encoding of the fee
    encoded += fees[i].toString(16).padStart(2 * 3, '0');
  }
  // encode the final token
  encoded += path[path.length - 1].slice(2);

  return encoded.toLowerCase();
};

async function swap(account: `0x${string}`) {
  // https://docs.uniswap.org/contracts/v3/reference/deployments/ethereum-deployments
  // https://github.com/Uniswap/sdks/tree/main/sdks
  // https://docs.uniswap.org/contracts/universal-router/technical-reference#sweep
  const universalRouterAddress = '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad';
  // const universalRouterAddress = '0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b';

  // UNI
  const uniAddress = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';

  // approve
  // https://sepolia.etherscan.io/address/0xfff9976782d46cc05630d1f6ebab18b2324d6b14#writeContract
  const wethAddress = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';

  const amountIn = parseEther('0.008').toString();
  const to = account;
  const V3_SWAP_EXACT_IN = '0x00';
  const V2_SWAP_EXACT_IN = '0x08';
  const fromEoa = false;
  const FEE = '500';

  // https://github.com/Uniswap/v3-sdk/blob/main/src/utils/encodeRouteToPath.ts
  const pathData = solidityPacked(['address', 'uint24', 'address'], [wethAddress, FEE, uniAddress]);
  const pathData01 = encodePath([wethAddress, uniAddress], [500]);

  console.log(
    'path list',
    pathData01,
    pathData,
    'pathData01 === pathData01',
    pathData01 === pathData01,
  );

  const params = [to, amountIn, 0, [wethAddress, uniAddress], fromEoa];
  const v3SwapData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'uint256', 'uint256', 'bytes', 'bool'],
    [to, amountIn, 0, pathData, fromEoa],
  );

  console.log('v3 swapdata', params, v3SwapData);

  const wrap_calldata = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'uint256'],
    [universalRouterAddress, amountIn],
  );

  const v2Calldata = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'uint256', 'uint256', 'address[]', 'bool'],
    [to, amountIn, 0, [wethAddress, uniAddress], fromEoa],
  );

  const allowance = await readContract(wagmiConfig, {
    chainId: ChainId.Sepolia,
    address: wethAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account, universalRouterAddress],
  });

  console.log(
    'allowance',
    formatEther(allowance),
    'allowance>amountIn',
    allowance - BigInt(amountIn) > 0,
  );

  if (allowance - BigInt(amountIn) < 0) {
    await writeContract(wagmiConfig, {
      chainId: ChainId.Sepolia,
      address: wethAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [universalRouterAddress, BigInt(amountIn)],
    });
    // wait tx
  }

  const hash = await writeContract(wagmiConfig, {
    chainId: ChainId.Sepolia,
    address: universalRouterAddress,
    abi: uniRouterAbi,
    functionName: 'execute',
    args: [V3_SWAP_EXACT_IN, [v3SwapData as `0x${string}`]],
    // args: [V2_SWAP_EXACT_IN, [v2Calldata as `0x${string}`]],
    // args: ['0x0b08', [wrap_calldata as `0x${string}`, v2Calldata as `0x${string}`]],
  });

  console.log(`Transaction hash: ${hash}`);
}

export default function Page() {
  const account = useAtomValue(accountAtom);

  return (
    <div className="container">
      <Button
        onClick={() => {
          if (account != null) swap(account);
        }}
      >
        swap
      </Button>
    </div>
  );
}
