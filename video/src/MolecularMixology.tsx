import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {MoleculeScene} from './MoleculeScene';
import {TitleOverlay} from './TitleOverlay';
import {Subtitles} from './Subtitles';

const BgParticles: React.FC = () => {
	const frame = useCurrentFrame();
	const particles = Array.from({length: 30}, (_, i) => {
		const x = (i * 137.5) % 100;
		const y = (i * 73.3 + frame * 0.15) % 100;
		const size = 2 + (i % 4);
		const opacity = 0.1 + Math.sin(frame * 0.03 + i) * 0.08;
		return {x, y, size, opacity, i};
	});

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{particles.map((p) => (
				<div
					key={p.i}
					style={{
						position: 'absolute',
						left: `${p.x}%`,
						top: `${p.y}%`,
						width: p.size,
						height: p.size,
						borderRadius: '50%',
						background: p.i % 3 === 0 ? '#f59e0b' : p.i % 3 === 1 ? '#fbbf24' : '#ffffff',
						opacity: p.opacity,
						boxShadow: `0 0 ${p.size * 2}px currentColor`,
						transform: `scale(${1 + Math.sin(frame * 0.05 + p.i * 0.5) * 0.3})`,
					}}
				/>
			))}
		</AbsoluteFill>
	);
};

const FooterBranding: React.FC = () => {
	const frame = useCurrentFrame();
	const fadeIn = interpolate(frame, [450, 480], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	return (
		<AbsoluteFill
			style={{
				justifyContent: 'flex-end',
				alignItems: 'center',
				paddingBottom: 30,
				opacity: fadeIn,
			}}
		>
			<div
				style={{
					fontSize: 14,
					color: 'rgba(255,255,255,0.4)',
					fontFamily: 'system-ui, sans-serif',
					letterSpacing: 3,
					textTransform: 'uppercase',
				}}
			>
				Game-OS · Molecular Mixology Lab
			</div>
		</AbsoluteFill>
	);
};

export const MolecularMixology: React.FC = () => {
	const frame = useCurrentFrame();

	const vignette = `radial-gradient(ellipse at center, transparent 40%, rgba(10,10,20,0.7) 100%)`;

	return (
		<AbsoluteFill
			style={{
				backgroundColor: '#0a0a0f',
				backgroundImage: `linear-gradient(180deg, #0a0a15 0%, #12121f 50%, #0a0a15 100%)`,
			}}
		>
			<BgParticles />

			<div
				style={{
					position: 'absolute',
					inset: 0,
					background: vignette,
					pointerEvents: 'none',
				}}
			/>

			<MoleculeScene />

			<Sequence from={0} durationInFrames={90}>
				<TitleOverlay title="🧬 分子调酒" subtitle="C₂H₅OH · 乙醇分子结构解析" />
			</Sequence>

			<Sequence from={90} durationInFrames={360}>
				<Subtitles
					lines={[
						{text: 'C₂H₅OH · 乙醇', start: 0, duration: 90, highlight: 'C₂H₅OH'},
						{text: '风味特征：果香 · 绵柔 · 温热', start: 70, duration: 90},
						{text: '对应基酒：獭祭 二割三分', start: 140, duration: 100, highlight: '獭祭 二割三分'},
						{text: '酒精度 16% · 精米步合 23%', start: 220, duration: 80},
					]}
				/>
			</Sequence>

			<Sequence from={450} durationInFrames={90}>
				<TitleOverlay title="🍸 Game-OS" subtitle="分子调酒实验室" />
			</Sequence>

			<FooterBranding />

			<div
				style={{
					position: 'absolute',
					top: 30,
					left: 40,
					fontSize: 13,
					color: 'rgba(245,158,11,0.6)',
					fontFamily: 'monospace',
					letterSpacing: 1,
					opacity: interpolate(frame, [30, 60], [0, 1], {extrapolateLeft: 'clamp'}),
				}}
			>
				⚗️ ETHANOL · C₂H₆O
			</div>

			<div
				style={{
					position: 'absolute',
					top: 30,
					right: 40,
					fontSize: 13,
					color: 'rgba(255,255,255,0.4)',
					fontFamily: 'monospace',
					opacity: interpolate(frame, [30, 60], [0, 1], {extrapolateLeft: 'clamp'}),
				}}
			>
				{String(Math.floor(frame / 30)).padStart(2, '0')}:{String((frame % 30) * 33.33).padStart(2, '0').slice(0, 2)}
			</div>
		</AbsoluteFill>
	);
};
