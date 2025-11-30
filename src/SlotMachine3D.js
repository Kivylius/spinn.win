import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Text,
  RoundedBox,
  OrbitControls,
  Cylinder,
  Sphere,
} from "@react-three/drei";

// 3D Reel with spinning drum effect
function Reel({ position, symbol, isSpinning, isWinning }) {
  const drumRef = useRef();
  const glowRef = useRef();

  const allSymbols = ["💎", "🍒", "🍋", "🍊", "💎", "🍒", "🍋", "🍊"];
  const spinSpeed = useRef(0);

  useFrame((state) => {
    if (drumRef.current) {
      if (isSpinning) {
        spinSpeed.current = 0.8;
        drumRef.current.rotation.y += spinSpeed.current;
      } else {
        if (spinSpeed.current > 0.01) {
          spinSpeed.current *= 0.92;
          drumRef.current.rotation.y += spinSpeed.current;
        } else {
          spinSpeed.current = 0;
          const symbolIndex = allSymbols.indexOf(symbol);
          if (symbolIndex !== -1) {
            const targetAngle = (symbolIndex / allSymbols.length) * Math.PI * 2;
            drumRef.current.rotation.y = targetAngle;
          }
        }
      }
    }

    if (isWinning && glowRef.current) {
      glowRef.current.scale.setScalar(
        1 + Math.sin(state.clock.elapsedTime * 8) * 0.2
      );
    }
  });

  return (
    <group position={position}>
      {/* Reel drum with symbols */}
      <group ref={drumRef}>
        <Cylinder args={[0.8, 0.8, 2.5, 32]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial
            color="#ffffff"
            metalness={0.1}
            roughness={0.3}
          />
        </Cylinder>

        {/* Symbols around the drum */}
        {allSymbols.map((sym, i) => {
          const angle = (i / allSymbols.length) * Math.PI * 2;
          const radius = 0.85;
          return (
            <Text
              key={i}
              position={[Math.sin(angle) * radius, 0, Math.cos(angle) * radius]}
              rotation={[0, -angle, 0]}
              fontSize={1}
              color="#000000"
              anchorX="center"
              anchorY="middle"
            >
              {sym}
            </Text>
          );
        })}
      </group>

      {/* Win glow */}
      {isWinning && (
        <group ref={glowRef}>
          <Sphere args={[1.2, 32, 32]} position={[0, 0, 0.5]}>
            <meshBasicMaterial color="#ffd700" transparent opacity={0.3} />
          </Sphere>
          <pointLight
            position={[0, 0, 1]}
            intensity={3}
            distance={4}
            color="#ffd700"
          />
        </group>
      )}
    </group>
  );
}

// Slot Machine Cabinet
function SlotCabinet() {
  return (
    <group>
      {/* Main cabinet body - tall and narrow like real slots */}
      <RoundedBox args={[6, 10, 3]} radius={0.2} position={[0, 0, -1.5]}>
        <meshStandardMaterial color="#cc0000" metalness={0.7} roughness={0.3} />
      </RoundedBox>

      {/* Top marquee with lights */}
      <group position={[0, 5.5, 0]}>
        <RoundedBox args={[6.5, 1.5, 3.5]} radius={0.3}>
          <meshStandardMaterial
            color="#ffd700"
            metalness={1}
            roughness={0.1}
            emissive="#ffd700"
            emissiveIntensity={0.5}
          />
        </RoundedBox>
        {/* Marquee lights */}
        {[...Array(8)].map((_, i) => (
          <Sphere
            key={i}
            args={[0.15, 16, 16]}
            position={[i * 0.8 - 2.8, 0, 1.8]}
          >
            <meshStandardMaterial
              color={i % 2 === 0 ? "#ff0000" : "#00ff00"}
              emissive={i % 2 === 0 ? "#ff0000" : "#00ff00"}
              emissiveIntensity={1}
            />
          </Sphere>
        ))}
      </group>

      {/* Screen bezel - black frame around reels */}
      <RoundedBox args={[5.5, 3.5, 0.3]} radius={0.15} position={[0, 1.5, 0.3]}>
        <meshStandardMaterial color="#000000" metalness={0.9} roughness={0.1} />
      </RoundedBox>

      {/* Glass reflection over reels */}
      <RoundedBox args={[5.3, 3.3, 0.05]} radius={0.1} position={[0, 1.5, 0.6]}>
        <meshPhysicalMaterial
          color="#ffffff"
          metalness={0}
          roughness={0.1}
          transparent
          opacity={0.15}
          transmission={0.9}
        />
      </RoundedBox>

      {/* Control panel */}
      <RoundedBox args={[5.5, 1.5, 0.8]} radius={0.2} position={[0, -1.5, 0.5]}>
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
      </RoundedBox>

      {/* Coin tray */}
      <RoundedBox args={[4, 0.5, 1.2]} radius={0.1} position={[0, -3.5, 0.8]}>
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
      </RoundedBox>

      {/* Side chrome strips */}
      <RoundedBox args={[0.3, 10, 3]} radius={0.1} position={[-3.15, 0, -1.5]}>
        <meshStandardMaterial color="#c0c0c0" metalness={1} roughness={0.1} />
      </RoundedBox>
      <RoundedBox args={[0.3, 10, 3]} radius={0.1} position={[3.15, 0, -1.5]}>
        <meshStandardMaterial color="#c0c0c0" metalness={1} roughness={0.1} />
      </RoundedBox>
    </group>
  );
}

// Neon ring lights around machine
function NeonRing() {
  const ringRef = useRef();

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group ref={ringRef}>
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 5;
        return (
          <Sphere
            key={i}
            args={[0.2, 16, 16]}
            position={[Math.cos(angle) * radius, Math.sin(angle) * radius, -2]}
          >
            <meshStandardMaterial
              color={
                i % 3 === 0 ? "#ff00ff" : i % 3 === 1 ? "#00ffff" : "#ffff00"
              }
              emissive={
                i % 3 === 0 ? "#ff00ff" : i % 3 === 1 ? "#00ffff" : "#ffff00"
              }
              emissiveIntensity={1}
            />
          </Sphere>
        );
      })}
    </group>
  );
}

