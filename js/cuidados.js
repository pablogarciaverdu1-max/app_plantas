// Base de datos de cuidados. Va dentro de la app: sin API, sin clave y sin coste.
//
// La mayoría de los consejos de cuidado son de género, no de especie: todos los
// Ficus se riegan parecido. Por eso la búsqueda prueba primero la especie exacta
// y luego cae al género, que multiplica la cobertura sin multiplicar el trabajo.

// --- Arquetipos: lo que comparten familias enteras de plantas ---------------

const ARQUETIPOS = {
  tropical: {
    riego: {
      verano: 7, invierno: 14,
      metodo: 'Riega por encima del sustrato hasta que salga agua por los agujeros y vacía el plato a los diez minutos.',
      cantidad: 'Hasta que drene, sin encharcar.',
      comoSaber: 'Mete el dedo tres centímetros en la tierra: si sale seco, riega.',
      agua: 'Agua del grifo reposada un día, a temperatura ambiente.',
    },
    luz: {
      exposicion: 'Luz indirecta brillante',
      horas: 'De 6 a 8 horas de claridad',
      ubicacion: 'A un metro de una ventana al este, o junto a una al norte.',
      evitar: 'El sol directo del mediodía, que le quema las hojas.',
    },
    ambiente: { tempIdeal: '18-27 °C', tempMin: '12 °C', tempMax: '30 °C', humedad: 'Media-alta, agradece un pulverizado', sitio: 'Interior' },
    sustrato: {
      tipo: 'Sustrato universal aligerado con perlita y algo de corteza.',
      maceta: 'Con agujeros de drenaje, un par de centímetros más ancha que el cepellón.',
      abono: 'Abono líquido para verdes cada 3 semanas, de marzo a septiembre.',
      trasplante: 'Cada 2 años, en primavera.',
    },
    extras: {
      poda: 'Corta las hojas secas por la base con tijera limpia.',
      plagas: ['Araña roja', 'Cochinilla algodonosa'],
      propagacion: 'Esqueje de tallo con un nudo, en agua o directo en sustrato.',
      consejos: ['Límpiale el polvo de las hojas una vez al mes', 'Gírala cada semana para que crezca recta'],
    },
    dificultad: 'Fácil',
  },

  suculenta: {
    riego: {
      verano: 12, invierno: 30,
      metodo: 'Riega a fondo y deja que la tierra se seque del todo antes de volver.',
      cantidad: 'Empapa el cepellón, luego olvídate.',
      comoSaber: 'La tierra tiene que estar seca hasta el fondo. Ante la duda, no riegues.',
      agua: 'Agua del grifo, nunca sobre las hojas.',
    },
    luz: {
      exposicion: 'Sol directo o mucha luz',
      horas: 'De 4 a 6 horas de sol',
      ubicacion: 'Ventana orientada al sur, o balcón.',
      evitar: 'Los rincones oscuros: se estiran y pierden la forma.',
    },
    ambiente: { tempIdeal: '18-30 °C', tempMin: '5 °C', tempMax: '38 °C', humedad: 'Baja, nada de pulverizar', sitio: 'Interior con mucha luz o exterior' },
    sustrato: {
      tipo: 'Sustrato específico de cactus, o universal con un tercio de arena gruesa.',
      maceta: 'De barro sin esmaltar y con agujeros: ayuda a que se seque.',
      abono: 'Abono de cactus una vez al mes, solo en primavera y verano.',
      trasplante: 'Cada 3 años.',
    },
    extras: {
      poda: 'Retira las hojas secas de abajo tirando con suavidad.',
      plagas: ['Cochinilla algodonosa', 'Pulgón'],
      propagacion: 'Hoja o esqueje: déjalo secar dos días antes de plantarlo.',
      consejos: ['Casi todas las que se mueren es por exceso de riego, no por falta', 'Si se estira y se pone pálida, necesita más luz'],
    },
    dificultad: 'Fácil',
  },

  helecho: {
    riego: {
      verano: 3, invierno: 6,
      metodo: 'Riega poco y a menudo; el sustrato no debe llegar a secarse.',
      cantidad: 'Mantén la tierra fresca, nunca encharcada.',
      comoSaber: 'Toca la superficie: si ya no está fresca, riega.',
      agua: 'Agua reposada o de lluvia. La muy calcárea le quema las puntas.',
    },
    luz: {
      exposicion: 'Sombra o luz indirecta suave',
      horas: 'Claridad, sin sol directo',
      ubicacion: 'Un baño con ventana es su sitio ideal por la humedad.',
      evitar: 'El sol directo y el aire seco de la calefacción.',
    },
    ambiente: { tempIdeal: '16-24 °C', tempMin: '10 °C', tempMax: '28 °C', humedad: 'Alta: pulveriza a diario o pon un plato con guijarros y agua', sitio: 'Interior' },
    sustrato: {
      tipo: 'Sustrato rico en materia orgánica, que retenga humedad.',
      maceta: 'Con drenaje, mejor de plástico que de barro para no perder humedad.',
      abono: 'Abono líquido flojo cada mes en primavera y verano.',
      trasplante: 'Cada 2 años.',
    },
    extras: {
      poda: 'Corta las frondes secas a ras de tierra.',
      plagas: ['Cochinilla', 'Araña roja si el aire está seco'],
      propagacion: 'División de la mata en primavera.',
      consejos: ['Las puntas marrones casi siempre son aire seco, no falta de riego', 'No lo pongas encima de un radiador'],
    },
    dificultad: 'Media',
  },

  mediterranea: {
    riego: {
      verano: 4, invierno: 12,
      metodo: 'Riego abundante y espaciado, mejor a primera hora o al atardecer.',
      cantidad: 'Empapa bien la maceta.',
      comoSaber: 'Cuando los primeros centímetros estén secos.',
      agua: 'Agua del grifo, sin problema.',
    },
    luz: {
      exposicion: 'Sol directo',
      horas: 'Un mínimo de 6 horas de sol',
      ubicacion: 'Balcón o terraza a pleno sol.',
      evitar: 'La sombra: florece mucho menos.',
    },
    ambiente: { tempIdeal: '15-30 °C', tempMin: '0 °C', tempMax: '38 °C', humedad: 'Baja', sitio: 'Exterior' },
    sustrato: {
      tipo: 'Sustrato con buen drenaje, algo arenoso.',
      maceta: 'Con agujeros generosos; el barro le va bien.',
      abono: 'Abono de floración cada 15 días en primavera y verano.',
      trasplante: 'Cada 2 años, en otoño o a finales de invierno.',
    },
    extras: {
      poda: 'Poda tras la floración para que rebrote compacta.',
      plagas: ['Pulgón', 'Mosca blanca'],
      propagacion: 'Esqueje de tallo semileñoso en verano.',
      consejos: ['En Barcelona aguanta el invierno fuera sin problema', 'Retira las flores marchitas y florecerá más'],
    },
    dificultad: 'Fácil',
  },

  aromatica: {
    riego: {
      verano: 3, invierno: 8,
      metodo: 'Riego regular, sin encharcar.',
      cantidad: 'Moderada pero frecuente en verano.',
      comoSaber: 'Cuando la superficie esté seca al tacto.',
      agua: 'Agua del grifo.',
    },
    luz: {
      exposicion: 'Sol directo',
      horas: 'De 5 a 8 horas de sol',
      ubicacion: 'Alféizar o balcón soleado.',
      evitar: 'La sombra, que la vuelve larguirucha y sin aroma.',
    },
    ambiente: { tempIdeal: '15-28 °C', tempMin: '5 °C', tempMax: '35 °C', humedad: 'Media', sitio: 'Exterior o ventana muy soleada' },
    sustrato: {
      tipo: 'Sustrato universal con buen drenaje.',
      maceta: 'Con agujeros; mejor honda que ancha.',
      abono: 'Poco abono: mucho nitrógeno le quita sabor.',
      trasplante: 'Cada año, en primavera.',
    },
    extras: {
      poda: 'Pellizca los brotes de arriba a menudo: así se ramifica y no florece.',
      plagas: ['Pulgón', 'Mosca blanca'],
      propagacion: 'Esqueje en agua o semilla en primavera.',
      consejos: ['Cortar hojas a menudo la mantiene productiva', 'Si florece, el sabor de la hoja se vuelve amargo'],
    },
    dificultad: 'Fácil',
  },

  palmera: {
    riego: {
      verano: 7, invierno: 15,
      metodo: 'Riega a fondo y deja escurrir.',
      cantidad: 'Hasta que drene.',
      comoSaber: 'Cuando los primeros centímetros estén secos.',
      agua: 'Agua reposada; la calcárea le mancha las hojas.',
    },
    luz: {
      exposicion: 'Luz indirecta brillante',
      horas: 'De 6 a 8 horas de claridad',
      ubicacion: 'Cerca de una ventana grande, sin sol directo encima.',
      evitar: 'Las corrientes de aire frío.',
    },
    ambiente: { tempIdeal: '18-27 °C', tempMin: '10 °C', tempMax: '32 °C', humedad: 'Media-alta', sitio: 'Interior' },
    sustrato: {
      tipo: 'Sustrato universal con arena y perlita.',
      maceta: 'Honda y con buen drenaje.',
      abono: 'Abono para verdes al mes, de abril a septiembre.',
      trasplante: 'Cada 3 años: no le gusta que le toquen las raíces.',
    },
    extras: {
      poda: 'Quita solo las hojas totalmente secas.',
      plagas: ['Araña roja', 'Cochinilla'],
      propagacion: 'Por semilla, lenta, o separando hijuelos.',
      consejos: ['Las puntas marrones suelen ser cal del agua o aire seco', 'No la cambies de sitio a menudo'],
    },
    dificultad: 'Media',
  },

  orquidea: {
    riego: {
      verano: 7, invierno: 12,
      metodo: 'Por inmersión: mete la maceta en agua 10 minutos y déjala escurrir del todo.',
      cantidad: 'Empapar y escurrir. Nunca dejar agua en el plato.',
      comoSaber: 'Las raíces verdes están hidratadas; cuando se ponen plateadas, toca regar.',
      agua: 'Agua de baja cal, mejor embotellada o de lluvia.',
    },
    luz: {
      exposicion: 'Luz indirecta brillante',
      horas: 'De 8 a 10 horas de claridad',
      ubicacion: 'Ventana al este, tras un visillo.',
      evitar: 'El sol directo, que le quema las hojas.',
    },
    ambiente: { tempIdeal: '18-26 °C', tempMin: '15 °C', tempMax: '30 °C', humedad: 'Alta, del 60% para arriba', sitio: 'Interior' },
    sustrato: {
      tipo: 'Corteza de pino para orquídeas. Nunca tierra normal.',
      maceta: 'Transparente y con muchos agujeros: las raíces hacen fotosíntesis.',
      abono: 'Abono específico de orquídeas, muy diluido, cada 15 días.',
      trasplante: 'Cada 2 o 3 años, cuando la corteza se deshaga.',
    },
    extras: {
      poda: 'Cuando acabe la floración, corta la vara dos yemas por encima de la base.',
      plagas: ['Cochinilla', 'Pulgón en las varas florales'],
      propagacion: 'Por keikis, los hijuelos que salen en la vara.',
      consejos: ['Las raíces plateadas por fuera de la maceta son normales, no las cortes', 'Un salto de temperatura en otoño estimula que saque vara'],
    },
    dificultad: 'Media',
  },

  citrico: {
    riego: {
      verano: 3, invierno: 8,
      metodo: 'Riego abundante, dejando secar un poco entre riegos.',
      cantidad: 'Hasta que drene.',
      comoSaber: 'Cuando los primeros cinco centímetros estén secos.',
      agua: 'Agua de baja cal: la calcárea le amarillea las hojas.',
    },
    luz: {
      exposicion: 'Sol directo',
      horas: 'De 6 a 8 horas de sol',
      ubicacion: 'La zona más soleada del balcón.',
      evitar: 'Las heladas fuertes y las corrientes.',
    },
    ambiente: { tempIdeal: '15-30 °C', tempMin: '2 °C', tempMax: '38 °C', humedad: 'Media', sitio: 'Exterior' },
    sustrato: {
      tipo: 'Sustrato específico de cítricos, ácido y con buen drenaje.',
      maceta: 'Grande y honda, con muchos agujeros.',
      abono: 'Abono de cítricos con hierro cada 15 días, de marzo a octubre.',
      trasplante: 'Cada 2 o 3 años.',
    },
    extras: {
      poda: 'Aclara el interior a finales de invierno y quita los chupones de la base.',
      plagas: ['Pulgón', 'Cochinilla', 'Minador de los cítricos'],
      propagacion: 'Injerto o esqueje; por semilla tarda años en dar fruta.',
      consejos: ['Las hojas amarillas con nervios verdes son falta de hierro: dale quelato', 'En Barcelona vive fuera todo el año'],
    },
    dificultad: 'Media',
  },
};

