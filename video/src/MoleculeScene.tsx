import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {ThreeCanvas} from '@remotion/three';

interface Atom {
	id: string;
	element: string;
	position: [number, number, number];
	color: string;
	radius: number;
}

interface Bond {
	from: string;
	to: string;
}

interface MoleculeData {
	atoms: Atom[];
	bonds: Bond[];
}

const ethanolMolecule: MoleculeData = {
	atoms: [
		{id: 'C1', element: 'C', position: [-1.2, 0.3, 0], color: '#404040', radius: 0.55},
		{id: 'C2', element: 'C', position: [0.6, 0.3, 0], color: '#404040', radius: 0.55},
		{id: 'O1', element: 'O', position: [1.5, 1.4, 0], color: '#FF4444', radius: 0.48},
		{id: 'H1', element: 'H', position: [-1.8, -0.5, 0.8], color: '#ffffff', radius: 0.3},
		{id: 'H2', element: 'H', position: [-1.8, -0.5, -0.8], color: '#ffffff', radius: 0.3},
		{id: 'H3', element: 'H', position: [-1.5, 1.3, 0], color: '#ffffff', radius: 0.3},
		{id: 'H4', element: 'H', position: [0.9, -0.6, 0.8], color: '#ffffff', radius: 0.3},
		{id: 'H5', element: 'H', position: [0.9, -0.6, -0.8], color: '#ffffff', radius: 0.3},
		{id: 'H6', element: 'H', position: [2.3, 1.0, 0], color: '#ffffff', radius: 0.3},
	],
	bonds: [
		{from: 'C1', to: 'C2'},
		{from: 'C1', to: 'H1'},
		{from: 'C1', to: 'H2'},
		{from: 'C1', to: 'H3'},
		{from: 'C2', to: 'O1'},
		{from: 'C2', to: 'H4'},
		{from: 'C2', to: 'H5'},
		{from: 'O1', to: 'H6'},
	],
};

const getAtomPosition = (id: string): [number, number, number] => {
	const atom = ethanolMolecule.atoms.find((a) => a.id === id);
	return atom ? atom.position : [0, 0, 0];
};

const Bond: React.FC<{from: [number, number, number]; to: [number, number, number]}> = ({from, to}) => {
	const dx = to[0] - from[0];
	const dy = to[1] - from[1];
	const dz = to[2] - from[2];
	const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
	const midX = (from[0] + to[0]) / 2;
	const midY = (from[1] + to[1]) / 2;
	const midZ = (from[2] + to[2]) / 2;

	const angleY = Math.atan2(dx, dz);
	const angleX = Math.asin(dy / length);

	return (
		<mesh position={[midX, midY, midZ]} rotation={[angleX, angleY, 0]}>
			<cylinderGeometry args={[0.08, 0.08, length, 12]} />
			<meshStandardMaterial color="#888888" metalness={0.3} roughness={0.5} />
		</mesh>
	);
};

export const MoleculeScene: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const rotation = frame * 0.012;
	const floatY = Math.sin(frame * 0.025) * 0.25;
	const pulseScale = 1 + Math.sin(frame * 0.04) * 0.03;
	const glowIntensity = interpolate(frame, [0, 30, 60], [0.3, 0.8, 0.3], {
		extrapolateRight: 'clamp',
	});

	return (
		<ThreeCanvas width={1920} height={1080} camera={{position: [0, 0.5, 5], fov: 50}} style={{background: 'transparent'}}>
			<ambientLight intensity={0.4} />
			<pointLight position={[5, 5, 5]} intensity={1.2} color="#ffd700" />
			<pointLight position={[-5, 3, -3]} intensity={0.6} color="#ff6600" />
			<pointLight position={[0, -3, 3]} intensity={0.4} color="#4488ff" />

			<group position={[0, floatY, 0]} rotation-y={rotation} scale={pulseScale}>
				{ethanolMolecule.bonds.map((bond, i) => (
					<Bond key={`bond-${i}`} from={getAtomPosition(bond.from)} to={getAtomPosition(bond.to)} />
				))}
				{ethanolMolecule.atoms.map((atom) => (
					<mesh key={atom.id} position={atom.position}>
						<sphereGeometry args={[atom.radius, 32, 32]} />
						<meshStandardMaterial
							color={atom.color}
							roughness={0.25}
							metalness={atom.element === 'C' ? 0.2 : 0.4}
							emissive={atom.element === 'O' ? '#ff2222' : atom.element === 'H' ? '#ffffff' : '#000000'}
							emissiveIntensity={atom.element === 'O' ? glowIntensity * 0.5 : 0.05}
						/>
					</mesh>
				))}
			</group>

			<mesh position={[0, -2.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<circleGeometry args={[3, 64]} />
				<meshStandardMaterial color="#1a1a2e" transparent opacity={0.6} />
			</mesh>
		</ThreeCanvas>
	);
};
