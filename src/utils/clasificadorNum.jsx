import vectores from './vectores_binarios_num.json';

// Renombrar las claves para uso directo
const referencias = {
  '2': vectores['bin_2.jpg'],
  '3': vectores['bin_3.jpg'],
  '4': vectores['bin_4.jpg'],
  '5': vectores['bin_5.jpg'],
  '6': vectores['bin_6.jpg'],
  '7': vectores['bin_7.jpg'],
  '8': vectores['bin_8.jpg'],
  '9': vectores['bin_9.jpg'],
  '10': vectores['bin_10.jpg'],
  'J': vectores['bin_J.jpg'],
  'Q': vectores['bin_Q.jpg'],
  'K': vectores['bin_K.jpg'],
  'A': vectores['bin_A.jpg'],
  'nada': vectores['bin_nada.jpg']
};

// Distancia de Hamming
function hamming(v1, v2) {
  let dist = 0;
  for (let i = 0; i < v1.length; i++) {
    dist += v1[i] !== v2[i] ? 1 : 0;
  }
  return dist;
}

// Clasificador para números/letras
export function clasificarVector(inputVector) {
  let menorDist = Infinity;
  let clase = null;

  for (const [nombre, vectorRef] of Object.entries(referencias)) {
    const dist = hamming(inputVector, vectorRef);
    if (dist < menorDist) {
      menorDist = dist;
      clase = nombre;
    }
  }

  return clase;
}
