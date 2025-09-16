import express, { Request, Response } from 'express';
import { exec } from 'child_process';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import multer from 'multer';

const app = express();
app.use(cors({
  origin: ['https://anoma-nft.netlify.app', 'http://localhost:3000']
}));

// Multer config
const upload = multer({
  storage: multer.memoryStorage(),
});

app.use(express.json());

// 📤 Dosya Upload Endpoint’i
app.post('/api/upload', upload.single('image'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const uploadDir = path.join(__dirname, '../public/images');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const fileName = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
  const filePath = path.join(uploadDir, fileName);

  fs.writeFileSync(filePath, req.file.buffer);
  res.json({ imagePath: `/images/${fileName}` });
});

// 🪙 Mint Endpoint’i
app.post('/api/mint', (req: Request, res: Response) => {
  const { name, imagePath } = req.body;
  if (!name || !imagePath) {
    return res.status(400).json({ error: "Name and imagePath required" });
  }

  const cliPath = path.join(__dirname, './cli/anoma-nft.ts');
  const command = `npx ts-node ${cliPath} mint "${name}" "${imagePath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ CLI Error: ${error}`);
      return res.status(500).json({ error: error.message });
    }

    try {
      const result = JSON.parse(stdout.trim());
      res.json(result);
    } catch (e) {
      console.error(`❌ Invalid CLI output: ${stdout}`);
      res.status(500).json({ error: "Invalid CLI output" });
    }
  });
});

// 🖼️ NFT Listesi
app.get('/api/nfts', (req: Request, res: Response) => {
  const dbPath = './db/nfts.json';
  if (!fs.existsSync(dbPath)) {
    return res.json([]);
  }
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  res.json(db);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ API Server running on http://localhost:${PORT}`);
});
