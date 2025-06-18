// src/utils/clasificador.js

import vectoresRef from './vectores_binarios.json';

// Renombramos los vectores con nombres más cortos
const vectores = {
  Corazon: vectoresRef["bin_Corazon.jpg"],
  Diamante: vectoresRef["bin_Diamante.jpg"],
  Pica: vectoresRef["bin_Pica.jpg"],
  Trebol: vectoresRef["bin_Trebol.jpg"],
  nada: vectoresRef["bin_nada.jpg"]
};

// Calcula la distancia de Hamming
function hamming(v1, v2) {
  let dist = 0;
  for (let i = 0; i < v1.length; i++) {
    dist += v1[i] !== v2[i] ? 1 : 0;
  }
  return dist;
}

// Clasifica un vector binario de entrada
export function clasificarVector(inputVector) {
  let menorDist = Infinity;
  let clase = null;

  for (const [nombre, vectorRef] of Object.entries(vectores)) {
    const dist = hamming(inputVector, vectorRef);
    if (dist < menorDist) {
      menorDist = dist;
      clase = nombre;
    }
  }

  return clase;
}
