import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import jsQR from 'jsqr';

interface WebCameraScannerProps {
  onScan: (data: string) => void;
  isActive: boolean;
}

export const WebCameraScanner: React.FC<WebCameraScannerProps> = ({ onScan, isActive }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      try {
        setErrorMsg(null);
        if (!navigator?.mediaDevices?.getUserMedia) {
          setErrorMsg('Tu navegador no soporta acceso a la cámara.');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.muted = true;
          await videoRef.current.play();
        }
      } catch (err: any) {
        console.error('[WebCameraScanner] Error starting camera:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMsg('Permiso de cámara denegado en el navegador.');
        } else {
          setErrorMsg('No se pudo iniciar la cámara en este dispositivo.');
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    let lastScanTime = 0;

    function scanFrame() {
      if (!isActive) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const now = Date.now();
        // Escanear cada ~100ms para optimizar rendimiento de CPU
        if (now - lastScanTime > 100) {
          lastScanTime = now;

          const width = video.videoWidth;
          const height = video.videoHeight;

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data) {
              onScan(code.data);
              return;
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(scanFrame);
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isActive, onScan]);

  if (errorMsg) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Elemento de video HTML5 para el stream web */}
      <video
        ref={videoRef as any}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
      {/* Canvas oculto para decodificación de fotogramas QR */}
      <canvas ref={canvasRef as any} style={{ display: 'none' }} />
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#231e1a',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'NunitoSans_600SemiBold',
  },
});
