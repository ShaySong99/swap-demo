/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { readContract, writeContract } from '@wagmi/core';
import { ethers } from 'ethers';
import { useAtomValue } from 'jotai';
import { erc20Abi, formatEther, parseEther } from 'viem';
import { ChainId } from '@/configs/chains';
import { uniRouterAbi } from '@/lib/abis/unirouter';
import { accountAtom } from '@/lib/states/evm';
import { wagmiConfig } from '@/lib/utils/wagmi';
import { Button } from '@/ui/shadcn/button';

async function swap(account: `0x${string}`) {
  const universalRouterAddress = '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad';
  // const universalRouterAddress = '0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b';

  // UNI
  const uniAddress = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';

  // approve
  // https://sepolia.etherscan.io/address/0xfff9976782d46cc05630d1f6ebab18b2324d6b14#writeContract
  const wethAddress = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';

  const amountIn = parseEther('0.001').toString();
  const to = account;
  const V3_SWAP_EXACT_IN = '0x00';
  const V2_SWAP_EXACT_IN = '0x08';
  const fromEoa = false;
  const FEE = 500;

  const pathData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'uint256', 'address'],
    [wethAddress, FEE, uniAddress],
  );

  const params = [to, amountIn, 0, [wethAddress, uniAddress], fromEoa];
  const v3SwapData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'uint256', 'uint256', 'bytes', 'bool'],
    [to, amountIn, 0, pathData, fromEoa],
  );

  console.log('v3 swapdata', params);

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
    // args: [V3_SWAP_EXACT_IN, [v3SwapData as `0x${string}`]],
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
