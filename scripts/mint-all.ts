// server/scripts/mint-all.ts
import { exec } from 'child_process';
import path from 'path';

// Mintlenecek NFT listesi
const nfts = [
  { name: "Anoma NFT #1", image: "./public/images/nft1.png" },
  { name: "Anoma NFT #2", image: "./public/images/nft2.png" },
  { name: "Anoma NFT #3", image: "./public/images/nft3.png" },
  { name: "Anoma NFT #4", image: "./public/images/nft4.png" },
  { name: "Anoma NFT #5", image: "./public/images/nft5.png" },
  { name: "Anoma NFT #6", image: "./public/images/nft6.png" },
];

// CLI betiğinin yolu
const cliPath = path.join(__dirname, '../cli/anoma-nft.ts');

console.log('🚀 Starting automatic NFT minting...');

nfts.forEach((nft, index) => {
  setTimeout(() => {
    const command = `npx ts-node ${cliPath} mint "${nft.name}" "${nft.image}"`;

    console.log(`\n📦 Minting: ${nft.name}`);
    console.log(`🖼️  Image: ${nft.image}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Failed to mint ${nft.name}:`, error.message);
        return;
      }
      try {
        const result = JSON.parse(stdout.trim());
        if (result.success) {
          console.log(`✅ Success: ${nft.name} - ID: ${result.nft.id}`);
        } else {
          console.error(`❌ Mint failed for ${nft.name}:`, result.error);
        }
      } catch (e) {
        console.error(`❌ Invalid output for ${nft.name}:`, stdout);
      }
    });
  }, index * 2000); // 2 saniye aralıkla mintle (rate limit önlemi)
});

console.log('\n⏳ Please wait... Minting in progress.');
