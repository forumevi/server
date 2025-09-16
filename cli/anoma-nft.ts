#!/usr/bin/env ts-node

import { Command } from 'commander';
import { create } from 'ipfs-http-client';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const program = new Command();

// IPFS Client
const ipfs = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
});

// Zincir yapılandırması
const CHAINS = [
  { name: 'Ethereum', gasPriceUrl: 'https://api.etherscan.io/api?module=proxy&action=eth_gasPrice', feeToken: 'ETH', avgBlockTime: 13 },
  { name: 'Polygon', gasPriceUrl: 'https://polygon-rpc.com/', feeToken: 'MATIC', avgBlockTime: 2 },
  { name: 'Optimism', gasPriceUrl: 'https://mainnet.optimism.io/', feeToken: 'ETH', avgBlockTime: 2 },
];

interface ChainOption {
  name: string;
  gasPrice: number;
  avgBlockTime: number;
  feeToken: string;
  estimatedCost: number;
}

async function getGasPrice(chain: any): Promise<number> {
  try {
    if (chain.name === 'Ethereum') {
      const res = await axios.get(chain.gasPriceUrl);
      return parseInt(res.data.result, 16) / 1e9;
    }
    if (chain.name === 'Polygon') return 30;
    if (chain.name === 'Optimism') return 0.1;
    return 1.0;
  } catch (e) {
    console.warn(`⚠️ Could not fetch gas for ${chain.name}, using default.`);
    return 1.0;
  }
}

async function selectOptimalChain(): Promise<ChainOption> {
  const chainData = await Promise.all(
    CHAINS.map(async (chain) => {
      const gasPrice = await getGasPrice(chain);
      const estimatedCost = gasPrice * 0.0001;
      return { ...chain, gasPrice, estimatedCost };
    })
  );
  const sorted = chainData.sort((a, b) => a.estimatedCost - b.estimatedCost);
  return sorted[0];
}

async function uploadToIPFS(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  const fileContent = fs.readFileSync(filePath);
  const { cid } = await ipfs.add(fileContent);
  return `ipfs://${cid.toString()}`;
}

async function generateMetadata(name: string, imageUri: string): Promise<string> {
  const metadata = {
    name,
    description: `Anoma NFT — minted via intent`,
    image: imageUri,
    attributes: [
      { trait_type: "Minted Via", value: "Anoma Intent Engine" },
      { trait_type: "Cross-Chain", value: "Yes" }
    ]
  };
  const metadataJson = JSON.stringify(metadata, null, 2);
  const { cid } = await ipfs.add(metadataJson);
  return `ipfs://${cid.toString()}`;
}

function saveNftRecord(nftData: any) {
  const dbPath = './db/nfts.json';
  if (!fs.existsSync('./db')) fs.mkdirSync('./db');
  let db = [];
  if (fs.existsSync(dbPath)) {
    const raw = fs.readFileSync(dbPath, 'utf-8');
    db = JSON.parse(raw);
  }
  const record = {
    id: nftData.token_id,
    name: nftData.name,
    image_uri: nftData.imageUri,
    metadata_uri: nftData.metadataUri,
    owner: nftData.owner,
    chain: nftData.chain.name,
    price: "0",
    intents: { ethereum: [], polygon: [], optimism: [] }
  };
  db.push(record);
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

async function mintNft(name: string, imagePath: string, chain: ChainOption) {
  const owner = process.env.DEFAULT_OWNER || "atest1d9khqw36xcx3p3v27s330g7g8n36g53v27s330g7g8n36g5";
  const token_id = `nft_${Date.now()}`;
  const imageUri = await uploadToIPFS(imagePath);
  const metadataUri = await generateMetadata(name, imageUri);

  console.log(`\n🪙 Simulating mint on ${chain.name}...`);
  console.log(`🖼️  Image: ${imageUri}`);
  console.log(`📄 Meta: ${metadataUri}`);

  saveNftRecord({ name, imageUri, metadataUri, owner, chain, token_id });

  return {
    success: true,
    nft: {
      id: token_id,
      name,
      image_uri: imageUri,
      owner,
      chain: chain.name,
      price: "0",
      intents: { ethereum: [], polygon: [], optimism: [] }
    }
  };
}

program
  .name('anoma-nft')
  .description('CLI to mint NFTs via intents')
  .version('1.0.0');

program
  .command('mint')
  .description('Mint an NFT')
  .argument('<name>', 'NFT name')
  .argument('<imagePath>', 'Local image path')
  .option('-c, --chain <chainName>', 'Force chain')
  .action(async (name, imagePath, options) => {
    let chain = options.chain ? CHAINS.find(c => c.name === options.chain) : await selectOptimalChain();
    if (!chain) { console.error(`❌ Chain not supported`); process.exit(1); }
    const result = await mintNft(name, imagePath, chain as ChainOption);
    console.log(JSON.stringify(result));
  });

program.parse();
