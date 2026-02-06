import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  VRMUtils,
  VRMExpressionPresetName,
  VRMHumanBoneName,
  VRMLoaderPlugin
} from "@pixiv/three-vrm";

const DEFAULT_VRM_URL = "/avatar.vrm";

const STATUS = {
  idle: "Idle",
  connecting: "Connecting…",
  live: "Live",
  error: "Error"
};

export default function App() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const vrmRef = useRef(null);
  const mixerRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const jawRef = useRef(null);
  const jawRestQuatRef = useRef(null);
  const mouthExpressionRef = useRef(null);
  const idleTimeRef = useRef(0);
  const blinkTimeRef = useRef(0);
  const isSpeakingRef = useRef(false);
  const speakingWeightRef = useRef(0);
  const rmsSmoothedRef = useRef(0);
  const nextBlinkRef = useRef(3 + Math.random() * 2);
  const blinkProgressRef = useRef(0);
  const emotionRef = useRef("neutral");
  const emotionIntensityRef = useRef(0);
  const gestureTimeRef = useRef(0);
  const currentGestureRef = useRef(null);
  const gestureProgressRef = useRef(0);
  const gestureDurationRef = useRef(0);
  const nextIdleGestureRef = useRef(8 + Math.random() * 6);
  const sessionStartingRef = useRef(false);
  const retryTimerRef = useRef(null);
  const primeOnceRef = useRef(false);

  const peerRef = useRef(null);
  const dataChannelRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const audioElRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const analyserDataRef = useRef(null);
  const localAnalyserRef = useRef(null);
  const localAnalyserDataRef = useRef(null);
  const vadMeterRef = useRef(null);
  const mouthSmoothedRef = useRef(0);

  const [status, setStatus] = useState(STATUS.idle);
  const [error, setError] = useState("");
  const [mouthDriver, setMouthDriver] = useState("Not ready");
  const [primed, setPrimed] = useState(false);
  const initialGreetingSentRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0b0f14, 2, 8);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0, 1.4, 2.2);
    cameraRef.current = camera;

    const hemi = new THREE.HemisphereLight(0xdde8ff, 0x101820, 1.2);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(2.5, 3.5, 2.5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7aa2ff, 0.6);
    rim.position.set(-3, 2.5, -2);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x0c1117, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.05;
    scene.add(floor);

    // Soft gradient backdrop behind the avatar for focus
    const backdropMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color(0x1a2e4d) },
        color2: { value: new THREE.Color(0x0c1220) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 color1;
        uniform vec3 color2;
        void main() {
          float d = distance(vUv, vec2(0.5, 0.5));
          float alpha = smoothstep(0.85, 0.55, d);
          vec3 col = mix(color1, color2, vUv.y);
          gl_FragColor = vec4(col, alpha * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false
    });
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10, 1, 1),
      backdropMaterial
    );
    backdrop.position.set(0, 1.4, -2.4);
    scene.add(backdrop);

    const resize = () => {
      const { clientWidth, clientHeight } = canvas.parentElement;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    resize();

    let running = true;
    const tick = () => {
      if (!running) return;
      requestAnimationFrame(tick);
      const delta = clockRef.current.getDelta();
      if (mixerRef.current) mixerRef.current.update(delta);
      animateIdle(delta);
      driveMouth();
      if (vrmRef.current) vrmRef.current.update(delta);
      updateVadMeter();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      running = false;
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    loadVrm(DEFAULT_VRM_URL).catch((err) => {
      const message =
        err?.message ||
        "Failed to load VRM avatar. Place a file at public/avatar.vrm.";
      setError(message);
      console.error("VRM load error", err);
    });
  }, []);

  useEffect(() => {
    if (primed) {
      startSession();
    }
    return () => stopSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primed]);

  const addLog = (message) => {
    // Keep console visibility for debugging without rendering logs on screen
    console.debug(message);
  };

  const loadVrm = async (url) => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm;
    if (!vrm) {
      throw new Error("No VRM data found in avatar file.");
    }
    VRMUtils.removeUnnecessaryJoints(vrm.scene);
    if (vrmRef.current) {
      sceneRef.current.remove(vrmRef.current.scene);
    }
    jawRef.current = null;
    jawRestQuatRef.current = null;
    mouthExpressionRef.current = null;
    const jaw = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Jaw);
    if (jaw) {
      jawRef.current = jaw;
      jawRestQuatRef.current = jaw.quaternion.clone();
    }
    const manager = vrm.expressionManager;
    if (manager) {
      const presets = Object.keys(manager.presetExpressionMap || {});
      const custom = Object.keys(manager.customExpressionMap || {});
      const preferred = ["aa", "a", "A", "mouthOpen"];
      const foundPreset = preferred.find((name) => presets.includes(name));
      const foundCustom = custom.find((name) =>
        name.toLowerCase().includes("mouth")
      );
      mouthExpressionRef.current = foundPreset || foundCustom || null;
      if (mouthExpressionRef.current) {
        setMouthDriver(`Expression: ${mouthExpressionRef.current}`);
      } else if (jaw) {
        setMouthDriver("Jaw bone");
      } else {
        setMouthDriver("No mouth driver found");
      }
    } else if (jaw) {
      setMouthDriver("Jaw bone");
    } else {
      setMouthDriver("No mouth driver found");
    }
    vrm.scene.position.set(0, 0, 0);
    vrm.scene.scale.set(1.25, 1.25, 1.25);
    vrm.scene.rotation.y = Math.PI; // Face camera

    // Set relaxed arm pose (from T-pose)
    const leftUpperArm = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm);
    const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm);
    const leftLowerArm = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm);
    const rightLowerArm = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm);

    if (leftUpperArm) leftUpperArm.rotation.z = 1.1;
    if (rightUpperArm) rightUpperArm.rotation.z = -1.1;
    if (leftLowerArm) leftLowerArm.rotation.z = 0.3;
    if (rightLowerArm) rightLowerArm.rotation.z = -0.3;

    sceneRef.current.add(vrm.scene);
    vrmRef.current = vrm;
  };

  // Detect emotion from text
  const detectEmotion = (text) => {
    const lower = text.toLowerCase();
    if (/\b(haha|lol|funny|hilarious|joke|laugh|😂|😄)\b/.test(lower)) return "happy";
    if (/\b(wow|amazing|incredible|awesome|fantastic|excited|!\s*$)\b/.test(lower)) return "surprised";
    if (/\b(sorry|sad|unfortunate|unfortunately|regret)\b/.test(lower)) return "sad";
    if (/\b(hmm|think|consider|wonder|interesting|curious)\b/.test(lower)) return "thinking";
    if (/\b(hello|hi|hey|greet|welcome|nice to meet)\b/.test(lower)) return "greeting";
    if (/\?/.test(text)) return "curious";
    return "neutral";
  };

  // Handle data channel messages for emotion detection
  const triggerGestureFromText = (text) => {
    const lower = text.toLowerCase();
    const queue = [];
    if (/\bwave\b/.test(lower) || /\bhand\b/.test(lower)) queue.push("wave");
    if (/\bdance\b/.test(lower) || /\bgroove\b/.test(lower)) queue.push("dance");
    if (/\bclose\b.*\beyes\b/.test(lower) || /\bcover\b.*\beyes\b/.test(lower)) queue.push("eyesClosed");
    if (/\bpalms?\b.*\beyes\b/.test(lower)) queue.push("coverEyes");
    if (/\bshrug\b/.test(lower)) queue.push("shrug");
    if (/\bnod\b/.test(lower) || /\byes\b/.test(lower)) queue.push("nod");
    if (/\btilt\b/.test(lower)) queue.push("tilt");
    if (queue.length > 0) {
      const next = queue[0];
      startGesture(next);
    }
  };

  const startGesture = (name) => {
    const def = GESTURES[name];
    if (!def) return;
    currentGestureRef.current = name;
    gestureDurationRef.current = def.duration;
    gestureProgressRef.current = 0;
  };

  const handleAIMessage = (data) => {
    try {
      const parsed = JSON.parse(data);
      // Check for transcript/text in various event types
      const text = parsed?.delta?.text ||
                   parsed?.transcript ||
                   parsed?.text ||
                   parsed?.response?.output?.[0]?.content?.[0]?.text || "";

      if (text) {
        const emotion = detectEmotion(text);
        emotionRef.current = emotion;
        emotionIntensityRef.current = 1;
        triggerGestureFromText(text);
      }

      // Detect if AI is speaking
      if (parsed?.type === "response.audio.delta" || parsed?.type === "response.audio_transcript.delta") {
        isSpeakingRef.current = true;
      }
      if (parsed?.type === "response.audio.done" || parsed?.type === "response.done") {
        isSpeakingRef.current = false;
        emotionIntensityRef.current = 0;
      }
    } catch {
      // Not JSON, ignore
    }
  };

  const sendInitialGreeting = () => {
    if (initialGreetingSentRef.current) return;
    const dc = dataChannelRef.current;
    if (!dc || dc.readyState !== "open") return;
    initialGreetingSentRef.current = true;
    const payload = {
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
        input_text:
          "براہِ کرم اردو میں مختصر انداز میں سلام کریں اور بتائیں کہ آپ سن رہے ہیں اور مدد کے لیے تیار ہیں۔"
      }
    };
    try {
      dc.send(JSON.stringify(payload));
      addLog("initial.greeting.sent");
    } catch (err) {
      console.error("Failed to send greeting", err);
    }
  };

  // Gesture definitions
  const GESTURES = {
    nod: { duration: 0.6 },
    tilt: { duration: 0.8 },
    handRaise: { duration: 1.2 },
    shrug: { duration: 1.0 },
    think: { duration: 1.5 },
    wave: { duration: 1.6 },
    dance: { duration: 2.8 },
    eyesClosed: { duration: 1.2 },
    coverEyes: { duration: 1.2 }
  };

  const animateIdle = (delta) => {
    const vrm = vrmRef.current;
    if (!vrm) return;

    idleTimeRef.current += delta;
    blinkTimeRef.current += delta;
    gestureTimeRef.current += delta;
    const t = idleTimeRef.current;

    const speaking = isSpeakingRef.current;
    const emotion = emotionRef.current;
    const intensity = emotionIntensityRef.current;
    const speakingWeight = (speakingWeightRef.current = THREE.MathUtils.damp(
      speakingWeightRef.current,
      speaking ? 1 : 0,
      6,
      delta
    ));

    // Decay emotion intensity
    if (emotionIntensityRef.current > 0) {
      emotionIntensityRef.current = Math.max(0, emotionIntensityRef.current - delta * 0.3);
    }

    // Get bones
    const spine = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Spine);
    const chest = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Chest);
    const head = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Head);
    const neck = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Neck);
    const leftUpperArm = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm);
    const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm);
    const leftLowerArm = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm);
    const rightLowerArm = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm);
    let forceBlinkValue = null;

    // Base breathing
    if (spine) {
      const target = Math.sin(t * 1.5) * 0.01;
      spine.rotation.x = THREE.MathUtils.damp(spine.rotation.x, target, 4, delta);
    }

    // Head + chest (blend idle <-> speaking)
    if (head) {
      const idleX = Math.sin(t * 0.7) * 0.02;
      const idleY = Math.sin(t * 0.5) * 0.03;
      let idleZ = 0;

      const speakX = Math.sin(t * 3) * 0.04 + Math.sin(t * 0.7) * 0.02;
      const speakY = Math.sin(t * 0.8) * 0.06;
      let speakZ = Math.sin(t * 1.2) * 0.02;

      if (emotion === "thinking" || emotion === "curious") {
        const tilt = intensity * 0.1;
        idleZ += tilt;
        speakZ += tilt;
      }

      const targetX = THREE.MathUtils.lerp(idleX, speakX, speakingWeight);
      const targetY = THREE.MathUtils.lerp(idleY, speakY, speakingWeight);
      const targetZ = THREE.MathUtils.lerp(idleZ, speakZ, speakingWeight);

      head.rotation.x = THREE.MathUtils.damp(head.rotation.x, targetX, 6, delta);
      head.rotation.y = THREE.MathUtils.damp(head.rotation.y, targetY, 6, delta);
      head.rotation.z = THREE.MathUtils.damp(head.rotation.z, targetZ, 6, delta);
    }

    if (chest) {
      const idleY = 0;
      const idleZ = 0;
      const speakY = Math.sin(t * 0.6) * 0.03;
      const speakZ = Math.sin(t * 0.9) * 0.01;
      const targetY = THREE.MathUtils.lerp(idleY, speakY, speakingWeight);
      const targetZ = THREE.MathUtils.lerp(idleZ, speakZ, speakingWeight);
      chest.rotation.y = THREE.MathUtils.damp(chest.rotation.y, targetY, 4, delta);
      chest.rotation.z = THREE.MathUtils.damp(chest.rotation.z, targetZ, 4, delta);
    }

    // Arms (blend idle <-> speaking)
    const gesturePhase = Math.sin(t * 1.5) * 0.5 + 0.5;
    if (leftUpperArm) {
      const idleZ = 1.1;
      const idleX = 0;
      const speakZ = 1.1 - gesturePhase * 0.2;
      const speakX = Math.sin(t * 2) * 0.1;
      const targetZ = THREE.MathUtils.lerp(idleZ, speakZ, speakingWeight);
      const targetX = THREE.MathUtils.lerp(idleX, speakX, speakingWeight);
      leftUpperArm.rotation.z = THREE.MathUtils.damp(leftUpperArm.rotation.z, targetZ, 6, delta);
      leftUpperArm.rotation.x = THREE.MathUtils.damp(leftUpperArm.rotation.x, targetX, 6, delta);
    }
    if (rightUpperArm) {
      const idleZ = -1.1;
      const idleX = 0;
      const speakZ = -1.1 + gesturePhase * 0.15;
      const speakX = Math.sin(t * 2.2 + 1) * 0.1;
      const targetZ = THREE.MathUtils.lerp(idleZ, speakZ, speakingWeight);
      const targetX = THREE.MathUtils.lerp(idleX, speakX, speakingWeight);
      rightUpperArm.rotation.z = THREE.MathUtils.damp(rightUpperArm.rotation.z, targetZ, 6, delta);
      rightUpperArm.rotation.x = THREE.MathUtils.damp(rightUpperArm.rotation.x, targetX, 6, delta);
    }
    if (leftLowerArm) {
      const idleZ = 0.3;
      const speakZ = 0.3 + Math.sin(t * 1.8) * 0.1;
      const targetZ = THREE.MathUtils.lerp(idleZ, speakZ, speakingWeight);
      leftLowerArm.rotation.z = THREE.MathUtils.damp(leftLowerArm.rotation.z, targetZ, 6, delta);
    }
    if (rightLowerArm) {
      const idleZ = -0.3;
      const speakZ = -0.3 - Math.sin(t * 1.6) * 0.1;
      const targetZ = THREE.MathUtils.lerp(idleZ, speakZ, speakingWeight);
      rightLowerArm.rotation.z = THREE.MathUtils.damp(rightLowerArm.rotation.z, targetZ, 6, delta);
    }

    // Personality idle gestures
    if (
      !speaking &&
      !currentGestureRef.current &&
      idleTimeRef.current > nextIdleGestureRef.current
    ) {
      const options = ["wave", "tilt", "shrug"];
      const pick = options[Math.floor(Math.random() * options.length)];
      startGesture(pick);
      idleTimeRef.current = 0;
      nextIdleGestureRef.current = 8 + Math.random() * 6;
    }

    // One-shot gestures layered on top
    if (currentGestureRef.current) {
      gestureProgressRef.current += delta;
      const duration = gestureDurationRef.current || 1;
      const p = Math.min(1, gestureProgressRef.current / duration);
      const wavePhase = Math.sin(p * Math.PI * 4); // 2 back-and-forth waves

      switch (currentGestureRef.current) {
        case "wave":
          if (rightUpperArm) {
            const targetZ = -0.2;
            const targetX = -0.4;
            rightUpperArm.rotation.z = THREE.MathUtils.damp(rightUpperArm.rotation.z, targetZ, 10, delta);
            rightUpperArm.rotation.x = THREE.MathUtils.damp(
              rightUpperArm.rotation.x,
              targetX,
              10,
              delta
            );
          }
          if (rightLowerArm) {
            const targetZ = -0.1 + wavePhase * 0.15;
            rightLowerArm.rotation.z = THREE.MathUtils.damp(rightLowerArm.rotation.z, targetZ, 12, delta);
          }
          break;
        case "dance":
          if (chest) {
            const targetY = Math.sin(t * 2) * 0.1;
            const targetZ = Math.sin(t * 1.7) * 0.08;
            chest.rotation.y = THREE.MathUtils.damp(chest.rotation.y, targetY, 6, delta);
            chest.rotation.z = THREE.MathUtils.damp(chest.rotation.z, targetZ, 6, delta);
          }
          if (head) {
            const targetZ = Math.sin(t * 1.5) * 0.05;
            head.rotation.z = THREE.MathUtils.damp(head.rotation.z, targetZ, 6, delta);
          }
          break;
        case "eyesClosed":
          forceBlinkValue = 1;
          break;
        case "coverEyes":
          forceBlinkValue = 1;
          if (leftUpperArm) {
            leftUpperArm.rotation.z = THREE.MathUtils.damp(leftUpperArm.rotation.z, 0.2, 10, delta);
            leftUpperArm.rotation.x = THREE.MathUtils.damp(leftUpperArm.rotation.x, 0.6, 10, delta);
          }
          if (rightUpperArm) {
            rightUpperArm.rotation.z = THREE.MathUtils.damp(rightUpperArm.rotation.z, -0.2, 10, delta);
            rightUpperArm.rotation.x = THREE.MathUtils.damp(rightUpperArm.rotation.x, 0.6, 10, delta);
          }
          if (leftLowerArm) {
            leftLowerArm.rotation.z = THREE.MathUtils.damp(leftLowerArm.rotation.z, 0.1, 10, delta);
          }
          if (rightLowerArm) {
            rightLowerArm.rotation.z = THREE.MathUtils.damp(rightLowerArm.rotation.z, -0.1, 10, delta);
          }
          break;
        case "nod":
          if (head) {
            const nod = Math.sin(p * Math.PI) * 0.35;
            head.rotation.x = THREE.MathUtils.damp(head.rotation.x, nod, 10, delta);
          }
          break;
        case "tilt":
          if (head) {
            const tilt = Math.sin(p * Math.PI) * 0.25;
            head.rotation.z = THREE.MathUtils.damp(head.rotation.z, tilt, 10, delta);
          }
          break;
        case "shrug":
          if (leftUpperArm) {
            leftUpperArm.rotation.z = THREE.MathUtils.damp(leftUpperArm.rotation.z, 0.9, 10, delta);
          }
          if (rightUpperArm) {
            rightUpperArm.rotation.z = THREE.MathUtils.damp(rightUpperArm.rotation.z, -0.9, 10, delta);
          }
          if (chest) {
            chest.rotation.z = THREE.MathUtils.damp(chest.rotation.z, 0.05, 10, delta);
          }
          break;
        default:
          break;
      }

      if (gestureProgressRef.current >= duration) {
        currentGestureRef.current = null;
        gestureProgressRef.current = 0;
        gestureDurationRef.current = 0;
      }
    }

    // Apply emotion expressions
    const manager = vrm.expressionManager;
    if (manager) {
      // Reset expressions
      manager.setValue(VRMExpressionPresetName.Happy, 0);
      manager.setValue(VRMExpressionPresetName.Sad, 0);
      manager.setValue(VRMExpressionPresetName.Surprised, 0);
      manager.setValue(VRMExpressionPresetName.Angry, 0);
      manager.setValue(VRMExpressionPresetName.Relaxed, 0);

      // Apply current emotion
      if (emotion === "happy" || emotion === "greeting") {
        manager.setValue(VRMExpressionPresetName.Happy, intensity * 0.6);
      } else if (emotion === "sad") {
        manager.setValue(VRMExpressionPresetName.Sad, intensity * 0.5);
      } else if (emotion === "surprised") {
        manager.setValue(VRMExpressionPresetName.Surprised, intensity * 0.7);
      }

      // Blinking
      if (blinkProgressRef.current > 0) {
        blinkProgressRef.current += delta;
        if (blinkProgressRef.current > 0.2) {
          blinkProgressRef.current = 0;
          blinkTimeRef.current = 0;
          nextBlinkRef.current = 3 + Math.random() * 2;
        }
      } else if (blinkTimeRef.current > nextBlinkRef.current) {
        blinkProgressRef.current = 0.0001;
      }
      const blinkPhase = blinkProgressRef.current;
      let blinkValue = 0;
      if (blinkPhase > 0) {
        if (blinkPhase < 0.1) {
          blinkValue = blinkPhase / 0.1;
        } else if (blinkPhase < 0.2) {
          blinkValue = 1 - (blinkPhase - 0.1) / 0.1;
        }
      }
      const blinkToSet = forceBlinkValue !== null ? forceBlinkValue : blinkValue;
      manager.setValue(VRMExpressionPresetName.Blink, blinkToSet);
    }
  };

  const ensureAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const setupAudioAnalyser = (stream) => {
    const ctx = ensureAudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    const source = ctx.createMediaStreamSource(stream);
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;
    source.connect(analyser);
    analyser.connect(silentGain);
    silentGain.connect(ctx.destination);
    analyserRef.current = analyser;
    analyserDataRef.current = new Uint8Array(analyser.fftSize);
  };

  const setupLocalAnalyser = (stream) => {
    const ctx = ensureAudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    const source = ctx.createMediaStreamSource(stream);
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;
    source.connect(analyser);
    analyser.connect(silentGain);
    silentGain.connect(ctx.destination);
    localAnalyserRef.current = analyser;
    localAnalyserDataRef.current = new Uint8Array(analyser.fftSize);
  };

  const driveMouth = () => {
    const vrm = vrmRef.current;
    const analyser = analyserRef.current;
    const data = analyserDataRef.current;
    if (!vrm || !analyser || !data) return;

    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    rmsSmoothedRef.current = rmsSmoothedRef.current * 0.9 + rms * 0.1;
    const mouthOpenTarget = Math.min(1, rmsSmoothedRef.current * 3.2);
    mouthSmoothedRef.current =
      mouthSmoothedRef.current * 0.85 + mouthOpenTarget * 0.15;

    // Detect speaking from audio level
    const speakingOn = 0.03;
    const speakingOff = 0.015;
    if (isSpeakingRef.current) {
      if (rmsSmoothedRef.current < speakingOff) isSpeakingRef.current = false;
    } else if (rmsSmoothedRef.current > speakingOn) {
      isSpeakingRef.current = true;
    }
    const manager = vrm.expressionManager;
    if (manager) {
      if (mouthExpressionRef.current) {
        manager.setValue(mouthExpressionRef.current, mouthSmoothedRef.current);
      }
      const mouthPresets = [
        VRMExpressionPresetName.Aa,
        VRMExpressionPresetName.Ih,
        VRMExpressionPresetName.Ou,
        VRMExpressionPresetName.Ee,
        VRMExpressionPresetName.Oh
      ];
      mouthPresets.forEach((name) =>
        manager.setValue(name, mouthSmoothedRef.current)
      );
    }
    if (jawRef.current && jawRestQuatRef.current) {
      const jaw = jawRef.current;
      const rest = jawRestQuatRef.current;
      const jawOpen = mouthSmoothedRef.current * 0.35;
      const target = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(jawOpen, 0, 0, "XYZ")
      );
      jaw.quaternion.copy(rest).multiply(target);
    }
  };

  const updateVadMeter = () => {
    const analyser = localAnalyserRef.current;
    const data = localAnalyserDataRef.current;
    const meter = vadMeterRef.current;
    if (!analyser || !data || !meter) return;

    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    const level = Math.min(1, rms * 4.5);
    meter.style.transform = `scaleX(${level})`;
  };

  const primeAudio = async () => {
    if (primeOnceRef.current) return;
    primeOnceRef.current = true;
    try {
      const ctx = ensureAudioContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      setPrimed(true);
    } catch (err) {
      console.error("Audio prime failed", err);
      primeOnceRef.current = false;
    }
  };

  const startSession = async () => {
    if (sessionStartingRef.current || status === STATUS.live) return;
    sessionStartingRef.current = true;
    initialGreetingSentRef.current = false;
    setError("");
    setStatus(STATUS.connecting);

    try {
      ensureAudioContext();
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      const tokenRes = await fetch("http://localhost:3001/token", {
        method: "POST"
      });
      if (!tokenRes.ok) {
        throw new Error("Failed to fetch client secret");
      }
      const tokenData = await tokenRes.json();
      const clientSecret =
        tokenData?.value ||
        tokenData?.client_secret?.value ||
        tokenData?.session?.client_secret?.value;
      if (!clientSecret) throw new Error("Client secret missing from response");

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      localStreamRef.current = localStream;
      setupLocalAnalyser(localStream);
      localStream.getTracks().forEach((track) => {
        track.enabled = true;
      });
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume().catch(() => {});
      }

      const pc = new RTCPeerConnection();
      peerRef.current = pc;
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;
      dc.onmessage = (event) => {
        addLog(event.data);
        handleAIMessage(event.data);
      };
      dc.onopen = () => {
        addLog("datachannel.open");
        sendInitialGreeting();
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        remoteStreamRef.current = stream;
        if (!audioElRef.current) {
          audioElRef.current = new Audio();
          audioElRef.current.autoplay = true;
          audioElRef.current.playsInline = true;
        }
        audioElRef.current.srcObject = stream;
        audioElRef.current.play().catch(() => {});
        setupAudioAnalyser(stream);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      });

      if (!sdpResponse.ok) {
        throw new Error("Failed to create realtime call");
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setStatus(STATUS.live);
      addLog("session.ready");
    } catch (err) {
      console.error(err);
      setError(err.message || "Connection failed");
      setStatus(STATUS.error);
      if (!retryTimerRef.current) {
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          startSession();
        }, 3000);
      }
    }
    sessionStartingRef.current = false;
  };

  const stopSession = () => {
    if (dataChannelRef.current) dataChannelRef.current.close();
    if (peerRef.current) peerRef.current.close();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioCtxRef.current) audioCtxRef.current.close();

    peerRef.current = null;
    dataChannelRef.current = null;
    localStreamRef.current = null;
    analyserRef.current = null;
    analyserDataRef.current = null;
    localAnalyserRef.current = null;
    localAnalyserDataRef.current = null;
    audioCtxRef.current = null;
    isSpeakingRef.current = false;
    emotionRef.current = "neutral";
    emotionIntensityRef.current = 0;
    initialGreetingSentRef.current = false;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    sessionStartingRef.current = false;

    setStatus(STATUS.idle);
  };

  const handleStop = () => {
    if (status === STATUS.idle || status === STATUS.connecting) return;
    stopSession();
  };

  const handleResume = () => {
    if (!primed || status === STATUS.live || status === STATUS.connecting) return;
    startSession();
  };

  return (
    <div className="app">
      <div className="header">
        <div>
          <div className="title">Your wellness coach</div>
          <div className="subtitle">Hands-free, always-on guidance. Just speak and I respond.</div>
        </div>
        <div className="header-actions">
          <div className={`status status-${status.toLowerCase()}`}>
            {status}
          </div>
          <div className="action-buttons">
            <button
              className="btn ghost"
              onClick={handleStop}
              disabled={status === STATUS.idle || status === STATUS.connecting}
            >
              Stop
            </button>
            <button
              className="btn primary"
              onClick={handleResume}
              disabled={!primed || status === STATUS.live || status === STATUS.connecting}
            >
              Resume
            </button>
          </div>
        </div>
      </div>

      <div className="stage">
        <div className="canvas-wrap centered">
          {!primed ? (
            <div
              className="prime-overlay"
              onPointerDown={primeAudio}
              onClick={primeAudio}
            >
              <div className="prime-card">
                <div className="prime-title">Tap to let me listen</div>
                <div className="prime-sub">One tap to start audio & mic. Then I stay responsive.</div>
              </div>
            </div>
          ) : null}
          <canvas ref={canvasRef} />
        </div>

        <div className="control-bar">
          <div className="pill listening">
            {primed
              ? status === STATUS.live
                ? "Listening and ready"
                : status
              : "Awaiting tap"}
          </div>
          <div className="meter">
            <div className="vad-label">Mic Level</div>
            <div className="vad-track">
              <div className="vad-fill" ref={vadMeterRef} />
            </div>
          </div>
          <div className="details">
            {error ? <div className="error">{error}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
