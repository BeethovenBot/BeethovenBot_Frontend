import { useState, useRef, useEffect } from 'react';
import { procesarImagenCanvas } from './utils/procesarImagen';
import { clasificarVector as clasificarNumero } from './utils/clasificadorNum';
import { esIgual, vectorReferencia } from './utils/clasificadorAccion';
import './index.css';

function CapturasDebug({ images }) {
  return (
    <div className="grid grid-cols-4 gap-2 mt-4">
      {images.map((src, idx) => (
        <div key={idx} className="flex flex-col items-center">
          <img src={src} alt={`ROI ${idx}`} className="w-24 h-auto border border-white" />
          <span className="text-xs mt-1">
  {idx < 13 ? `ROI ${idx + 1}` : 'Acciones'}
</span>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [recomendacion, setRecomendacion] = useState('');
  const [recomendacionGPT, setRecomendacionGPT] = useState('');
  const [streamIniciado, setStreamIniciado] = useState(false);
  const [debugImages, setDebugImages] = useState([]);
  const [manoActual, setManoActual] = useState([]);
  const [cartasPrevias, setCartasPrevias] = useState([]);
  const [vectorAcciones, setVectorAcciones] = useState([]);
  const [cartasActivas, setCartasActivas] = useState('');
  const [mostrarJugar, setMostrarJugar] = useState(false);
  const videoTrackRef = useRef(null);
  const intervalRef = useRef(null);
  const [snapshotAnterior, setSnapshotAnterior] = useState(null);

  const esNuevaMano = (cartasJugador) => {
    return (
      cartasJugador.length > 0 &&
      (cartasPrevias.length === 0 || cartasJugador.join(',') !== cartasPrevias.join(','))
    );
  };

  const manoTerminada = (cartasJugador) => {
    return cartasPrevias.length > 0 && cartasJugador.length === 0;
  };

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

      const stackPotROIs = [
      { x: 203, y: 263, w: 75, h: 27 },
      { x: 438, y: 215, w: 75, h: 27 },
      { x: 744, y: 263, w: 75, h: 27 },
      { x: 674, y: 446, w: 75, h: 27 },
      { x: 513, y: 453, w: 75, h: 27 },
      { x: 276, y: 447, w: 75, h: 27 },
      { x: 496, y: 246, w: 75, h: 27 },
      { x: 86, y: 238, w: 91, h: 22 },
      { x: 467, y: 153, w: 91, h: 22 },
      { x: 850, y: 238, w: 91, h: 22 },
      { x: 764, y: 538, w: 91, h: 22 },
      { x: 464, y: 592, w: 91, h: 22 },
      { x: 170, y: 538, w: 91, h: 22 }
    ];
      // Nuevo ROI para acciones (Fold / Check / Raise)
      const accionesCoords = { x: 654, y: 678, w: 30, h: 30 }; // Ajusta si es necesario
      const accionCanvas = document.createElement('canvas');
      accionCanvas.width = accionesCoords.w;
      accionCanvas.height = accionesCoords.h;
      const accionCtx = accionCanvas.getContext('2d');
      accionCtx.drawImage(canvas, accionesCoords.x, accionesCoords.y, accionesCoords.w, accionesCoords.h, 0, 0, accionesCoords.w, accionesCoords.h);

      const roiCanvasList = stackPotROIs.map(({ x, y, w, h }) => {
        const roiCanvas = document.createElement('canvas');
        roiCanvas.width = w;
        roiCanvas.height = h;
        const roiCtx = roiCanvas.getContext('2d');
        roiCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
        return roiCanvas;
      });

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

      // Detectar botón
      const botones = await Promise.all(
        dealerCoords.map(c => procesarImagenCanvas(extraerRoiCanvas(c), 18, 18))
      );
      const boton_pos = botones.findIndex(vec => vec.vectorBinario?.some(v => v === 1)) + 1 || null;

      // OCR
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
        '',
        ...descripcionJugadores.map(j => `👤 ${j}`)
      ];

      // Procesar accionCanvas como binario
      const accionProcesada = await procesarImagenCanvas(accionCanvas, accionesCoords.w, accionesCoords.h);
      const binCanvas = document.createElement('canvas');
      binCanvas.width = accionesCoords.w;
      binCanvas.height = accionesCoords.h;
      const binCtx = binCanvas.getContext('2d');

      // Pintar imagen binaria (vectorBinario)
      const imageData = binCtx.createImageData(accionesCoords.w, accionesCoords.h);
      for (let i = 0; i < accionProcesada.vectorBinario.length; i++) {
        const valor = accionProcesada.vectorBinario[i] ? 255 : 0;
        imageData.data[i * 4 + 0] = valor; // R
        imageData.data[i * 4 + 1] = valor; // G
        imageData.data[i * 4 + 2] = valor; // B
        imageData.data[i * 4 + 3] = 255;   // Alpha
      }
      binCtx.putImageData(imageData, 0, 0);

      // Mostrar todos los ROIs más este binarizado
      /* setDebugImages([...roiCanvasList.map(c => c.toDataURL()), binCanvas.toDataURL()]); */
      // Mostrar solo la imagen binarizada del ROI de acciones
      setDebugImages([
        binCanvas.toDataURL()
      ]);

      // Guardar vector binario para mostrar en texto
      setVectorAcciones(accionProcesada.vectorBinario);
      // Clasificar si coincide con el vector referencia
      if (esIgual(accionProcesada.vectorBinario, vectorReferencia)) {
        setMostrarJugar(true);
        const esMomentoDeJugar = esIgual(accionProcesada.vectorBinario, vectorReferencia);
        setMostrarJugar(esMomentoDeJugar);
      } else {
        setMostrarJugar(false);
      }
      setRecomendacion(resumen.join('\n'));

      // Preparar snapshot actual
      const snapshotActual = {
        cartas_jugador: cartasJugador,
        cartas_mesa: cartasMesa,
        pote,
        posicion: boton_pos?.toString(),
        jugadores: descripcionJugadores.map((desc, i) => ({
          jugador: i + 1,
          stack: desc.match(/\d+(\.\d+)? BB/)?.[0] || '–',
          apuesta: apuestas[i] || '–'
        }))
      };

      const cartasActuales = cartasJugador.join(',');

      // Si el jugador recibió nuevas cartas => nueva mano
      if (cartasJugador.length === 2 && cartasActuales !== cartasActivas) {
        setCartasActivas(cartasActuales);     // guardar cartas actuales
        setManoActual([]);                    // limpiar historial de mano anterior
        setSnapshotAnterior(null);           // reiniciar comparación
      }


// Comparar si el estado general cambió (mesa, bote, apuestas, etc.)
const haCambiado =
  !snapshotAnterior ||
  JSON.stringify(snapshotAnterior.cartas_mesa) !== JSON.stringify(snapshotActual.cartas_mesa) ||
  snapshotAnterior.pote !== snapshotActual.pote ||
  snapshotAnterior.posicion !== snapshotActual.posicion ||
  snapshotAnterior.cartas_jugador.join(',') !== snapshotActual.cartas_jugador.join(',') ||
  JSON.stringify(snapshotAnterior.jugadores) !== JSON.stringify(snapshotActual.jugadores);

console.log("Snapshot anterior:", snapshotAnterior);
console.log("Snapshot actual:", snapshotActual);
console.log("¿Cambió?", haCambiado);


// Guardar nuevo estado si hubo cambio
  if (haCambiado) {
    setManoActual(prev => [...prev, snapshotActual]);
    setSnapshotAnterior(snapshotActual);

    await fetch('https://beethoven-bot-backend.vercel.app/api/historial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshotActual)
    });

    if (esMomentoDeJugar && !recomendacionGPT) {
      solicitarRecomendacionGPT(snapshotActual);
    }
  }




setCartasPrevias(cartasJugador);


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
      intervalRef.current = setInterval(capturarPantallaYProcesar, 1500);
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

  async function solicitarRecomendacionGPT(snapshot) {
  try {
        if (esMomentoDeJugar && !recomendacionGPT) {
        console.log("✅ Solicitando recomendación a GPT...");
        solicitarRecomendacionGPT(snapshotActual);
      }
    const response = await fetch('https://beethoven-bot-backend.vercel.app/api/recomendacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot)
    });

    const data = await response.json();
    if (data?.recomendacion) {
      setRecomendacionGPT(data.recomendacion);
    } else {
      setRecomendacionGPT('⚠️ No se recibió una recomendación.');
    }
  } catch (err) {
    console.error('Error solicitando recomendación GPT:', err);
    setRecomendacionGPT('❌ Error al solicitar la recomendación.');
  }
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

       {/* <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full mt-4">
        <h2 className="text-xl font-semibold mb-2">📊 Estado Actual</h2>
        <pre className="text-sm whitespace-pre-wrap break-words">{recomendacion}</pre>
      </div> */}

      {/* <CapturasDebug images={debugImages} />  */}
       {/* {vectorAcciones.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-lg mt-4 max-w-4xl w-full text-xs overflow-auto">
          <h3 className="text-lg font-semibold mb-2">🧬 Vector binario ROI Acciones</h3>
          <pre className="whitespace-pre-wrap break-words">
            {vectorAcciones.join(', ')}
          </pre>
        </div>
      )}  */}
            {mostrarJugar && (
  <div className="text-white text-2xl font-bold px-8 py-4 rounded-lg mt-4 animate-pulse">
    💡 Recomendación:{"\n"}{recomendacionGPT}
  </div>
)}
      <div className="bg-gray-800 p-6 rounded-lg max-w-6xl w-full mt-6 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">🎯 Mano en juego</h2>
        <table className="min-w-full text-sm text-white table-auto border-collapse">
  <thead className="bg-gray-700 text-xs uppercase font-semibold text-gray-300">
    <tr>
      <th className="px-2 py-2 border border-gray-600 text-center">#</th>
      <th className="px-2 py-2 border border-gray-600 text-center">Cartas Jugador</th>
      <th className="px-2 py-2 border border-gray-600 text-center">Cartas Mesa</th>
      <th className="px-2 py-2 border border-gray-600 text-center">Botón</th>
      <th className="px-2 py-2 border border-gray-600 text-center">Pote</th>
      {[1, 2, 3, 4, 5, 6].map(n => (
        <th key={n} className="px-2 py-2 border border-gray-600 text-center">J{n}</th>
      ))}
    </tr>
  </thead>
  <tbody>
    {[...manoActual].map((h, idx) => (
      <tr key={idx} className="bg-gray-900 even:bg-gray-800">
        <td className="px-2 py-2 border border-gray-700 text-center">{idx + 1}</td>
        <td className="px-2 py-2 border border-gray-700">{h.cartas_jugador.join(', ')}</td>
        <td className="px-2 py-2 border border-gray-700">{h.cartas_mesa.join(', ')}</td>
        <td className="px-2 py-2 border border-gray-700 text-center">{h.posicion || '–'}</td>
        <td className="px-2 py-2 border border-gray-700 text-center">{h.pote}</td>
        {[0, 1, 2, 3, 4, 5].map(i => {
  const j = h.jugadores[i];
  return (
    <td key={i} className="px-2 py-2 border border-gray-700 text-center">
      {j ? `${j.stack} / ${j.apuesta}` : '–'}
    </td>
  );
})}

      </tr>
    ))}
  </tbody>
</table>
      </div>
    </div>
  );
}

export default App;