// --- Plantas concretas ------------------------------------------------------
// Cada entrada indica su arquetipo y solo cambia lo que le diferencia.

const PLANTAS = {
  // Tropicales de interior
  Monstera: { arq: 'tropical', nombre: 'Costilla de Adán', toxica: 'Tóxica para perros y gatos si mastican la hoja.',
    extras: { consejos: ['Ponle un tutor de musgo y hará hojas más grandes y agujereadas', 'Las hojas jóvenes salen enteras: los agujeros llegan con la edad'] } },
  Epipremnum: { arq: 'tropical', nombre: 'Potos', riego: { verano: 8, invierno: 16 }, dificultad: 'Fácil',
    toxica: 'Tóxico para perros y gatos.',
    luz: { exposicion: 'Se adapta desde la sombra a la luz indirecta', ubicacion: 'Aguanta casi cualquier rincón, aunque con luz crece más rápido.' },
    extras: { consejos: ['Es de las más difíciles de matar: perfecta para empezar', 'Si las hojas pierden el jaspeado, le falta luz'] } },
  Philodendron: { arq: 'tropical', nombre: 'Filodendro', toxica: 'Tóxico para perros y gatos.' },
  Spathiphyllum: { arq: 'tropical', nombre: 'Espatifilo', riego: { verano: 5, invierno: 10 },
    toxica: 'Tóxico para perros y gatos.',
    extras: { consejos: ['Cuando le falta agua deja caer las hojas de golpe y se recupera en horas', 'Florece mejor con algo de luz indirecta'] } },
  Ficus: { arq: 'tropical', nombre: 'Ficus', riego: { verano: 8, invierno: 16 },
    toxica: 'El látex irrita la piel y es tóxico si se ingiere.',
    extras: { consejos: ['Odia los cambios de sitio: si lo mueves puede soltar hojas', 'Las corrientes de aire frío le hacen perder hoja'] } },
  Zamioculcas: { arq: 'tropical', nombre: 'Zamioculca', riego: { verano: 15, invierno: 30, comoSaber: 'Espera a que la tierra esté seca del todo. Aguanta semanas sin agua.' },
    dificultad: 'Fácil', toxica: 'Tóxica para perros y gatos.',
    luz: { exposicion: 'Tolera poca luz', ubicacion: 'Sobrevive en rincones donde nada más aguanta.' },
    extras: { consejos: ['Si dudas, no la riegues: se pudre con facilidad', 'Es la planta ideal si viajas mucho'] } },
  Sansevieria: { arq: 'suculenta', nombre: 'Lengua de suegra', riego: { verano: 15, invierno: 35 },
    toxica: 'Tóxica para perros y gatos.',
    luz: { exposicion: 'Se adapta a casi todo, desde sombra a sol suave', ubicacion: 'Cualquier sitio; con luz crece más deprisa.' },
    ambiente: { sitio: 'Interior' },
    extras: { consejos: ['Prácticamente indestructible salvo por exceso de agua', 'En invierno puedes dejarla casi dos meses sin regar'] } },
  Dracaena: { arq: 'tropical', nombre: 'Drácena', riego: { verano: 10, invierno: 20, agua: 'Agua de baja cal: el flúor le quema las puntas.' },
    toxica: 'Tóxica para perros y gatos.',
    extras: { consejos: ['Las puntas marrones suelen ser el agua del grifo: usa embotellada'] } },
  Aglaonema: { arq: 'tropical', nombre: 'Aglaonema', toxica: 'Tóxica para perros y gatos.' },
  Syngonium: { arq: 'tropical', nombre: 'Singonio', toxica: 'Tóxico para perros y gatos.' },
  Anthurium: { arq: 'tropical', nombre: 'Anturio', riego: { verano: 5, invierno: 10 },
    ambiente: { humedad: 'Alta: pulveriza a menudo' }, toxica: 'Tóxico para perros y gatos.',
    extras: { consejos: ['Necesita humedad para sacar flor', 'Corta las flores viejas por la base'] } },
  Calathea: { arq: 'tropical', nombre: 'Calatea', riego: { verano: 4, invierno: 8, agua: 'Agua de lluvia o embotellada: la cal le quema los bordes.' },
    dificultad: 'Difícil', toxica: 'No tóxica para perros ni gatos.',
    ambiente: { humedad: 'Alta, imprescindible' },
    extras: { consejos: ['Los bordes marrones son cal del agua o aire seco', 'Cierra las hojas de noche: es normal'] } },
  Goeppertia: { arq: 'tropical', nombre: 'Calatea', riego: { verano: 4, invierno: 8, agua: 'Agua de lluvia o embotellada.' },
    dificultad: 'Difícil', toxica: 'No tóxica para perros ni gatos.', ambiente: { humedad: 'Alta, imprescindible' } },
  Maranta: { arq: 'tropical', nombre: 'Maranta', riego: { verano: 4, invierno: 8 },
    toxica: 'No tóxica para perros ni gatos.', ambiente: { humedad: 'Alta' } },
  Chlorophytum: { arq: 'tropical', nombre: 'Cinta', riego: { verano: 6, invierno: 12 },
    toxica: 'No tóxica; a los gatos les atrae y pueden mordisquearla sin peligro.',
    extras: { propagacion: 'Planta los hijuelos que cuelgan de los estolones.', consejos: ['Muy agradecida y difícil de matar'] } },
  Pilea: { arq: 'tropical', nombre: 'Planta del dinero china', riego: { verano: 7, invierno: 14 },
    toxica: 'No tóxica para perros ni gatos.',
    extras: { consejos: ['Gírala a menudo o se inclinará toda hacia la luz', 'Los hijuelos de la base se separan y regalan'] } },
  Peperomia: { arq: 'tropical', nombre: 'Peperomia', riego: { verano: 10, invierno: 18 }, toxica: 'No tóxica para perros ni gatos.' },
  Begonia: { arq: 'tropical', nombre: 'Begonia', riego: { verano: 5, invierno: 10 }, toxica: 'Tóxica para perros y gatos.' },
  Tradescantia: { arq: 'tropical', nombre: 'Amor de hombre', riego: { verano: 5, invierno: 12 }, toxica: 'Puede irritar la piel y la boca.' },
  Alocasia: { arq: 'tropical', nombre: 'Oreja de elefante', riego: { verano: 5, invierno: 12 }, dificultad: 'Difícil',
    toxica: 'Muy tóxica para perros y gatos.', ambiente: { humedad: 'Alta' },
    extras: { consejos: ['En invierno puede perder todas las hojas y rebrotar en primavera: no la tires'] } },
  Hedera: { arq: 'tropical', nombre: 'Hiedra', riego: { verano: 6, invierno: 12 }, toxica: 'Tóxica para perros y gatos.',
    ambiente: { tempIdeal: '10-22 °C', sitio: 'Interior o exterior en sombra' } },
  Aspidistra: { arq: 'tropical', nombre: 'Pilistra', riego: { verano: 12, invierno: 25 }, dificultad: 'Fácil',
    toxica: 'No tóxica para perros ni gatos.',
    luz: { exposicion: 'Sombra', ubicacion: 'Es la planta de los rincones oscuros.' } },
  Strelitzia: { arq: 'tropical', nombre: 'Ave del paraíso', riego: { verano: 6, invierno: 14 },
    luz: { exposicion: 'Mucha luz, tolera algo de sol directo' }, toxica: 'Tóxica para perros y gatos.' },
  Musa: { arq: 'tropical', nombre: 'Platanera', riego: { verano: 3, invierno: 8 },
    luz: { exposicion: 'Mucha luz o sol suave' }, toxica: 'No tóxica.' },

  // Suculentas y cactus
  Aloe: { arq: 'suculenta', nombre: 'Aloe', toxica: 'Tóxica para perros y gatos si la muerden.',
    extras: { consejos: ['El gel de las hojas calma quemaduras leves', 'Si las hojas se ponen blandas y translúcidas, hay exceso de riego'] } },
  Echeveria: { arq: 'suculenta', nombre: 'Echeveria', toxica: 'No tóxica para perros ni gatos.',
    extras: { consejos: ['Riega en la tierra, nunca en el centro de la roseta'] } },
  Crassula: { arq: 'suculenta', nombre: 'Árbol de jade', toxica: 'Tóxica para perros y gatos.',
    extras: { consejos: ['Con los años hace tronco y parece un bonsái'] } },
  Sedum: { arq: 'suculenta', nombre: 'Sedum', toxica: 'Generalmente no tóxico.' },
  Kalanchoe: { arq: 'suculenta', nombre: 'Kalanchoe', riego: { verano: 10, invierno: 21 }, toxica: 'Tóxico para perros y gatos.',
    extras: { consejos: ['Corta las flores marchitas y volverá a florecer'] } },
  Haworthia: { arq: 'suculenta', nombre: 'Haworthia', luz: { exposicion: 'Luz indirecta brillante', evitar: 'El sol directo fuerte, que la quema.' },
    toxica: 'No tóxica para perros ni gatos.' },
  Opuntia: { arq: 'suculenta', nombre: 'Chumbera', riego: { verano: 18, invierno: 45 }, toxica: 'Las espinas son el peligro, no la toxicidad.' },
  Mammillaria: { arq: 'suculenta', nombre: 'Cactus mamilaria', riego: { verano: 15, invierno: 40 }, toxica: 'No tóxico.' },
  Euphorbia: { arq: 'suculenta', nombre: 'Euforbia', toxica: 'El látex blanco es tóxico e irrita mucho la piel y los ojos.',
    extras: { consejos: ['Usa guantes si la podas: el látex quema'] } },
  Agave: { arq: 'suculenta', nombre: 'Agave', riego: { verano: 15, invierno: 40 }, ambiente: { sitio: 'Exterior' }, toxica: 'La savia irrita la piel.' },
  Sempervivum: { arq: 'suculenta', nombre: 'Siempreviva', riego: { verano: 14, invierno: 40 },
    ambiente: { tempMin: '-15 °C', sitio: 'Exterior' }, toxica: 'No tóxica.' },

  // Helechos
  Nephrolepis: { arq: 'helecho', nombre: 'Helecho de Boston', toxica: 'No tóxico para perros ni gatos.' },
  Asplenium: { arq: 'helecho', nombre: 'Nido de ave', toxica: 'No tóxico para perros ni gatos.' },
  Adiantum: { arq: 'helecho', nombre: 'Culantrillo', dificultad: 'Difícil', toxica: 'No tóxico.',
    extras: { consejos: ['Es exigente con la humedad: un baño con ventana es su sitio'] } },
  Platycerium: { arq: 'helecho', nombre: 'Cuerno de alce', riego: { verano: 7, invierno: 12, metodo: 'Sumerge la base en agua unos minutos una vez por semana.' },
    toxica: 'No tóxico.' },

  // Orquídeas
  Phalaenopsis: { arq: 'orquidea', nombre: 'Orquídea mariposa', toxica: 'No tóxica para perros ni gatos.' },
  Cymbidium: { arq: 'orquidea', nombre: 'Cymbidium', ambiente: { sitio: 'Exterior en sombra o interior fresco' }, toxica: 'No tóxica.' },
  Dendrobium: { arq: 'orquidea', nombre: 'Dendrobium', toxica: 'No tóxica.' },

  // Palmeras y similares
  Chamaedorea: { arq: 'palmera', nombre: 'Palmera de salón', toxica: 'No tóxica para perros ni gatos.' },
  Howea: { arq: 'palmera', nombre: 'Kentia', toxica: 'No tóxica para perros ni gatos.',
    extras: { consejos: ['Es la palmera de interior más resistente'] } },
  Dypsis: { arq: 'palmera', nombre: 'Areca', toxica: 'No tóxica.' },
  Yucca: { arq: 'suculenta', nombre: 'Yuca', riego: { verano: 12, invierno: 25 }, ambiente: { sitio: 'Interior o exterior' },
    toxica: 'Tóxica para perros y gatos.' },
  Beaucarnea: { arq: 'suculenta', nombre: 'Pata de elefante', riego: { verano: 18, invierno: 40 }, toxica: 'No tóxica.',
    extras: { consejos: ['El tronco hinchado almacena agua: por eso aguanta tanto sin regar'] } },
  Cycas: { arq: 'palmera', nombre: 'Cica', riego: { verano: 10, invierno: 20 }, toxica: 'Muy tóxica para perros: puede ser mortal.' },

  // Mediterráneas y de balcón
  Lavandula: { arq: 'mediterranea', nombre: 'Lavanda', toxica: 'Ligeramente tóxica para perros y gatos.',
    extras: { consejos: ['Pódala tras la floración para que no se haga leñosa'] } },
  Rosmarinus: { arq: 'mediterranea', nombre: 'Romero', toxica: 'No tóxico en las cantidades que se usan en cocina.' },
  Salvia: { arq: 'mediterranea', nombre: 'Salvia', toxica: 'No tóxica en cantidades normales.' },
  Thymus: { arq: 'mediterranea', nombre: 'Tomillo', toxica: 'No tóxico.' },
  Pelargonium: { arq: 'mediterranea', nombre: 'Geranio', riego: { verano: 3, invierno: 10 }, toxica: 'Tóxico para perros y gatos.',
    extras: { consejos: ['Quita las flores secas cada semana y no parará de florecer', 'Ojo con la oruga del geranio en verano'] } },
  Bougainvillea: { arq: 'mediterranea', nombre: 'Buganvilla', riego: { verano: 5, invierno: 15 }, toxica: 'Ligeramente tóxica; las espinas irritan.',
    extras: { consejos: ['Florece más si pasa algo de sed', 'En Barcelona es de las que mejor aguantan el balcón a pleno sol'] } },
  Nerium: { arq: 'mediterranea', nombre: 'Adelfa', toxica: 'Muy tóxica para personas y animales: no la pongas al alcance de mascotas.' },
  Olea: { arq: 'mediterranea', nombre: 'Olivo', riego: { verano: 7, invierno: 20 }, toxica: 'No tóxico.',
    extras: { consejos: ['En maceta necesita poda anual para mantener la copa'] } },
  Jasminum: { arq: 'mediterranea', nombre: 'Jazmín', riego: { verano: 3, invierno: 10 }, toxica: 'No tóxico.' },
  Lantana: { arq: 'mediterranea', nombre: 'Lantana', toxica: 'Tóxica para perros y gatos.' },
  Hibiscus: { arq: 'mediterranea', nombre: 'Hibisco', riego: { verano: 2, invierno: 8 }, toxica: 'No tóxico.',
    ambiente: { tempMin: '5 °C' } },
  Rosa: { arq: 'mediterranea', nombre: 'Rosal', riego: { verano: 3, invierno: 10 }, toxica: 'No tóxico; cuidado con las espinas.',
    extras: { plagas: ['Pulgón', 'Oídio', 'Mancha negra'], poda: 'Poda fuerte a finales de invierno, dejando tres o cuatro yemas por rama.' } },
  Gardenia: { arq: 'mediterranea', nombre: 'Gardenia', dificultad: 'Difícil',
    riego: { verano: 3, invierno: 8, agua: 'Agua de lluvia o sin cal: es muy sensible.' },
    luz: { exposicion: 'Luz indirecta brillante', evitar: 'El sol directo fuerte.' },
    sustrato: { tipo: 'Sustrato ácido, de plantas de hoja ácida.' }, toxica: 'Ligeramente tóxica.' },
  Camellia: { arq: 'mediterranea', nombre: 'Camelia', luz: { exposicion: 'Semisombra', evitar: 'El sol del mediodía.' },
    sustrato: { tipo: 'Sustrato ácido.' }, riego: { agua: 'Agua sin cal.' }, toxica: 'No tóxica.' },
  Hydrangea: { arq: 'mediterranea', nombre: 'Hortensia', riego: { verano: 2, invierno: 8 },
    luz: { exposicion: 'Semisombra', evitar: 'El sol directo, que le achicharra las flores.' },
    sustrato: { tipo: 'Sustrato ácido; el pH decide si las flores salen azules o rosas.' },
    toxica: 'Tóxica para perros y gatos.' },
  Citrus: { arq: 'citrico', nombre: 'Cítrico', toxica: 'No tóxico, aunque el aceite de la piel puede sentar mal a los gatos.' },

  // Aromáticas y comestibles
  Ocimum: { arq: 'aromatica', nombre: 'Albahaca', riego: { verano: 2, invierno: 6 }, toxica: 'No tóxica.',
    extras: { consejos: ['Corta siempre por encima de un par de hojas y se ramificará', 'Quítale las flores en cuanto salgan'] } },
  Mentha: { arq: 'aromatica', nombre: 'Menta', riego: { verano: 2, invierno: 6 },
    luz: { exposicion: 'Sol suave o semisombra' }, toxica: 'Puede sentar mal a perros y gatos en cantidad.',
    extras: { consejos: ['Plántala sola: invade la maceta de cualquier vecina'] } },
  Petroselinum: { arq: 'aromatica', nombre: 'Perejil', riego: { verano: 2, invierno: 6 }, toxica: 'En cantidad es tóxico para perros y gatos.' },
  Origanum: { arq: 'aromatica', nombre: 'Orégano', toxica: 'No tóxico en cantidades normales.' },
  Aloysia: { arq: 'aromatica', nombre: 'Hierba luisa', toxica: 'No tóxica.' },
  Capsicum: { arq: 'aromatica', nombre: 'Pimiento o guindilla', riego: { verano: 2, invierno: 7 }, toxica: 'La capsaicina irrita a las mascotas.' },
  Solanum: { arq: 'mediterranea', nombre: 'Tomate y parientes', riego: { verano: 2, invierno: 8 },
    toxica: 'Hojas y tallos son tóxicos; el fruto maduro no.' },
  Fragaria: { arq: 'mediterranea', nombre: 'Fresa', riego: { verano: 2, invierno: 8 }, toxica: 'No tóxica.' },
};

// --- Búsqueda ---------------------------------------------------------------

function fusionar(base, encima) {
  const salida = { ...base };
  for (const [clave, valor] of Object.entries(encima || {})) {
    salida[clave] =
      valor && typeof valor === 'object' && !Array.isArray(valor)
        ? fusionar(base[clave] || {}, valor)
        : valor;
  }
  return salida;
}

/**
 * Ficha de cuidados de una especie. Prueba la especie exacta y cae al género.
 * Devuelve null si no la tenemos, en vez de inventarse los cuidados.
 */
export function cuidadosDe(nombreCientifico, genero = '') {
  const claves = [];
  if (nombreCientifico) {
    claves.push(nombreCientifico);
    claves.push(nombreCientifico.split(' ')[0]); // el género que va delante
  }
  if (genero) claves.push(genero);

  for (const clave of claves) {
    const entrada = PLANTAS[clave];
    if (entrada) {
      const base = ARQUETIPOS[entrada.arq] || {};
      const { arq, nombre, ...resto } = entrada;
      return { ...fusionar(base, resto), nombre, coincidencia: clave };
    }
  }
  return null;
}

export const generosConocidos = Object.keys(PLANTAS).length;
