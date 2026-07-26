import React from 'react';
import {interpolate, useCurrentFrame, AbsoluteFill} from 'remotion';

interface TitleOverlayProps {
	title: string;
	subtitle?: string;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({title, subtitle}) => {
	const frame = useCurrentFrame();

	const opacity = interpolate(frame, [0, 15, 75, 90], [0, 1, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const translateY = interpolate(frame, [0, 20], [30, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const glowSize = interpolate(frame, [15, 45, 75], [10, 25, 10], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				opacity,
				transform: `translateY(${translateY}px)`,
			}}
		>
			<div
				style={{
					textAlign: 'center',
					padding: '40px 80px',
					background: 'linear-gradient(135deg, rgba(10,10,20,0.85), rgba(20,15,30,0.9))',
					borderRadius: 20,
					border: '1px solid rgba(245,158,11,0.3)',
					backdropFilter: 'blur(20px)',
					boxShadow: `0 0 ${glowSize}px rgba(245,158,11,0.2)`,
				}}
			>
				<div
					style={{
						fontSize: 56,
						fontWeight: 800,
						fontFamily: 'system-ui, -apple-system, sans-serif',
						background: 'linear-gradient(135deg, #f59e0b, #fbbf24, #f97316, #f59e0b)',
						backgroundSize: '200% auto',
						WebkitBackgroundClip: 'text',
						WebkitTextFillColor: 'transparent',
						backgroundClip: 'text',
						letterSpacing: 2,
						marginBottom: subtitle ? 16 : 0,
					}}
				>
					{title}
				</div>
				{subtitle && (
					<div
						style={{
							fontSize: 22,
							color: 'rgba(255,255,255,0.6)',
							fontFamily: 'system-ui, -apple-system, sans-serif',
							letterSpacing: 1,
						}}
					>
						{subtitle}
					</div>
				)}
			</div>
		</AbsoluteFill>
	);
};
