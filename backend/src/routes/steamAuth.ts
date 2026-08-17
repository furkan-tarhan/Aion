import express from 'express';
import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { config } from '../config';

const router = express.Router();
const JWT_SECRET = config.jwt.secret || process.env.JWT_SECRET || 'loopskins_secret_key';

// Passport config for Steam
passport.use(new SteamStrategy({
  returnURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/steam/return`,
  realm: `${process.env.BACKEND_URL || 'http://localhost:5000'}/`,
  apiKey: process.env.STEAM_API_KEY || 'dummy_key'
},
async (identifier: string, profile: any, done: any) => {
  try {
    const steamId = profile.id;
    // Kullanıcıyı SteamID ile bul
    let user = await User.findOne({ steamId });

    if (!user) {
      // Sadece Steam girişine izin verdiğimiz için, e-posta/şifre zorunluluklarını bypass etmek için dummy veri kullanıyoruz
      user = new User({
        steamId,
        username: profile.displayName || `steam_${steamId}`,
        email: `${steamId}@steam.local`, // benzersiz sahte email
        password: Math.random().toString(36).slice(-10), // rastgele şifre
        steamProfile: {
          displayName: profile.displayName,
          avatar: profile.photos?.[2]?.value || profile.photos?.[0]?.value,
          profileUrl: profile._json?.profileurl
        }
      });
      await user.save();
    } else {
      // Var olan kullanıcının bilgilerini güncelle
      user.steamProfile = {
        displayName: profile.displayName,
        avatar: profile.photos?.[2]?.value || profile.photos?.[0]?.value,
        profileUrl: profile._json?.profileurl
      };
      await user.save();
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Steam'e yönlendir (Giriş)
router.get('/', passport.authenticate('steam', { failureRedirect: '/' }));

// Steam'den dönüş
router.get('/return', 
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    const user = req.user as any;
    
    // Kullanıcıya JWT oluştur
    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Popup kapat ve ana pencereye token'ı gönder — targetOrigin frontend'e kısıtlanır,
    // böylece token yalnızca bizim frontend origin'imizdeki opener'a teslim edilir.
    res.send(`
      <script>
        window.opener.postMessage({ type: 'STEAM_LOGIN_SUCCESS', token: '${token}' }, ${JSON.stringify(config.frontendUrl)});
        window.close();
      </script>
    `);
  }
);

export default router;