// Floating coins
function FloatingCoins({ show }) {
  const coinsRef = useRef([]);

  useFrame(() => {
    if (show) {
      coinsRef.current.forEach((coin) => {
        if (coin) {
          coin.position.y += 0.08;
          coin.rotation.y += 0.15;
          coin.rotation.x += 0.1;
          if (coin.position.y > 8) coin.position.y = -4;
        }
      });
    }
  });

  if (!show) return null;

  return (
    <group>
      {[...Array(20)].map((_, i) => (
        <Cylinder
          key={i}
          ref={(el) => (coinsRef.current[i] = el)}
          args={[0.4, 0.4, 0.15, 32]}
          position={[
            (Math.random() - 0.5) * 10,
            Math.random() * 8 - 4,
            Math.random() * 3,
          ]}
        >
          <meshStandardMaterial
            color="#ffd700"
            metalness={1}
            roughness={0.1}
            emissive="#ffd700"
            emissiveIntensity={0.5}
          />
        </Cylinder>
      ))}
    </group>
  );
}

// Main 3D Scene
export default function SlotMachine3D({
  reels,
  isSpinning,
  isWinning,
  showConfetti,
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "700px",
        borderRadius: "20px",
        overflow: "hidden",
        background: "#000",
      }}
    >
      <Canvas camera={{ position: [0, 0, 15], fov: 45 }} shadows>
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={10}
          maxDistance={25}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 6}
        />

        {/* Lighting setup */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <directionalLight position={[-10, 10, 5]} intensity={0.5} />
        <spotLight
          position={[0, 8, 8]}
          angle={0.5}
          intensity={1.5}
          color="#ffffff"
        />
        <pointLight position={[0, 6, 3]} intensity={1} color="#ffd700" />

        {/* Neon ring */}
        <NeonRing />

        {/* Slot Machine Cabinet */}
        <SlotCabinet />

        {/* Three Reels */}
        <Reel
          position={[-1.8, 1.5, 0.8]}
          symbol={reels[0]}
          isSpinning={isSpinning}
          isWinning={isWinning}
        />
        <Reel
          position={[0, 1.5, 0.8]}
          symbol={reels[1]}
          isSpinning={isSpinning}
          isWinning={isWinning}
        />
        <Reel
          position={[1.8, 1.5, 0.8]}
          symbol={reels[2]}
          isSpinning={isSpinning}
          isWinning={isWinning}
        />

        {/* Floating coins */}
        <FloatingCoins show={showConfetti} />

        {/* Top marquee text */}
        <Text
          position={[0, 5.5, 1.8]}
          fontSize={0.6}
          color="#000000"
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/orbitron/v29/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1nyGy6xpmIyXjU1pg.woff"
        >
          JACKPOT
        </Text>

        {/* Floor reflection */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -6, 0]}
          receiveShadow
        >
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial
            color="#111111"
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      </Canvas>
    </div>
  );
}
