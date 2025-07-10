import { useState, useRef } from 'react';
import { procesarImagenCanvas } from './utils/procesarImagen';
import { clasificarVector as clasificarNumero } from './utils/clasificadorNum';
import './index.css';

function CapturasDebug({ images }) {
  return (
    <div className="grid grid-cols-4 gap-2 mt-4">
      {images.map((src, idx) => (
        <div key={idx} className="flex flex-col items-center">
          <img src={src} alt={`ROI ${idx}`} className="w-24 h-auto border border-white" />
          <span className="text-xs mt-1">ROI {idx + 1}</span>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [recomendacion, setRecomendacion] = useState('');
  const [streamIniciado, setStreamIniciado] = useState(false);
  const [debugImages, setDebugImages] = useState([]);
  const videoTrackRef = useRef(null);
  const intervalRef = useRef(null);

  async function capturarPantallaYProcesar() {
    if (!videoTrackRef.current) return;

    try {
      const video = document.createElement('video');
      video.srcObject = new MediaStream([videoTrackRef.current]);
      video.muted = true;
      await video.play();

      const fullWidth = video.videoWidth;
      const fullHeight = video.videoHeight;

      const canvas = document.createElement('canvas');
      canvas.width = fullWidth;
      canvas.height = fullHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, fullWidth, fullHeight);

      // OCR ROIs
      const stackPotROIs = [
        { x: 203, y: 263, w: 75, h: 27 },
        { x: 438, y: 215, w: 75, h: 27 },
        { x: 744, y: 263, w: 75, h: 27 },
        { x: 674, y: 446, w: 75, h: 27 },
        { x: 513, y: 453, w: 75, h: 27 },
        { x: 276, y: 447, w: 75, h: 27 },
        { x: 476, y: 376, w: 75, h: 27 },
        { x: 86, y: 238, w: 91, h: 22 },
        { x: 467, y: 153, w: 91, h: 22 },
        { x: 850, y: 238, w: 91, h: 22 },
        { x: 764, y: 538, w: 91, h: 22 },
        { x: 464, y: 592, w: 91, h: 22 },
        { x: 170, y: 538, w: 91, h: 22 }
      ];

      const roiCanvasList = stackPotROIs.map(({ x, y, w, h }) => {
        const roiCanvas = document.createElement('canvas');
        roiCanvas.width = w;
        roiCanvas.height = h;
        const roiCtx = roiCanvas.getContext('2d');
        roiCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
        return roiCanvas;
      });

      // Cartas jugador (2) + mesa (5) => 14 ROIs
      const cartasCoords = [
        { x: 447, y: 498, w: 20, h: 25 },
        { x: 447, y: 524, w: 18, h: 18 },
        { x: 514, y: 498, w: 20, h: 25 },
        { x: 514, y: 524, w: 18, h: 18 },
        { x: 343, y: 278, w: 20, h: 25 },
        { x: 343, y: 304, w: 18, h: 18 },
        { x: 414, y: 278, w: 20, h: 25 },
        { x: 414, y: 304, w: 18, h: 18 },
        { x: 485, y: 278, w: 20, h: 25 },
        { x: 485, y: 304, w: 18, h: 18 },
        { x: 556, y: 278, w: 20, h: 25 },
        { x: 556, y: 304, w: 18, h: 18 },
        { x: 627, y: 278, w: 20, h: 25 },
        { x: 627, y: 304, w: 18, h: 18 }
      ];

      const dealerCoords = [
        { x: 174, y: 267, w: 35, h: 28 },
        { x: 406, y: 172, w: 35, h: 28 },
        { x: 813, y: 267, w: 35, h: 28 },
        { x: 673, y: 476, w: 35, h: 28 },
        { x: 408, y: 489, w: 35, h: 28 },
        { x: 318, y: 477, w: 35, h: 28 }
      ];

      const extraerRoiCanvas = ({ x, y, w, h }) => {
        const roiCanvas = document.createElement('canvas');
        roiCanvas.width = w;
        roiCanvas.height = h;
        const roiCtx = roiCanvas.getContext('2d');
        roiCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
        return roiCanvas;
      };

      // Clasificar cartas jugador y mesa
      const cartasJugador = [];
      const cartasMesa = [];

      for (let i = 0; i < cartasCoords.length; i += 2) {
        const canvasNum = extraerRoiCanvas(cartasCoords[i]);
        const canvasPalo = extraerRoiCanvas(cartasCoords[i + 1]);

        const resNum = await procesarImagenCanvas(canvasNum, 20, 25);
        const resPalo = await procesarImagenCanvas(canvasPalo, 18, 18);

        const numero = clasificarNumero(resNum.vectorBinario);
        const palo = resPalo.clase;

        if (numero !== 'nada' && palo !== 'nada') {
          const carta = `${numero} ${palo}`;
          if (i < 4) cartasJugador.push(carta);
          else cartasMesa.push(carta);
        }
      }

      // Detectar botón (dealer)
      const botones = await Promise.all(
        dealerCoords.map(c => procesarImagenCanvas(extraerRoiCanvas(c), 18, 18))
      );
      const boton_pos = botones.findIndex(vec => vec.vectorBinario?.some(v => v === 1)) + 1 || null;

      // OCR montos → enviar al backend
      const formData = new FormData();
      await Promise.all(
        roiCanvasList.map((canvas, idx) =>
          new Promise(resolve => {
            canvas.toBlob(blob => {
              if (blob) {
                formData.append('imagenes', blob, `imagen${idx}.png`);
              }
              resolve();
            }, 'image/png');
          })
        )
      );

      const response = await fetch('https://beethoven-bot-backend.vercel.app/api/ocr', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      const textosOCR = data.results.map(r => r.results?.[0]?.text?.trim() || '');

      const apuestas = textosOCR.slice(0, 6);
      const pote = textosOCR[6] || 'Desconocido';
      const jugadores = textosOCR.slice(7, 13);

      const descripcionJugadores = jugadores.map((texto, i) => {
        const apuesta = apuestas[i] || '–';
        const stack = texto.match(/\d+(\.\d+)? BB/i)?.[0] || '–';
        return `Jugador ${i + 1}: ${stack} (Apuesta: ${apuesta})`;
      });

      const resumen = [
        `🂡 Cartas jugador: ${cartasJugador.length ? cartasJugador.join(', ') : 'N/A'}`,
        `🃏 Cartas mesa: ${cartasMesa.length ? cartasMesa.join(', ') : 'N/A'}`,
        `🔘 Botón en posición: ${boton_pos || 'no detectado'}`,
        `🎯 Pote: ${pote}`,
        ``,
        ...descripcionJugadores.map(j => `👤 ${j}`)
      ];

      setDebugImages(roiCanvasList.map(c => c.toDataURL()));
      setRecomendacion(resumen.join('\n'));
      setRecomendacion(resumen.join('\n'));

await fetch('https://beethoven-bot-backend.vercel.app/api/historial', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cartas_jugador: cartasJugador,
    cartas_mesa: cartasMesa,
    posicion: boton_pos?.toString(),
    pote,
    jugadores: descripcionJugadores.map((desc, i) => ({
      jugador: i + 1,
      stack: desc.match(/\d+(\.\d+)? BB/)?.[0] || '–',
      apuesta: apuestas[i] || '–'
    }))
  })
});

    } catch (err) {
      console.error('Error al capturar o procesar:', err);
      setRecomendacion('⚠️ Ocurrió un error al procesar la información.');
      
    }
  }

  async function iniciarCaptura() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      videoTrackRef.current = track;
      setStreamIniciado(true);
      intervalRef.current = setInterval(capturarPantallaYProcesar, 3000);
    } catch (err) {
      console.error('Error al iniciar captura:', err);
      setRecomendacion('❌ No se pudo iniciar la captura.');
    }
  }

  async function detenerCaptura() {
    if (videoTrackRef.current) videoTrackRef.current.stop();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStreamIniciado(false);
    setRecomendacion('🔴 Tracking detenido.');
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-start p-6">
      <h1 className="text-3xl font-bold mb-4">Asistente de Póker</h1>

      {!streamIniciado ? (
        <button onClick={iniciarCaptura} className="bg-yellow-600 hover:bg-yellow-700 px-6 py-3 rounded-lg text-lg font-semibold mb-4">
          Iniciar Captura
        </button>
      ) : (
        <button onClick={detenerCaptura} className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg text-lg font-semibold mb-4">
          Detener
        </button>
      )}

      <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full mt-4">
        <h2 className="text-xl font-semibold mb-2">📊 Estado Actual</h2>
        <pre className="text-sm whitespace-pre-wrap break-words">{recomendacion}</pre>
      </div>

      <CapturasDebug images={debugImages} />
    </div>
  );
}

export default App;
