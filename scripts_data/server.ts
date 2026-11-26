import { config } from 'dotenv';
import { resolve } from 'node:path';
import express, { Request, Response } from 'express';
import path from 'path';
import { getMetadata, generateScenario, getBatches, rollbackBatch } from './services/data-generator';
import {
  TIER_DEFINITIONS,
  listUsersWithMembership,
  upgradeMemberTier,
} from './services/membership-upgrader';
import { listAdmins, grantAdminRole } from './services/admin-manager';

config({ path: resolve(__dirname, '../.env'), quiet: true });

const app = express();
const PORT = process.env.DATA_STUDIO_PORT || 3500;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Lấy danh sách tour, location, transport hiện có
app.get('/api/metadata', async (_req: Request, res: Response) => {
  try {
    const data = await getMetadata();
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi lấy dữ liệu ban đầu' });
  }
});

// API: Sinh dữ liệu mẫu theo kịch bản
app.post('/api/generate', async (req: Request, res: Response) => {
  try {
    const options = req.body;
    const result = await generateScenario(options);
    res.json(result);
  } catch (error: any) {
    console.error('Error generating scenario:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi tạo dữ liệu mẫu' });
  }
});

// API: Lấy danh sách các đợt dữ liệu mẫu đã tạo
app.get('/api/batches', async (_req: Request, res: Response) => {
  try {
    const batches = await getBatches();
    res.json({ success: true, data: batches });
  } catch (error: any) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy danh sách đợt' });
  }
});

// API: Rollback / Xoá đợt dữ liệu mẫu
app.delete('/api/batches/:tag', async (req: Request, res: Response) => {
  try {
    const tag = Array.isArray(req.params.tag) ? req.params.tag[0] : req.params.tag;
    const result = await rollbackBatch(tag);
    res.json(result);
  } catch (error: any) {
    console.error('Error rolling back batch:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi dọn dẹp đợt dữ liệu' });
  }
});

// API: Danh sách cấu hình các hạng hội viên & danh sách user
app.get('/api/membership/tiers', (_req: Request, res: Response) => {
  res.json({ success: true, data: Object.values(TIER_DEFINITIONS) });
});

app.get('/api/users', async (_req: Request, res: Response) => {
  try {
    const users = await listUsersWithMembership();
    res.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy danh sách người dùng' });
  }
});

// API: Nâng hạng hoặc seed hội viên
app.post('/api/membership/upgrade', async (req: Request, res: Response) => {
  try {
    const result = await upgradeMemberTier(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Error upgrading membership:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi khi nâng hạng hội viên' });
  }
});

// API: Danh sách Admin & Cấp quyền Admin
app.get('/api/admins', async (_req: Request, res: Response) => {
  try {
    const admins = await listAdmins();
    res.json({ success: true, data: admins });
  } catch (error: any) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy danh sách Admin' });
  }
});

app.post('/api/admins/grant', async (req: Request, res: Response) => {
  try {
    const result = await grantAdminRole(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Error granting admin role:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi khi cấp quyền Admin' });
  }
});

// Fallback trang chủ
app.use((_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('\n===============================================================');
  console.log(' 🚀 JOURNITRIP MOCK DATA STUDIO ĐÃ KHỞI ĐỘNG!');
  console.log(` 🌐 Giao diện điều khiển: http://localhost:${PORT}`);
  console.log(' 💾 Database: Kết nối PostgreSQL trực tiếp');
  console.log(' 📊 Tính năng: Sinh dữ liệu, Nâng hạng hội viên, Cấp quyền Admin');
  console.log('===============================================================\n');
});
