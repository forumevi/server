// server/index.ts
import express, { Request, Response } from 'express';
import { exec } from 'child_process';
import path from 'path';
import cors from 'cors';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

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
