#! /usr/bin/env node

import axios from 'axios'

type Block = {
  height: number
  time: number
}

const FIRST_BLOCK_MS = 1231006505

async function getBlock(blockHeight: number): Promise<Block> {
  type HttpResponse = {
    blocks: { time: number }[]
  }

  const { data } = await axios.get<HttpResponse>(`https://blockchain.info/block-height/${blockHeight}?format=json`)

  if (data.blocks.length === 0) {
    throw new Error('Block not found')
  }

  return {
    height: blockHeight,
    time: data.blocks[0].time,
  }
}

async function getLatestBlock(): Promise<Block> {
  type HttpResponse = {
    height: number
    time: number
  }
  const { data } = await axios.get<HttpResponse>(`https://blockchain.info/latestblock`)
  return {
    time: data.time,
    height: data.height,
  }
}

type BlockHeight = number | undefined

async function findBlockHeightByTs(ts: number): Promise<BlockHeight> {
  if (ts < FIRST_BLOCK_MS) {
    throw new Error(`Timestamp ${ts} is less than the genesis block timestamp ${FIRST_BLOCK_MS}`)
  }

  if (ts === FIRST_BLOCK_MS) {
    throw new Error(`Timestamp ${ts} is equal to genesis block timestamp ${FIRST_BLOCK_MS}`)
  }

  let startBlock: Block = { height: 0, time: FIRST_BLOCK_MS }
  let endBlock: Block = await getLatestBlock()

  if (ts > endBlock.time) {
    return endBlock.height
  }

  while (startBlock.height <= endBlock.height) {
    const midBlockheight = Math.min(Math.ceil((startBlock.height + endBlock.height) / 2), endBlock.height)

    const [midBlockLessOne, midBlock] = await Promise.all([getBlock(midBlockheight - 1), getBlock(midBlockheight)])
    console.log(
      `s: ${startBlock.height} (${startBlock.time}), m-1: ${midBlockheight - 1} (${
        midBlockLessOne.time
      }), m: ${midBlockheight} (${midBlock.time}), e: ${endBlock.height} (${endBlock.time})`,
    )

    if (midBlockLessOne.time < ts) {
      if (ts <= midBlock.time) {
        return midBlockLessOne.height
      }
      startBlock = midBlock
    } else {
      endBlock = midBlockLessOne
    }
  }

  throw new Error(`failed to find block before timestamp ${ts}`)
}

async function main() {
  if(process.argv[2] === undefined){
    throw new Error(`Please provide a timestamp`)
  }
  const result = await findBlockHeightByTs(Number(process.argv[2]))
  console.log(result)
}

main()
