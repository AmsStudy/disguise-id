'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle, faStar } from '@fortawesome/free-solid-svg-icons';

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_W_NORMAL = 185;   // px — resting width
const CARD_W_EXPANDED = 320;   // px — hovered width (pushes neighbors)
const CARD_H = 460;   // px — uniform height for ALL cards

// ─── Team Data ────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  name: string;
  role: string;
  image: string;
  faculty: string;
  department: string;
  expertise: string;
  motto: string;
  accentColor: string;
  badge?: string;
}

const team: TeamMember[] = [
  {
    id: 'supervisor',
    name: 'Dr. Lilis Nur Hayati, S.Kom., M.Eng., MTA',
    role: 'DOSEN PEMBIMBING',
    image: '/assets/dospen_Lilis_Nur_Hayati.png',
    faculty: 'Fakultas Ilmu Komputer',
    department: 'S1 Teknik Informatika',
    expertise: 'Penasihat & Pengarah Riset',
    motto: 'Membimbing generasi inovator bangsa menuju masa depan digital yang cerdas dan berdaya saing.',
    accentColor: '#FF6B35',
    badge: 'PEMBIMBING',
  },
  {
    id: 'leader',
    name: 'ICHWAL',
    role: 'TEAM LEADER',
    image: '/assets/ketua_ICHWAL.png',
    faculty: 'Fakultas Ilmu Komputer',
    department: 'S1 Teknik Informatika',
    expertise: 'Sistem Arsitektur & Full Stack Developer',
    motto: 'Memimpin dengan visi yang jelas, mengeksekusi dengan presisi dan determinasi penuh.',
    accentColor: '#00E5FF',
    badge: 'LEADER',
  },
  {
    id: 'aan',
    name: 'Aan Maulana Sampe',
    role: 'ANGGOTA',
    image: '/assets/anggota1_AAN.png',
    faculty: 'Fakultas Ilmu Komputer',
    department: 'S1 Teknik Informatika',
    expertise: 'UI/UX & Frontend Dev',
    motto: 'Merancang pengalaman digital yang intuitif, estetis, dan memukau setiap pengguna.',
    accentColor: '#00CFE8',
  },
  {
    id: 'rizki',
    name: 'Rizqi Ananda Jalil ',
    role: 'ANGGOTA',
    image: '/assets/anggota2_RIZKI.png',
    faculty: 'Fakultas Ilmu Komputer',
    department: 'S1 Teknik Informatika',
    expertise: 'Backend & System Arch',
    motto: 'Membangun fondasi sistem yang kokoh, scalable, dan aman untuk masa depan.',
    accentColor: '#00B4D8',
  },
  {
    id: 'marsya',
    name: 'Marsya Putri Berlian',
    role: 'ANGGOTA',
    image: '/assets/anggota3_MARSYA.png',
    faculty: 'Fakultas Ilmu Komputer',
    department: 'S1 Teknik Informatika',
    expertise: 'AI & Data Science',
    motto: 'Mengolah data menjadi kecerdasan yang mengubah cara dunia mengenali identitas.',
    accentColor: '#00B4D8',
  },
  {
    id: 'zaskia',
    name: 'Zaskia Tenri Awaru',
    role: 'ANGGOTA',
    image: '/assets/anggota4_ZASKIA.png',
    faculty: 'Fakultas Ilmu Komputer',
    department: 'S1 Teknik Informatika',
    expertise: 'Model Training & Eval',
    motto: 'Mengoptimalkan model AI untuk mencapai akurasi pengenalan wajah tertinggi.',
    accentColor: '#00CFE8',
  },
];

// ─── Corner Brackets ──────────────────────────────────────────────────────────

