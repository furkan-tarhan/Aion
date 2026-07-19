import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

// authenticateToken sonrası çalışır; (req as any).user.userId JWT'den gelir.
// Rol/ban durumu her istekte DB'den taze okunur (JWT'deki role bilgisine güvenilmez).
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Token gerekli' });
    }

    const user = await User.findById(userId).select('role isBanned');
    if (!user || user.role !== 'admin' || user.isBanned) {
      return res.status(403).json({ success: false, message: 'Bu işlem için admin yetkisi gerekli' });
    }

    next();
  } catch (error) {
    console.error('requireAdmin hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
}
