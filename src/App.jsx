import { useState, useRef } from 'react';
import { procesarImagenBase64 } from './utils/procesarImagen';
import { clasificarVector as clasificarNumero } from './utils/clasificadorNum';
import './index.css';

function App() {
  const [recomendacion, setRecomendacion] = useState('');
  const [streamIniciado, setStreamIniciado] = useState(false);
  const [imagenesBoton, setImagenesBoton] = useState([]);
  const videoTrackRef = useRef(null);
  const intervalRef = useRef(null);

  async function iniciarCaptura() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      videoTrackRef.current = track;
      setStreamIniciado(true);
      intervalRef.current = setInterval(capturarPantallaYEnviar, 1000);
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

  async function capturarPantallaYEnviar() {
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

      const coordenadas = [
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

      const dealerROIs = [
        { x: 174, y: 267, w: 35, h: 28 },
        { x: 406, y: 172, w: 35, h: 28 },
        { x: 813, y: 267, w: 35, h: 28 },
        { x: 673, y: 476, w: 35, h: 28 },
        { x: 408, y: 489, w: 35, h: 28 },
        { x: 318, y: 477, w: 35, h: 28 }
      ];

      const extraerRoi = ({ x, y, w, h }) => {
        const roiCanvas = document.createElement('canvas');
        roiCanvas.width = w;
        roiCanvas.height = h;
        const roiCtx = roiCanvas.getContext('2d');
        roiCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
        return roiCanvas.toDataURL('image/jpeg', 1.0);
      };

      const cartas = [];

      for (let i = 0; i < coordenadas.length; i += 2) {
        const imgNum = extraerRoi(coordenadas[i]);
        const imgPalo = extraerRoi(coordenadas[i + 1]);

        const resNum = await procesarImagenBase64(imgNum, 20, 25);
        const resPalo = await procesarImagenBase64(imgPalo, 18, 18);

        const numero = clasificarNumero(resNum.vectorBinario);
        const palo = resPalo.clase;

        if (numero !== 'nada' && palo !== 'nada') {
          cartas.push(`${numero} ${palo}`);
        } else {
          cartas.push(`N/A`);
        }
      }

      const botonesDetectados = [];

      for (let i = 0; i < dealerROIs.length; i++) {
        const imgDealer = extraerRoi(dealerROIs[i]);
        const resDealer = await procesarImagenBase64(imgDealer, 18, 18);
        botonesDetectados.push({
          img: imgDealer,
          vector: resDealer.vectorBinario
        });
      }

      setImagenesBoton(botonesDetectados);

      const boton_posicion = botonesDetectados.findIndex(b => b.vector.some(v => v === 1)) + 1 || null;

      const cartas_jugador = cartas.slice(0, 2).filter(c => c !== 'N/A');
      const cartas_mesa = cartas.slice(2).filter(c => c !== 'N/A');

      const resultado = {
        timestamp: new Date().toISOString(),
        cartas_jugador,
        cartas_mesa,
        boton_posicion,
        asiento_jugador: 5
      };

      setRecomendacion(JSON.stringify(resultado, null, 2));

    } catch (err) {
      console.error('Error al capturar o procesar:', err);
      setRecomendacion('❌ Error al capturar o procesar las imágenes.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-start p-4">
      <h1 className="text-3xl font-bold mb-6">Asistente de Póker con IA</h1>

      {!streamIniciado ? (
        <button onClick={iniciarCaptura} className="bg-yellow-600 hover:bg-yellow-700 px-6 py-3 rounded-lg text-lg font-semibold mb-4">
          Iniciar Captura de Pantalla
        </button>
      ) : (
        <button onClick={detenerCaptura} className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg text-lg font-semibold mb-4">
          Detener Tracking
        </button>
      )}

      <div className="bg-gray-800 p-4 rounded mt-4 max-w-2xl w-full">
        <h2 className="text-xl font-semibold mb-2">📝 Estado de la mesa</h2>
        <pre className="whitespace-pre-wrap break-words text-sm">{recomendacion}</pre>
      </div>

      {imagenesBoton.length > 0 && (
        <div className="bg-gray-800 p-4 rounded mt-4 max-w-5xl w-full">
          <h2 className="text-xl font-semibold mb-2">🎯 Posiciones del Botón (Dealer)</h2>
          <div className="grid grid-cols-3 gap-4">
            {imagenesBoton.map((boton, idx) => (
              <div key={idx} className="bg-gray-700 p-2 rounded text-sm">
                <img src={boton.img} alt={`Botón ${idx + 1}`} className="w-16 h-16 mb-2 border-2 border-yellow-400" />
                <p className="break-words">{boton.vector.join('')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