function CornerBrackets({ color, size = 14 }: { color: string; size?: number }) {
  const s = size;
  const b: React.CSSProperties = { position: 'absolute', width: s, height: s, zIndex: 5 };
  return (
    <>
      <div style={{ ...b, top: 8, left: 8, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}`, transition: 'border-color 0.3s' }} />
      <div style={{ ...b, top: 8, right: 8, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}`, transition: 'border-color 0.3s' }} />
      <div style={{ ...b, bottom: 8, left: 8, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}`, transition: 'border-color 0.3s' }} />
      <div style={{ ...b, bottom: 8, right: 8, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}`, transition: 'border-color 0.3s' }} />
    </>
  );
}

// ─── Companion Analysis Panel ─────────────────────────────────────────────────

function CompanionPanel({ member }: { member: TeamMember }) {
  const accent = member.accentColor;
  return (
    <motion.div
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 70, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        background: `linear-gradient(to top, rgba(4,10,20,0.99) 0%, rgba(6,14,26,0.97) 100%)`,
        borderTop: `1px solid ${accent}40`,
        padding: '12px 14px 14px',
        zIndex: 10,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', fontWeight: 700, color: accent, letterSpacing: '0.14em' }}>
          COMPANION ANALYSIS
        </span>
        <motion.div animate={{ opacity: [1, 0.15, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
          <FontAwesomeIcon icon={faCircle} style={{ fontSize: '6px', color: '#00E676' }} />
        </motion.div>
      </div>

      {/* Faculty */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '7px', color: '#4A6B84', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px', fontFamily: 'Inter, sans-serif' }}>FAKULTAS</div>
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '8.5px', fontWeight: 700, color: '#D0E8F4', lineHeight: 1.3 }}>{member.faculty}</div>
        <div style={{ fontSize: '8px', color: '#5A7E94', fontFamily: 'Inter, sans-serif', marginTop: '2px' }}>{member.department}</div>
      </div>

      {/* Expertise badge */}
      <div style={{ marginBottom: '9px' }}>
        <div style={{ fontSize: '7px', color: '#4A6B84', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', fontFamily: 'Inter, sans-serif' }}>KEAHLIAN</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          background: `${accent}16`, border: `1px solid ${accent}45`,
          borderRadius: '99px', padding: '3px 10px',
        }}>
          <span style={{ fontSize: '8.5px', color: accent, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
            {member.expertise}
          </span>
        </div>
      </div>

      {/* Motto + Mascot */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '7px', color: '#4A6B84', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px', fontFamily: 'Inter, sans-serif' }}>MOTTO</div>
          <div style={{
            fontSize: '8.5px', color: '#8BAFC4', fontFamily: 'Inter, sans-serif',
            lineHeight: 1.45, fontStyle: 'italic',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const,
          }}>
            &ldquo;{member.motto}&rdquo;
          </div>
        </div>
        {/* Mascot */}
        <div style={{ flexShrink: 0 }}>
          <motion.div
            initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 18, delay: 0.1 }}
            style={{ filter: `drop-shadow(0 0 12px ${accent}80)` }}
          >
            <Image src="/assets/MASKOT.png" alt="Maskot" width={56} height={66}
              style={{ objectFit: 'contain', width: 'auto', height: 'auto' }} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Uniform Team Card ────────────────────────────────────────────────────────

const TeamCard: React.FC<{ member: TeamMember; delay: number; inView: boolean }> = ({ member, delay, inView }) => {
  const [hovered, setHovered] = useState(false);
  const accent = member.accentColor;

  return (
    <motion.div
      // Entrance animation + width expansion combined in one animate object
      initial={{ opacity: 0, y: 32, width: CARD_W_NORMAL }}
      animate={inView ? {
        opacity: 1,
        y: 0,
        width: hovered ? CARD_W_EXPANDED : CARD_W_NORMAL,
        zIndex: hovered ? 20 : 1,
      } : { opacity: 0, y: 32, width: CARD_W_NORMAL }}
      transition={{
        opacity: { duration: 0.5, delay },
        y: { duration: 0.5, delay, type: 'spring', stiffness: 100, damping: 22 },
        width: { type: 'spring', stiffness: 280, damping: 28 },
        zIndex: { duration: 0 },
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        height: CARD_H,
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '4px',
        cursor: 'default',
        border: `1px solid ${hovered ? accent + '70' : 'rgba(255,255,255,0.09)'}`,
        boxShadow: hovered
          ? `0 0 36px ${accent}25, 0 14px 48px rgba(0,0,0,0.65)`
          : '0 2px 14px rgba(0,0,0,0.45)',
        transition: 'border-color 0.35s ease, box-shadow 0.35s ease',
      }}
    >
      {/* Photo ─ fill the card, high quality, NO blur-causing tiny size hint */}
      <Image
        src={member.image}
        alt={member.name}
        fill
        quality={100}
        sizes="(max-width: 768px) 320px, 420px"
        style={{
          objectFit: 'cover',
          objectPosition: 'top center',
          // Crisp grayscale — brightness high enough so details are visible
          filter: hovered
            ? 'grayscale(10%) brightness(0.92)'
            : 'grayscale(100%) brightness(0.85)',
          transition: 'filter 0.5s ease',
        }}
      />

      {/* Permanent bottom gradient */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '52%',
        background: 'linear-gradient(to top, rgba(4,10,20,0.98) 0%, rgba(4,10,20,0.1) 70%, transparent 100%)',
        zIndex: 2, pointerEvents: 'none',
      }} />

      {/* Corner brackets */}
      <CornerBrackets color={hovered ? accent : 'rgba(255,255,255,0.15)'} />

      {/* Role badge (LEADER / PEMBIMBING only) */}
      {member.badge && (
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          zIndex: 6, display: 'flex', alignItems: 'center', gap: '5px',
          background: 'rgba(4,10,20,0.88)', border: `1px solid ${accent}55`,
          borderRadius: '99px', padding: '3px 11px', backdropFilter: 'blur(10px)',
          whiteSpace: 'nowrap',
        }}>
          <FontAwesomeIcon icon={faStar} style={{ fontSize: '7px', color: accent }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: accent, fontWeight: 700, letterSpacing: '0.14em' }}>
            {member.badge}
          </span>
          {member.badge === 'LEADER' && (
            <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
              <FontAwesomeIcon icon={faCircle} style={{ fontSize: '5px', color: '#00E676' }} />
            </motion.div>
          )}
        </div>
      )}

      {/* Name block — moves up when companion panel is open */}
      <motion.div
        animate={{ y: hovered ? -120 : 0 }}
        transition={{ duration: 0.38, ease: 'easeOut' }}
        style={{ position: 'absolute', bottom: '14px', left: 0, right: 0, textAlign: 'center', zIndex: 3 }}
      >
        <div style={{
          fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 700,
          color: hovered ? accent : 'rgba(0,207,232,0.85)',
          textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '5px',
          transition: 'color 0.35s',
        }}>
          {member.role}
        </div>
        <div style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: member.name.length > 8 ? '11px' : '17px',
          fontWeight: 900,
          color: '#E8F4F8', lineHeight: 1,
          textShadow: hovered ? `0 0 18px ${accent}, 0 0 36px ${accent}50` : 'none',
          transition: 'text-shadow 0.35s',
          padding: '0 10px',
        }}>
          {member.name}
        </div>
      </motion.div>

      {/* Companion panel */}
      <AnimatePresence>
        {hovered && <CompanionPanel member={member} />}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Main Section ─────────────────────────────────────────────────────────────

export const TeamSection: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.06, triggerOnce: true });
  const [stars, setStars] = useState<{ w: number; h: number; l: string; t: string; o: number; dur: string; del: string }[]>([]);

  useEffect(() => {
    setStars(Array.from({ length: 65 }).map(() => ({
      w: Math.random() * 2 + 0.5,
      h: Math.random() * 2 + 0.5,
      l: `${Math.random() * 100}%`,
      t: `${Math.random() * 100}%`,
      o: Math.random() * 0.22 + 0.04,
      dur: `${Math.random() * 5 + 3}s`,
      del: `${Math.random() * 5}s`,
    })));
  }, []);

  return (
    <section
      id="team"
      style={{
        padding: '110px 0 90px',
        background: 'linear-gradient(180deg, #0D1B2A 0%, #060D14 55%, #07101A 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Stars */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {stars.map((s, i) => (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%', background: '#fff',
            width: s.w, height: s.h, left: s.l, top: s.t, opacity: s.o,
            animation: `pulseGlow ${s.dur} ease-in-out infinite`,
            animationDelay: s.del,
          }} />
        ))}
      </div>

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', bottom: '8%', left: '50%', transform: 'translateX(-50%)',
        width: '900px', height: '260px',
        background: 'radial-gradient(ellipse at center, rgba(0,229,255,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.65 }}
        style={{ textAlign: 'center', marginBottom: '68px', padding: '0 24px', position: 'relative', zIndex: 1 }}
      >
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '18px' }}>
          <motion.div
            initial={{ opacity: 0, letterSpacing: '0.08em' }}
            animate={inView ? { opacity: 1, letterSpacing: '0.3em' } : {}}
            transition={{ duration: 1, delay: 0.15 }}
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 700, color: '#00CFE8', textTransform: 'uppercase' }}
          >
            THE MEMBERS OF
          </motion.div>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.75, delay: 0.55 }}
            style={{
              position: 'absolute', bottom: -5, left: 0, right: 0, height: '1px',
              background: 'linear-gradient(90deg, transparent, #00CFE8, transparent)',
              transformOrigin: 'left',
            }}
          />
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.12 }}
          style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 'clamp(44px, 6.5vw, 88px)',
            fontWeight: 900, color: '#00E5FF',
            textShadow: '0 0 40px rgba(0,229,255,0.5), 0 0 80px rgba(0,229,255,0.18)',
            lineHeight: 1, marginBottom: '18px',
            animation: 'glitch 8s infinite',
          }}
        >
          DISGUISE-ID
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}
        >
          <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.4))' }} />
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#8BAFC4', letterSpacing: '0.1em' }}>
            Universitas Muslim Indonesia
          </div>
          <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, rgba(0,229,255,0.4), transparent)' }} />
        </motion.div>
      </motion.div>

      {/* ── Card Strip ─────────────────────────────────────────────────────── */}
      {/*
        overflow: visible on the strip so expanded cards are not clipped.
        The section itself has overflow: hidden for the background,
        but we need the strip's content to be visible when expanding.
      */}
      <div
        className="team-strip"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '5px',
          overflowX: 'auto',
          overflowY: 'visible',
          scrollbarWidth: 'none',
          paddingBottom: '8px',
          paddingLeft: '16px',
          paddingRight: '16px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {team.map((member, i) => (
          <TeamCard key={member.id} member={member} delay={i * 0.07} inView={inView} />
        ))}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.65 }}
        style={{ textAlign: 'center', marginTop: '56px', padding: '0 24px', position: 'relative', zIndex: 1 }}
      >
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 700, color: '#D8EEF8', fontStyle: 'italic' }}>
            Program Kreatifitas Mahasiswa
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '1px', background: 'rgba(0,229,255,0.3)' }} />
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, color: '#00CFE8', letterSpacing: '0.22em' }}>
              KARSA CIPTA 2026
            </div>
            <div style={{ width: '28px', height: '1px', background: 'rgba(0,229,255,0.3)' }} />
          </div>
        </div>
      </motion.div>

      <style>{`
        .team-strip::-webkit-scrollbar { display: none; }
        @media (max-width: 1300px) {
          .team-strip { justify-content: flex-start !important; }
        }
      `}</style>
    </section>
  );
};
