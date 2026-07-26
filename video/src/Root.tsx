import React from 'react';
import {Composition} from 'remotion';
import {MolecularMixology} from './MolecularMixology';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="MolecularMixology"
				component={MolecularMixology}
				durationInFrames={540}
				fps={30}
				width={1920}
				height={1080}
			/>
		</>
	);
};
