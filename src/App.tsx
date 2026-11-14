import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import QRCode from 'qrcode';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';

// Global declarations for embedded environments (e.g. Google Sites / single-file embed)
declare global {
  interface Window {
    __firebase_config?: string;
    __app_id?: string;
    __initial_auth_token?: string;
  }
}
declare const __firebase_config: string | undefined;
declare const __app_id: string | undefined;
declare const __initial_auth_token: string | undefined;
import { 
  Shield, Sword, Crown, Eye, EyeOff, Users, Sparkles, Skull, 
  CheckCircle2, XCircle, HelpCircle, ScrollText, Play, RotateCcw, 
  Copy, Check, Volume2, VolumeX, Smartphone, UserPlus, Shuffle, 
  Award, Flame, Lock, Unlock, Terminal, ChevronRight, AlertTriangle,
  Palette, Wand2, Globe, Waves, Target, Crosshair
} from 'lucide-react';

// ==========================================
// 1. FIREBASE INITIALIZATION
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {};
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-avalon-app';

// ==========================================
// 2. SOUND ENGINE (Web Audio API Synthesizer)
// ==========================================
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playTone(freq, type = 'sine', duration = 0.2, delay = 0, volume = 0.15) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      gain.gain.setValueAtTime(volume, this.ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    } catch (e) {
      // Ignore audio errors on restricted devices
    }
  }

  click() { this.playTone(520, 'triangle', 0.08, 0, 0.1); }
  revealRole() {
    this.playTone(330, 'sine', 0.3, 0, 0.12);
    this.playTone(493.88, 'sine', 0.4, 0.1, 0.12);
    this.playTone(659.25, 'triangle', 0.6, 0.2, 0.15);
  }
  questSuccess() {
    this.playTone(440, 'triangle', 0.25, 0, 0.18);
    this.playTone(554.37, 'triangle', 0.25, 0.12, 0.18);
    this.playTone(659.25, 'triangle', 0.5, 0.24, 0.22);
  }
  questFail() {
    this.playTone(196, 'sawtooth', 0.35, 0, 0.2);
    this.playTone(146.83, 'sawtooth', 0.6, 0.2, 0.25);
  }
  drumroll() {
    for (let i = 0; i < 6; i++) {
      this.playTone(120 + i * 15, 'triangle', 0.08, i * 0.09, 0.12);
    }
  }
  victoryGood() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      this.playTone(f, 'triangle', 0.4, idx * 0.14, 0.2);
    });
  }
  victoryEvil() {
    [311.13, 277.18, 246.94, 185.0].forEach((f, idx) => {
      this.playTone(f, 'sawtooth', 0.45, idx * 0.16, 0.2);
    });
  }
  ladyLake() {
    [392.0, 493.88, 587.33, 783.99].forEach((f, idx) => {
      this.playTone(f, 'sine', 0.35, idx * 0.1, 0.14);
    });
  }
}

const sfx = new SoundEffects();

// ==========================================
// 2B. PIXELFX ENGINE & RPG SKIN PRESETS
// ==========================================
const SKIN_AVATARS = [
  { id: 'knight', name: 'Thánh Kỵ Sĩ', bg: 'from-blue-600 to-indigo-950', hat: '#fbbf24', armor: '#38bdf8', face: '#fde68a', weapon: '⚔️' },
  { id: 'mage', name: 'Pháp Sư Cổ Ngữ', bg: 'from-purple-600 to-indigo-950', hat: '#a855f7', armor: '#6366f1', face: '#fef08a', weapon: '🔮' },
  { id: 'assassin', name: 'Sát Thủ Huyết Nguyệt', bg: 'from-red-700 to-zinc-950', hat: '#dc2626', armor: '#18181b', face: '#fca5a5', weapon: '🗡️' },
  { id: 'paladin', name: 'Hộ Vệ Ánh Sáng', bg: 'from-amber-500 to-blue-950', hat: '#fef08a', armor: '#f59e0b', face: '#fde68a', weapon: '🛡️' },
  { id: 'necromancer', name: 'Chiêu Hồn Sư', bg: 'from-emerald-700 to-zinc-950', hat: '#10b981', armor: '#064e3b', face: '#a7f3d0', weapon: '💀' },
  { id: 'elf', name: 'Cung Thủ Tinh Linh', bg: 'from-teal-500 to-emerald-950', hat: '#34d399', armor: '#059669', face: '#fde68a', weapon: '🏹' },
  { id: 'valkyrie', name: 'Nữ Chiến Thần', bg: 'from-sky-500 to-indigo-950', hat: '#f472b6', armor: '#e0f2fe', face: '#fde68a', weapon: '⚡' },
  { id: 'berserker', name: 'Chiến Binh Cuồng Nộ', bg: 'from-orange-600 to-red-950', hat: '#f97316', armor: '#7c2d12', face: '#fed7aa', weapon: '🪓' },
  { id: 'king', name: 'Đức Vua Camelot', bg: 'from-yellow-500 to-amber-950', hat: '#facc15', armor: '#b45309', face: '#fef08a', weapon: '👑' },
  { id: 'witch', name: 'Phù Thủy Hắc Ám', bg: 'from-fuchsia-700 to-purple-950', hat: '#e879f9', armor: '#4a044e', face: '#f5d0fe', weapon: '🧪' },
  { id: 'ranger', name: 'Thợ Săn Bóng Đêm', bg: 'from-slate-600 to-slate-950', hat: '#94a3b8', armor: '#334155', face: '#e2e8f0', weapon: '🦅' },
  { id: 'dragon', name: 'Long Kỵ Sĩ', bg: 'from-rose-600 to-amber-950', hat: '#fb7185', armor: '#be123c', face: '#fecdd3', weapon: '🐉' }
];

const SKIN_FRAMES = [
  { id: 'gold', name: 'Cốc Thánh Hoàng Kim', ring: 'ring-2 ring-amber-400 border-amber-300 shadow-amber-500/30' },
  { id: 'arcane', name: 'Hào Quang Pháp Thuật', ring: 'ring-2 ring-cyan-400 border-cyan-300 shadow-cyan-500/30' },
  { id: 'crimson', name: 'Lửa Địa Ngục', ring: 'ring-2 ring-rose-500 border-rose-400 shadow-rose-500/40' },
  { id: 'emerald', name: 'Rừng Thiêng Avalon', ring: 'ring-2 ring-emerald-400 border-emerald-300 shadow-emerald-500/30' },
  { id: 'void', name: 'Bóng Tối Hư Không', ring: 'ring-2 ring-purple-500 border-fuchsia-400 shadow-purple-500/40' }
];

const SKIN_TITLES = [
  'Hiệp Sĩ Bàn Tròn',
  'Pháp Sư Tối Cao',
  'Thợ Săn Sói Đêm',
  'Kẻ Thao Túng',
  'Lãnh Chúa Camelot',
  'Bậc Thầy Đấu Trí',
  'Kẻ Phản Đồ Bí Ẩn',
  'Thần Hồ Bảo Hộ',
  'Sát Thủ Áo Đen'
];

// Pixel Art SVG Avatar Renderer
function PixelCharacterAvatar({ skinId = 'knight', frameId = 'gold', size = 'md', isLeader = false, hasLady = false }) {
  const skin = SKIN_AVATARS.find(s => s.id === skinId) || SKIN_AVATARS[0];
  const frame = SKIN_FRAMES.find(f => f.id === frameId) || SKIN_FRAMES[0];
  const dims = size === 'lg' ? 'w-16 h-16' : size === 'sm' ? 'w-8 h-8' : 'w-11 h-11';

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <div className={`${dims} rounded-xl bg-gradient-to-br ${skin.bg} border ${frame.ring} shadow-md flex items-center justify-center overflow-hidden relative`}>
        <svg viewBox="0 0 16 16" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
          {/* Helmet / Hat */}
          <rect x="4" y="1" width="8" height="3" fill={skin.hat} />
          <rect x="3" y="3" width="10" height="2" fill={skin.hat} />
          {/* Face */}
          <rect x="4" y="5" width="8" height="5" fill={skin.face} />
          {/* Eyes */}
          <rect x="5" y="6" width="2" height="2" fill="#0f172a" />
          <rect x="9" y="6" width="2" height="2" fill="#0f172a" />
          <rect x="5" y="6" width="1" height="1" fill="#ffffff" />
          <rect x="9" y="6" width="1" height="1" fill="#ffffff" />
          {/* Armor / Shoulders */}
          <rect x="2" y="10" width="12" height="5" fill={skin.armor} />
          <rect x="5" y="10" width="6" height="4" fill={skin.hat} opacity="0.85" />
          {/* Cape trim */}
          <rect x="3" y="14" width="10" height="2" fill="#0f172a" opacity="0.4" />
        </svg>
        <span className="absolute -bottom-0.5 -right-0.5 text-[11px] drop-shadow">{skin.weapon}</span>
      </div>
      {isLeader && (
        <span className="absolute -top-2 -left-1.5 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow border border-white" title="Đội Trưởng (Leader)">
          <Crown className="w-3 h-3 fill-current" />
        </span>
      )}
      {hasLady && (
        <span className="absolute -top-2 -right-1.5 w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow border border-white animate-bounce" title="Đang giữ Token Nữ Thần Hồ Nước (Lady of the Lake)">
          <Waves className="w-3 h-3" />
        </span>
      )}
    </div>
  );
}

