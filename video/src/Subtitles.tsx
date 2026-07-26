import React from 'react';
import {interpolate, useCurrentFrame, AbsoluteFill} from 'remotion';

interface SubtitleLine {
	text: string;
	start: number;
	duration?: number;
	highlight?: string;
}

interface SubtitlesProps {
	lines: SubtitleLine[];
}

export const Subtitles: React.FC<SubtitlesProps> = ({lines}) => {
	const frame = useCurrentFrame();

	return (
		<AbsoluteFill style={{justifyContent: 'flex-end', paddingBottom: 80}}>
			{lines.map((line, idx) => {
				const lineDur = line.duration || 120;
				const opacity = interpolate(
					frame,
					[line.start, line.start + 10, line.start + lineDur - 10, line.start + lineDur],
					[0, 1, 1, 0],
					{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
				);
				const translateY = interpolate(
					frame,
					[line.start, line.start + 15],
					[20, 0],
					{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
				);

				return (
					<div
						key={idx}
						style={{
							opacity,
							transform: `translateY(${translateY}px)`,
							textAlign: 'center',
							marginTop: idx === 0 ? 0 : 12,
						}}
					>
						<div
							style={{
								display: 'inline-block',
								fontSize: 28,
								fontWeight: 600,
								fontFamily: 'system-ui, -apple-system, sans-serif',
								color: '#fff',
								padding: '14px 36px',
								background: 'linear-gradient(135deg, rgba(0,0,0,0.7), rgba(20,20,30,0.8))',
								borderRadius: 12,
								borderLeft: '3px solid #f59e0b',
								backdropFilter: 'blur(10px)',
								letterSpacing: 0.5,
								textShadow: '0 2px 10px rgba(0,0,0,0.5)',
							}}
						>
							{line.highlight ? (
								<>
									{line.text.split(line.highlight)[0]}
									<span style={{color: '#fbbf24', fontWeight: 700}}>{line.highlight}</span>
									{line.text.split(line.highlight)[1]}
								</>
							) : (
								line.text
							)}
						</div>
					</div>
				);
			})}
		</AbsoluteFill>
	);
};
