import { config } from 'dotenv';
import { resolve } from 'node:path';
import express, { Request, Response } from 'express';
import path from 'path';
import { getMetadata, generateScenario, getBatches, rollbackBatch, boostTourReviews } from './services/data-generator';
import {
  TIER_DEFINITIONS,
  listUsersWithMembership,
  upgradeMemberTier,
} from './services/membership-upgrader';
import { listAdmins, grantAdminRole } from './services/admin-manager';
import {
  getLocationStats,
  importLocations,
} from './services/location-importer';
import {
  getSupplementaryStats,
  importSeasonalShowcaseService,
  seedTourCostumesService,
} from './services/showcase-costume-importer';
import {
  getPartnerStats,
  importPartners,
} from './services/partner-importer';
import {
  getCatalogStats,
  importHotels,
  importTransports,
} from './services/catalog-importer';
import {
  getAttractionStats,
  importAttractions,
} from './services/attraction-importer';
import {
  getInternationalLocationStats,
  importInternationalLocations,
} from './services/international-location-importer';

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

// API: Bơm đánh giá trực tiếp cho một Tour (Review Booster)
app.post('/api/reviews/boost', async (req: Request, res: Response) => {
  try {
    const options = req.body;
    const result = await boostTourReviews(options);
    res.json(result);
  } catch (error: any) {
    console.error('Error boosting reviews:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi bơm đánh giá cho tour' });
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

// API: Thống kê & Import địa điểm (34 tỉnh thành)
app.get('/api/locations/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getLocationStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error fetching location stats:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy thống kê địa điểm' });
  }
});

app.post('/api/locations/import', async (req: Request, res: Response) => {
  try {
    const { dryRun, source, customFilePath } = req.body;
    const result = await importLocations({
      dryRun: Boolean(dryRun),
      source,
      customFilePath,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error importing locations:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi khi import địa điểm' });
  }
});

// API: Import trọn bộ cây địa điểm và điểm tham quan nước ngoài.
app.get('/api/international-locations/stats', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await getInternationalLocationStats() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi lấy thống kê địa điểm nước ngoài' });
  }
});

app.post('/api/international-locations/import', async (req: Request, res: Response) => {
  try {
    const { dryRun, customFilePath } = req.body;
    if (dryRun !== undefined && typeof dryRun !== 'boolean') throw new Error('dryRun phải là boolean.');
    if (customFilePath !== undefined && typeof customFilePath !== 'string') throw new Error('customFilePath phải là chuỗi.');
    res.json(await importInternationalLocations({ dryRun, customFilePath }));
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Lỗi import địa điểm nước ngoài' });
  }
});

// API: Thống kê & Import Đối tác / Nhà cung cấp (Providers / Partners)
app.get('/api/partners/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getPartnerStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error fetching partner stats:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy thống kê đối tác' });
  }
});

app.post('/api/partners/import', async (req: Request, res: Response) => {
  try {
    const { dryRun, statusMode, customFilePath } = req.body;
    const result = await importPartners({
      dryRun: Boolean(dryRun),
      statusMode,
      customFilePath,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error importing partners:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi khi import đối tác' });
  }
});

// API: Thống kê & Import Khách sạn & Phương tiện (Hotels & Transports)
app.get('/api/catalog/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getCatalogStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error fetching catalog stats:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy thống kê danh mục dịch vụ' });
  }
});

app.post('/api/hotels/import', async (req: Request, res: Response) => {
  try {
    const { dryRun, cleanPrevious, customFilePath } = req.body;
    const result = await importHotels({
      dryRun: Boolean(dryRun),
      cleanPrevious: cleanPrevious !== undefined ? Boolean(cleanPrevious) : true,
      customFilePath,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error importing hotels:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi khi import khách sạn' });
  }
});

app.post('/api/transports/import', async (req: Request, res: Response) => {
  try {
    const { dryRun, cleanPrevious, customFilePath } = req.body;
    const result = await importTransports({
      dryRun: Boolean(dryRun),
      cleanPrevious: cleanPrevious !== undefined ? Boolean(cleanPrevious) : true,
      customFilePath,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error importing transports:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi khi import phương tiện' });
  }
});

// API: Thống kê & Import Điểm tham quan (Attractions - Level 6)
app.get('/api/attractions/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getAttractionStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error fetching attraction stats:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy thống kê điểm tham quan' });
  }
});

app.post('/api/attractions/import', async (req: Request, res: Response) => {
  try {
    const { dryRun, cleanPrevious, customFilePath } = req.body;
    const result = await importAttractions({
      dryRun: Boolean(dryRun),
      cleanPrevious: Boolean(cleanPrevious),
      customFilePath,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error importing attractions:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi khi import điểm tham quan' });
  }
});

// API: Thống kê & Import dữ liệu bổ trợ (Showcase & Tour Costumes & Partners & Catalog & Attractions)
app.get('/api/imports/overview', async (_req: Request, res: Response) => {
  try {
    const [locations, supplementary, partners, catalog, attractions] = await Promise.all([
      getLocationStats(),
      getSupplementaryStats(),
      getPartnerStats(),
      getCatalogStats(),
      getAttractionStats(),
    ]);
    res.json({
      success: true,
      data: {
        locations,
        supplementary,
        partners,
        catalog,
        attractions,
      },
    });
  } catch (error: any) {
    console.error('Error fetching imports overview:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy tổng quan import' });
  }
});

app.post('/api/imports/seasonal-showcase', async (_req: Request, res: Response) => {
  try {
    const result = await importSeasonalShowcaseService();
    res.json(result);
  } catch (error: any) {
    console.error('Error importing seasonal showcase:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi khi import seasonal showcase' });
  }
});

app.post('/api/imports/tour-costumes', async (req: Request, res: Response) => {
  try {
    const { maxTours, costumesPerTour } = req.body || {};
    const result = await seedTourCostumesService({
      maxTours: maxTours ? Number(maxTours) : undefined,
      costumesPerTour: costumesPerTour ? Number(costumesPerTour) : undefined,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error seeding tour costumes:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi khi nạp trang phục tour' });
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
  console.log(' 📊 Tính năng: Sinh dữ liệu, Nâng hạng hội viên, Cấp quyền Admin, Import Địa điểm');
  console.log('===============================================================\n');
});