// PixelFX Particle Canvas Overlay (Inspired by user's pixelfx library)
function PixelFXOverlay({ effectType, onComplete }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!effectType || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;
    let frame = 0;
    const maxFrames = 85;

    const particles = Array.from({ length: 65 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5.5;
      let colors = ['#fbbf24', '#38bdf8', '#ffffff', '#60a5fa'];
      if (effectType === 'FAIL' || effectType === 'ASSASSIN') {
        colors = ['#ef4444', '#991b1b', '#f97316', '#f43f5e', '#450a0a'];
      } else if (effectType === 'LADY_LAKE') {
        colors = ['#22d3ee', '#a855f7', '#38bdf8', '#e0f2fe', '#c084fc'];
      }
      return {
        x: 160,
        y: 120,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (effectType === 'SUCCESS' ? 1.5 : 0),
        size: Math.floor(3 + Math.random() * 6),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0,
        decay: 0.012 + Math.random() * 0.015
      };
    });

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Central pixel burst / beam
      if (frame < 35) {
        ctx.save();
        if (effectType === 'SUCCESS') {
          ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
          ctx.fillRect(130, 0, 60, canvas.height);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
          ctx.fillRect(148, 0, 24, canvas.height);
        } else if (effectType === 'FAIL' || effectType === 'ASSASSIN') {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(40, 30);
          ctx.lineTo(280, 210);
          ctx.moveTo(280, 30);
          ctx.lineTo(40, 210);
          ctx.stroke();
        } else if (effectType === 'LADY_LAKE') {
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(160, 120, frame * 3.2, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw pixel particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (effectType === 'FAIL') p.vy += 0.12;
        p.life = Math.max(0, p.life - p.decay);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        // Snap to pixel grid (4px)
        const px = Math.round(p.x / 3) * 3;
        const py = Math.round(p.y / 3) * 3;
        ctx.fillRect(px, py, p.size, p.size);
      });
      ctx.globalAlpha = 1;

      if (frame < maxFrames) {
        animId = requestAnimationFrame(render);
      } else if (onComplete) {
        onComplete();
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [effectType]);

  if (!effectType) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
      <div className="relative flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          className="w-80 h-60"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="px-4 py-1.5 rounded-full bg-slate-950/90 border border-amber-400/50 text-xs font-black uppercase tracking-widest text-amber-300 shadow-xl">
          {effectType === 'SUCCESS' && '✨ Thánh Quang Bảo Hộ • Nhiệm Vụ Thành Công!'}
          {effectType === 'FAIL' && '💀 Hắc Ám Phá Hoại • Nhiệm Vụ Thất Bại!'}
          {effectType === 'LADY_LAKE' && '🌊 Nữ Thần Hồ Nước Đang Soi Lòng Trung Thành...'}
          {effectType === 'ASSASSIN' && '🗡️ Nhát Kiếm Định Mệnh Của Sát Thủ!'}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. AVALON RULES & CONSTANTS (5-10 Players)
// ==========================================
const PLAYER_MATRIX = {
  5:  { good: 3, evil: 2, quests: [2, 3, 2, 3, 3], twoFailsOnQuest4: false },
  6:  { good: 4, evil: 2, quests: [2, 3, 4, 3, 4], twoFailsOnQuest4: false },
  7:  { good: 4, evil: 3, quests: [2, 3, 3, 4, 4], twoFailsOnQuest4: true },
  8:  { good: 5, evil: 3, quests: [3, 4, 4, 5, 5], twoFailsOnQuest4: true },
  9:  { good: 6, evil: 3, quests: [3, 4, 4, 5, 5], twoFailsOnQuest4: true }, // Chuẩn 9 người
  10: { good: 6, evil: 4, quests: [3, 4, 4, 5, 5], twoFailsOnQuest4: true },
};

const ROLES_DATA = {
  MERLIN: {
    id: 'MERLIN',
    name: 'Merlin Đại Pháp Sư',
    team: 'GOOD',
    icon: '🧙‍♂️',
    color: 'from-blue-600 to-indigo-900',
    border: 'border-cyan-400',
    shortDesc: 'Biết mặt kẻ ác (trừ Mordred). Phải ẩn mình trước Sát Thủ!',
    fullDesc: 'Bạn nhìn thấy tất cả thành viên Phe Ác (ngoại trừ Mordred). Hãy khéo léo dẫn dắt Phe Thiện đi đúng hướng, nhưng đừng lộ liễu vì nếu Phe Thiện thắng 3 nhiệm vụ, Sát Thủ (Assassin) sẽ có 1 phát đạn cuối cùng để đoán ai là bạn!'
  },
  PERCIVAL: {
    id: 'PERCIVAL',
    name: 'Hộ Vệ Percival',
    team: 'GOOD',
    icon: '🛡️',
    color: 'from-sky-600 to-blue-900',
    border: 'border-sky-300',
    shortDesc: 'Nhìn thấy 2 ứng viên Merlin (Merlin thật & Morgana).',
    fullDesc: 'Đầu ván, bạn sẽ thấy tên của 2 người: một người là Merlin thật, người kia là phù thủy Morgana giả dạng. Nhiệm vụ của bạn là quan sát ai nói lý lẽ đúng đắn để tìm ra Merlin thật và thậm chí giả làm Merlin để đỡ đạn cuối game!'
  },
  SERVANT: {
    id: 'SERVANT',
    name: 'Hiệp Sĩ Bàn Tròn',
    team: 'GOOD',
    icon: '⚔️',
    color: 'from-blue-700 to-slate-900',
    border: 'border-blue-400',
    shortDesc: 'Hiệp sĩ trung thành của Vua Arthur. Suy luận qua phiếu bầu!',
    fullDesc: 'Bạn không có thông tin mật đầu game, nhưng bạn là xương sống của Phe Thiện. Hãy quan sát thật kỹ cách mọi người lập đội và biểu quyết để tìm ra đồng minh đáng tin cậy.'
  },
  ASSASSIN: {
    id: 'ASSASSIN',
    name: 'Sát Thủ (Assassin)',
    team: 'EVIL',
    icon: '🗡️',
    color: 'from-red-700 to-rose-950',
    border: 'border-red-500',
    shortDesc: 'Phe Ác. Có quyền ám sát Merlin để lật kèo cuối game!',
    fullDesc: 'Bạn biết những đồng bọn Phe Ác khác. Bên cạnh việc phá hoại nhiệm vụ, hãy quan sát xem ai ở Phe Thiện có vẻ "biết quá nhiều". Nếu Phe Thiện thắng 3 nhiệm vụ, bạn được quyền chỉ định ám sát 1 người — nếu trúng Merlin, Phe Ác cướp lại chiến thắng!'
  },
  MORGANA: {
    id: 'MORGANA',
    name: 'Phù Thủy Morgana',
    team: 'EVIL',
    icon: '🔮',
    color: 'from-purple-800 to-red-950',
    border: 'border-fuchsia-500',
    shortDesc: 'Phe Ác. Giả dạng thành Merlin trong mắt Percival.',
    fullDesc: 'Bạn xuất hiện cùng với Merlin thật trong tầm nhìn của Percival. Hãy đóng giả làm người tốt thông thái để lừa Percival tin rằng bạn mới là Merlin thật!'
  },
  MORDRED: {
    id: 'MORDRED',
    name: 'Trùm Cuối Mordred',
    team: 'EVIL',
    icon: '👑',
    color: 'from-rose-800 to-zinc-950',
    border: 'border-rose-500',
    shortDesc: 'Phe Ác. Tàng hình trước mắt pháp sư Merlin!',
    fullDesc: 'Merlin KHÔNG biết bạn là kẻ ác! Hãy tận dụng vỏ bọc trong sạch tuyệt đối này để lấy lòng tin của toàn bộ bàn chơi, lọt vào các nhiệm vụ quan trọng và tung phiếu Thất Bại chí mạng.'
  },
  OBERON: {
    id: 'OBERON',
    name: 'Bóng Ma Oberon',
    team: 'EVIL',
    icon: '👻',
    color: 'from-emerald-900 to-red-950',
    border: 'border-rose-400',
    shortDesc: 'Phe Ác độc hành. Không biết đồng bọn, đồng bọn cũng không biết bạn (nhưng Merlin vẫn thấy bạn).',
    fullDesc: 'Bạn thuộc Phe Ác nhưng hoạt động hoàn toàn đơn độc. Bạn không biết ai là đồng bọn và họ cũng không biết bạn. Tuy nhiên Merlin vẫn nhìn thấy bạn là kẻ ác!'
  },
  MINION: {
    id: 'MINION',
    name: 'Tay Sai Của Mordred',
    team: 'EVIL',
    icon: '🔥',
    color: 'from-red-800 to-stone-950',
    border: 'border-red-400',
    shortDesc: 'Tay sai trung thành của Phe Ác. Biết rõ các đồng bọn.',
    fullDesc: 'Bạn biết những ai cùng Phe Ác với mình. Hãy phối hợp nhịp nhàng với đồng đội để trà trộn vào đội hình nhiệm vụ hoặc gây hỗn loạn trên bàn nghị sự.'
  }
};

const DEFAULT_9_PLAYER_NAMES = [
  'Người chơi 1', 'Người chơi 2', 'Người chơi 3',
  'Người chơi 4', 'Người chơi 5', 'Người chơi 6',
  'Người chơi 7', 'Người chơi 8', 'Người chơi 9'
];

// Master Prompt for User's AI Agent
const MASTER_AGENT_PROMPT = `Bạn là một Senior Full-Stack Game Developer. Hãy viết cho tôi một Web App hoàn chỉnh cho board game ẩn vai "Avalon: The Resistance" (Bản tiếng Việt - Không ngủ), tối ưu đặc biệt cho nhóm 9 người chơi trên điện thoại di động.

1. YÊU CẦU KIẾN TRÚC & CHẾ ĐỘ CHƠI:
- Hỗ trợ 2 chế độ:
  + Online Multiplayer (Real-time qua Room Code 4 ký tự dùng Firebase/WebSocket).
  + Local Pass-and-Play / Game Master Mode (Chơi trên 1 thiết bị chuyền tay hoặc Quản trò điều khiển để dự phòng khi có người hết pin).
- Giao diện Dark Medieval Fantasy (Vàng kim, Xanh hoàng gia cho Phe Thiện, Đỏ thẫm cho Phe Ác), có đầy đủ CSS 3D Card Flip Animation, hiệu ứng rung màn hình khi nhiệm vụ thất bại và âm thanh Web Audio API.

2. LUẬT CHƠI & PHÂN VAI CHUẨN 9 NGƯỜI (Hỗ trợ linh hoạt 5-10 người):
- Bàn 9 người gồm: 6 Phe Thiện (1 Merlin, 1 Percival, 4 Hiệp Sĩ) vs 3 Phe Ác (1 Morgana, 1 Assassin, 1 Mordred).
- Ma trận 5 Nhiệm Vụ (Quests) cho 9 người: Q1 (3 người), Q2 (4 người), Q3 (4 người), Q4 (5 người - CẦN TỐI THIỂU 2 PHIẾU THẤT BẠI mới hỏng nhiệm vụ), Q5 (5 người).

3. CƠ CHẾ "KHÔNG NGỦ" (ZERO-SLEEP SECRET ENGINE):
- Không cần nhắm mắt đầu game. Mỗi người chơi có thẻ "Nhấn và giữ để xem Vai Trò & Tình Báo Mật".
- Khi nhấn giữ, thẻ lật 3D hiển thị:
  + Merlin: Thấy danh sách tên Phe Ác (trừ Mordred).
  + Percival: Thấy 2 tên (Merlin & Morgana) được xáo trộn ngẫu nhiên dưới nhãn "Ứng viên Merlin".
  + Morgana / Assassin / Mordred: Thấy tên đồng đội Phe Ác (trừ Oberon).
  + Hiệp Sĩ: Thấy lời khuyên suy luận.

4. STATE MACHINE 6 GIAI ĐOẠN (GAME LOOP):
- Giai đoạn 1 (Lobby): Thêm/bớt người chơi, xáo trộn chỗ ngồi, tùy chỉnh vai trò đặc biệt.
- Giai đoạn 2 (Xem Vai Trò): Kiểm tra từng người đã xem vai bí mật.
- Giai đoạn 3 (Lập Đội - Team Building): Đội Trưởng (Leader) xoay vòng theo chiều kim đồng hồ, chọn đủ số người cho Nhiệm vụ hiện tại.
- Giai đoạn 4 (Biểu Quyết Đội Hình - Public Vote): Tất cả bỏ phiếu Tán Thành (Approve) hoặc Phản Đối (Reject) ẩn, sau đó lật đồng loạt. Nếu quá bán Tán Thành -> Đi làm nhiệm vụ. Nếu từ chối -> Chuyển Đội Trưởng và tăng Bộ Đếm Từ Chối (5 lần từ chối liên tiếp trong 1 nhiệm vụ = Phe Ác thắng ngay).
- Giai đoạn 5 (Thực Hiện Nhiệm Vụ - Secret Quest): Những người trong đội bí mật chọn "Thành Công" hoặc "Thất Bại" (Phe Thiện chỉ được chọn Thành Công, nhưng giao diện nút bấm phải chống nhìn trộm vị trí ngón tay). Hệ thống xáo trộn các lá phiếu và lật mở từng chiếc Cốc Thánh với hiệu ứng hồi hộp.
- Giai đoạn 6 (Pha Ám Sát Merlin & Tổng Kết): Nếu Phe Thiện thắng 3 nhiệm vụ, Sát Thủ (Assassin) chọn 1 người để ám sát. Nếu đoán trúng Merlin -> Phe Ác lật kèo thắng! Cuối ván công bố toàn bộ vai trò và lịch sử biểu quyết.`;

// ==========================================
// 4. HELPER FUNCTIONS
// ==========================================
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildRoleDeck(playerCount, specialConfig) {
  const matrix = PLAYER_MATRIX[playerCount] || PLAYER_MATRIX[9];
  const goodRoles = [];
  const evilRoles = [];

  if (specialConfig.merlin) goodRoles.push('MERLIN');
  if (specialConfig.percival) goodRoles.push('PERCIVAL');
  while (goodRoles.length < matrix.good) {
    goodRoles.push('SERVANT');
  }

  if (specialConfig.assassin) evilRoles.push('ASSASSIN');
  if (specialConfig.morgana && evilRoles.length < matrix.evil) evilRoles.push('MORGANA');
  if (specialConfig.mordred && evilRoles.length < matrix.evil) evilRoles.push('MORDRED');
  if (specialConfig.oberon && evilRoles.length < matrix.evil) evilRoles.push('OBERON');
  while (evilRoles.length < matrix.evil) {
    evilRoles.push('MINION');
  }

  return shuffleArray([...goodRoles.slice(0, matrix.good), ...evilRoles.slice(0, matrix.evil)]);
}

function getSecretIntelForPlayer(player, allPlayers) {
  if (!player || !player.role) return { title: '', items: [], note: '' };
  const role = player.role;

  if (role === 'MERLIN') {
    const visibleEvil = allPlayers.filter(
      p => p.id !== player.id && ROLES_DATA[p.role]?.team === 'EVIL' && p.role !== 'MORDRED'
    );
    const hasMordred = allPlayers.some(p => p.role === 'MORDRED');
    return {
      title: '👁️ Tầm Nhìn Của Merlin (Kẻ Ác Lộ Diện):',
      items: visibleEvil.map(p => ({ name: p.name, tag: 'Phe Ác (Lộ diện)', color: 'text-red-400 bg-red-950/70 border-red-500/40' })),
      note: hasMordred 
        ? '⚠️ Cảnh báo: Trong ván này có MORDRED đang ẩn mình mà bạn KHÔNG nhìn thấy!' 
        : 'Bạn đã nhìn thấy toàn bộ Phe Ác trong ván này.'
    };
  }

  if (role === 'PERCIVAL') {
    // Sort deterministically by ID so it doesn't reshuffle on every render, but doesn't leak role
    const candidates = allPlayers
      .filter(p => p.role === 'MERLIN' || p.role === 'MORGANA')
      .sort((a, b) => a.name.localeCompare(b.name));
    const hasMorgana = allPlayers.some(p => p.role === 'MORGANA');
    return {
      title: '🛡️ Hai Ứng Viên Merlin Cần Bảo Vệ:',
      items: candidates.map(p => ({ name: p.name, tag: 'Merlin hoặc Morgana?', color: 'text-amber-300 bg-amber-950/60 border-amber-400/40' })),
      note: hasMorgana
        ? 'Một trong hai người trên là Merlin thật, người còn lại là Phù thủy Morgana giả dạng!'
        : 'Người trên chính là Merlin Đại Pháp Sư cần bạn bảo vệ!'
    };
  }

  if (ROLES_DATA[role]?.team === 'EVIL' && role !== 'OBERON') {
    const fellowEvil = allPlayers.filter(
      p => p.id !== player.id && ROLES_DATA[p.role]?.team === 'EVIL' && p.role !== 'OBERON'
    );
    const hasOberon = allPlayers.some(p => p.role === 'OBERON');
    return {
      title: '🔥 Đồng Minh Phe Ác Của Bạn:',
      items: fellowEvil.map(p => ({ name: p.name, tag: 'Đồng bọn Phe Ác', color: 'text-rose-400 bg-rose-950/70 border-rose-500/40' })),
      note: hasOberon
        ? '👻 Lưu ý: Có thêm Bóng Ma Oberon thuộc Phe Ác nhưng không ai biết mặt hắn!'
        : 'Hãy phối hợp ngầm với đồng đội để phá hỏng 3 nhiệm vụ hoặc tìm ra Merlin!'
    };
  }

  if (role === 'OBERON') {
    return {
      title: '👻 Hành Động Độc Lập:',
      items: [],
      note: 'Bạn thuộc Phe Ác nhưng không biết đồng bọn là ai (và họ cũng không biết bạn). Hãy tự mình gây nhiễu loạn và phá nhiệm vụ!'
    };
  }

  return {
    title: '⚔️ Lời Thề Hiệp Sĩ Bàn Tròn:',
    items: [],
    note: 'Bạn là Hiệp Sĩ Trung Thành! Hãy quan sát kỹ ai bầu chọn đội hình nào và lắng nghe tín hiệu ngầm từ Merlin để tìm ra 6 người tốt.'
  };
}

// ==========================================
// 5. MAIN APPLICATION COMPONENT
// ==========================================
export default function App() {
  // Auth & Firebase state
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('LOCAL'); // 'LOCAL' (Chơi ngay 1 máy / Quản trò) or 'ONLINE' (Nhiều điện thoại)
  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [myOnlineName, setMyOnlineName] = useState('');
  const [onlineError, setOnlineError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // PeerJS Serverless WebRTC & P2P Star Topology State
  const [myDeviceId] = useState(() => {
    if (typeof window === 'undefined') return 'p_' + Math.random().toString(36).substring(2, 9);
    let id = localStorage.getItem('avalon_device_id_v1');
    if (!id) {
      id = 'p_' + Math.random().toString(36).substring(2, 9);
      try { localStorage.setItem('avalon_device_id_v1', id); } catch (e) {}
    }
    return id;
  });
  const [isHost, setIsHost] = useState(false);
  const [peerStatus, setPeerStatus] = useState<'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR'>('IDLE');
  const [connectedPeerCount, setConnectedPeerCount] = useState(0);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const peerInstanceRef = useRef<Peer | null>(null);
  const hostConnectionsRef = useRef<DataConnection[]>([]);
  const clientConnectionRef = useRef<DataConnection | null>(null);

  // Modals & UI Helpers
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [editingSkinPlayerId, setEditingSkinPlayerId] = useState(null);
  const [pixelFxEvent, setPixelFxEvent] = useState(null); // 'SUCCESS' | 'FAIL' | 'LADY_LAKE' | 'ASSASSIN' | null
  const [rulesTab, setRulesTab] = useState('OVERVIEW');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [activeViewerId, setActiveViewerId] = useState('p1'); // For Local Mode perspective switching
  const [holdingSecret, setHoldingSecret] = useState(false);
  const [passScreenLocked, setPassScreenLocked] = useState(true); // Privacy shield when passing phone
  const [questButtonsSwapped, setQuestButtonsSwapped] = useState(false); // Anti-thumb-tracking

  // Initial Game State Template (Defaults to 9 Players Ready to Play!)
  const createInitialGameState = () => ({
    phase: 'LOBBY', // LOBBY | ROLE_REVEAL | TEAM_BUILD | TEAM_VOTE | VOTE_RESULT | QUEST_EXEC | QUEST_RESULT | LADY_OF_LAKE | LADY_REVEAL | ASSASSIN | GAME_OVER
    hostId: 'p1',
    players: DEFAULT_9_PLAYER_NAMES.map((name, idx) => ({
      id: `p${idx + 1}`,
      name,
      role: null,
      readyRole: false,
      skinId: SKIN_AVATARS[idx % SKIN_AVATARS.length].id,
      frameId: SKIN_FRAMES[idx % SKIN_FRAMES.length].id,
      titleBadge: SKIN_TITLES[idx % SKIN_TITLES.length]
    })),
    specialConfig: {
      merlin: true,
      percival: true,
      assassin: true,
      morgana: true,
      mordred: true,
      oberon: false,
      ladyOfLake: true, // Optional Rulebook Page 8
      targeting: false  // Optional Rulebook Page 8
    },
    leaderIdx: 0,
    currentQuestIdx: 0, // 0 to 4
    completedQuestsCount: 0,
    rejectCount: 0, // 0 to 5
    questResults: [null, null, null, null, null], // 'SUCCESS' | 'FAIL' | null
    selectedTeam: [], // array of player IDs
    teamVotes: {}, // { playerId: 'APPROVE' | 'REJECT' }
    questVotes: {}, // { playerId: 'SUCCESS' | 'FAIL' }
    revealedQuestCards: [], // shuffled array of 'SUCCESS' | 'FAIL'
    revealedCardCount: 0, // for step-by-step dramatic reveal
    ladyHolderId: null, // Player currently holding Lady of the Lake token
    ladyPastHolders: [], // Players who have held Lady token (cannot be inspected!)
    ladyTargetId: null, // Player currently inspected by Lady of the Lake
    ladyUsesCount: 0, // Max 3 times (after 2nd, 3rd, 4th quest)
    assassinatedId: null,
    winner: null, // 'GOOD' | 'EVIL'
    winReason: '',
    historyLogs: []
  });

  const [gameState, setGameState] = useState(createInitialGameState);

  // ------------------------------------------
  // URL Room Query & Session Persistence Restore
  // ------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl && roomFromUrl.length === 4) {
      setJoinInput(roomFromUrl);
      setMode('ONLINE');
    }
    try {
      const savedSession = localStorage.getItem('avalon_party_session_v1');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed.playerName && !myOnlineName) {
          setMyOnlineName(parsed.playerName);
        }
        if (parsed.roomCode && !roomFromUrl) {
          setJoinInput(parsed.roomCode);
        }
      }
    } catch (e) {}
  }, []);

  // ------------------------------------------
  // QR Code Generator Effect for Host Lobby
  // ------------------------------------------
  useEffect(() => {
    if (roomCode && typeof window !== 'undefined') {
      const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
      QRCode.toDataURL(joinUrl, {
        width: 240,
        margin: 1,
        color: {
          dark: '#020617',
          light: '#fbbf24'
        }
      })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('Failed to generate QR code:', err));
    } else {
      setQrCodeDataUrl('');
    }
  }, [roomCode]);

  // ------------------------------------------
  // Firebase Auth Init (Rule 3)
  // ------------------------------------------
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error('Auth init error:', e);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // ------------------------------------------
  // Firestore Room Listener (Rule 1 & 2)
  // ------------------------------------------
  useEffect(() => {
    if (!user || !db || mode !== 'ONLINE' || !roomCode) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'avalon_rooms', roomCode);
    const unsub = onSnapshot(
      roomRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setGameState(data);
        }
      },
      (err) => {
        console.error('Room snapshot error:', err);
      }
    );
    return () => unsub();
  }, [user, mode, roomCode]);

  // Broadcast current state to all connected client nodes (Host Node Star Topology)
  const broadcastState = useCallback((nextState: any) => {
    hostConnectionsRef.current.forEach(conn => {
      if (conn && conn.open) {
        try {
          conn.send({ type: 'GAME_STATE_SYNC', state: nextState });
        } catch (e) {
          console.error('Failed to broadcast to peer:', e);
        }
      }
    });
  }, []);

  // Unified state updater (works for both LOCAL and ONLINE)
  const syncState = async (updater: any) => {
    setGameState((prev: any) => {
      const nextState = typeof updater === 'function' ? updater(prev) : updater;
      
      // If we are Host in ONLINE mode, broadcast to all connected peer clients
      if (mode === 'ONLINE' && isHost) {
        broadcastState(nextState);
      }

      // Optional Firebase sync fallback (if configured)
      if (mode === 'ONLINE' && user && db && roomCode) {
        try {
          const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'avalon_rooms', roomCode);
          setDoc(roomRef, nextState).catch(err => console.error('Firebase sync error:', err));
        } catch (e) {}
      }

      return nextState;
    });
  };

  // Dispatch Action: If Client node, sends via WebRTC to Host. If Host or Local, executes locally!
  const dispatchAction = useCallback((actionName: string, payload: any = {}) => {
    if (mode === 'ONLINE' && !isHost) {
      if (clientConnectionRef.current && clientConnectionRef.current.open) {
        try {
          clientConnectionRef.current.send({
            type: 'CLIENT_ACTION',
            actionName,
            payload
          });
          return;
        } catch (e) {
          console.error('Failed to dispatch client action over WebRTC:', e);
        }
      } else {
        console.warn('WebRTC client connection is not open yet.');
      }
    }
    // Host node or Local Mode execution
    executeHostAction(actionName, payload);
  }, [mode, isHost]);

  // Current active player perspective
  const currentPlayerId = mode === 'ONLINE' ? (user?.uid || myDeviceId) : activeViewerId;
  const currentPlayer = useMemo(
    () => gameState.players.find((p: any) => p.id === currentPlayerId) || gameState.players[0],
    [gameState.players, currentPlayerId]
  );

  const playerCount = gameState.players.length;
  const currentMatrix = PLAYER_MATRIX[playerCount] || PLAYER_MATRIX[9];
  const currentLeader = gameState.players[gameState.leaderIdx] || gameState.players[0];
  const requiredTeamSize = currentMatrix.quests[gameState.currentQuestIdx] || 3;

  // Toggle sound
  const toggleSound = () => {
    sfx.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  // ------------------------------------------
  // Serverless WebRTC Star Topology: Host & Client Handlers
  // ------------------------------------------
  const handleCreateOnlineRoom = async () => {
    const hostName = myOnlineName.trim() || 'Chủ Phòng';
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const hostPeerId = `avalon-party-2026-${code}`;

    setOnlineError('');
    setPeerStatus('CONNECTING');

    // Clean up previous peer
    if (peerInstanceRef.current) {
      try { peerInstanceRef.current.destroy(); } catch (e) {}
    }

    try {
      const peer = new Peer(hostPeerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });
      peerInstanceRef.current = peer;

      peer.on('open', (id) => {
        setRoomCode(code);
        setIsHost(true);
        setMode('ONLINE');
        setPeerStatus('CONNECTED');
        sfx.click();

        // Initialize Host game state
        const initialHostPlayer = {
          id: user?.uid || myDeviceId,
          name: hostName,
          role: null,
          readyRole: false,
          skinId: SKIN_AVATARS[0].id,
          frameId: SKIN_FRAMES[0].id,
          titleBadge: SKIN_TITLES[0]
        };

        const newOnlineState = {
          ...createInitialGameState(),
          hostId: initialHostPlayer.id,
          players: [initialHostPlayer]
        };

        setGameState(newOnlineState);

        // Save session
        try {
          localStorage.setItem('avalon_party_session_v1', JSON.stringify({
            playerId: initialHostPlayer.id,
            playerName: hostName,
            roomCode: code,
            isHost: true
          }));
        } catch (e) {}

        // Firebase fallback if available
        if (user && db) {
          const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'avalon_rooms', code);
          setDoc(roomRef, newOnlineState).catch(() => {});
        }
      });

      peer.on('connection', (conn) => {
        hostConnectionsRef.current.push(conn);
        setConnectedPeerCount(hostConnectionsRef.current.length);

        conn.on('open', () => {
          // Immediately send latest authoritative game state to the joining client
          setGameState((current: any) => {
            conn.send({ type: 'GAME_STATE_SYNC', state: current });
            return current;
          });
        });

        conn.on('data', (data: any) => {
          if (!data) return;
          if (data.type === 'JOIN_PLAYER') {
            const joiningPlayer = data.player;
            setGameState((prev: any) => {
              const existingIdx = prev.players.findIndex((p: any) => p.id === joiningPlayer.id);
              let updatedPlayers = [...prev.players];
              if (existingIdx >= 0) {
                // Reconnect existing player
                updatedPlayers[existingIdx] = {
                  ...updatedPlayers[existingIdx],
                  name: joiningPlayer.name || updatedPlayers[existingIdx].name,
                  skinId: joiningPlayer.skinId || updatedPlayers[existingIdx].skinId,
                  frameId: joiningPlayer.frameId || updatedPlayers[existingIdx].frameId
                };
              } else {
                if (updatedPlayers.length < 10) {
                  updatedPlayers.push({
                    id: joiningPlayer.id,
                    name: joiningPlayer.name || `Hiệp Sĩ ${updatedPlayers.length + 1}`,
                    role: null,
                    readyRole: false,
                    skinId: joiningPlayer.skinId || SKIN_AVATARS[updatedPlayers.length % SKIN_AVATARS.length].id,
                    frameId: joiningPlayer.frameId || SKIN_FRAMES[updatedPlayers.length % SKIN_FRAMES.length].id,
                    titleBadge: joiningPlayer.titleBadge || SKIN_TITLES[updatedPlayers.length % SKIN_TITLES.length]
                  });
                }
              }
              const nextState = { ...prev, players: updatedPlayers };
              broadcastState(nextState);
              return nextState;
            });
          } else if (data.type === 'CLIENT_ACTION') {
            executeHostAction(data.actionName, data.payload);
          }
        });

        conn.on('close', () => {
          hostConnectionsRef.current = hostConnectionsRef.current.filter(c => c !== conn);
          setConnectedPeerCount(hostConnectionsRef.current.length);
        });

        conn.on('error', () => {
          hostConnectionsRef.current = hostConnectionsRef.current.filter(c => c !== conn);
          setConnectedPeerCount(hostConnectionsRef.current.length);
        });
      });

      peer.on('error', (err) => {
        console.error('PeerJS Host Error:', err);
        setOnlineError('Lỗi kết nối P2P. Bạn có thể sử dụng Chế Độ 1 Máy (Pass & Play)!');
        setPeerStatus('ERROR');
      });

    } catch (e) {
      console.error(e);
      setOnlineError('Không thể khởi tạo P2P. Bạn có thể sử dụng Chế Độ 1 Máy!');
      setPeerStatus('ERROR');
    }
  };

  const handleJoinOnlineRoom = async () => {
    const cleanCode = joinInput.trim();
    const playerName = myOnlineName.trim() || `Hiệp Sĩ ${Math.floor(Math.random() * 90 + 10)}`;
    if (cleanCode.length !== 4) {
      setOnlineError('Mã phòng gồm 4 chữ số!');
      return;
    }

    setOnlineError('');
    setPeerStatus('CONNECTING');

    // Clean up previous client peer
    if (peerInstanceRef.current) {
      try { peerInstanceRef.current.destroy(); } catch (e) {}
    }

    try {
      const peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });
      peerInstanceRef.current = peer;

      peer.on('open', () => {
        const targetHostPeerId = `avalon-party-2026-${cleanCode}`;
        const conn = peer.connect(targetHostPeerId, { reliable: true });
        clientConnectionRef.current = conn;

        conn.on('open', () => {
          setRoomCode(cleanCode);
          setIsHost(false);
          setMode('ONLINE');
          setPeerStatus('CONNECTED');
          sfx.click();

          const myPlayerPayload = {
            id: user?.uid || myDeviceId,
            name: playerName,
            skinId: SKIN_AVATARS[0].id,
            frameId: SKIN_FRAMES[0].id,
            titleBadge: SKIN_TITLES[0]
          };

          conn.send({
            type: 'JOIN_PLAYER',
            player: myPlayerPayload
          });

          // Save session
          try {
            localStorage.setItem('avalon_party_session_v1', JSON.stringify({
              playerId: myPlayerPayload.id,
              playerName,
              roomCode: cleanCode,
              isHost: false
            }));
          } catch (e) {}
        });

        conn.on('data', (data: any) => {
          if (data?.type === 'GAME_STATE_SYNC') {
            setGameState(data.state);
          }
        });

        conn.on('close', () => {
          setPeerStatus('IDLE');
          setOnlineError('Đã mất kết nối tới Chủ Phòng. Đang thử kết nối lại...');
        });

        conn.on('error', (err) => {
          console.error('Connection error:', err);
          setOnlineError('Không thể kết nối tới phòng ' + cleanCode + '. Vui lòng kiểm tra mã phòng!');
          setPeerStatus('ERROR');
        });
      });

      peer.on('error', (err) => {
        console.error('PeerJS Client Error:', err);
        setOnlineError('Không tìm thấy phòng ' + cleanCode + '. Hãy chắc chắn Chủ Phòng đã bấm "Tạo Phòng"!');
        setPeerStatus('ERROR');
      });

    } catch (e) {
      console.error(e);
      setOnlineError('Lỗi kết nối WebRTC. Vui lòng kiểm tra mạng!');
      setPeerStatus('ERROR');
    }
  };

  // ------------------------------------------
  // Host Authoritative Action Executor
  // ------------------------------------------
  const executeHostAction = (actionName: string, payload: any = {}) => {
    switch (actionName) {
      case 'UPDATE_NAME':
        if (payload.id && payload.newName) {
          syncState((prev: any) => ({
            ...prev,
            players: prev.players.map((p: any) => p.id === payload.id ? { ...p, name: payload.newName } : p)
          }));
        }
        break;
      case 'UPDATE_SKIN':
        if (payload.id && payload.updates) {
          syncState((prev: any) => ({
            ...prev,
            players: prev.players.map((p: any) => p.id === payload.id ? { ...p, ...payload.updates } : p)
          }));
        }
        break;
      case 'CONFIRM_ROLE_VIEWED':
        handleConfirmRoleViewed(payload.pId);
        break;
      case 'TOGGLE_TEAM_MEMBER':
        handleToggleTeamMember(payload.targetId);
        break;
      case 'SUBMIT_TEAM_PROPOSAL':
        handleSubmitTeamProposal();
        break;
      case 'CAST_TEAM_VOTE':
        handleCastTeamVote(payload.voterId, payload.choice);
        break;
      case 'CAST_QUEST_CARD':
        handleCastQuestCard(payload.memberId, payload.cardChoice);
        break;
      case 'SELECT_LADY_TARGET':
        handleSelectLadyTarget(payload.targetId);
        break;
      case 'FINISH_LADY_INSPECTION':
        handleFinishLadyInspection();
        break;
      case 'ASSASSINATE_TARGET':
        handleAssassinateTarget(payload.targetId);
        break;
      case 'PROCEED_FROM_VOTE_RESULT':
        handleProceedFromVoteResult();
        break;
      case 'REVEAL_NEXT_QUEST_CARD':
        handleRevealNextQuestCard();
        break;
      case 'FINISH_QUEST_RESOLUTION':
        handleFinishQuestResolution();
        break;
      default:
        console.warn('Unhandled Host Action:', actionName);
    }
  };

  const handleCopyShareLink = () => {
    if (typeof window === 'undefined' || !roomCode) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    sfx.click();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // ------------------------------------------
  // Lobby Actions
  // ------------------------------------------
  const handleUpdatePlayerName = (id, newName) => {
    if (mode === 'ONLINE' && !isHost) {
      dispatchAction('UPDATE_NAME', { id, newName });
      return;
    }
    syncState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === id ? { ...p, name: newName } : p)
    }));
  };

  const handleUpdatePlayerSkin = (id, updates) => {
    if (mode === 'ONLINE' && !isHost) {
      dispatchAction('UPDATE_SKIN', { id, updates });
      return;
    }
    sfx.click();
    syncState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const handleAddPlayerSlot = () => {
    if (gameState.players.length >= 10) return;
    sfx.click();
    const nextNum = gameState.players.length + 1;
    const newId = `p_${Date.now()}_${nextNum}`;
    syncState(prev => ({
      ...prev,
      players: [
        ...prev.players,
        {
          id: newId,
          name: `Người chơi ${nextNum}`,
          role: null,
          readyRole: false,
          skinId: SKIN_AVATARS[(nextNum - 1) % SKIN_AVATARS.length].id,
          frameId: SKIN_FRAMES[(nextNum - 1) % SKIN_FRAMES.length].id,
          titleBadge: SKIN_TITLES[(nextNum - 1) % SKIN_TITLES.length]
        }
      ]
    }));
  };

  const handleRemovePlayerSlot = (id) => {
    if (gameState.players.length <= 5) return;
    sfx.click();
    syncState(prev => {
      const filtered = prev.players.filter(p => p.id !== id);
      return {
        ...prev,
        players: filtered
      };
    });
  };

  const handleResetTo9Players = () => {
    sfx.click();
    syncState(prev => ({
      ...prev,
      players: DEFAULT_9_PLAYER_NAMES.map((name, idx) => ({
        id: `p${idx + 1}`,
        name: prev.players[idx]?.name || name,
        role: null,
        readyRole: false,
        skinId: prev.players[idx]?.skinId || SKIN_AVATARS[idx % SKIN_AVATARS.length].id,
        frameId: prev.players[idx]?.frameId || SKIN_FRAMES[idx % SKIN_FRAMES.length].id,
        titleBadge: prev.players[idx]?.titleBadge || SKIN_TITLES[idx % SKIN_TITLES.length]
      }))
    }));
    setActiveViewerId('p1');
  };

  const handleShuffleSeats = () => {
    sfx.click();
    syncState(prev => ({
      ...prev,
      players: shuffleArray(prev.players)
    }));
  };

  const handleToggleSpecialRole = (key) => {
    sfx.click();
    syncState(prev => ({
      ...prev,
      specialConfig: {
        ...prev.specialConfig,
        [key]: !prev.specialConfig[key]
      }
    }));
  };

  // ------------------------------------------
  // Start Game & Deal Roles
  // ------------------------------------------
  const handleStartGame = () => {
    if (gameState.players.length < 5 || gameState.players.length > 10) return;
    sfx.revealRole();
    const deck = buildRoleDeck(gameState.players.length, gameState.specialConfig);
    const assignedPlayers = gameState.players.map((p, idx) => ({
      ...p,
      role: deck[idx],
      readyRole: false
    }));
    const randomLeader = Math.floor(Math.random() * assignedPlayers.length);
    // Rulebook Page 8: Lady of the Lake token is given to the player on the Leader's right
    const ladyIdx = (randomLeader + assignedPlayers.length - 1) % assignedPlayers.length;
    const initialLadyId = gameState.specialConfig.ladyOfLake ? assignedPlayers[ladyIdx].id : null;

    syncState({
      ...gameState,
      phase: 'ROLE_REVEAL',
      players: assignedPlayers,
      leaderIdx: randomLeader,
      currentQuestIdx: 0,
      completedQuestsCount: 0,
      rejectCount: 0,
      questResults: [null, null, null, null, null],
      selectedTeam: [],
      teamVotes: {},
      questVotes: {},
      revealedQuestCards: [],
      revealedCardCount: 0,
      ladyHolderId: initialLadyId,
      ladyPastHolders: initialLadyId ? [initialLadyId] : [],
      ladyTargetId: null,
      ladyUsesCount: 0,
      assassinatedId: null,
      winner: null,
      winReason: '',
      historyLogs: []
    });

    if (mode === 'LOCAL') {
      setActiveViewerId(assignedPlayers[0].id);
      setPassScreenLocked(true);
    }
  };

  // Confirm Role Viewed
  const handleConfirmRoleViewed = (pId) => {
    if (mode === 'ONLINE' && !isHost) {
      dispatchAction('CONFIRM_ROLE_VIEWED', { pId });
      return;
    }
    sfx.click();
    const updatedPlayers = gameState.players.map(p =>
      p.id === pId ? { ...p, readyRole: true } : p
    );
    const allReady = updatedPlayers.every(p => p.readyRole);

    if (mode === 'LOCAL' && !allReady) {
      const nextUnready = updatedPlayers.find(p => !p.readyRole);
      if (nextUnready) {
        setActiveViewerId(nextUnready.id);
        setPassScreenLocked(true);
      }
    }

    syncState(prev => ({
      ...prev,
      players: updatedPlayers,
      phase: allReady ? 'TEAM_BUILD' : 'ROLE_REVEAL'
    }));
  };

  const handleSkipAllRoleConfirm = () => {
    sfx.click();
    syncState(prev => ({
      ...prev,
      players: prev.players.map(p => ({ ...p, readyRole: true })),
      phase: 'TEAM_BUILD'
    }));
  };

  // ------------------------------------------
  // Phase 3: Team Building
  // ------------------------------------------
  const handleToggleTeamMember = (targetId) => {
    if (mode === 'ONLINE' && !isHost) {
      dispatchAction('TOGGLE_TEAM_MEMBER', { targetId });
      return;
    }
    sfx.click();
    syncState(prev => {
      const exists = prev.selectedTeam.includes(targetId);
      let nextTeam = [...prev.selectedTeam];
      if (exists) {
        nextTeam = nextTeam.filter(id => id !== targetId);
      } else {
        if (nextTeam.length >= requiredTeamSize) return prev;
        nextTeam.push(targetId);
      }
      return { ...prev, selectedTeam: nextTeam };
    });
  };

  const handleSubmitTeamProposal = () => {
    if (mode === 'ONLINE' && !isHost) {
      dispatchAction('SUBMIT_TEAM_PROPOSAL', {});
      return;
    }
    if (gameState.selectedTeam.length !== requiredTeamSize) return;
    sfx.drumroll();
    syncState(prev => ({
      ...prev,
      phase: 'TEAM_VOTE',
      teamVotes: {}
    }));
    if (mode === 'LOCAL') {
      setActiveViewerId(gameState.players[0].id);
    }
  };

  // ------------------------------------------
  // Phase 4: Team Voting (Approve / Reject)
  // ------------------------------------------
  const handleCastTeamVote = (voterId, choice) => {
    if (mode === 'ONLINE' && !isHost) {
      dispatchAction('CAST_TEAM_VOTE', { voterId, choice });
      return;
    }
    sfx.click();
    const nextVotes = { ...gameState.teamVotes, [voterId]: choice };
    const allVoted = gameState.players.every(p => nextVotes[p.id]);

    if (mode === 'LOCAL' && !allVoted) {
      const nextVoter = gameState.players.find(p => !nextVotes[p.id]);
      if (nextVoter) setActiveViewerId(nextVoter.id);
    }

    syncState(prev => ({
      ...prev,
      teamVotes: nextVotes,
      phase: allVoted ? 'VOTE_RESULT' : 'TEAM_VOTE'
    }));
  };

  // Quick Game Master Vote Helper (Approve All or Reject All or fast toggle in Local Mode)
  const handleGMForceApproveTeam = () => {
    sfx.questSuccess();
    const allApprove = {};
    gameState.players.forEach(p => { allApprove[p.id] = 'APPROVE'; });
    syncState(prev => ({
      ...prev,
      teamVotes: allApprove,
      phase: 'VOTE_RESULT'
    }));
  };

  const handleProceedFromVoteResult = () => {
    if (mode === 'ONLINE' && !isHost) {
      dispatchAction('PROCEED_FROM_VOTE_RESULT', {});
      return;
    }
    const approveCount = Object.values(gameState.teamVotes).filter(v => v === 'APPROVE').length;
    const rejectVotesCount = gameState.players.length - approveCount;
    const isApproved = approveCount > rejectVotesCount;

    const logEntry = {
      questNum: gameState.currentQuestIdx + 1,
      leaderName: currentLeader.name,
      teamNames: gameState.selectedTeam.map(id => gameState.players.find(p => p.id === id)?.name),
      votes: { ...gameState.teamVotes },
      approved: isApproved,
      type: 'VOTE'
    };

    if (isApproved) {
      sfx.questSuccess();
      const firstQuestMember = gameState.selectedTeam[0];
      if (mode === 'LOCAL' && firstQuestMember) {
        setActiveViewerId(firstQuestMember);
        setPassScreenLocked(true);
        setQuestButtonsSwapped(Math.random() > 0.5);
      }
      syncState(prev => ({
        ...prev,
        phase: 'QUEST_EXEC',
        questVotes: {},
        historyLogs: [logEntry, ...prev.historyLogs]
      }));
    } else {
      const nextRejectCount = gameState.rejectCount + 1;
      const nextLeaderIdx = (gameState.leaderIdx + 1) % gameState.players.length;

      if (nextRejectCount >= 5) {
        sfx.victoryEvil();
        syncState(prev => ({
          ...prev,
          rejectCount: 5,
          phase: 'GAME_OVER',
          winner: 'EVIL',
          winReason: 'Bàn tròn rơi vào hỗn loạn! Đã có 5 lần lập đội bị từ chối liên tiếp trong cùng một Nhiệm vụ.',
          historyLogs: [logEntry, ...prev.historyLogs]
        }));
      } else {
        sfx.questFail();
        syncState(prev => ({
          ...prev,
          rejectCount: nextRejectCount,
          leaderIdx: nextLeaderIdx,
          selectedTeam: [],
          teamVotes: {},
          phase: 'TEAM_BUILD',
          historyLogs: [logEntry, ...prev.historyLogs]
        }));
      }
    }
  };

  // ------------------------------------------
  // Phase 5: Secret Quest Execution
  // ------------------------------------------
  const handleCastQuestCard = (memberId, cardChoice) => {
    if (mode === 'ONLINE' && !isHost) {
      dispatchAction('CAST_QUEST_CARD', { memberId, cardChoice });
      return;
    }
    sfx.click();
    const nextQuestVotes = { ...gameState.questVotes, [memberId]: cardChoice };
    const allDone = gameState.selectedTeam.every(id => nextQuestVotes[id]);

    if (mode === 'LOCAL' && !allDone) {
      const nextMemberId = gameState.selectedTeam.find(id => !nextQuestVotes[id]);
      if (nextMemberId) {
        setActiveViewerId(nextMemberId);
        setPassScreenLocked(true);
        setQuestButtonsSwapped(Math.random() > 0.5);
      }
    }

    if (allDone) {
      const shuffledCards = shuffleArray(Object.values(nextQuestVotes));
      sfx.drumroll();
      syncState(prev => ({
        ...prev,
        questVotes: nextQuestVotes,
        revealedQuestCards: shuffledCards,
        revealedCardCount: 0,
        phase: 'QUEST_RESULT'
      }));
    } else {
      syncState(prev => ({
        ...prev,
        questVotes: nextQuestVotes
      }));
    }
  };

  const handleRevealNextQuestCard = () => {
    if (mode === 'ONLINE' && !isHost) {
      dispatchAction('REVEAL_NEXT_QUEST_CARD', {});
      return;
    }
    if (gameState.revealedCardCount >= gameState.revealedQuestCards.length) return;
    const nextIdx = gameState.revealedCardCount;
    const card = gameState.revealedQuestCards[nextIdx];
    if (card === 'FAIL') {
      sfx.questFail();
      setPixelFxEvent('FAIL');
    } else {
      sfx.questSuccess();
      setPixelFxEvent('SUCCESS');
    }
    syncState(prev => ({
      ...prev,
      revealedCardCount: prev.revealedCardCount + 1
    }));
  };

  const handleFinishQuestResolution = () => {
    if (mode === 'ONLINE' && !isHost) {
      dispatchAction('FINISH_QUEST_RESOLUTION', {});
      return;
    }
    const failCount = gameState.revealedQuestCards.filter(c => c === 'FAIL').length;
    const needsTwoFails = gameState.currentQuestIdx === 3 && currentMatrix.twoFailsOnQuest4;
    const questFailed = needsTwoFails ? failCount >= 2 : failCount >= 1;
    const outcome = questFailed ? 'FAIL' : 'SUCCESS';

    const nextQuestResults = [...gameState.questResults];
    nextQuestResults[gameState.currentQuestIdx] = outcome;
    const nextCompletedCount = nextQuestResults.filter(r => r !== null).length;

    const totalSuccess = nextQuestResults.filter(r => r === 'SUCCESS').length;
    const totalFail = nextQuestResults.filter(r => r === 'FAIL').length;
    const nextLeaderIdx = (gameState.leaderIdx + 1) % gameState.players.length;

    if (totalFail >= 3) {
      sfx.victoryEvil();
      syncState(prev => ({
        ...prev,
        questResults: nextQuestResults,
        completedQuestsCount: nextCompletedCount,
        phase: 'GAME_OVER',
        winner: 'EVIL',
        winReason: 'Phe Ác đã phá hoại thành công 3 Nhiệm vụ của Vương quốc!'
      }));
      return;
    }

    if (totalSuccess >= 3) {
      const hasAssassin = gameState.players.some(p => p.role === 'ASSASSIN');
      const hasMerlin = gameState.players.some(p => p.role === 'MERLIN');
      if (hasAssassin && hasMerlin) {
        sfx.drumroll();
        const assassinPlayer = gameState.players.find(p => p.role === 'ASSASSIN');
        if (mode === 'LOCAL' && assassinPlayer) {
          setActiveViewerId(assassinPlayer.id);
        }
        syncState(prev => ({
          ...prev,
          questResults: nextQuestResults,
          completedQuestsCount: nextCompletedCount,
          phase: 'ASSASSIN'
        }));
      } else {
        sfx.victoryGood();
        syncState(prev => ({
          ...prev,
          questResults: nextQuestResults,
          completedQuestsCount: nextCompletedCount,
          phase: 'GAME_OVER',
          winner: 'GOOD',
          winReason: 'Hiệp Sĩ Bàn Tròn đã hoàn thành xuất sắc 3 Nhiệm vụ!'
        }));
      }
      return;
    }

    // Rulebook Page 8: Immediately after the 2nd, 3rd, and 4th Quest is resolved, Lady of the Lake activates
    const shouldTriggerLady =
      gameState.specialConfig.ladyOfLake &&
      gameState.ladyHolderId &&
      (nextCompletedCount === 2 || nextCompletedCount === 3 || nextCompletedCount === 4) &&
      gameState.ladyUsesCount < 3;

    // Pick next available quest index (supports Targeting rule)
    const nextDefaultQuestIdx = nextQuestResults.findIndex(r => r === null);

    if (shouldTriggerLady) {
      sfx.ladyLake();
      if (mode === 'LOCAL') {
        setActiveViewerId(gameState.ladyHolderId);
        setPassScreenLocked(true);
      }
      syncState(prev => ({
        ...prev,
        questResults: nextQuestResults,
        completedQuestsCount: nextCompletedCount,
        currentQuestIdx: nextDefaultQuestIdx !== -1 ? nextDefaultQuestIdx : prev.currentQuestIdx,
        rejectCount: 0,
        leaderIdx: nextLeaderIdx,
        selectedTeam: [],
        teamVotes: {},
        questVotes: {},
        revealedQuestCards: [],
        revealedCardCount: 0,
        phase: 'LADY_OF_LAKE'
      }));
      return;
    }

    sfx.click();
    syncState(prev => ({
      ...prev,
      questResults: nextQuestResults,
      completedQuestsCount: nextCompletedCount,
      currentQuestIdx: nextDefaultQuestIdx !== -1 ? nextDefaultQuestIdx : prev.currentQuestIdx + 1,
      rejectCount: 0,
      leaderIdx: nextLeaderIdx,
      selectedTeam: [],
      teamVotes: {},
      questVotes: {},
      revealedQuestCards: [],
      revealedCardCount: 0,
      phase: 'TEAM_BUILD'
    }));
  };

  // ------------------------------------------
  // Phase 5C: Lady of the Lake (Rulebook Page 8)
  // ------------------------------------------
  const handleSelectLadyTarget = (targetId) => {
    if (mode === 'ONLINE' && !isHost) {
      dispatchAction('SELECT_LADY_TARGET', { targetId });
      return;
    }
    if (gameState.ladyPastHolders.includes(targetId)) return;
    sfx.ladyLake();
    setPixelFxEvent('LADY_LAKE');
    syncState(prev => ({
      ...prev,
      ladyTargetId: targetId,
      phase: 'LADY_REVEAL'
    }));
  };

  const handleFinishLadyInspection = () => {
    if (mode === 'ONLINE' && !isHost) {
      dispatchAction('FINISH_LADY_INSPECTION', {});
      return;
    }
    const targetPlayer = gameState.players.find(p => p.id === gameState.ladyTargetId);
    const holderPlayer = gameState.players.find(p => p.id === gameState.ladyHolderId);
    sfx.click();

    const ladyLog = {
      questNum: gameState.completedQuestsCount,
      leaderName: holderPlayer?.name || 'Nữ Thần',
      teamNames: [targetPlayer?.name || 'Ẩn danh'],
      approved: true,
      type: 'LADY_LAKE'
    };

    if (mode === 'LOCAL' && gameState.players[gameState.leaderIdx]) {
      setActiveViewerId(gameState.players[gameState.leaderIdx].id);
    }

    syncState(prev => ({
      ...prev,
      ladyHolderId: prev.ladyTargetId,
      ladyPastHolders: [...prev.ladyPastHolders, prev.ladyTargetId],
      ladyTargetId: null,
      ladyUsesCount: prev.ladyUsesCount + 1,
      historyLogs: [ladyLog, ...prev.historyLogs],
      phase: 'TEAM_BUILD'
    }));
  };

  // ------------------------------------------
  // Phase 6: Assassin's Final Shot
  // ------------------------------------------
  const handleAssassinateTarget = (targetId) => {
    if (mode === 'ONLINE' && !isHost) {
      dispatchAction('ASSASSINATE_TARGET', { targetId });
      return;
    }
    const targetPlayer = gameState.players.find(p => p.id === targetId);
    if (!targetPlayer) return;
    setPixelFxEvent('ASSASSIN');
    const isMerlin = targetPlayer.role === 'MERLIN';

    if (isMerlin) {
      sfx.victoryEvil();
      syncState(prev => ({
        ...prev,
        assassinatedId: targetId,
        phase: 'GAME_OVER',
        winner: 'EVIL',
        winReason: `Cú lật kèo ngoạn mục! Sát Thủ đã bắn trúng Đại Pháp Sư Merlin (${targetPlayer.name})!`
      }));
    } else {
      sfx.victoryGood();
      syncState(prev => ({
        ...prev,
        assassinatedId: targetId,
        phase: 'GAME_OVER',
        winner: 'GOOD',
        winReason: `Sát Thủ đã nhắm bắn ${targetPlayer.name} (${ROLES_DATA[targetPlayer.role]?.name}) nhưng KHÔNG phải Merlin! Phe Thiện bảo toàn chiến thắng!`
      }));
    }
  };

  // Copy Prompt helper
  const handleCopyMasterPrompt = () => {
    navigator.clipboard.writeText(MASTER_AGENT_PROMPT);
    setCopiedPrompt(true);
    sfx.click();
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedRoom(true);
    sfx.click();
    setTimeout(() => setCopiedRoom(false), 2000);
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  const secretIntel = useMemo(
    () => getSecretIntelForPlayer(currentPlayer, gameState.players),
    [currentPlayer, gameState.players]
  );

  const currentRoleInfo = currentPlayer?.role ? ROLES_DATA[currentPlayer.role] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-amber-50 font-sans selection:bg-amber-500 selection:text-slate-950 flex flex-col justify-between relative overflow-x-hidden">
      {/* PixelFX Animated Overlay */}
      <PixelFXOverlay effectType={pixelFxEvent} onComplete={() => setPixelFxEvent(null)} />

      {/* Custom Styles for 3D Flip & Magical Glow Animations */}
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes shakeScreen {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px) rotate(-1deg); }
          40%, 80% { transform: translateX(8px) rotate(1deg); }
        }
        .animate-float { animation: floatSlow 3.5s ease-in-out infinite; }
        .animate-shake { animation: shakeScreen 0.45s ease-in-out; }
      `}</style>

      {/* Ambient Magical Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-red-600/15 rounded-full blur-3xl" />
      </div>

      {/* ==========================================
          TOP NAVIGATION BAR
         ========================================== */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-amber-500/20 px-3 py-2.5 shadow-lg">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center shadow-md shadow-amber-500/20">
              <Crown className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-wide bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 bg-clip-text text-transparent flex items-center gap-2">
                AVALON: BÀN TRÒN
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300">
                  {playerCount} Người
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Ẩn Vai Suy Luận Không Ngủ • Tối ưu tiệc 9 người
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {mode === 'ONLINE' && roomCode && (
              <button
                onClick={handleCopyRoomCode}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-950/90 border border-indigo-400/40 text-xs font-bold text-indigo-200 hover:bg-indigo-900 transition"
                title="Sao chép Mã Phòng"
              >
                <span>Phòng: {roomCode}</span>
                {copiedRoom ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              onClick={() => { sfx.click(); setShowPromptModal(true); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition shadow-sm"
              title="Lấy Prompt cho AI Agent"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Prompt AI</span>
            </button>

            <button
              onClick={() => { sfx.click(); setShowDeployModal(true); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-sky-300 text-xs font-semibold transition shadow-sm"
              title="Hướng dẫn Publish lên Google Sites & Web"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Google Sites</span>
            </button>

            {gameState.phase !== 'LOBBY' && (
              <button
                onClick={() => { sfx.click(); setShowHistoryModal(true); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-200 text-xs font-semibold transition"
              >
                <ScrollText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nhật Ký</span>
              </button>
            )}

            <button
              onClick={() => { sfx.click(); setShowRulesModal(true); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-xs font-semibold transition"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Rulebook</span>
            </button>

            <button
              onClick={toggleSound}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>
      </header>

      {/* ==========================================
          MAIN CONTENT AREA
         ========================================== */}
      <main className="flex-1 z-10 max-w-5xl w-full mx-auto px-3 py-4 sm:px-6 flex flex-col gap-4">

        {/* ------------------------------------------
            QUEST TRACKER BOARD (Shown when in-game)
           ------------------------------------------ */}
        {gameState.phase !== 'LOBBY' && (
          <section className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3 sm:p-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm sm:text-base font-bold text-amber-100">
                  Tiến Trình 5 Nhiệm Vụ ({currentMatrix.good} Thiện vs {currentMatrix.evil} Ác)
                </h2>
              </div>

              {/* Reject Vote Track (0/5) */}
              <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 font-medium">Lần từ chối đội:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(step => (
                    <div
                      key={step}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                        gameState.rejectCount >= step
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/50 scale-110'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 5 Quest Circles */}
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {currentMatrix.quests.map((teamSize, idx) => {
                const status = gameState.questResults[idx];
                const isCurrent = gameState.currentQuestIdx === idx && gameState.phase !== 'GAME_OVER';
                const needsTwoFails = idx === 3 && currentMatrix.twoFailsOnQuest4;
                // Rulebook Page 8 Targeting: Leader can choose which Quest to attempt (5th Quest requires 2 successes first)
                const totalSuccessSoFar = gameState.questResults.filter(r => r === 'SUCCESS').length;
                const canTargetThisQuest =
                  gameState.specialConfig.targeting &&
                  gameState.phase === 'TEAM_BUILD' &&
                  status === null &&
                  (idx !== 4 || totalSuccessSoFar >= 2);

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (canTargetThisQuest) {
                        sfx.click();
                        syncState(prev => ({ ...prev, currentQuestIdx: idx, selectedTeam: [] }));
                      }
                    }}
                    className={`relative rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center border transition-all ${
                      canTargetThisQuest ? 'cursor-pointer hover:border-amber-400' : ''
                    } ${
                      status === 'SUCCESS'
                        ? 'bg-gradient-to-b from-blue-600/40 to-blue-950/80 border-blue-400 shadow-lg shadow-blue-500/20'
                        : status === 'FAIL'
                        ? 'bg-gradient-to-b from-red-600/40 to-red-950/80 border-red-500 shadow-lg shadow-red-500/20'
                        : isCurrent
                        ? 'bg-gradient-to-b from-amber-500/25 to-slate-900 border-amber-400 ring-2 ring-amber-400/30 animate-pulse'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1">
                      <span>NV {idx + 1}</span>
                      {canTargetThisQuest && !isCurrent && <Target className="w-3 h-3 text-amber-400" />}
                    </span>

                    <div className="my-1 flex items-center justify-center">
                      {status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
                      ) : status === 'FAIL' ? (
                        <Skull className="w-6 h-6 sm:w-8 sm:h-8 text-red-400" />
                      ) : (
                        <span className="text-lg sm:text-2xl font-black text-amber-300">
                          {teamSize}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 text-center">
                      {teamSize} người
                    </span>

                    {needsTwoFails && (
                      <span className="mt-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[9px] font-bold text-amber-300 text-center leading-tight">
                        Cần 2 Thất Bại
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ------------------------------------------
            PERSPECTIVE SWITCHER & SECRET ROLE CARD (In-Game)
           ------------------------------------------ */}
        {gameState.phase !== 'LOBBY' && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left column: Player Perspective Switcher (For Local Mode) & Secret Card */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              {mode === 'LOCAL' && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" />
                      Đang cầm máy / Góc nhìn của:
                    </span>
                    <span className="text-[11px] text-slate-400">
                      (Chế độ 1 Máy / Quản Trò)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {gameState.players.map((p, idx) => {
                      const isSelected = p.id === currentPlayer?.id;
                      const isLeader = idx === gameState.leaderIdx;
                      const hasLady = p.id === gameState.ladyHolderId;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            sfx.click();
                            setActiveViewerId(p.id);
                            setHoldingSecret(false);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-xs font-semibold truncate flex items-center justify-center gap-1 border transition ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold shadow-md'
                              : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          {isLeader && <Crown className="w-3 h-3 shrink-0 text-amber-400" />}
                          {hasLady && <Waves className="w-3 h-3 shrink-0 text-cyan-400" />}
                          <span className="truncate">{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Zero-Sleep Hold-To-Reveal Role & Intel Card */}
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <PixelCharacterAvatar
                      skinId={currentPlayer?.skinId}
                      frameId={currentPlayer?.frameId}
                      size="sm"
                      isLeader={gameState.players[gameState.leaderIdx]?.id === currentPlayer?.id}
                      hasLady={gameState.ladyHolderId === currentPlayer?.id}
                    />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-200 block">
                        {currentPlayer?.name}
                      </span>
                      <span className="text-[10px] text-amber-400/80 font-semibold">
                        {currentPlayer?.titleBadge || 'Hiệp Sĩ Bàn Tròn'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingSkinPlayerId(currentPlayer?.id)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold text-amber-300 flex items-center gap-1"
                  >
                    <Palette className="w-3 h-3" />
                    <span>Đổi Skin</span>
                  </button>
                </div>

                {/* 3D Flip Card Container */}
                <div className="perspective-1000 w-full my-1">
                  <div
                    className={`relative w-full min-h-[210px] rounded-xl transition-all duration-500 transform-style-3d ${
                      holdingSecret ? 'rotate-y-180' : ''
                    }`}
                  >
                    {/* FRONT OF CARD (Hidden state) */}
                    <div className="absolute inset-0 backface-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border-2 border-amber-500/40 p-4 flex flex-col items-center justify-center text-center shadow-inner">
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-400/30 flex items-center justify-center mb-2 animate-float">
                        <Lock className="w-6 h-6 text-amber-400" />
                      </div>
                      <p className="text-sm font-bold text-amber-200">
                        Thông Tin Mật Đang Ẩn
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs">
                        Che màn hình khỏi người ngồi cạnh và nhấn giữ nút bên dưới để xem Vai Trò & Tình Báo Đêm.
                      </p>
                    </div>

                    {/* BACK OF CARD (Revealed Role & Zero-Sleep Intel) */}
                    <div
                      className={`absolute inset-0 backface-hidden rotate-y-180 rounded-xl bg-gradient-to-br ${
                        currentRoleInfo?.color || 'from-slate-800 to-slate-950'
                      } border-2 ${
                        currentRoleInfo?.border || 'border-amber-400'
                      } p-3.5 flex flex-col justify-between overflow-y-auto`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{currentRoleInfo?.icon}</span>
                            <div>
                              <h3 className="text-sm font-black text-white leading-tight">
                                {currentRoleInfo?.name}
                              </h3>
                              <span
                                className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full mt-0.5 ${
                                  currentRoleInfo?.team === 'GOOD'
                                    ? 'bg-blue-500/30 text-blue-200 border border-blue-300/40'
                                    : 'bg-red-500/30 text-red-200 border border-red-300/40'
                                }`}
                              >
                                {currentRoleInfo?.team === 'GOOD' ? '🛡️ PHE THIỆN' : '🔥 PHE ÁC'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Zero-Sleep Night Knowledge */}
                        <div className="mt-2.5">
                          <p className="text-xs font-bold text-amber-200 mb-1.5">
                            {secretIntel.title}
                          </p>
                          {secretIntel.items.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {secretIntel.items.map((item, idx) => (
                                <span
                                  key={idx}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${item.color}`}
                                >
                                  {item.name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <p className="text-[11px] text-slate-200/90 leading-relaxed bg-black/25 p-2 rounded-lg border border-white/10">
                            {secretIntel.note}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Press & Hold Button */}
                <button
                  onMouseDown={() => { sfx.revealRole(); setHoldingSecret(true); }}
                  onMouseUp={() => setHoldingSecret(false)}
                  onMouseLeave={() => setHoldingSecret(false)}
                  onTouchStart={(e) => { e.preventDefault(); sfx.revealRole(); setHoldingSecret(true); }}
                  onTouchEnd={() => setHoldingSecret(false)}
                  className={`mt-2 w-full py-3 rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 select-none transition-all ${
                    holdingSecret
                      ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30 scale-[0.99]'
                      : 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 shadow-md'
                  }`}
                >
                  {holdingSecret ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span>Thả Tay Để Ẩn Ngay</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Nhấn & Giữ Để Xem Vai Trò</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right column: Active Game Phase Action Board */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="flex-1 bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between">
                
                {/* ==========================================
                    PHASE 2: ROLE_REVEAL CONFIRMATION
                   ========================================== */}
                {gameState.phase === 'ROLE_REVEAL' && (
                  <div className="flex flex-col justify-between h-full gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold mb-2">
                        <Sparkles className="w-3.5 h-3.5" />
                        Giai đoạn 1: Nhận Diện Vai Trò (Không Cần Nhắm Mắt)
                      </div>
                      <h2 className="text-lg sm:text-xl font-extrabold text-white">
                        Mỗi người kiểm tra Thẻ Bài Mật của mình
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1">
                        Hệ thống đã tự động phân tích và hiển thị sẵn tên đồng bọn / Merlin trong thẻ bài bên trái. Sau khi xem xong, hãy bấm xác nhận!
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                        {gameState.players.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              if (mode === 'LOCAL') {
                                sfx.click();
                                setActiveViewerId(p.id);
                              }
                            }}
                            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                              p.readyRole
                                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                                : p.id === currentPlayer?.id
                                ? 'bg-amber-500/20 border-amber-400 text-white'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="text-xs font-bold truncate">{p.name}</span>
                            {p.readyRole ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                                Chờ xem
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-800">
                      {!currentPlayer?.readyRole && (
                        <button
                          onClick={() => handleConfirmRoleViewed(currentPlayer.id)}
                          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm shadow-lg transition flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          <span>{currentPlayer?.name} Đã Xem Xong Vai Trò</span>
                        </button>
                      )}
                      <button
                        onClick={handleSkipAllRoleConfirm}
                        className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/30 transition"
                      >
                        Vào Thẳng Nhiệm Vụ 1 →
                      </button>
                    </div>
                  </div>
                )}

                {/* ==========================================
                    PHASE 3: TEAM BUILDING (LẬP ĐỘI)
                   ========================================== */}
                {gameState.phase === 'TEAM_BUILD' && (
                  <div className="flex flex-col justify-between h-full gap-4">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                          <Crown className="w-3.5 h-3.5" />
                          Đội Trưởng Hiện Tại: {currentLeader?.name}
                        </span>
                        <span className="text-xs font-bold text-sky-300 bg-sky-950/80 px-2.5 py-1 rounded-lg border border-sky-500/30">
                          Đã chọn: {gameState.selectedTeam.length} / {requiredTeamSize} người
                        </span>
                      </div>

                      <h2 className="text-lg sm:text-xl font-extrabold text-white">
                        Đề Cử Đội Hình Đi Nhiệm Vụ {gameState.currentQuestIdx + 1}
                      </h2>
                      <p className="text-xs text-slate-300 mt-1">
                        {currentLeader?.name} hãy thảo luận cùng cả bàn và chọn đúng <strong>{requiredTeamSize} người</strong> tham gia nhiệm vụ này.
                        {gameState.currentQuestIdx === 3 && currentMatrix.twoFailsOnQuest4 && (
                          <span className="text-amber-300 font-semibold"> (Lưu ý: Nhiệm vụ 4 cần tới 2 phiếu Thất Bại mới bị phá hỏng!)</span>
                        )}
                      </p>

                      {/* Player Selection Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
                        {gameState.players.map((p, idx) => {
                          const isSelected = gameState.selectedTeam.includes(p.id);
                          const isLeader = idx === gameState.leaderIdx;
                          const hasLady = p.id === gameState.ladyHolderId;
                          return (
                            <button
                              key={p.id}
                              onClick={() => handleToggleTeamMember(p.id)}
                              className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-gradient-to-r from-amber-500/30 to-yellow-600/20 border-amber-400 text-white shadow-md shadow-amber-500/10 scale-[1.02]'
                                  : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <PixelCharacterAvatar
                                  skinId={p.skinId}
                                  frameId={p.frameId}
                                  size="sm"
                                  isLeader={isLeader}
                                  hasLady={hasLady}
                                />
                                <div className="truncate">
                                  <span className="text-xs font-bold block truncate">{p.name}</span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    {isSelected ? '⚔️ Trong đội' : p.titleBadge || 'Chưa chọn'}
                                  </span>
                                </div>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center border ${
                                  isSelected
                                    ? 'bg-amber-400 border-amber-300 text-slate-950'
                                    : 'border-slate-700 bg-slate-900'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      disabled={gameState.selectedTeam.length !== requiredTeamSize}
                      onClick={handleSubmitTeamProposal}
                      className={`w-full py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                        gameState.selectedTeam.length === requiredTeamSize
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/25 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      <Sword className="w-4 h-4" />
                      <span>
                        Chốt Đội Hình ({gameState.selectedTeam.length}/{requiredTeamSize}) & Mở Biểu Quyết
                      </span>
                    </button>
                  </div>
                )}

                {/* ==========================================
                    PHASE 4: TEAM VOTING (BIỂU QUYẾT ĐỘI HÌNH)
                   ========================================== */}
                {gameState.phase === 'TEAM_VOTE' && (
                  <div className="flex flex-col justify-between h-full gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                          Biểu Quyết Đội Hình Nhiệm Vụ {gameState.currentQuestIdx + 1}
                        </span>
                        <span className="text-xs text-slate-400">
                          Đã bỏ phiếu: {Object.keys(gameState.teamVotes).length}/{gameState.players.length}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 mb-3">
                        <p className="text-xs text-slate-400 mb-1.5">
                          Đội hình do <strong className="text-amber-300">{currentLeader?.name}</strong> đề cử gồm:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {gameState.selectedTeam.map(id => {
                            const member = gameState.players.find(p => p.id === id);
                            return (
                              <span
                                key={id}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-bold"
                              >
                                ⚔️ {member?.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Vote buttons for current player */}
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 mb-3">
                        <p className="text-xs font-bold text-center text-amber-100 mb-2.5">
                          Lá phiếu của <span className="text-amber-400 underline">{currentPlayer?.name}</span>:
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => handleCastTeamVote(currentPlayer.id, 'APPROVE')}
                            className={`py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 border transition ${
                              gameState.teamVotes[currentPlayer?.id] === 'APPROVE'
                                ? 'bg-emerald-600 text-white border-emerald-300 shadow-lg'
                                : 'bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>TÁN THÀNH</span>
                          </button>

                          <button
                            onClick={() => handleCastTeamVote(currentPlayer.id, 'REJECT')}
                            className={`py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 border transition ${
                              gameState.teamVotes[currentPlayer?.id] === 'REJECT'
                                ? 'bg-rose-600 text-white border-rose-300 shadow-lg'
                                : 'bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            <XCircle className="w-4 h-4" />
                            <span>PHẢN ĐỐI</span>
                          </button>
                        </div>
                      </div>

                      {/* Status of everyone's vote */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {gameState.players.map(p => {
                          const hasVoted = Boolean(gameState.teamVotes[p.id]);
                          return (
                            <div
                              key={p.id}
                              onClick={() => mode === 'LOCAL' && setActiveViewerId(p.id)}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer ${
                                hasVoted
                                  ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                                  : 'bg-slate-950 border-slate-800 text-slate-500'
                              }`}
                            >
                              <span className="truncate">{p.name}</span>
                              <span className="text-[10px] font-bold">
                                {hasVoted ? 'Đã bầu' : '...'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Fast GM Helper for Local Party Mode */}
                    {mode === 'LOCAL' && (
                      <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400">
                          Mẹo Quản Trò: Có thể giơ tay biểu quyết ngoài đời rồi bấm nhanh:
                        </span>
                        <button
                          onClick={handleGMForceApproveTeam}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-bold transition"
                        >
                          ⚡ Đa Số Đồng Ý → Đi Nhiệm Vụ Ngay
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ==========================================
                    PHASE 4B: VOTE RESULT REVEAL
                   ========================================== */}
                {gameState.phase === 'VOTE_RESULT' && (() => {
                  const approveCount = Object.values(gameState.teamVotes).filter(v => v === 'APPROVE').length;
                  const rejectCount = gameState.players.length - approveCount;
                  const passed = approveCount > rejectCount;

                  return (
                    <div className="flex flex-col justify-between h-full gap-4">
                      <div>
                        <div
                          className={`p-4 rounded-xl border text-center mb-4 ${
                            passed
                              ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200'
                              : 'bg-rose-950/60 border-rose-500 text-rose-200'
                          }`}
                        >
                          <h3 className="text-lg font-black uppercase">
                            {passed ? '✅ Đội Hình Được Thông Qua!' : '❌ Đội Hình Bị Từ Chối!'}
                          </h3>
                          <p className="text-xs mt-1">
                            Tán Thành: <strong>{approveCount}</strong> phiếu • Phản Đối: <strong>{rejectCount}</strong> phiếu
                          </p>
                        </div>

                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Chi tiết lá phiếu công khai của từng người:
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {gameState.players.map(p => {
                            const v = gameState.teamVotes[p.id];
                            return (
                              <div
                                key={p.id}
                                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                                  v === 'APPROVE'
                                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                                }`}
                              >
                                <span className="truncate">{p.name}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/30">
                                  {v === 'APPROVE' ? 'Tán Thành' : 'Phản Đối'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={handleProceedFromVoteResult}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-sm uppercase tracking-wider shadow-lg transition"
                      >
                        {passed ? 'Tiến Vào Thực Hiện Nhiệm Vụ →' : 'Chuyển Quyền Đội Trưởng →'}
                      </button>
                    </div>
                  );
                })()}

                {/* ==========================================
                    PHASE 5: SECRET QUEST EXECUTION (THỰC HIỆN NHIỆM VỤ)
                   ========================================== */}
                {gameState.phase === 'QUEST_EXEC' && (() => {
                  const isOnTeam = gameState.selectedTeam.includes(currentPlayer?.id);
                  const hasSubmitted = Boolean(gameState.questVotes[currentPlayer?.id]);
                  const isGoodPlayer = ROLES_DATA[currentPlayer?.role]?.team === 'GOOD';

                  return (
                    <div className="flex flex-col justify-between h-full gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                            Thực Hiện Nhiệm Vụ Mật (Nhiệm Vụ {gameState.currentQuestIdx + 1})
                          </span>
                          <span className="text-xs text-slate-400">
                            Đã nộp: {Object.keys(gameState.questVotes).length}/{gameState.selectedTeam.length}
                          </span>
                        </div>

                        {/* Team Member Status Pills */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {gameState.selectedTeam.map(id => {
                            const member = gameState.players.find(p => p.id === id);
                            const done = Boolean(gameState.questVotes[id]);
                            return (
                              <button
                                key={id}
                                onClick={() => {
                                  if (mode === 'LOCAL') {
                                    setActiveViewerId(id);
                                    setPassScreenLocked(true);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition ${
                                  done
                                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                    : id === currentPlayer?.id
                                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md'
                                    : 'bg-slate-950 border-slate-700 text-slate-300'
                                }`}
                              >
                                <span>{member?.name}</span>
                                {done ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px]">(Chờ nộp)</span>}
                              </button>
                            );
                          })}
                        </div>

                        {!isOnTeam ? (
                          <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                            <Shield className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                            <p className="text-sm font-bold text-slate-300">
                              {currentPlayer?.name} không nằm trong đội đi Nhiệm vụ này.
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Hãy chuyền máy hoặc chờ các thành viên trong đội bí mật bỏ phiếu Thành Công / Thất Bại.
                            </p>
                          </div>
                        ) : hasSubmitted ? (
                          <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm font-bold text-emerald-200">
                              {currentPlayer?.name} đã nộp lá phiếu Nhiệm Vụ!
                            </p>
                            <p className="text-xs text-slate-300 mt-1">
                              Hãy trao máy cho thành viên tiếp theo trong đội.
                            </p>
                          </div>
                        ) : passScreenLocked && mode === 'LOCAL' ? (
                          <div className="p-6 rounded-2xl bg-slate-950/90 border-2 border-amber-500/40 text-center">
                            <Lock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                            <h3 className="text-base font-extrabold text-white">
                              Màn Hình Bảo Mật Cho: {currentPlayer?.name}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1 mb-4">
                              Hãy chắc chắn chỉ một mình <strong>{currentPlayer?.name}</strong> đang nhìn vào màn hình trước khi mở khóa!
                            </p>
                            <button
                              onClick={() => { sfx.click(); setPassScreenLocked(false); }}
                              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition"
                            >
                              Tôi Là {currentPlayer?.name} • Mở Khóa Bỏ Phiếu
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/40">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-bold text-amber-200">
                                Lựa chọn bí mật của {currentPlayer?.name}:
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                Chống nhìn trộm vị trí ngón tay
                              </span>
                            </div>

                            {/* Anti-Meta-Game Dual Buttons (Swapped randomly so spectators can't guess by left/right thumb!) */}
                            <div className="grid grid-cols-2 gap-3">
                              {(questButtonsSwapped ? ['FAIL', 'SUCCESS'] : ['SUCCESS', 'FAIL']).map((btnType) => {
                                if (btnType === 'SUCCESS') {
                                  return (
                                    <button
                                      key="SUCCESS"
                                      onClick={() => handleCastQuestCard(currentPlayer.id, 'SUCCESS')}
                                      className="p-4 rounded-xl bg-gradient-to-b from-blue-600 to-blue-900 hover:from-blue-500 hover:to-blue-800 border-2 border-blue-300 text-white flex flex-col items-center justify-center gap-1.5 shadow-lg transition"
                                    >
                                      <Award className="w-7 h-7 text-amber-300" />
                                      <span className="text-sm font-black uppercase">THÀNH CÔNG</span>
                                      <span className="text-[10px] text-blue-200">Cốc Thánh Bảo Vệ</span>
                                    </button>
                                  );
                                } else {
                                  return (
                                    <button
                                      key="FAIL"
                                      onClick={() => {
                                        if (isGoodPlayer) {
                                          // Standard Avalon rule: Good players must submit SUCCESS even if they tap the decoy button
                                          handleCastQuestCard(currentPlayer.id, 'SUCCESS');
                                        } else {
                                          handleCastQuestCard(currentPlayer.id, 'FAIL');
                                        }
                                      }}
                                      className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 shadow-lg transition ${
                                        isGoodPlayer
                                          ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-slate-600 text-slate-300'
                                          : 'bg-gradient-to-b from-red-700 to-rose-950 hover:from-red-600 hover:to-rose-900 border-red-400 text-white'
                                      }`}
                                    >
                                      <Flame className="w-7 h-7 text-red-400" />
                                      <span className="text-sm font-black uppercase">
                                        {isGoodPlayer ? 'THÀNH CÔNG (NGỤY TRANG)' : 'THẤT BẠI'}
                                      </span>
                                      <span className="text-[10px] text-slate-300 text-center">
                                        {isGoodPlayer
                                          ? 'Phe Thiện luôn nộp Thành Công'
                                          : 'Đầu Độc Nhiệm Vụ'}
                                      </span>
                                    </button>
                                  );
                                }
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* ==========================================
                    PHASE 5B: DRAMATIC 3D QUEST CARD REVEAL
                   ========================================== */}
                {gameState.phase === 'QUEST_RESULT' && (() => {
                  const totalCards = gameState.revealedQuestCards.length;
                  const allRevealed = gameState.revealedCardCount >= totalCards;
                  const visibleFails = gameState.revealedQuestCards
                    .slice(0, gameState.revealedCardCount)
                    .filter(c => c === 'FAIL').length;

                  return (
                    <div
                      className={`flex flex-col justify-between h-full gap-4 ${
                        visibleFails > 0 ? 'animate-shake' : ''
                      }`}
                    >
                      <div>
                        <div className="text-center mb-4">
                          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                            Lật Mở Kết Quả Nhiệm Vụ {gameState.currentQuestIdx + 1}
                          </span>
                          <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                            Các Lá Phiếu Đã Được Xáo Trộn Ngẫu Nhiên!
                          </h3>
                        </div>

                        {/* Cards Row */}
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 my-4">
                          {gameState.revealedQuestCards.map((card, idx) => {
                            const isFlipped = idx < gameState.revealedCardCount;
                            return (
                              <div key={idx} className="perspective-1000 h-32">
                                <div
                                  className={`relative w-full h-full rounded-xl transition-all duration-700 transform-style-3d ${
                                    isFlipped ? 'rotate-y-180' : ''
                                  }`}
                                >
                                  {/* Unflipped Back */}
                                  <div className="absolute inset-0 backface-hidden rounded-xl bg-gradient-to-b from-amber-700/40 to-slate-950 border-2 border-amber-400/50 flex flex-col items-center justify-center p-2 shadow-lg">
                                    <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
                                    <span className="text-[11px] font-bold text-amber-200 mt-1">
                                      Cốc #{idx + 1}
                                    </span>
                                  </div>

                                  {/* Flipped Result */}
                                  <div
                                    className={`absolute inset-0 backface-hidden rotate-y-180 rounded-xl border-2 flex flex-col items-center justify-center p-2 shadow-xl ${
                                      card === 'SUCCESS'
                                        ? 'bg-gradient-to-b from-blue-600 to-blue-950 border-blue-300 text-white'
                                        : 'bg-gradient-to-b from-red-600 to-rose-950 border-red-300 text-white'
                                    }`}
                                  >
                                    {card === 'SUCCESS' ? (
                                      <>
                                        <Award className="w-8 h-8 text-amber-300 mb-1" />
                                        <span className="text-xs font-black uppercase">THÀNH CÔNG</span>
                                      </>
                                    ) : (
                                      <>
                                        <Skull className="w-8 h-8 text-white mb-1" />
                                        <span className="text-xs font-black uppercase">THẤT BẠI!</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {!allRevealed ? (
                        <button
                          onClick={handleRevealNextQuestCard}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-sm uppercase tracking-wider shadow-lg transition animate-pulse"
                        >
                          ✨ Lật Mở Chiếc Cốc Tiếp Theo ({gameState.revealedCardCount + 1}/{totalCards})
                        </button>
                      ) : (
                        <button
                          onClick={handleFinishQuestResolution}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm uppercase tracking-wider shadow-lg transition"
                        >
                          Tiếp Tục Hành Trình →
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* ==========================================
                    PHASE 5C: LADY OF THE LAKE (NỮ THẦN HỒ NƯỚC - RULEBOOK TRANG 8)
                   ========================================== */}
                {gameState.phase === 'LADY_OF_LAKE' && (() => {
                  const ladyHolder = gameState.players.find(p => p.id === gameState.ladyHolderId);
                  return (
                    <div className="flex flex-col justify-between h-full gap-4">
                      <div>
                        <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950 via-blue-950 to-indigo-950 border border-cyan-400/50 mb-3">
                          <div className="flex items-center gap-2 text-cyan-300 text-xs font-extrabold uppercase tracking-wider">
                            <Waves className="w-4 h-4" />
                            Quyền Năng Nữ Thần Hồ Nước (Lần {gameState.ladyUsesCount + 1}/3)
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-white mt-1">
                            {ladyHolder?.name} đang giữ Token Nữ Thần Hồ Nước!
                          </h3>
                          <p className="text-xs text-slate-300 mt-1">
                            Theo luật chính thức (Trang 8): Hãy chọn <strong>1 người chơi</strong> để bí mật soi <strong>Thẻ Lòng Trung Thành (Phe Thiện hay Phe Ác)</strong> của họ. Người được soi sẽ nhận lại Token Nữ Thần Hồ Nước! (Không được chọn người đã từng giữ Token này).
                          </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {gameState.players.map(p => {
                            const hasHeldBefore = gameState.ladyPastHolders.includes(p.id);
                            return (
                              <button
                                key={p.id}
                                disabled={hasHeldBefore}
                                onClick={() => handleSelectLadyTarget(p.id)}
                                className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                                  hasHeldBefore
                                    ? 'bg-slate-950/40 border-slate-800/60 opacity-45 cursor-not-allowed'
                                    : 'bg-slate-950/90 hover:bg-cyan-950/60 border-slate-700 hover:border-cyan-400 cursor-pointer'
                                }`}
                              >
                                <PixelCharacterAvatar skinId={p.skinId} frameId={p.frameId} size="sm" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white truncate">{p.name}</p>
                                  <span className="text-[10px] text-cyan-300 block">
                                    {hasHeldBefore ? 'Đã từng giữ Token' : '🔍 Soi Lòng Trung Thành'}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ==========================================
                    PHASE 5D: LADY OF THE LAKE LOYALTY REVEAL
                   ========================================== */}
                {gameState.phase === 'LADY_REVEAL' && (() => {
                  const ladyHolder = gameState.players.find(p => p.id === gameState.ladyHolderId);
                  const targetPlayer = gameState.players.find(p => p.id === gameState.ladyTargetId);
                  const targetTeam = ROLES_DATA[targetPlayer?.role]?.team || 'GOOD';

                  return (
                    <div className="flex flex-col justify-between h-full gap-4">
                      <div className="text-center my-auto py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold mb-2">
                          <Waves className="w-3.5 h-3.5" />
                          Màn Hình Mật Chỉ Dành Cho: {ladyHolder?.name}
                        </span>

                        {passScreenLocked && mode === 'LOCAL' ? (
                          <div className="p-6 rounded-2xl bg-slate-950 border-2 border-cyan-400/40 max-w-md mx-auto mt-2">
                            <Lock className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                            <h4 className="text-sm font-black text-white">
                              Chỉ một mình {ladyHolder?.name} được nhìn màn hình!
                            </h4>
                            <p className="text-xs text-slate-400 mt-1 mb-4">
                              Theo Rulebook Trang 8: Bạn chỉ được xem thẻ Lòng Trung Thành (Good/Evil), không được đưa màn hình cho người khác xem, nhưng được quyền nói thật hoặc nói dối về kết quả này!
                            </p>
                            <button
                              onClick={() => { sfx.revealRole(); setPassScreenLocked(false); }}
                              className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs uppercase tracking-wider"
                            >
                              Mở Xem Thẻ Lòng Trung Thành Của {targetPlayer?.name}
                            </button>
                          </div>
                        ) : (
                          <div
                            className={`p-6 rounded-2xl border-2 max-w-md mx-auto mt-2 shadow-2xl ${
                              targetTeam === 'GOOD'
                                ? 'bg-gradient-to-b from-blue-700 to-indigo-950 border-cyan-300'
                                : 'bg-gradient-to-b from-red-700 to-rose-950 border-red-400'
                            }`}
                          >
                            <PixelCharacterAvatar skinId={targetPlayer?.skinId} frameId={targetPlayer?.frameId} size="lg" />
                            <p className="text-xs uppercase font-bold text-amber-200 mt-2">
                              Thẻ Lòng Trung Thành (Loyalty Card) của {targetPlayer?.name}:
                            </p>
                            <h3 className="text-2xl font-black text-white mt-1">
                              {targetTeam === 'GOOD' ? '🛡️ PHE THIỆN (GOOD)' : '🔥 PHE ÁC (EVIL)'}
                            </h3>
                            <p className="text-[11px] text-slate-200 mt-2 bg-black/30 p-2 rounded-lg">
                              (Lưu ý: Không hiển thị chức năng nhân vật cụ thể để bảo vệ Merlin theo đúng Rulebook Trang 8).
                            </p>
                          </div>
                        )}
                      </div>

                      {(!passScreenLocked || mode === 'ONLINE') && (
                        <button
                          onClick={handleFinishLadyInspection}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-extrabold text-sm uppercase tracking-wider shadow-lg transition"
                        >
                          Đã Nhớ & Trao Token Nữ Thần Hồ Nước Cho {targetPlayer?.name} →
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* ==========================================
                    PHASE 6: ASSASSIN'S FINAL SHOT
                   ========================================== */}
                {gameState.phase === 'ASSASSIN' && (() => {
                  const assassinPlayer = gameState.players.find(p => p.role === 'ASSASSIN');
                  const goodCandidates = gameState.players.filter(
                    p => ROLES_DATA[p.role]?.team === 'GOOD'
                  );

                  return (
                    <div className="flex flex-col justify-between h-full gap-4">
                      <div>
                        <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950 via-rose-900/60 to-slate-950 border border-red-500/50 mb-3">
                          <div className="flex items-center gap-2 text-red-400 text-xs font-extrabold uppercase tracking-wider">
                            <Skull className="w-4 h-4" />
                            Pha Lật Kèo Cuối Cùng: Ám Sát Merlin!
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-white mt-1">
                            Phe Thiện đã thắng 3 Nhiệm vụ, NHƯNG Sát Thủ ({assassinPlayer?.name}) có 1 phát đạn cuối!
                          </h3>
                          <p className="text-xs text-slate-300 mt-1">
                            Phe Ác có thể thảo luận công khai để tìm xem ai là <strong>Merlin Đại Pháp Sư</strong>. Nếu Sát Thủ chọn đúng Merlin, Phe Ác lập tức cướp chiến thắng!
                          </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {goodCandidates.map(p => (
                            <button
                              key={p.id}
                              onClick={() => handleAssassinateTarget(p.id)}
                              className="p-3 rounded-xl bg-slate-950/80 hover:bg-red-950/70 border border-slate-700 hover:border-red-400 text-left transition group flex items-center justify-between"
                            >
                              <div>
                                <p className="text-xs sm:text-sm font-bold text-white group-hover:text-red-200">
                                  {p.name}
                                </p>
                                <span className="text-[10px] text-slate-400 group-hover:text-red-300">
                                  Nhắm bắn mục tiêu
                                </span>
                              </div>
                              <Sword className="w-4 h-4 text-slate-500 group-hover:text-red-400" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ==========================================
                    PHASE 7: GAME OVER & FULL ROLE REVEAL
                   ========================================== */}
                {gameState.phase === 'GAME_OVER' && (
                  <div className="flex flex-col justify-between h-full gap-4">
                    <div>
                      <div
                        className={`p-4 rounded-2xl border-2 text-center mb-4 ${
                          gameState.winner === 'GOOD'
                            ? 'bg-gradient-to-b from-blue-900/60 to-slate-950 border-blue-400 shadow-lg shadow-blue-500/20'
                            : 'bg-gradient-to-b from-red-900/60 to-slate-950 border-red-500 shadow-lg shadow-red-500/20'
                        }`}
                      >
                        <div className="text-3xl mb-1">
                          {gameState.winner === 'GOOD' ? '🛡️👑✨' : '🔥🗡️💀'}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black uppercase text-white">
                          {gameState.winner === 'GOOD'
                            ? 'PHE THIỆN CHIẾN THẮNG HUY HOÀNG!'
                            : 'PHE ÁC THỐNG TRỊ CAMELOT!'}
                        </h2>
                        <p className="text-xs sm:text-sm text-amber-200 mt-1">
                          {gameState.winReason}
                        </p>
                      </div>

                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
                        Danh tính thật sự của toàn bộ bàn chơi:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                        {gameState.players.map(p => {
                          const rInfo = ROLES_DATA[p.role];
                          const isAssassinated = p.id === gameState.assassinatedId;
                          return (
                            <div
                              key={p.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                rInfo?.team === 'GOOD'
                                  ? 'bg-blue-950/40 border-blue-500/30'
                                  : 'bg-red-950/40 border-red-500/30'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{rInfo?.icon}</span>
                                <div>
                                  <p className="text-xs font-extrabold text-white flex items-center gap-1">
                                    <span>{p.name}</span>
                                    {isAssassinated && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white">
                                        Bị Ám Sát
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[11px] text-amber-300 font-semibold">
                                    {rInfo?.name}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  rInfo?.team === 'GOOD'
                                    ? 'bg-blue-500/20 text-blue-300'
                                    : 'bg-red-500/20 text-red-300'
                                }`}
                              >
                                {rInfo?.team === 'GOOD' ? 'Thiện' : 'Ác'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-800">
                      <button
                        onClick={handleStartGame}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-sm uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Chia Bài Lại • Chơi Ván Mới</span>
                      </button>
                      <button
                        onClick={() => syncState(prev => ({ ...prev, phase: 'LOBBY' }))}
                        className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition"
                      >
                        Về Phòng Chờ
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </section>
        )}

        {/* ==========================================
            PHASE 1: LOBBY / PHÒNG CHỜ & CẤU HÌNH BÀN 9 NGƯỜI
           ========================================== */}
        {gameState.phase === 'LOBBY' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Mode Switcher & Player List (Defaults to 9 Players!) */}
            <div className="lg:col-span-7 bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between gap-4">
              <div>
                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-4">
                  <button
                    onClick={() => { sfx.click(); setMode('LOCAL'); }}
                    className={`py-2.5 px-3 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                      mode === 'LOCAL'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Chơi Ngay 1 Máy / Quản Trò</span>
                  </button>
                  <button
                    onClick={() => { sfx.click(); setMode('ONLINE'); }}
                    className={`py-2.5 px-3 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                      mode === 'ONLINE'
                        ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Nhiều Điện Thoại (Mã Phòng)</span>
                  </button>
                </div>

                {/* Online Room Setup Box */}
                {mode === 'ONLINE' && !roomCode && (
                  <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40 mb-4">
                    <h3 className="text-sm font-bold text-indigo-200 mb-2">
                      Kết nối nhiều điện thoại qua Mã Phòng
                    </h3>
                    <input
                      type="text"
                      placeholder="Nhập tên hiển thị của bạn..."
                      value={myOnlineName}
                      onChange={(e) => setMyOnlineName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white mb-2.5 focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={handleCreateOnlineRoom}
                        className="flex-1 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                      >
                        + Tạo Phòng Mới (Host)
                      </button>
                      <div className="flex gap-1.5 flex-1">
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="Mã 4 số..."
                          value={joinInput}
                          onChange={(e) => setJoinInput(e.target.value)}
                          className="w-24 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-center font-bold tracking-widest text-amber-300"
                        />
                        <button
                          onClick={handleJoinOnlineRoom}
                          className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                        >
                          Vào Phòng
                        </button>
                      </div>
                    </div>
                    {onlineError && (
                      <p className="text-xs text-rose-400 mt-2">{onlineError}</p>
                    )}
                  </div>
                )}


                {/* Host Room Info & QR Code Card (Online Multiplayer) */}
                {mode === 'ONLINE' && roomCode && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/80 border border-amber-400/40 shadow-2xl mb-5 flex flex-col md:flex-row items-center justify-between gap-5 animate-fadeIn">
                    <div className="flex-1 space-y-2.5 text-center md:text-left">
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          P2P WebRTC Sẵn Sàng
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                          {isHost ? `👑 Bạn Là Chủ Phòng (${connectedPeerCount} máy kết nối)` : '📱 Máy Khách'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Mã phòng tham gia (nhập trên điện thoại):</p>
                        <div className="text-3xl sm:text-4xl font-black text-amber-400 tracking-widest font-mono select-all">
                          {roomCode}
                        </div>
                      </div>
                      <p className="text-xs text-slate-300">
                        Bạn bè chỉ cần mở camera điện thoại quét mã QR hoặc nhập mã <b className="text-amber-300">{roomCode}</b> để vào ngay!
                      </p>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                        <button
                          onClick={handleCopyShareLink}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition shadow"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? 'Đã Sao Chép Link!' : 'Sao Chép Link Mời'}</span>
                        </button>
                        <button
                          onClick={handleCopyRoomCode}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition border border-slate-700"
                        >
                          {copiedRoom ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>Sao Chép Mã 4 Số</span>
                        </button>
                      </div>
                    </div>

                    {qrCodeDataUrl && (
                      <div className="shrink-0 flex flex-col items-center p-3 rounded-xl bg-slate-950/90 border border-amber-400/30 shadow-lg">
                        <img
                          src={qrCodeDataUrl}
                          alt={`QR Code Room ${roomCode}`}
                          className="w-40 h-40 sm:w-44 sm:h-44 rounded-lg bg-amber-100 p-1.5 shadow"
                        />
                        <span className="mt-2 text-[11px] font-extrabold text-amber-300 tracking-wider flex items-center gap-1">
                          <QrCode className="w-3.5 h-3.5" /> Quét Để Vào Chơi
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Player List Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                      <span>Danh Sách Bàn Chơi ({playerCount}/10)</span>
                      {playerCount === 9 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                          ✨ Chuẩn Tiệc 9 Người
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Đặt tên cho 9 thành viên trong bữa tiệc để hệ thống báo thông tin mật chính xác!
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {playerCount !== 9 && (
                      <button
                        onClick={handleResetTo9Players}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-bold transition"
                      >
                        Đặt Chuẩn 9 Người
                      </button>
                    )}
                    <button
                      onClick={handleShuffleSeats}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 transition"
                      title="Xáo trộn chỗ ngồi"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Đảo ghế</span>
                    </button>
                    {playerCount < 10 && (
                      <button
                        onClick={handleAddPlayerSlot}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1 transition"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+1</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Editable Player Inputs with Custom Skin Button */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {gameState.players.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 focus-within:border-amber-400 rounded-xl p-2 transition shadow-sm"
                    >
                      <button
                        onClick={() => { sfx.click(); setEditingSkinPlayerId(p.id); }}
                        className="relative group shrink-0"
                        title="Bấm để đổi Skin & Khung viền nhân vật"
                      >
                        <PixelCharacterAvatar skinId={p.skinId} frameId={p.frameId} size="sm" />
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
                          <Palette className="w-2.5 h-2.5" />
                        </span>
                      </button>

                      <div className="min-w-0 flex-1">
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => handleUpdatePlayerName(p.id, e.target.value)}
                          className="w-full bg-transparent text-xs sm:text-sm font-bold text-white focus:outline-none truncate"
                          placeholder={`Người chơi ${idx + 1}`}
                        />
                        <button
                          onClick={() => { sfx.click(); setEditingSkinPlayerId(p.id); }}
                          className="text-[10px] text-amber-400/80 hover:text-amber-300 truncate block"
                        >
                          ✨ {p.titleBadge || 'Đổi danh hiệu'}
                        </button>
                      </div>

                      {playerCount > 5 && (
                        <button
                          onClick={() => handleRemovePlayerSlot(p.id)}
                          className="text-slate-600 hover:text-rose-400 transition text-xs px-1"
                          title="Xóa người chơi"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Start Game CTA */}
              <button
                onClick={handleStartGame}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm sm:text-base uppercase tracking-wider shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Bắt Đầu Chia Vai ({playerCount} Người - Không Cần Nhắm Mắt)</span>
              </button>
            </div>

            {/* Right Column: Role Configuration & Party Guide */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm sm:text-base font-extrabold text-amber-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Cấu Hình Nhân Vật ({currentMatrix.good} Thiện vs {currentMatrix.evil} Ác)
                  </h3>
                </div>

                <p className="text-xs text-slate-400 mb-3">
                  Đã cài sẵn bộ nhân vật cân bằng và kịch tính nhất cho tiệc <strong>9 người</strong> (Merlin, Percival, Morgana, Assassin, Mordred). Bạn có thể bật/tắt tùy ý:
                </p>

                <div className="space-y-2">
                  {[
                    { key: 'merlin', role: ROLES_DATA.MERLIN },
                    { key: 'percival', role: ROLES_DATA.PERCIVAL },
                    { key: 'assassin', role: ROLES_DATA.ASSASSIN },
                    { key: 'morgana', role: ROLES_DATA.MORGANA },
                    { key: 'mordred', role: ROLES_DATA.MORDRED },
                    { key: 'oberon', role: ROLES_DATA.OBERON },
                  ].map(({ key, role }) => {
                    const active = gameState.specialConfig[key];
                    return (
                      <div
                        key={key}
                        onClick={() => handleToggleSpecialRole(key)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          active
                            ? role.team === 'GOOD'
                              ? 'bg-blue-950/50 border-blue-400/50 text-white'
                              : 'bg-red-950/50 border-red-400/50 text-white'
                            : 'bg-slate-950/50 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 pr-2">
                          <span className="text-xl">{role.icon}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold">{role.name}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  role.team === 'GOOD'
                                    ? 'bg-blue-500/20 text-blue-300'
                                    : 'bg-red-500/20 text-red-300'
                                }`}
                              >
                                {role.team === 'GOOD' ? 'Thiện' : 'Ác'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">
                              {role.shortDesc}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                            active
                              ? 'bg-amber-400 border-amber-300 text-slate-950'
                              : 'border-slate-700 bg-slate-900'
                          }`}
                        >
                          {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Optional Rules from Rulebook Page 8 */}
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 mb-2 flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5" />
                    Luật Mở Rộng Chính Thức (Rulebook Trang 8)
                  </h4>
                  <div className="space-y-2">
                    <div
                      onClick={() => handleToggleSpecialRole('ladyOfLake')}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        gameState.specialConfig.ladyOfLake
                          ? 'bg-cyan-950/50 border-cyan-400/50 text-white'
                          : 'bg-slate-950/50 border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="pr-2">
                        <span className="text-xs font-bold block text-cyan-200">
                          🌊 Lady of the Lake (Nữ Thần Hồ Nước)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Sau Nhiệm vụ 2, 3, 4: Người giữ Token được bí mật soi Phe (Good/Evil) của 1 người chơi (Rất khuyên dùng cho 7-10 người!).
                        </span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                          gameState.specialConfig.ladyOfLake
                            ? 'bg-cyan-400 border-cyan-300 text-slate-950'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {gameState.specialConfig.ladyOfLake && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    <div
                      onClick={() => handleToggleSpecialRole('targeting')}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        gameState.specialConfig.targeting
                          ? 'bg-amber-950/40 border-amber-400/50 text-white'
                          : 'bg-slate-950/50 border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="pr-2">
                        <span className="text-xs font-bold block text-amber-200">
                          🎯 Targeting (Chọn Thứ Tự Nhiệm Vụ Tự Do)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Đội Trưởng được chọn thực hiện Nhiệm vụ bất kỳ (Nhiệm vụ 5 chỉ mở sau khi thắng 2 nhiệm vụ khác).
                        </span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                          gameState.specialConfig.targeting
                            ? 'bg-amber-400 border-amber-300 text-slate-950'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {gameState.specialConfig.targeting && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==========================================
          MODAL 1: LUẬT CHƠI & VAI TRÒ CHI TIẾT (FULL RULEBOOK PAGES 1-8)
         ========================================== */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-extrabold text-amber-300 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Sổ Tay Rulebook Chính Thức (Trang 1–8 • Chuẩn Tiệc 9 Người)
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Đóng ✕
              </button>
            </div>

            {/* Rulebook Tabs */}
            <div className="flex gap-1.5 px-4 pt-3 border-b border-slate-800 overflow-x-auto">
              {[
                { id: 'OVERVIEW', label: '1. Tổng Quan & Bàn 9 Người' },
                { id: 'VISION', label: '2. Ma Trận Tầm Nhìn Không Ngủ' },
                { id: 'ROLES', label: '3. Các Nhân Vật (Trang 1 & 7)' },
                { id: 'OPTIONAL', label: '4. Lady of the Lake & Targeting (Trang 8)' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setRulesTab(tab.id)}
                  className={`px-3 py-2 rounded-t-lg text-xs font-extrabold whitespace-nowrap transition ${
                    rulesTab === tab.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              {rulesTab === 'OVERVIEW' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/30">
                    <h4 className="font-extrabold text-amber-300 mb-1">Mục Tiêu Tối Thượng (Rulebook Trang 1, 2 & 6)</h4>
                    <p>
                      • <strong>Chia Phe Bàn 9 Người:</strong> Gồm <strong>6 Phe Thiện (Good)</strong> và <strong>3 Phe Ác (Evil)</strong>.<br />
                      • <strong>Phe Thiện thắng khi:</strong> Hoàn thành thành công <strong>3 trên 5 Nhiệm vụ</strong> VÀ bảo vệ được <strong>Merlin</strong> khỏi phát đạn cuối cùng của Sát Thủ (Assassin).<br />
                      • <strong>Phe Ác thắng khi:</strong> Phá hỏng <strong>3 Nhiệm vụ</strong>, HOẶC làm bàn chơi từ chối lập đội <strong>5 lần liên tiếp</strong> trong 1 vòng (Vote Track chạm mốc 5), HOẶC <strong>ám sát đúng Merlin</strong> vào cuối ván!
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <h4 className="font-extrabold text-white mb-1">Số Người Đi Nhiệm Vụ Bàn 9 Người (Rulebook Trang 3 & 5)</h4>
                    <p>
                      • <strong>Nhiệm vụ 1:</strong> 3 người • <strong>Nhiệm vụ 2:</strong> 4 người • <strong>Nhiệm vụ 3:</strong> 4 người • <strong>Nhiệm vụ 4:</strong> 5 người (<strong>Đặc biệt: Cần ít nhất 2 lá Thất Bại mới bị tính là hỏng!</strong>) • <strong>Nhiệm vụ 5:</strong> 5 người.<br />
                      • Khi biểu quyết Đội hình: Hòa phiếu tính là Từ chối (Reject).
                    </p>
                  </div>
                </div>
              )}

              {rulesTab === 'VISION' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-400/30">
                    <h4 className="font-extrabold text-indigo-300 mb-1">Cơ Chế "Không Ngủ" Thay Cho Đọc Thoại Quản Trò (Trang 2 & 7)</h4>
                    <p>
                      Trong bản giấy, Quản trò phải đọc kịch bản bắt cả bàn nhắm mắt và giơ ngón cái. Với ứng dụng này, bạn <strong>không cần nhắm mắt</strong> — hệ thống tự động lọc thông tin mật trên thẻ bài của từng người theo đúng chuẩn trang 7:
                    </p>
                    <ul className="mt-2 space-y-1.5 list-disc list-inside text-slate-200">
                      <li><strong>Merlin:</strong> Thấy tên của Assassin, Morgana, Oberon, Minion. <strong>KHÔNG thấy Mordred</strong>.</li>
                      <li><strong>Percival:</strong> Thấy 2 cái tên (<strong>Merlin và Morgana</strong>) nhưng không biết ai là Merlin thật, ai là Morgana giả dạng.</li>
                      <li><strong>Assassin, Morgana, Mordred, Minion:</strong> Nhìn thấy tên đồng bọn Phe Ác của nhau, nhưng <strong>KHÔNG thấy Oberon</strong>.</li>
                      <li><strong>Oberon:</strong> Thuộc Phe Ác nhưng không thấy đồng bọn và đồng bọn cũng không thấy hắn (nhưng Merlin vẫn thấy Oberon!).</li>
                    </ul>
                  </div>
                </div>
              )}

              {rulesTab === 'ROLES' && (
                <div className="grid grid-cols-1 gap-2.5">
                  {Object.values(ROLES_DATA).map(r => (
                    <div key={r.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{r.icon}</span>
                        <span className="font-bold text-white">{r.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            r.team === 'GOOD' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {r.team === 'GOOD' ? 'Phe Thiện' : 'Phe Ác'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{r.fullDesc}</p>
                    </div>
                  ))}
                </div>
              )}

              {rulesTab === 'OPTIONAL' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-400/30">
                    <h4 className="font-extrabold text-cyan-300 mb-1">🌊 Lady of the Lake - Nữ Thần Hồ Nước (Rulebook Trang 8)</h4>
                    <p>
                      • Đầu ván, người ngồi ngay bên phải Đội Trưởng đầu tiên nhận Token <strong>Nữ Thần Hồ Nước</strong>.<br />
                      • Ngay sau khi <strong>Nhiệm vụ thứ 2, 3 và 4</strong> hoàn tất, người giữ Token chọn 1 người chơi bất kỳ để bí mật xem <strong>Thẻ Lòng Trung Thành (Phe Thiện hay Phe Ác)</strong> của họ.<br />
                      • Người giữ Token có thể thảo luận hoặc nói dối về điều mình thấy. Sau đó, người bị soi sẽ nhận Token Nữ Thần Hồ Nước.<br />
                      • Bất kỳ ai đã từng giữ Token này sẽ <strong>không thể bị soi</strong> trong suốt phần còn lại của ván đấu.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-400/30">
                    <h4 className="font-extrabold text-amber-300 mb-1">🎯 Targeting - Chọn Thứ Tự Nhiệm Vụ (Rulebook Trang 8)</h4>
                    <p>
                      • Khi bật chế độ này ở Phòng Chờ, Đội Trưởng được phép bấm chọn thực hiện bất kỳ Nhiệm vụ nào trên thanh tiến trình (thay vì bắt buộc đi theo thứ tự 1 → 5).<br />
                      • Điều kiện: <strong>Nhiệm vụ thứ 5</strong> không được phép thực hiện cho đến khi có ít nhất 2 Nhiệm vụ khác đã Thành công. Nhiệm vụ số 4 vẫn luôn yêu cầu 2 phiếu Thất bại.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 1B: CUSTOMIZE CHARACTER SKIN & AVATAR
         ========================================== */}
      {editingSkinPlayerId && (() => {
        const targetP = gameState.players.find(p => p.id === editingSkinPlayerId);
        if (!targetP) return null;

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
            <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-extrabold text-amber-300 flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Tạo Skin Nhân Vật Cho: {targetP.name}
                </h3>
                <button
                  onClick={() => setEditingSkinPlayerId(null)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  Xong ✓
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-4">
                {/* Preview Header */}
                <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center gap-4">
                  <PixelCharacterAvatar skinId={targetP.skinId} frameId={targetP.frameId} size="lg" isLeader />
                  <div>
                    <h4 className="text-base font-black text-white">{targetP.name}</h4>
                    <span className="inline-block text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-400/30 px-2.5 py-0.5 rounded-full mt-1">
                      {targetP.titleBadge}
                    </span>
                    <button
                      onClick={() => setPixelFxEvent('SUCCESS')}
                      className="mt-2 block text-[11px] text-cyan-300 hover:underline"
                    >
                      ✨ Bấm thử hiệu ứng PixelFX của nhân vật
                    </button>
                  </div>
                </div>

                {/* 12 Pixel RPG Skins */}
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                    1. Chọn Ngoại Hình Nhân Vật (12 Skin Pixel RPG):
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {SKIN_AVATARS.map(skin => (
                      <button
                        key={skin.id}
                        onClick={() => handleUpdatePlayerSkin(targetP.id, { skinId: skin.id })}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
                          targetP.skinId === skin.id
                            ? 'bg-amber-500/20 border-amber-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <PixelCharacterAvatar skinId={skin.id} frameId={targetP.frameId} size="sm" />
                        <span className="text-[10px] font-bold text-center truncate w-full">{skin.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5 Aura Frames */}
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                    2. Chọn Khung Viền Hào Quang:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SKIN_FRAMES.map(frame => (
                      <button
                        key={frame.id}
                        onClick={() => handleUpdatePlayerSkin(targetP.id, { frameId: frame.id })}
                        className={`p-2 rounded-xl border text-xs font-bold transition ${
                          targetP.frameId === frame.id
                            ? 'bg-amber-500 text-slate-950 border-amber-300'
                            : 'bg-slate-950 text-slate-300 border-slate-800'
                        }`}
                      >
                        {frame.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title Badges */}
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                    3. Chọn Danh Hiệu Cá Nhân:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SKIN_TITLES.map(title => (
                      <button
                        key={title}
                        onClick={() => handleUpdatePlayerSkin(targetP.id, { titleBadge: title })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                          targetP.titleBadge === title
                            ? 'bg-indigo-600 text-white border-indigo-400'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==========================================
          MODAL 4: GOOGLE SITES & DEPLOY GUIDE
         ========================================== */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-slate-900 border border-sky-500/40 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-sky-300 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Hướng Dẫn Đưa Lên Google Sites & Chơi Chung Với Bạn Bè
              </h3>
              <button
                onClick={() => setShowDeployModal(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Đóng ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30">
                <h4 className="font-extrabold text-sky-300 mb-1">Cách 1: Chơi ngay trên 1 Điện thoại / iPad / Laptop tại bàn tiệc (Nhanh nhất)</h4>
                <p>
                  Chế độ <strong>"Chơi Ngay 1 Máy / Quản Trò"</strong> lưu toàn bộ trạng thái trực tiếp trên máy của bạn và đã có sẵn <strong>Màn Hình Khóa Bảo Mật</strong> khi chuyền tay. Nếu bạn nhúng vào <strong>Google Sites</strong> (qua mục <em>Nhúng → Mã nhúng</em> hoặc dán link Vercel/GitHub Pages), cả 9 người có thể ngồi quanh bàn chuyền máy xem bài và bỏ phiếu Cốc Thánh mượt 100% mà không cần cấu hình Database.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                <h4 className="font-extrabold text-indigo-300 mb-1">Cách 2: 9 Người Cầm 9 Điện Thoại Vào Mã Phòng (Online Real-time)</h4>
                <p>
                  • Ngay trên cửa sổ Preview này, tính năng <strong>"Nhiều Điện Thoại (Mã Phòng)"</strong> đã được kết nối sẵn với <strong>Firebase Firestore</strong>.<br />
                  • Nếu bạn tải code về tự host lên <strong>Google Sites / GitHub Pages / Vercel</strong> để 9 điện thoại khác nhau tự bấm Vote từ xa, bạn chỉ cần tạo 1 project miễn phí tại <code>console.firebase.google.com</code>, bật <em>Firestore Database</em> + <em>Anonymous Auth</em>, rồi dán <code>firebaseConfig</code> của bạn vào đầu file <code>avalon_party_game.jsx</code> là cả 9 máy đồng bộ theo thời gian thực!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: PROMPT CHI TIẾT CHO AI AGENT
         ========================================== */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-emerald-300 flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Prompt Kỹ Thuật Chi Tiết Cho AI Agent
              </h3>
              <button
                onClick={() => setShowPromptModal(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Đóng ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3">
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] sm:text-xs text-emerald-200 whitespace-pre-wrap font-mono leading-relaxed">
                {MASTER_AGENT_PROMPT}
              </pre>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={handleCopyMasterPrompt}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition"
              >
                {copiedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPrompt ? 'Đã Sao Chép!' : 'Sao Chép Toàn Bộ Prompt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3: NHẬT KÝ BIỂU QUYẾT (HISTORY LOG)
         ========================================== */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-amber-300 flex items-center gap-2">
                <ScrollText className="w-5 h-5" />
                Nhật Ký Lập Đội & Biểu Quyết
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Đóng ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {gameState.historyLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Chưa có lượt biểu quyết nào được ghi nhận.
                </p>
              ) : (
                gameState.historyLogs.map((log, index) => (
                  <div key={index} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-amber-300">
                        Nhiệm vụ {log.questNum} • Đội trưởng: {log.leaderName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          log.approved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {log.approved ? 'Thông Qua' : 'Bị Từ Chối'}
                      </span>
                    </div>
                    <p className="text-slate-300 mb-1.5">
                      Đội đề cử: <strong>{log.teamNames.join(', ')}</strong>
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}