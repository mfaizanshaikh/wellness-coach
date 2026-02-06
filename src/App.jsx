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
  const [log, setLog] = useState([]);
  const [micActive, setMicActive] = useState(false);
  const [mouthDriver, setMouthDriver] = useState("Not ready");

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
    camera.position.set(0, 1.35, 3.2);
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

  const addLog = (message) => {
    setLog((prev) => [message, ...prev].slice(0, 8));
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

  // Gesture definitions
  const GESTURES = {
    nod: { duration: 0.6 },
    tilt: { duration: 0.8 },
    handRaise: { duration: 1.2 },
    shrug: { duration: 1.0 },
    think: { duration: 1.5 },
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
      manager.setValue(VRMExpressionPresetName.Blink, blinkValue);
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

  const setMicEnabled = (enabled) => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setMicActive(enabled);
    if (enabled && audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
  };

  const startSession = async () => {
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
      setMicEnabled(false);

      const pc = new RTCPeerConnection();
      peerRef.current = pc;
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;
      dc.onmessage = (event) => {
        addLog(event.data);
        handleAIMessage(event.data);
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
    }
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
    setMicActive(false);
    isSpeakingRef.current = false;
    emotionRef.current = "neutral";
    emotionIntensityRef.current = 0;

    setStatus(STATUS.idle);
  };

  return (
    <div className="app">
      <div className="header">
        <div>
          <div className="title">Grok Companion</div>
          <div className="subtitle">Realtime voice + 3D VRM avatar</div>
        </div>
        <div className={`status status-${status.toLowerCase()}`}>
          {status}
        </div>
      </div>

      <div className="panel">
        <div className="canvas-wrap">
          <canvas ref={canvasRef} />
          <div className="canvas-hint">Drop a VRM at public/avatar.vrm</div>
        </div>
        <div className="controls">
          <button
            className="primary"
            onClick={startSession}
            disabled={status === STATUS.connecting || status === STATUS.live}
          >
            Start Talking
          </button>
          <button
            className={`ptt ${micActive ? "active" : ""}`}
            disabled={status !== STATUS.live}
            onPointerDown={() => setMicEnabled(true)}
            onPointerUp={() => setMicEnabled(false)}
            onPointerLeave={() => setMicEnabled(false)}
            onContextMenu={(event) => event.preventDefault()}
          >
            Hold to Talk
          </button>
          <button
            className="ghost"
            onClick={stopSession}
            disabled={status !== STATUS.live && status !== STATUS.error}
          >
            Stop
          </button>
          {error ? <div className="error">{error}</div> : null}
          <div className="hint">Mouth driver: {mouthDriver}</div>
        </div>
        <div className="vad">
          <div className="vad-label">Mic Level</div>
          <div className="vad-track">
            <div className="vad-fill" ref={vadMeterRef} />
          </div>
        </div>
        <div className="log">
          {log.length === 0 ? (
            <div className="log-empty">Realtime events will show up here.</div>
          ) : (
            log.map((item, idx) => (
              <div key={`${item}-${idx}`} className="log-item">
                {item}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
